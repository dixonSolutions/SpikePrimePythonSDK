"""Chunk transfer and firmware update, driven against a stubbed hub."""

import asyncio
import hashlib

import pytest

from spikeprime.client import Hub
from spikeprime.errors import HubNackError, HubProtocolError
from spikeprime.protocol.crc import crc32
from spikeprime.protocol.messages import (
    BeginFirmwareUpdateRequest,
    InfoResponse,
    Message,
    StartFirmwareUploadRequest,
    StartFirmwareUploadResponse,
    TransferChunkRequest,
)


class StubHub(Hub):
    """A Hub with the BLE layer replaced by a recorder."""

    def __init__(self, chunk_size: int = 4, bytes_uploaded: int = 0) -> None:
        self._info = InfoResponse(3, 0, 0, 1, 0, 0, 20, 20, chunk_size, 0)
        self._bytes_uploaded = bytes_uploaded
        self.sent: list[Message] = []
        self.start_nack = False

    async def _request(self, message, response_type, timeout=10.0, *, high_priority=False):
        self.sent.append(message)
        if response_type is StartFirmwareUploadResponse:
            return StartFirmwareUploadResponse(
                success=not self.start_nack, bytes_uploaded=self._bytes_uploaded
            )
        return response_type()

    @property
    def chunks(self) -> list[TransferChunkRequest]:
        return [m for m in self.sent if isinstance(m, TransferChunkRequest)]


class _FakeBleak:
    def __init__(self, packets: list[bytes]) -> None:
        self.packets = packets

    async def write_gatt_char(self, _uuid, packet, response=False) -> None:
        self.packets.append(bytes(packet))


class WritingHub(Hub):
    """A Hub that records the raw bytes it would write to the RX characteristic."""

    def __init__(self, packet_size: int = 100) -> None:
        self._info = InfoResponse(3, 0, 0, 1, 0, 0, packet_size, packet_size, 4, 0)
        self.packets: list[bytes] = []
        self._client = _FakeBleak(self.packets)


def _running_crcs(*chunks: bytes) -> list[int]:
    running = 0
    values = []
    for chunk in chunks:
        running = crc32(chunk, running)
        values.append(running)
    return values


def test_transfer_chunks_splits_and_chains_crc() -> None:
    hub = StubHub(chunk_size=4)
    asyncio.run(hub._transfer_chunks(b"0123456789"))

    assert [c.payload for c in hub.chunks] == [b"0123", b"4567", b"89"]
    assert [c.running_crc for c in hub.chunks] == _running_crcs(b"0123", b"4567", b"89")


def test_transfer_chunks_resumes_without_resending() -> None:
    hub = StubHub(chunk_size=4)
    asyncio.run(hub._transfer_chunks(b"0123456789", already=8))

    # Only the tail is sent, but its CRC still covers everything before it.
    assert [c.payload for c in hub.chunks] == [b"89"]
    assert hub.chunks[0].running_crc == _running_crcs(b"0123", b"4567", b"89")[-1]


def test_transfer_chunks_rejects_unaligned_resume() -> None:
    hub = StubHub(chunk_size=4)
    with pytest.raises(HubProtocolError, match="not a multiple"):
        asyncio.run(hub._transfer_chunks(b"0123456789", already=5))


def test_transfer_chunks_reports_progress() -> None:
    hub = StubHub(chunk_size=4)
    seen: list[tuple[int, int]] = []
    asyncio.run(hub._transfer_chunks(b"0123456789", progress=lambda s, t: seen.append((s, t))))
    assert seen == [(4, 10), (8, 10), (10, 10)]


def test_update_firmware_full_sequence() -> None:
    hub = StubHub(chunk_size=4)
    image = b"firmware-image"
    asyncio.run(hub.update_firmware(image))

    start = hub.sent[0]
    assert isinstance(start, StartFirmwareUploadRequest)
    assert start.file_sha == hashlib.sha1(image).digest()
    assert start.crc == crc32(image)

    assert b"".join(c.payload for c in hub.chunks) == image

    begin = hub.sent[-1]
    assert isinstance(begin, BeginFirmwareUpdateRequest)
    assert begin.file_sha == start.file_sha
    assert begin.crc == start.crc


def test_update_firmware_can_stage_only() -> None:
    hub = StubHub(chunk_size=4)
    asyncio.run(hub.update_firmware(b"firmware-image", begin=False))
    assert not any(isinstance(m, BeginFirmwareUpdateRequest) for m in hub.sent)


def test_update_firmware_resumes_from_reported_offset() -> None:
    hub = StubHub(chunk_size=4, bytes_uploaded=8)
    image = b"firmware-image"  # 14 bytes
    asyncio.run(hub.update_firmware(image))
    assert b"".join(c.payload for c in hub.chunks) == image[8:]
    assert isinstance(hub.sent[-1], BeginFirmwareUpdateRequest)


def test_update_firmware_rejects_nack() -> None:
    hub = StubHub(chunk_size=4)
    hub.start_nack = True
    with pytest.raises(HubNackError):
        asyncio.run(hub.update_firmware(b"firmware-image"))
    assert not hub.chunks


def test_update_firmware_rejects_empty_image() -> None:
    with pytest.raises(ValueError):
        asyncio.run(StubHub().update_firmware(b""))


def test_update_firmware_rejects_impossible_resume_offset() -> None:
    hub = StubHub(chunk_size=4, bytes_uploaded=64)
    with pytest.raises(HubProtocolError, match="bytes uploaded"):
        asyncio.run(hub.update_firmware(b"short"))


def test_tunnel_marks_high_priority_frames() -> None:
    hub = WritingHub()
    asyncio.run(hub.tunnel(b"payload"))
    assert hub.packets[0][0] != 0x01

    hub = WritingHub()
    asyncio.run(hub.tunnel(b"payload", high_priority=True))
    assert hub.packets[0][0] == 0x01
    assert hub.packets[-1][-1] == 0x02


def test_send_honors_max_packet_size() -> None:
    hub = WritingHub(packet_size=4)
    asyncio.run(hub.tunnel(b"a longer tunnel payload"))
    assert len(hub.packets) > 1
    assert all(len(packet) <= 4 for packet in hub.packets)


def test_update_firmware_reads_image_from_path(tmp_path) -> None:
    image = bytes(range(32))
    path = tmp_path / "hub.bin"
    path.write_bytes(image)

    hub = StubHub(chunk_size=8)
    asyncio.run(hub.update_firmware(str(path)))
    assert b"".join(c.payload for c in hub.chunks) == image
