"""HubOS 3 message structs.

Layouts follow https://lego.github.io/spike-prime-docs/messages.html
All multi-byte fields are little-endian. Strings are UTF-8 and null-terminated.
"""

from __future__ import annotations

import struct
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import ClassVar

from spikeprime.enums import ProductGroup, ProgramAction, ResponseStatus
from spikeprime.errors import HubProtocolError


class Message(ABC):
    ID: ClassVar[int]

    @abstractmethod
    def serialize(self) -> bytes:
        raise NotImplementedError

    @classmethod
    def deserialize(cls, data: bytes) -> Message:
        raise NotImplementedError

    def __str__(self) -> str:
        props = {k: v for k, v in vars(self).items() if not k.startswith("_")}
        body = ", ".join(f"{k}={v!r}" for k, v in props.items())
        return f"{self.__class__.__name__}({body})"


def _require_id(data: bytes, expected: int) -> None:
    if not data:
        raise HubProtocolError("empty message")
    if data[0] != expected:
        raise HubProtocolError(f"expected message id 0x{expected:02x}, got 0x{data[0]:02x}")


def _c_string(text: str, max_bytes: int) -> bytes:
    encoded = text.encode("utf-8")
    if len(encoded) > max_bytes - 1:
        raise ValueError(f"string too long: {len(encoded)} bytes, max {max_bytes - 1}")
    return encoded + b"\x00"


def _read_c_string(data: bytes) -> str:
    return data.split(b"\x00", 1)[0].decode("utf-8")


@dataclass
class StatusMessage(Message):
    success: bool = True

    def serialize(self) -> bytes:
        status = ResponseStatus.ACK if self.success else ResponseStatus.NACK
        return struct.pack("<BB", self.ID, status)

    @classmethod
    def deserialize(cls, data: bytes) -> StatusMessage:
        _require_id(data, cls.ID)
        _, status = struct.unpack("<BB", data[:2])
        return cls(success=status == ResponseStatus.ACK)


@dataclass
class InfoRequest(Message):
    ID: ClassVar[int] = 0x00

    def serialize(self) -> bytes:
        return b"\x00"

    @classmethod
    def deserialize(cls, data: bytes) -> InfoRequest:
        _require_id(data, cls.ID)
        return cls()


@dataclass
class InfoResponse(Message):
    ID: ClassVar[int] = 0x01
    rpc_major: int
    rpc_minor: int
    rpc_build: int
    firmware_major: int
    firmware_minor: int
    firmware_build: int
    max_packet_size: int
    max_message_size: int
    max_chunk_size: int
    product_group_device: int

    def serialize(self) -> bytes:
        return struct.pack(
            "<BBBHBBHHHHH",
            self.ID,
            self.rpc_major,
            self.rpc_minor,
            self.rpc_build,
            self.firmware_major,
            self.firmware_minor,
            self.firmware_build,
            self.max_packet_size,
            self.max_message_size,
            self.max_chunk_size,
            self.product_group_device,
        )

    @classmethod
    def deserialize(cls, data: bytes) -> InfoResponse:
        _require_id(data, cls.ID)
        (
            _,
            rpc_major,
            rpc_minor,
            rpc_build,
            firmware_major,
            firmware_minor,
            firmware_build,
            max_packet_size,
            max_message_size,
            max_chunk_size,
            product_group_device,
        ) = struct.unpack("<BBBHBBHHHHH", data[:17])
        return cls(
            rpc_major,
            rpc_minor,
            rpc_build,
            firmware_major,
            firmware_minor,
            firmware_build,
            max_packet_size,
            max_message_size,
            max_chunk_size,
            product_group_device,
        )

    @property
    def product_group(self) -> ProductGroup | None:
        """The product group as an enum, or None if the hub reports an unknown one."""
        try:
            return ProductGroup(self.product_group_device)
        except ValueError:
            return None

    @property
    def rpc_version(self) -> str:
        return f"{self.rpc_major}.{self.rpc_minor}.{self.rpc_build}"

    @property
    def firmware_version(self) -> str:
        return f"{self.firmware_major}.{self.firmware_minor}.{self.firmware_build}"


