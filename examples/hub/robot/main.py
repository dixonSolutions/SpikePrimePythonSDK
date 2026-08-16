"""Entry point. Everything below is ordinary multi-file Python."""

import runloop
from hub import light_matrix

from robot import VERSION
from robot.hardware import drive
from robot.hardware.eyes import blocked


async def main():
    await light_matrix.write(VERSION)
    drive.forward()
    while not blocked():
        await runloop.sleep_ms(50)
    drive.halt()
    await light_matrix.write("!")


runloop.run(main())
