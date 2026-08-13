"""HubOS enumerations from the protocol docs."""

from enum import IntEnum


class ProductGroup(IntEnum):
    SPIKE_PRIME = 0x0000


class Color(IntEnum):
    BLACK = 0x00
    MAGENTA = 0x01
    PURPLE = 0x02
    BLUE = 0x03
    AZURE = 0x04
    TURQUOISE = 0x05
    GREEN = 0x06
    YELLOW = 0x07
    ORANGE = 0x08
    RED = 0x09
    WHITE = 0x0A
    UNKNOWN = -1  # 0xFF as int8

    @classmethod
    def from_int8(cls, value: int) -> "Color":
        if value in (-1, 0xFF):
            return cls.UNKNOWN
        try:
            return cls(value)
        except ValueError:
            return cls.UNKNOWN


class Port(IntEnum):
    A = 0x00
    B = 0x01
    C = 0x02
    D = 0x03
    E = 0x04
    F = 0x05


class HubFace(IntEnum):
    TOP = 0x00
    FRONT = 0x01
    RIGHT = 0x02
    BOTTOM = 0x03
    BACK = 0x04
    LEFT = 0x05


class ProgramAction(IntEnum):
    START = 0x00
    STOP = 0x01


class ResponseStatus(IntEnum):
    ACK = 0x00
    NACK = 0x01


class MotorEndState(IntEnum):
    COAST = 0x00
    BRAKE = 0x01
    HOLD = 0x02
    CONTINUE = 0x03
    COAST_SMART = 0x04
    BRAKE_SMART = 0x05
    DEFAULT = -1  # 0xFF as int8


class MotorDirection(IntEnum):
    CLOCKWISE = 0x00
    COUNTER_CLOCKWISE = 0x01
    SHORTEST_PATH = 0x02
    LONGEST_PATH = 0x03


class MotorType(IntEnum):
    MEDIUM = 0x30
    LARGE = 0x31
    SMALL = 0x41
    UNKNOWN = 0x00

    @classmethod
    def from_uint8(cls, value: int) -> "MotorType":
        try:
            return cls(value)
        except ValueError:
            return cls.UNKNOWN
