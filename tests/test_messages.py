import uuid

from spikeprime.enums import Color, Port, ProductGroup, ProgramAction
from spikeprime.devices import DeviceSnapshot
from spikeprime.protocol.messages import (
    BeginFirmwareUpdateRequest,
    ClearSlotRequest,
    ConsoleNotification,
    DeviceNotification,
    DeviceUuidResponse,
    GetHubNameResponse,
    InfoRequest,
    InfoResponse,
    ProgramFlowNotification,
    ProgramFlowRequest,
    SetHubNameRequest,
    StartFileUploadRequest,
    StartFirmwareUploadRequest,
    StartFirmwareUploadResponse,
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
    _roundtrip(ProgramFlowRequest(ProgramAction.START, 3))
    _roundtrip(ProgramFlowNotification(ProgramAction.STOP))
    _roundtrip(ClearSlotRequest(7))


def test_program_flow_uses_program_action_enum() -> None:
    start = ProgramFlowRequest(ProgramAction.START, 3)
    assert start.serialize() == bytes([0x1E, 0x00, 0x03])
    assert not start.stop

    stop = ProgramFlowRequest.deserialize(bytes([0x1E, 0x01, 0x03]))
    assert stop.action is ProgramAction.STOP
    assert stop.stop

    notification = ProgramFlowNotification.deserialize(bytes([0x20, 0x01]))
    assert notification.action is ProgramAction.STOP
    assert notification.stop


def test_info_response_product_group() -> None:
    known = InfoResponse(3, 0, 12, 1, 2, 30, 512, 1024, 128, 0x0000)
    assert known.product_group is ProductGroup.SPIKE_PRIME
    unknown = InfoResponse(3, 0, 12, 1, 2, 30, 512, 1024, 128, 0x1234)
    assert unknown.product_group is None


def test_firmware_messages() -> None:
    sha = bytes(range(20))
    _roundtrip(StartFirmwareUploadRequest(sha, 0xDEADBEEF))
    _roundtrip(BeginFirmwareUpdateRequest(sha, 0xDEADBEEF))
    reply = StartFirmwareUploadResponse.deserialize(
        StartFirmwareUploadResponse(success=True, bytes_uploaded=4096).serialize()
    )
    assert reply.success
    assert reply.bytes_uploaded == 4096
    nack = StartFirmwareUploadResponse.deserialize(bytes([0x0B, 0x01, 0, 0, 0, 0]))
    assert not nack.success


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
