"""Motor helpers. Uses the on-hub `motor` module."""

import motor
from hub import port

LEFT = port.A
RIGHT = port.B


def forward(speed=500):
    motor.run(LEFT, speed)
    motor.run(RIGHT, -speed)


def halt():
    motor.stop(LEFT)
    motor.stop(RIGHT)