@dataclass
class StartFirmwareUploadRequest(Message):
    ID: ClassVar[int] = 0x0A
    file_sha: bytes
    crc: int

    def serialize(self) -> bytes:
        if len(self.file_sha) != 20:
            raise ValueError("file_sha must be 20 bytes")
        return struct.pack("<B20sI", self.ID, self.file_sha, self.crc)

    @classmethod
    def deserialize(cls, data: bytes) -> StartFirmwareUploadRequest:
        _require_id(data, cls.ID)
        _, sha, crc = struct.unpack("<B20sI", data[:25])
        return cls(file_sha=sha, crc=crc)


@dataclass
class StartFirmwareUploadResponse(Message):
    ID: ClassVar[int] = 0x0B
    success: bool
    bytes_uploaded: int

    def serialize(self) -> bytes:
        status = ResponseStatus.ACK if self.success else ResponseStatus.NACK
        return struct.pack("<BBI", self.ID, status, self.bytes_uploaded)

    @classmethod
    def deserialize(cls, data: bytes) -> StartFirmwareUploadResponse:
        _require_id(data, cls.ID)
        _, status, uploaded = struct.unpack("<BBI", data[:6])
        return cls(success=status == ResponseStatus.ACK, bytes_uploaded=uploaded)


@dataclass
class StartFileUploadRequest(Message):
    ID: ClassVar[int] = 0x0C
    file_name: str
    slot: int
    crc: int

    def serialize(self) -> bytes:
        name = _c_string(self.file_name, 32)
        return struct.pack(f"<B{len(name)}sBI", self.ID, name, self.slot, self.crc)

    @classmethod
    def deserialize(cls, data: bytes) -> StartFileUploadRequest:
        _require_id(data, cls.ID)
        name = _read_c_string(data[1:33])
        offset = 1 + len(name.encode("utf-8")) + 1
        slot, crc = struct.unpack_from("<BI", data, offset)
        return cls(file_name=name, slot=slot, crc=crc)


class StartFileUploadResponse(StatusMessage):
    ID: ClassVar[int] = 0x0D


@dataclass
class TransferChunkRequest(Message):
    ID: ClassVar[int] = 0x10
    running_crc: int
    payload: bytes

    def serialize(self) -> bytes:
        return struct.pack(
            f"<BIH{len(self.payload)}s",
            self.ID,
            self.running_crc,
            len(self.payload),
            self.payload,
        )

    @classmethod
    def deserialize(cls, data: bytes) -> TransferChunkRequest:
        _require_id(data, cls.ID)
        _, running_crc, size = struct.unpack("<BIH", data[:7])
        return cls(running_crc=running_crc, payload=data[7 : 7 + size])


class TransferChunkResponse(StatusMessage):
    ID: ClassVar[int] = 0x11


@dataclass
class BeginFirmwareUpdateRequest(Message):
    ID: ClassVar[int] = 0x14
    file_sha: bytes
    crc: int

    def serialize(self) -> bytes:
        if len(self.file_sha) != 20:
            raise ValueError("file_sha must be 20 bytes")
        return struct.pack("<B20sI", self.ID, self.file_sha, self.crc)

    @classmethod
    def deserialize(cls, data: bytes) -> BeginFirmwareUpdateRequest:
        _require_id(data, cls.ID)
        _, sha, crc = struct.unpack("<B20sI", data[:25])
        return cls(file_sha=sha, crc=crc)


class BeginFirmwareUpdateResponse(StatusMessage):
    ID: ClassVar[int] = 0x15


@dataclass
class SetHubNameRequest(Message):
    ID: ClassVar[int] = 0x16
    name: str

    def serialize(self) -> bytes:
        return bytes([self.ID]) + _c_string(self.name, 30)

    @classmethod
    def deserialize(cls, data: bytes) -> SetHubNameRequest:
        _require_id(data, cls.ID)
        return cls(name=_read_c_string(data[1:]))


