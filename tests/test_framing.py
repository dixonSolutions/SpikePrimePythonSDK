from spikeprime.protocol.framing import FrameAssembler, encode_frame, split_packets
from spikeprime.protocol.messages import ConsoleNotification, InfoRequest, deserialize


def test_split_and_reassemble() -> None:
    payload = InfoRequest().serialize()
    frame = encode_frame(payload)
    assembler = FrameAssembler()
    collected: list[bytes] = []
    for packet in split_packets(frame, 3):
        collected.extend(assembler.feed(packet))
    assert len(collected) == 1
    assert deserialize(collected[0]).ID == InfoRequest.ID


def test_two_frames_in_one_packet() -> None:
    first = encode_frame(InfoRequest().serialize())
    second = encode_frame(ConsoleNotification("hi").serialize())
    assembler = FrameAssembler()
    payloads = assembler.feed(first + second)
    assert len(payloads) == 2
    assert deserialize(payloads[1]).text == "hi"  # type: ignore[attr-defined]


def test_high_priority_interrupts_low() -> None:
    low = encode_frame(b"\x21low-priority-console\x00")
    high = encode_frame(InfoRequest().serialize(), high_priority=True)
    assembler = FrameAssembler()
    # Feed the first half of the low-priority frame, then a complete high frame,
    # then the rest of the low frame.
    mid = max(1, len(low) // 2)
    payloads = []
    payloads.extend(assembler.feed(low[:mid]))
    payloads.extend(assembler.feed(high))
    payloads.extend(assembler.feed(low[mid:]))
    ids = [deserialize(item).ID for item in payloads]
    assert ids[0] == InfoRequest.ID
    assert ids[-1] == 0x21
