"""Async BLE client for a HubOS 3 hub."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import TypeVar
from uuid import UUID

from bleak import BleakClient, BleakScanner
from bleak.backends.characteristic import BleakGATTCharacteristic
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData

from spikeprime.devices import DeviceSnapshot
from spikeprime.errors import HubNackError, HubNotFoundError, HubProtocolError, HubTimeoutError
from spikeprime.protocol.framing import FrameAssembler, encode_frame, split_packets
from spikeprime.protocol.crc import crc32
from spikeprime.protocol.messages import (
    ClearSlotRequest,
    ClearSlotResponse,
    ConsoleNotification,
    DeviceNotification,
    DeviceNotificationRequest,
    DeviceNotificationResponse,
    DeviceUuidRequest,
    DeviceUuidResponse,
    GetHubNameRequest,
    GetHubNameResponse,
    InfoRequest,
    InfoResponse,
    Message,
    ProgramFlowNotification,
    ProgramFlowRequest,
    ProgramFlowResponse,
    SetHubNameRequest,
    SetHubNameResponse,
    StartFileUploadRequest,
    StartFileUploadResponse,
    TransferChunkRequest,
    TransferChunkResponse,
    TunnelMessage,
    deserialize,
)

logger = logging.getLogger(__name__)

TMessage = TypeVar("TMessage", bound=Message)

SERVICE_UUID = "0000fd02-0000-1000-8000-00805f9b34fb"
RX_UUID = "0000fd02-0001-1000-8000-00805f9b34fb"
TX_UUID = "0000fd02-0002-1000-8000-00805f9b34fb"

DEFAULT_SCAN_TIMEOUT = 10.0
DEFAULT_REQUEST_TIMEOUT = 10.0
SLOTS = range(20)

ConsoleCallback = Callable[[str], Awaitable[None] | None]
DeviceCallback = Callable[[DeviceSnapshot], Awaitable[None] | None]
ProgramCallback = Callable[[bool], Awaitable[None] | None]


@dataclass(frozen=True)
class HubAdvertisement:
    """A hub seen while scanning."""

    address: str
    name: str | None
    rssi: int | None
    device: BLEDevice


def _matches_service(_device: BLEDevice, adv: AdvertisementData) -> bool:
    return SERVICE_UUID.lower() in [uuid.lower() for uuid in adv.service_uuids]


async def scan(timeout: float = DEFAULT_SCAN_TIMEOUT) -> list[HubAdvertisement]:
    """Return every hub advertising the HubOS GATT service."""
    found: dict[str, HubAdvertisement] = {}

    def _on_detect(device: BLEDevice, adv: AdvertisementData) -> None:
        if not _matches_service(device, adv):
            return
        found[device.address] = HubAdvertisement(
            address=device.address,
            name=device.name or adv.local_name,
            rssi=adv.rssi,
            device=device,
        )

    scanner = BleakScanner(detection_callback=_on_detect, service_uuids=[SERVICE_UUID])
    await scanner.start()
    try:
        await asyncio.sleep(timeout)
    finally:
        await scanner.stop()
    return list(found.values())


async def connect(
    address: str | None = None,
    name: str | None = None,
    timeout: float = DEFAULT_SCAN_TIMEOUT,
) -> Hub:
    """Connect to a hub. Picks the first one found if address/name are omitted."""
    return await Hub.connect(address=address, name=name, timeout=timeout)


class Hub:
    """Talk to one HubOS 3 hub over BLE."""

    def __init__(self, device: BLEDevice) -> None:
        self._device = device
        self._client = BleakClient(device, disconnected_callback=self._on_disconnect)
        self._assembler = FrameAssembler()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._request_lock = asyncio.Lock()
        self._pending: tuple[int, asyncio.Future[Message]] | None = None
        self._info: InfoResponse | None = None
        self._console: asyncio.Queue[str] = asyncio.Queue()
        self._devices: asyncio.Queue[DeviceSnapshot] = asyncio.Queue()
        self._tunnel: asyncio.Queue[bytes] = asyncio.Queue()
        self._latest_devices: DeviceSnapshot | None = None
        self._running: bool | None = None
        self._console_callbacks: list[ConsoleCallback] = []
        self._device_callbacks: list[DeviceCallback] = []
        self._program_callbacks: list[ProgramCallback] = []
        self._disconnected = asyncio.Event()

    @property
    def address(self) -> str:
        return self._device.address

    @property
    def ble_name(self) -> str | None:
        return self._device.name

    @property
    def info(self) -> InfoResponse:
        if self._info is None:
            raise HubProtocolError("hub has not completed handshake")
        return self._info

    @property
    def devices(self) -> DeviceSnapshot | None:
        return self._latest_devices

    @property
    def running(self) -> bool | None:
        return self._running

    @classmethod
    async def connect(
        cls,
        address: str | None = None,
        name: str | None = None,
        timeout: float = DEFAULT_SCAN_TIMEOUT,
    ) -> Hub:
        device = await cls._find(address=address, name=name, timeout=timeout)
        hub = cls(device)
        await hub.open()
        return hub

    @staticmethod
    async def _find(
        address: str | None,
        name: str | None,
        timeout: float,
    ) -> BLEDevice:
        if address:
            device = await BleakScanner.find_device_by_address(address, timeout=timeout)
            if device is None:
                raise HubNotFoundError(f"no hub at {address}")
            return device

        def _filter(device: BLEDevice, adv: AdvertisementData) -> bool:
            if not _matches_service(device, adv):
                return False
            if name is None:
                return True
            advertised = (device.name or adv.local_name or "").lower()
            return advertised == name.lower() or name.lower() in advertised

        device = await BleakScanner.find_device_by_filter(_filter, timeout=timeout)
        if device is None:
            hint = f" named {name!r}" if name else ""
            raise HubNotFoundError(
                f"no hub{hint} found. Turn the hub on and make sure it is advertising."
            )
        return device

    async def open(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._disconnected.clear()
        await self._client.connect()
        await self._client.start_notify(TX_UUID, self._on_notify)
        self._info = await self._request(InfoRequest(), InfoResponse)
        logger.info(
            "connected to %s firmware=%s rpc=%s packet=%s chunk=%s",
            self.address,
            self._info.firmware_version,
            self._info.rpc_version,
            self._info.max_packet_size,
            self._info.max_chunk_size,
        )

    async def close(self) -> None:
        if self._client.is_connected:
            try:
                await asyncio.wait_for(self._client.stop_notify(TX_UUID), timeout=2)
            except Exception:
                logger.debug("stop_notify failed", exc_info=True)
            try:
                await asyncio.wait_for(self._client.disconnect(), timeout=2)
            except Exception:
                logger.debug("disconnect failed", exc_info=True)
        self._disconnected.set()
        self._fail_pending("disconnected")

    async def __aenter__(self) -> Hub:
        if not self._client.is_connected:
            await self.open()
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.close()

    def _on_disconnect(self, _client: BleakClient) -> None:
        logger.info("hub disconnected")
        loop = self._loop
        if loop is not None and loop.is_running():
            loop.call_soon_threadsafe(self._disconnected.set)
            loop.call_soon_threadsafe(self._fail_pending, "disconnected")

    def _on_notify(self, _char: BleakGATTCharacteristic, data: bytearray) -> None:
        loop = self._loop
        if loop is None:
            return
        payload = bytes(data)
        loop.call_soon_threadsafe(self._handle_bytes, payload)

    def _handle_bytes(self, data: bytes) -> None:
        try:
            payloads = self._assembler.feed(data)
        except Exception:
            logger.exception("failed to reassemble frame")
            return
        for payload in payloads:
            try:
                message = deserialize(payload)
            except HubProtocolError:
                logger.warning("unknown payload: %s", payload.hex(" "))
                continue
            logger.debug("recv %s", message)
            self._dispatch(message)

    def _dispatch(self, message: Message) -> None:
        pending = self._pending
        if pending is not None and message.ID == pending[0] and not pending[1].done():
            pending[1].set_result(message)
            return

        if isinstance(message, ConsoleNotification):
            self._console.put_nowait(message.text)
            self._schedule_callbacks(self._console_callbacks, message.text)
        elif isinstance(message, DeviceNotification):
            snapshot = DeviceSnapshot.from_notification(message)
            self._latest_devices = snapshot
            self._devices.put_nowait(snapshot)
            self._schedule_callbacks(self._device_callbacks, snapshot)
        elif isinstance(message, ProgramFlowNotification):
            self._running = not message.stop
            self._schedule_callbacks(self._program_callbacks, message.stop)
        elif isinstance(message, TunnelMessage):
            self._tunnel.put_nowait(message.payload)
        else:
            logger.debug("unsolicited message: %s", message)

    def _schedule_callbacks(self, callbacks: list, value: object) -> None:
        loop = self._loop
        if loop is None:
            return
        for callback in list(callbacks):
            result = callback(value)
            if asyncio.iscoroutine(result):
                loop.create_task(result)

    def _fail_pending(self, reason: str) -> None:
        pending = self._pending
        if pending is not None and not pending[1].done():
            pending[1].set_exception(HubProtocolError(reason))

    async def _send(self, message: Message) -> None:
        frame = encode_frame(message.serialize())
        packet_size = self._info.max_packet_size if self._info else len(frame)
        logger.debug("send %s (%s bytes)", message, len(frame))
        for packet in split_packets(frame, packet_size):
            await self._client.write_gatt_char(RX_UUID, packet, response=False)

    async def _request(
        self,
        message: Message,
        response_type: type[TMessage],
        timeout: float = DEFAULT_REQUEST_TIMEOUT,
    ) -> TMessage:
        async with self._request_lock:
            loop = asyncio.get_running_loop()
            future: asyncio.Future[Message] = loop.create_future()
            self._pending = (response_type.ID, future)
            try:
                await self._send(message)
                try:
                    reply = await asyncio.wait_for(future, timeout)
                except asyncio.TimeoutError as exc:
                    raise HubTimeoutError(
                        f"{type(message).__name__} timed out after {timeout}s"
                    ) from exc
            finally:
                self._pending = None
        if not isinstance(reply, response_type):
            raise HubProtocolError(
                f"expected {response_type.__name__}, got {type(reply).__name__}"
            )
        return reply

    async def _ack(
        self,
        message: Message,
        response_type: type[Message],
        operation: str,
        *,
        ignore_nack: bool = False,
        timeout: float = DEFAULT_REQUEST_TIMEOUT,
    ) -> Message:
        reply = await self._request(message, response_type, timeout=timeout)
        success = getattr(reply, "success", True)
        if not success and not ignore_nack:
            raise HubNackError(operation)
        return reply

    def on_console(self, callback: ConsoleCallback) -> None:
        self._console_callbacks.append(callback)

    def on_device(self, callback: DeviceCallback) -> None:
        self._device_callbacks.append(callback)

    def on_program(self, callback: ProgramCallback) -> None:
        self._program_callbacks.append(callback)

    async def console(self) -> AsyncIterator[str]:
        while not self._disconnected.is_set():
            try:
                line = await asyncio.wait_for(self._console.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue
            yield line

    async def device_updates(self) -> AsyncIterator[DeviceSnapshot]:
        while not self._disconnected.is_set():
            try:
                snapshot = await asyncio.wait_for(self._devices.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue
            yield snapshot

    async def wait_disconnected(self) -> None:
        await self._disconnected.wait()

    async def wait_until_stopped(self, timeout: float | None = 30.0) -> None:
        """Block until the hub reports the running program has stopped."""
        done = asyncio.Event()

        def _on_program(stopped: bool) -> None:
            if stopped:
                done.set()

        self.on_program(_on_program)
        if self._running is False:
            return
        try:
            await asyncio.wait_for(done.wait(), timeout=timeout)
        except asyncio.TimeoutError as exc:
            raise HubTimeoutError(f"program did not stop within {timeout}s") from exc

    async def get_name(self) -> str:
        reply = await self._request(GetHubNameRequest(), GetHubNameResponse)
        return reply.name

    async def set_name(self, name: str) -> None:
        await self._ack(SetHubNameRequest(name), SetHubNameResponse, "set hub name")

    async def uuid(self) -> UUID:
        reply = await self._request(DeviceUuidRequest(), DeviceUuidResponse)
        return reply.uuid

    async def enable_notifications(self, interval_ms: int = 500) -> None:
        await self._ack(
            DeviceNotificationRequest(interval_ms),
            DeviceNotificationResponse,
            "enable device notifications",
        )

    async def disable_notifications(self) -> None:
        await self.enable_notifications(0)

    async def clear_slot(self, slot: int = 0, *, ignore_nack: bool = True) -> None:
        _check_slot(slot)
        await self._ack(
            ClearSlotRequest(slot),
            ClearSlotResponse,
            f"clear slot {slot}",
            ignore_nack=ignore_nack,
        )

    async def start(self, slot: int = 0) -> None:
        _check_slot(slot)
        await self._ack(
            ProgramFlowRequest(stop=False, slot=slot),
            ProgramFlowResponse,
            f"start slot {slot}",
        )
        if self._running is not False:
            self._running = True

    async def stop(self, slot: int = 0) -> None:
        _check_slot(slot)
        await self._ack(
            ProgramFlowRequest(stop=True, slot=slot),
            ProgramFlowResponse,
            f"stop slot {slot}",
        )
        self._running = False

    async def upload(
        self,
        source: str | Path | bytes,
        *,
        slot: int = 0,
        filename: str = "program.py",
        clear: bool = True,
    ) -> None:
        """Upload a Python program into a hub slot. Does not start it."""
        _check_slot(slot)
        data = _read_source(source)
        if clear:
            await self.clear_slot(slot)
        file_crc = crc32(data)
        await self._ack(
            StartFileUploadRequest(filename, slot, file_crc),
            StartFileUploadResponse,
            "start file upload",
        )
        chunk_size = self.info.max_chunk_size
        running = 0
        for offset in range(0, len(data), chunk_size):
            chunk = data[offset : offset + chunk_size]
            running = crc32(chunk, running)
            await self._ack(
                TransferChunkRequest(running, chunk),
                TransferChunkResponse,
                f"transfer chunk at {offset}",
            )

    async def run(
        self,
        source: str | Path | bytes,
        *,
        slot: int = 0,
        filename: str = "program.py",
    ) -> None:
        """Upload a program and start it."""
        await self.upload(source, slot=slot, filename=filename)
        await self.start(slot)

    async def tunnel(self, payload: bytes) -> None:
        await self._send(TunnelMessage(payload))


def _check_slot(slot: int) -> None:
    if slot not in SLOTS:
        raise ValueError(f"slot must be 0-19, got {slot}")


def _read_source(source: str | Path | bytes) -> bytes:
    if isinstance(source, bytes):
        return source
    path = Path(source)
    if isinstance(source, Path) or path.is_file():
        return path.read_bytes()
    return source.encode("utf-8")