class SetHubNameResponse(StatusMessage):
    ID: ClassVar[int] = 0x17


@dataclass
class GetHubNameRequest(Message):
    ID: ClassVar[int] = 0x18

    def serialize(self) -> bytes:
        return bytes([self.ID])

    @classmethod
    def deserialize(cls, data: bytes) -> GetHubNameRequest:
        _require_id(data, cls.ID)
        return cls()


@dataclass
class GetHubNameResponse(Message):
    ID: ClassVar[int] = 0x19
    name: str

    def serialize(self) -> bytes:
        return bytes([self.ID]) + _c_string(self.name, 30)

    @classmethod
    def deserialize(cls, data: bytes) -> GetHubNameResponse:
        _require_id(data, cls.ID)
        return cls(name=_read_c_string(data[1:]))


@dataclass
class DeviceUuidRequest(Message):
    ID: ClassVar[int] = 0x1A

    def serialize(self) -> bytes:
        return bytes([self.ID])

    @classmethod
    def deserialize(cls, data: bytes) -> DeviceUuidRequest:
        _require_id(data, cls.ID)
        return cls()


@dataclass
class DeviceUuidResponse(Message):
    ID: ClassVar[int] = 0x1B
    uuid: uuid.UUID

    def serialize(self) -> bytes:
        return bytes([self.ID]) + self.uuid.bytes

    @classmethod
    def deserialize(cls, data: bytes) -> DeviceUuidResponse:
        _require_id(data, cls.ID)
        return cls(uuid=uuid.UUID(bytes=data[1:17]))


@dataclass
class ProgramFlowRequest(Message):
    ID: ClassVar[int] = 0x1E
    action: ProgramAction
    slot: int

    def serialize(self) -> bytes:
        return struct.pack("<BBB", self.ID, ProgramAction(self.action), self.slot)

    @classmethod
    def deserialize(cls, data: bytes) -> ProgramFlowRequest:
        _require_id(data, cls.ID)
        _, action, slot = struct.unpack("<BBB", data[:3])
        return cls(action=ProgramAction(action), slot=slot)

    @property
    def stop(self) -> bool:
        return self.action is ProgramAction.STOP


class ProgramFlowResponse(StatusMessage):
    ID: ClassVar[int] = 0x1F


@dataclass
class ProgramFlowNotification(Message):
    ID: ClassVar[int] = 0x20
    action: ProgramAction

    def serialize(self) -> bytes:
        return struct.pack("<BB", self.ID, ProgramAction(self.action))

    @classmethod
    def deserialize(cls, data: bytes) -> ProgramFlowNotification:
        _require_id(data, cls.ID)
        _, action = struct.unpack("<BB", data[:2])
        return cls(action=ProgramAction(action))

    @property
    def stop(self) -> bool:
        return self.action is ProgramAction.STOP


@dataclass
class ClearSlotRequest(Message):
    ID: ClassVar[int] = 0x46
    slot: int

    def serialize(self) -> bytes:
        return struct.pack("<BB", self.ID, self.slot)

    @classmethod
    def deserialize(cls, data: bytes) -> ClearSlotRequest:
        _require_id(data, cls.ID)
        _, slot = struct.unpack("<BB", data[:2])
        return cls(slot=slot)


class ClearSlotResponse(StatusMessage):
    ID: ClassVar[int] = 0x47


@dataclass
class ConsoleNotification(Message):
    ID: ClassVar[int] = 0x21
    text: str

    def serialize(self) -> bytes:
        encoded = self.text.encode("utf-8")
        if len(encoded) > 255:
            encoded = encoded[:255]
        return bytes([self.ID]) + encoded + b"\x00"

    @classmethod
    def deserialize(cls, data: bytes) -> ConsoleNotification:
        _require_id(data, cls.ID)
        return cls(text=_read_c_string(data[1:]))


