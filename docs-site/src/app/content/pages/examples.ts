import type { DocPage } from '../types';

export const examples: DocPage = {
  slug: 'examples',
  title: 'Examples',
  summary:
    'Complete, runnable programs — the ones in the repository plus a few patterns worth copying.',
  keywords: ['example', 'sample', 'recipe', 'snippet', 'cookbook', 'hello world'],
  sections: [
    {
      id: 'repository',
      title: 'In the repository',
      blocks: [
        {
          kind: 'prose',
          html: 'The <code>examples/</code> directory is arranged so the two sides cannot be confused: files directly inside it are host scripts, and <code>examples/hub/</code> holds MicroPython for the brick.',
        },
        {
          kind: 'table',
          headers: ['File', 'What it does'],
          rows: [
            ['<code>examples/hello.py</code>', 'Uploads <code>examples/hub/hello.py</code> and prints its console output'],
            ['<code>examples/sensors.py</code>', 'Subscribes to device notifications and prints each update'],
            ['<code>examples/upload_and_run.py</code>', 'Uploads a file named on the command line and runs it'],
            ['<code>examples/hub/hello.py</code>', 'Hub program: writes “Hi” on the light matrix'],
          ],
        },
      ],
    },
    {
      id: 'hello',
      title: 'Hello, hub',
      blocks: [
        {
          kind: 'code',
          lang: 'python',
          caption: 'examples/hello.py — host',
          code: `"""Upload examples/hub/hello.py to a hub and print its console output."""

import asyncio
from pathlib import Path

from spikeprime import connect

HUB_PROGRAM = Path(__file__).parent / "hub" / "hello.py"


async def main() -> None:
    async with await connect() as hub:
        print(f"Connected to {await hub.get_name()} ({hub.info.firmware_version})")
        hub.on_console(lambda line: print(f"[hub] {line.rstrip()}"))
        await hub.run(HUB_PROGRAM, slot=0)
        await hub.wait_until_stopped()


if __name__ == "__main__":
    asyncio.run(main())`,
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'examples/hub/hello.py — hub',
          code: `import runloop
from hub import light_matrix

print("hello from Sherlock 2")


async def main():
    await light_matrix.write("Hi")
    print("wrote Hi on the matrix")


runloop.run(main())`,
        },
      ],
    },
    {
      id: 'upload-and-run',
      title: 'Upload a file named on the command line',
      blocks: [
        {
          kind: 'code',
          lang: 'python',
          caption: 'examples/upload_and_run.py',
          code: `"""Upload a file from disk and start it."""

import argparse
import asyncio
from pathlib import Path

from spikeprime import connect


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    parser.add_argument("--slot", type=int, default=0)
    args = parser.parse_args()

    async with await connect() as hub:
        await hub.run(args.file, slot=args.slot)
        print(f"Running {args.file.name} in slot {args.slot}")
        await hub.wait_disconnected()


if __name__ == "__main__":
    asyncio.run(main())`,
        },
        {
          kind: 'prose',
          html: 'Note <code>wait_disconnected()</code> rather than <code>wait_until_stopped()</code>: this one deliberately stays attached until the hub goes away, so the console keeps flowing even across several runs started from the brick.',
        },
      ],
    },
    {
      id: 'inventory',
      title: 'Recipe: what is plugged in?',
      blocks: [
        {
          kind: 'prose',
          html: 'One snapshot is enough to inventory a robot. Enable notifications, take the first update, print it, and leave.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio

from spikeprime import connect


async def main() -> None:
    async with await connect() as hub:
        await hub.enable_notifications(200)
        snapshot = await anext(hub.device_updates())

        print(f"battery: {snapshot.battery.percent}%" if snapshot.battery else "battery: unknown")
        for port, motor in sorted(snapshot.motors.items()):
            print(f"port {port.name}: {motor.motor_type.name} motor at {motor.position}")
        for port, sensor in sorted(snapshot.color.items()):
            print(f"port {port.name}: colour sensor, sees {sensor.color.name}")
        for port, sensor in sorted(snapshot.distance.items()):
            print(f"port {port.name}: distance sensor")
        for port, sensor in sorted(snapshot.force.items()):
            print(f"port {port.name}: force sensor")


asyncio.run(main())`,
        },
      ],
    },
    {
      id: 'watch',
      title: 'Recipe: rerun on save',
      blocks: [
        {
          kind: 'prose',
          html: 'A tight edit loop: hold one link, watch the file, and re-run it whenever it changes. This is where holding the connection open really pays off — reconnecting per save would add a full scan to every iteration.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio
from pathlib import Path

from spikeprime import connect

PROGRAM = Path("hub/mission.py")


async def main() -> None:
    async with await connect(name="Sherlock") as hub:
        hub.on_console(lambda line: print("[hub]", line.rstrip()))
        stamp = 0.0

        while True:
            current = PROGRAM.stat().st_mtime
            if current != stamp:
                stamp = current
                print("--- running", PROGRAM.name)
                await hub.run(PROGRAM, slot=0, filename=PROGRAM.name)
                await hub.wait_until_stopped()
                await asyncio.sleep(0.4)
            await asyncio.sleep(0.5)


asyncio.run(main())`,
        },
      ],
    },
    {
      id: 'csv',
      title: 'Recipe: log sensors to CSV',
      blocks: [
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio
import csv
import time

from spikeprime import Port, connect


async def main() -> None:
    with open("run.csv", "w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["t", "yaw", "motor_a_pos", "distance_c_mm"])

        async with await connect() as hub:
            await hub.enable_notifications(100)
            start = time.monotonic()

            async for snapshot in hub.device_updates():
                motor = snapshot.motors.get(Port.A)
                distance = snapshot.distance.get(Port.C)
                writer.writerow([
                    round(time.monotonic() - start, 3),
                    snapshot.imu.yaw if snapshot.imu else "",
                    motor.position if motor else "",
                    distance.millimeters if distance and distance.detected else "",
                ])


asyncio.run(main())`,
        },
      ],
    },
    {
      id: 'protocol',
      title: 'Recipe: decode a frame by hand',
      blocks: [
        {
          kind: 'prose',
          html: 'The protocol layer works standalone, with no hub and no Bluetooth — useful for tests, for a packet capture, or simply for understanding the wire format.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime.protocol.framing import FrameAssembler, encode_frame
from spikeprime.protocol.messages import InfoRequest, deserialize

frame = encode_frame(InfoRequest().serialize())
print(frame.hex(" "))

assembler = FrameAssembler()
for payload in assembler.feed(frame):
    print(deserialize(payload))       # InfoRequest()`,
        },
        {
          kind: 'prose',
          html: '<code>FrameAssembler.feed()</code> accepts any slice of the stream, so you can hand it BLE notifications exactly as they arrive — split, joined, or interleaved between the two priority lanes.',
        },
      ],
    },
  ],
};
