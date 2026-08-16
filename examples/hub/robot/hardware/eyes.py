"""Distance sensing, kept apart from the motor code."""

import distance_sensor
from hub import port

EYE = port.C
TOO_CLOSE_MM = 150


def blocked():
    reading = distance_sensor.distance(EYE)
    return 0 <= reading <= TOO_CLOSE_MM
