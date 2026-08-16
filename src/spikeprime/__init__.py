"""SpikePrimePythonSDK: unofficial host SDK for SPIKE Prime HubOS 3 over Bluetooth."""

from spikeprime.client import Hub, HubAdvertisement, connect, scan
from spikeprime.devices import (
    Battery,
    ColorMatrix,
    ColorSensor,
    DeviceSnapshot,
    DistanceSensor,
    ForceSensor,
    IMU,
    Matrix5x5,
    Motor,
)
from spikeprime.enums import (
    Color,
    HubFace,
    MotorDirection,
    MotorEndState,
    MotorType,
    Port,
    ProductGroup,
    ProgramAction,
    ResponseStatus,
)
from spikeprime.errors import HubError, HubNackError, HubNotFoundError, HubProtocolError, HubTimeoutError

__version__ = "0.1.0"
__all__ = [
    "Battery",
    "Color",
    "ColorMatrix",
    "ColorSensor",
    "DeviceSnapshot",
    "DistanceSensor",
    "ForceSensor",
    "Hub",
    "HubAdvertisement",
    "HubError",
    "HubFace",
    "HubNackError",
    "HubNotFoundError",
    "HubProtocolError",
    "HubTimeoutError",
    "IMU",
    "Matrix5x5",
    "Motor",
    "MotorDirection",
    "MotorEndState",
    "MotorType",
    "Port",
    "ProductGroup",
    "ProgramAction",
    "ResponseStatus",
    "connect",
    "scan",
]