@dataclass
class TunnelMessage(Message):
    ID: ClassVar[int] = 0x32
    payload: bytes

    def serialize(self) -> bytes:
        return struct.pack(f"<BH{len(self.payload)}s", self.ID, len(self.payload), self.payload)

    @classmethod
    def deserialize(cls, data: bytes) -> TunnelMessage:
        _require_id(data, cls.ID)
        _, size = struct.unpack("<BH", data[:3])
        return cls(payload=data[3 : 3 + size])


@dataclass
class DeviceNotificationRequest(Message):
    ID: ClassVar[int] = 0x28
    interval_ms: int

    def serialize(self) -> bytes:
        return struct.pack("<BH", self.ID, self.interval_ms)

    @classmethod
    def deserialize(cls, data: bytes) -> DeviceNotificationRequest:
        _require_id(data, cls.ID)
        _, interval = struct.unpack("<BH", data[:3])
        return cls(interval_ms=interval)


class DeviceNotificationResponse(StatusMessage):
    ID: ClassVar[int] = 0x29


@dataclass
class DeviceNotification(Message):
    ID: ClassVar[int] = 0x3C
    payload: bytes
    messages: list[tuple[str, tuple]] = field(default_factory=list)

    def serialize(self) -> bytes:
        return struct.pack(f"<BH{len(self.payload)}s", self.ID, len(self.payload), self.payload)

    @classmethod
    def deserialize(cls, data: bytes) -> DeviceNotification:
        _require_id(data, cls.ID)
        _, size = struct.unpack("<BH", data[:3])
        payload = data[3 : 3 + size]
        return cls(payload=payload, messages=_parse_device_payload(payload))


# Device-message layouts: (name, struct format including leading type byte)
_DEVICE_LAYOUTS: dict[int, tuple[str, str]] = {
    0x00: ("Battery", "<BB"),
    0x01: ("IMU", "<BBBhhhhhhhhh"),
    0x02: ("5x5", "<B25B"),
    0x0A: ("Motor", "<BBBhhbi"),
    0x0B: ("Force", "<BBBB"),
    0x0C: ("Color", "<BBbHHH"),
    0x0D: ("Distance", "<BBh"),
    0x0E: ("3x3", "<BB9B"),
}


def _parse_device_payload(payload: bytes) -> list[tuple[str, tuple]]:
    messages: list[tuple[str, tuple]] = []
    data = payload
    while data:
        type_id = data[0]
        layout = _DEVICE_LAYOUTS.get(type_id)
        if layout is None:
            break
        name, fmt = layout
        size = struct.calcsize(fmt)
        if len(data) < size:
            break
        messages.append((name, struct.unpack(fmt, data[:size])))
        data = data[size:]
    return messages


KNOWN_MESSAGES: dict[int, type[Message]] = {
    cls.ID: cls
    for cls in (
        InfoRequest,
        InfoResponse,
        StartFirmwareUploadRequest,
        StartFirmwareUploadResponse,
        StartFileUploadRequest,
        StartFileUploadResponse,
        TransferChunkRequest,
        TransferChunkResponse,
        BeginFirmwareUpdateRequest,
        BeginFirmwareUpdateResponse,
        SetHubNameRequest,
        SetHubNameResponse,
        GetHubNameRequest,
        GetHubNameResponse,
        DeviceUuidRequest,
        DeviceUuidResponse,
        ProgramFlowRequest,
        ProgramFlowResponse,
        ProgramFlowNotification,
        ClearSlotRequest,
        ClearSlotResponse,
        ConsoleNotification,
        TunnelMessage,
        DeviceNotificationRequest,
        DeviceNotificationResponse,
        DeviceNotification,
    )
}


def deserialize(data: bytes) -> Message:
    if not data:
        raise HubProtocolError("empty message")
    cls = KNOWN_MESSAGES.get(data[0])
    if cls is None:
        raise HubProtocolError(f"unknown message id 0x{data[0]:02x}")
    return cls.deserialize(data)
