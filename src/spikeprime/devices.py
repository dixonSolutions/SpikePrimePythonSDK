"""Typed device snapshots parsed from DeviceNotification payloads."""

from __future__ import annotations

from dataclasses import dataclass, field

from spikeprime.enums import Color, HubFace, MotorType, Port
from spikeprime.protocol.messages import DeviceNotification


@dataclass(frozen=True)
class Battery:
    percent: int


@dataclass(frozen=True)
class IMU:
    face_up: HubFace
    yaw_face: HubFace
    yaw: int
    pitch: int
    roll: int
    accel: tuple[int, int, int]
    gyro: tuple[int, int, int]


@dataclass(frozen=True)
class Matrix5x5:
    pixels: tuple[int, ...]


@dataclass(frozen=True)
class Motor:
    port: Port
    motor_type: MotorType
    absolute_position: int
    power: int
    speed: int
    position: int


@dataclass(frozen=True)
class ForceSensor:
    port: Port
    value: int
    pressed: bool


@dataclass(frozen=True)
class ColorSensor:
    port: Port
    color: Color
    red: int
    green: int
    blue: int


@dataclass(frozen=True)
class DistanceSensor:
    port: Port
    millimeters: int

    @property
    def detected(self) -> bool:
        return self.millimeters >= 0


@dataclass(frozen=True)
class ColorMatrix:
    port: Port
    pixels: tuple[int, ...]


@dataclass
class DeviceSnapshot:
    """Latest values from a DeviceNotification."""

    battery: Battery | None = None
    imu: IMU | None = None
    display: Matrix5x5 | None = None
    motors: dict[Port, Motor] = field(default_factory=dict)
    force: dict[Port, ForceSensor] = field(default_factory=dict)
    color: dict[Port, ColorSensor] = field(default_factory=dict)
    distance: dict[Port, DistanceSensor] = field(default_factory=dict)
    color_matrix: dict[Port, ColorMatrix] = field(default_factory=dict)

    @classmethod
    def from_notification(cls, notification: DeviceNotification) -> DeviceSnapshot:
        snap = cls()
        for name, values in notification.messages:
            _apply(snap, name, values)
        return snap


def _apply(snap: DeviceSnapshot, name: str, values: tuple) -> None:
    if name == "Battery":
        snap.battery = Battery(percent=values[1])
    elif name == "IMU":
        snap.imu = IMU(
            face_up=HubFace(values[1]),
            yaw_face=HubFace(values[2]),
            yaw=values[3],
            pitch=values[4],
            roll=values[5],
            accel=(values[6], values[7], values[8]),
            gyro=(values[9], values[10], values[11]),
        )
    elif name == "5x5":
        snap.display = Matrix5x5(pixels=tuple(values[1:]))
    elif name == "Motor":
        motor = Motor(
            port=Port(values[1]),
            motor_type=MotorType.from_uint8(values[2]),
            absolute_position=values[3],
            power=values[4],
            speed=values[5],
            position=values[6],
        )
        snap.motors[motor.port] = motor
    elif name == "Force":
        sensor = ForceSensor(port=Port(values[1]), value=values[2], pressed=bool(values[3]))
        snap.force[sensor.port] = sensor
    elif name == "Color":
        sensor = ColorSensor(
            port=Port(values[1]),
            color=Color.from_int8(values[2]),
            red=values[3],
            green=values[4],
            blue=values[5],
        )
        snap.color[sensor.port] = sensor
    elif name == "Distance":
        sensor = DistanceSensor(port=Port(values[1]), millimeters=values[2])
        snap.distance[sensor.port] = sensor
    elif name == "3x3":
        matrix = ColorMatrix(port=Port(values[1]), pixels=tuple(values[2:]))
        snap.color_matrix[matrix.port] = matrix
