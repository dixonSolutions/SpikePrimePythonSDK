import type { DocPage } from '../types';

export const quickstart: DocPage = {
  slug: 'quickstart',
  title: 'Quick start',
  summary:
    'Find a hub, upload a program, run it and read what it prints — the whole loop, in about twenty lines.',
  keywords: ['hello world', 'first program', 'connect', 'run', 'example', 'getting started'],
  sections: [
    {
      id: 'scan',
      title: 'Step 1 — find the hub',
      blocks: [
        {
          kind: 'prose',
          html: 'Before writing anything, prove the host can see the hub. Switch the hub on, make sure nothing else is connected to it, and run:',
        },
        {
          kind: 'terminal',
          command: 'spikeprime scan',
          output: `E4:B3:23:AA:11:02\tSherlock 2\t-54 dBm`,
        },
        {
          kind: 'prose',
          html: 'Three columns: the BLE address, the advertised name, and signal strength. Note the name — it is the friendliest way to pick a specific hub later.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          html: 'Empty output means the hub is off, out of range, or already connected to something else — most often the LEGO SPIKE app. A connected peripheral stops advertising entirely. See <a href="docs/troubleshooting">Troubleshooting</a>.',
        },
      ],
    },
    {
      id: 'hub-program',
      title: 'Step 2 — write the hub program',
      blocks: [
        {
          kind: 'prose',
          html: 'This is MicroPython for the brick. It imports <code>runloop</code> and <code>hub</code>, which exist only on the hub, and it never mentions <code>spikeprime</code>.',
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'hub/hello.py',
          code: `import runloop
from hub import light_matrix

print("hello from the hub")


async def main():
    await light_matrix.write("Hi")
    print("wrote Hi on the matrix")


runloop.run(main())`,
        },
        {
          kind: 'prose',
          html: 'Both <code>print()</code> calls will come back over Bluetooth as console notifications, which is how you get output from a program running on a brick with no screen.',
        },
      ],
    },
    {
      id: 'host-script',
      title: 'Step 3 — write the host script',
      blocks: [
        {
          kind: 'prose',
          html: 'This one runs on your computer. <code>connect()</code> scans for the HubOS service and takes the first hub it finds; <code>hub.run()</code> uploads and starts the program; <code>wait_until_stopped()</code> blocks until the hub reports that it finished.',
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'host/hello.py',
          code: `import asyncio
from pathlib import Path

from spikeprime import connect

PROGRAM = Path(__file__).parent.parent / "hub" / "hello.py"


async def main() -> None:
    async with await connect() as hub:
        print(f"connected to {await hub.get_name()} ({hub.info.firmware_version})")

        hub.on_console(lambda line: print(f"[hub] {line.rstrip()}"))

        await hub.run(PROGRAM, slot=0)
        await hub.wait_until_stopped()


if __name__ == "__main__":
    asyncio.run(main())`,
        },
        {
          kind: 'terminal',
          command: 'python host/hello.py',
          output: `connected to Sherlock 2 (3.4.3)
[hub] hello from the hub
[hub] wrote Hi on the matrix`,
        },
      ],
    },
    {
      id: 'line-by-line',
      title: 'What each line did',
      blocks: [
        {
          kind: 'steps',
          steps: [
            {
              title: 'await connect()',
              html: 'Scans for a device advertising the HubOS GATT service, opens the link, subscribes to notifications, and completes the handshake by asking the hub for its packet, message and chunk size limits. Those limits govern every later write.',
            },
            {
              title: 'async with …',
              html: '<code>Hub</code> is an async context manager. Leaving the block stops notifications and disconnects cleanly, even if the body raised.',
            },
            {
              title: 'hub.on_console(…)',
              html: 'Registers a callback for every line the hub prints. Callbacks may be plain functions or coroutines. There is also an async-iterator form — see <a href="docs/console-output">Console output</a>.',
            },
            {
              title: 'await hub.run(PROGRAM, slot=0)',
              html: 'Clears slot 0, starts a file upload with the CRC32 of the whole file, sends the source in chunks each carrying a running CRC, then issues a program-flow start. A <code>Path</code> is read from disk; a <code>str</code> is treated as source code unless it names an existing file.',
            },
            {
              title: 'await hub.wait_until_stopped()',
              html: 'Waits for the hub to report that the program ended. By default there is no timeout, because a hub program may legitimately run for hours.',
            },
          ],
        },
      ],
    },
    {
      id: 'inline',
      title: 'Without a separate file',
      blocks: [
        {
          kind: 'prose',
          html: 'For something short, pass the source as a string. Anything that is not a path to an existing file is treated as code.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio
from spikeprime import connect

PROGRAM = """\\
import runloop
from hub import light_matrix

async def main():
    await light_matrix.write("Hi")

runloop.run(main())
"""


async def main() -> None:
    async with await connect() as hub:
        await hub.run(PROGRAM, slot=0)
        await hub.wait_until_stopped()


asyncio.run(main())`,
        },
      ],
    },
    {
      id: 'cli-equivalent',
      title: 'The same thing from the CLI',
      blocks: [
        {
          kind: 'prose',
          html: 'No host script needed for a one-off. <code>--run</code> starts the program after uploading and streams the console until it stops.',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `spikeprime upload hub/hello.py --slot 0 --run`,
        },
        {
          kind: 'prose',
          html: 'Full command list in the <a href="docs/cli-reference">CLI reference</a>.',
        },
      ],
    },
    {
      id: 'next',
      title: 'Next steps',
      blocks: [
        {
          kind: 'cards',
          cards: [
            {
              title: 'Connecting to a hub',
              icon: 'pi pi-wifi',
              html: 'Pick a specific hub, hold one link across many runs, and recover from a drop.',
              slug: 'connecting',
            },
            {
              title: 'Running programs',
              icon: 'pi pi-play',
              html: 'Slots, uploads, stopping, and what happens when a program ends on its own.',
              slug: 'running-programs',
            },
            {
              title: 'Sensors and devices',
              icon: 'pi pi-sliders-h',
              html: 'Turn on device notifications and read typed motor and sensor snapshots.',
              slug: 'sensors-and-devices',
            },
            {
              title: 'Hub code vs host code',
              icon: 'pi pi-exclamation-triangle',
              html: 'The distinction behind most first-day confusion, spelled out.',
              slug: 'hub-code-vs-host-code',
            },
          ],
        },
      ],
    },
  ],
};
