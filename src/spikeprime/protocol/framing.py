"""BLE packet reassembly using the HubOS delimiter state machine."""

from __future__ import annotations

from enum import Enum

from spikeprime.protocol.cobs import pack, unpack


class _Priority(Enum):
    NONE = 0
    LOW = 1
    HIGH = 2


class FrameAssembler:
    """Turn a stream of GATT notification bytes into complete unpacked payloads.

    HubOS uses 0x01 to start a high-priority frame and 0x02 to end a frame
    (and implicitly resume low-priority). BLE notifications may split or join
    those frames; feed() accepts any slice.
    """

    def __init__(self) -> None:
        self._priority = _Priority.NONE
        self._low = bytearray()
        self._high = bytearray()

    def feed(self, data: bytes) -> list[bytes]:
        payloads: list[bytes] = []
        for byte in data:
            if byte == 0x01:
                if self._priority is _Priority.HIGH:
                    self._high.clear()
                    self._low.clear()
                self._priority = _Priority.HIGH
                self._high = bytearray([0x01])
            elif byte == 0x02:
                if self._priority is _Priority.HIGH:
                    self._high.append(0x02)
                    payloads.append(unpack(bytes(self._high)))
                    self._high.clear()
                    self._priority = _Priority.LOW
                elif self._priority is _Priority.LOW:
                    self._low.append(0x02)
                    payloads.append(unpack(bytes(self._low)))
                    self._low.clear()
                    self._priority = _Priority.NONE
                else:
                    self._priority = _Priority.LOW
            else:
                if self._priority is _Priority.HIGH:
                    self._high.append(byte)
                else:
                    if self._priority is _Priority.NONE:
                        self._priority = _Priority.LOW
                    self._low.append(byte)
        return payloads

    def reset(self) -> None:
        self._priority = _Priority.NONE
        self._low.clear()
        self._high.clear()


def encode_frame(payload: bytes, *, high_priority: bool = False) -> bytes:
    frame = pack(payload)
    if high_priority:
        return b"\x01" + frame
    return frame


def split_packets(frame: bytes, max_packet_size: int) -> list[bytes]:
    if max_packet_size <= 0:
        raise ValueError("max_packet_size must be positive")
    return [frame[i : i + max_packet_size] for i in range(0, len(frame), max_packet_size)]
