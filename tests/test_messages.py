import uuid

from spikeprime.enums import Color, Port
from spikeprime.devices import DeviceSnapshot
from spikeprime.protocol.messages import (
    ClearSlotRequest,
    ConsoleNotification,
    DeviceNotification,
    DeviceUuidResponse,
    GetHubNameResponse,
    InfoRequest,
    InfoResponse,
    ProgramFlowRequest,
    SetHubNameRequest,
    StartFileUploadRequest,
    TransferChunkRequest,
    deserialize,
)


def _roundtrip(message) -> None:
    restored = deserialize(message.serialize())
    assert type(restored) is type(message)
    assert restored.serialize() == message.serialize()


def test_info_request() -> None:
    _roundtrip(InfoRequest())


def test_info_response() -> None:
    message = InfoResponse(3, 0, 12, 1, 2, 30, 512, 1024, 128, 0)
    _roundtrip(message)
    restored = InfoResponse.deserialize(message.serialize())
    assert restored.rpc_version == "3.0.12"
    assert restored.firmware_version == "1.2.30"
    assert restored.max_chunk_size == 128


def test_file_upload_and_chunk() -> None:
    start = StartFileUploadRequest("program.py", 5, 0xAABBCCDD)
    _roundtrip(start)
    chunk = TransferChunkRequest(0x1111, b"hello")
    _roundtrip(chunk)
    restored = TransferChunkRequest.deserialize(chunk.serialize())
    assert restored.payload == b"hello"


def test_program_flow_and_slot() -> None:
    _roundtrip(ProgramFlowRequest(stop=False, slot=3))
    _roundtrip(ClearSlotRequest(7))


def test_hub_name_and_uuid() -> None:
    _roundtrip(SetHubNameRequest("lab-hub"))
    name = GetHubNameResponse.deserialize(GetHubNameResponse("lab-hub").serialize())
    assert name.name == "lab-hub"
    ident = uuid.UUID("12345678-1234-5678-1234-567812345678")
    restored = DeviceUuidResponse.deserialize(DeviceUuidResponse(ident).serialize())
    assert restored.uuid == ident


def test_console_notification() -> None:
    message = ConsoleNotification("hello from hub")
    restored = ConsoleNotification.deserialize(message.serialize())
    assert restored.text == "hello from hub"


def test_device_notification_battery_and_color() -> None:
    # Battery 0x00, 87% then Color on port A, red, raw rgb.
    payload = bytes([0x00, 87, 0x0C, 0x00, 0x09, 0x10, 0x00, 0x20, 0x00, 0x30, 0x00])
    notification = DeviceNotification(payload=payload)
    parsed = DeviceNotification.deserialize(notification.serialize())
    assert parsed.messages[0][0] == "Battery"
    assert parsed.messages[0][1][1] == 87
    snap = DeviceSnapshot.from_notification(parsed)
    assert snap.battery is not None
    assert snap.battery.percent == 87
    assert Port.A in snap.color
    assert snap.color[Port.A].color is Color.RED
