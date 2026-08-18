import type { DocPage } from '../types';

export const overview: DocPage = {
  slug: 'overview',
  title: 'Overview',
  summary:
    'Install it, connect to a hub, run a program — plus the one distinction that trips everyone up and a map of the rest of the docs.',
  keywords: [
    'introduction',
    'about',
    'what is',
    'getting started',
    'install',
    'spike prime',
    'hubos 3',
    'unofficial',
  ],
  sections: [
    {
      id: 'install',
      title: 'Install',
      blocks: [
        {
          kind: 'prose',
          html: 'Releases go to this project&rsquo;s own <a href="https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/" target="_blank" rel="noopener">PEP&nbsp;503 index</a>, not to PyPI. Keep the <code>--extra-index-url</code> so <code>bleak</code> and the rest still resolve from PyPI.',
        },
        {
          kind: 'code',
          lang: 'bash',
          caption: 'Python 3.10 or newer',
          code: `pip install SpikePrimePythonSDK \\
  --index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/ \\
  --extra-index-url https://pypi.org/simple`,
        },
        {
          kind: 'prose',
          html: 'The distribution is named <code>SpikePrimePythonSDK</code>; the import and the console script are both <code>spikeprime</code>. Working from a checkout, pinning a tag, or fixing Bluetooth permissions on Linux, macOS or Windows? See <a href="docs/installation">Installation</a> and <a href="docs/project-setup">Project setup</a>.',
        },
      ],
    },
    {
      id: 'first-program',
      title: 'Run something on a hub',
      blocks: [
        {
          kind: 'prose',
          html: 'Turn the hub on, make sure it is not already paired to the SPIKE app, and run this. <code>connect()</code> scans for the HubOS GATT service and returns the first hub it finds.',
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'hello.py',
          code: `import asyncio
from spikeprime import connect

PROGRAM = """\\
import runloop
from hub import light_matrix

async def main():
    await light_matrix.write("Hi")

runloop.run(main())
"""

async def main():
    async with await connect() as hub:
        print(await hub.get_name(), hub.info.firmware_version)
        hub.on_console(lambda line: print("[hub]", line.rstrip()))
        await hub.run(PROGRAM, slot=0)
        await hub.wait_until_stopped()

asyncio.run(main())`,
        },
        {
          kind: 'prose',
          html: 'Or do the same thing without writing any host code at all &mdash; the CLI ships with the package:',
        },
        {
          kind: 'terminal',
          command: 'spikeprime upload hello_hub.py --slot 0 --run',
          output: `Uploaded hello_hub.py to slot 0.
Started. Console (Ctrl+C to stop):
Hi`,
        },
        {
          kind: 'prose',
          html: 'The full walkthrough, including what to do when the scan finds nothing, is in <a href="docs/quickstart">Quick start</a>. Every command is listed under <a href="docs/cli-reference">CLI reference</a>.',
        },
      ],
    },
    {
      id: 'host-not-hub',
      title: 'Host side, not hub side',
      blocks: [
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The most common first mistake',
          html: 'This library runs on your computer, never on the hub. Do not upload a script that imports <code>spikeprime</code> &mdash; the hub has no BLE stack and no <code>bleak</code>, so it would fail immediately. The CLI refuses to do it.',
        },
        {
          kind: 'prose',
          html: 'Robot programs keep using the on-hub MicroPython modules &mdash; <code>hub</code>, <code>motor</code>, <code>color_sensor</code>, <code>runloop</code> &mdash; which only exist on the brick. <code>spikeprime</code> is the other half of the conversation: the process that sends that code over and listens to what comes back. In the snippet above, <code>PROGRAM</code> is hub code and everything around it is host code.',
        },
        {
          kind: 'prose',
          html: 'It has a page of its own, worth reading once: <a href="docs/hub-code-vs-host-code">Hub code vs host code</a>.',
        },
      ],
    },
    {
      id: 'capabilities',
      title: 'What you can call',
      blocks: [
        {
          kind: 'prose',
          html: 'Everything on <code>Hub</code> maps onto documented HubOS messages. Nothing here is guesswork or a private API.',
        },
        {
          kind: 'table',
          headers: ['Method', 'Protocol messages behind it'],
          rows: [
            ['<code>hub.run(source, slot=0)</code>', 'clear slot + start upload + transfer chunks + program flow start'],
            ['<code>hub.upload(...)</code>', '<code>StartFileUploadRequest</code> + <code>TransferChunkRequest</code>'],
            ['<code>hub.start()</code> / <code>hub.stop()</code>', '<code>ProgramFlowRequest</code>'],
            ['<code>hub.clear_slot()</code>', '<code>ClearSlotRequest</code>'],
            ['<code>hub.get_name()</code> / <code>hub.set_name()</code>', '<code>GetHubNameRequest</code> / <code>SetHubNameRequest</code>'],
            ['<code>hub.uuid()</code>', '<code>DeviceUuidRequest</code>'],
            ['<code>hub.enable_notifications(ms)</code>', '<code>DeviceNotificationRequest</code>'],
            ['<code>async for line in hub.console()</code>', '<code>ConsoleNotification</code>'],
            ['<code>async for snap in hub.device_updates()</code>', '<code>DeviceNotification</code>, parsed'],
            ['<code>hub.tunnel(payload)</code>', '<code>TunnelMessage</code>'],
            ['<code>hub.update_firmware(image)</code>', 'firmware upload + <code>BeginFirmwareUpdateRequest</code>, resumable'],
            ['<code>hub.wait_until_stopped()</code>', 'waits on <code>ProgramFlowNotification</code>'],
            ['<code>hub.reconnect()</code>', 'rebuilds a dropped link, keeping the same <code>Hub</code>'],
          ],
        },
        {
          kind: 'prose',
          html: 'Signatures, arguments and exceptions for all of them are in <a href="docs/api-client">spikeprime.client</a>.',
        },
      ],
    },
    {
      id: 'shape',
      title: 'The shape of a session',
      blocks: [
        {
          kind: 'prose',
          html: 'Everything is <code>asyncio</code>. A session is normally one <code>async with</code> block that holds a single BLE link open while you do many things over it.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio
from spikeprime import connect

async def main():
    async with await connect(name="Sherlock") as hub:
        hub.on_console(lambda line: print("[hub]", line.rstrip()))
        await hub.enable_notifications(200)

        for program in programs:
            await hub.run(program, slot=0)
            await hub.wait_until_stopped()

asyncio.run(main())`,
        },
        {
          kind: 'prose',
          html: 'Connecting costs a Bluetooth scan, so keeping one <code>Hub</code> across several runs is both faster and kinder to the link than reconnecting per program. See <a href="docs/connecting">Connecting to a hub</a>, <a href="docs/console-output">Console output</a> and <a href="docs/sensors-and-devices">Sensors and devices</a>.',
        },
      ],
    },
    {
      id: 'layers',
      title: 'The layers underneath',
      blocks: [
        {
          kind: 'prose',
          html: 'The high-level <code>Hub</code> class is one layer of four. Each layer below it is importable on its own, which is what makes the package useful for protocol work as well as for driving a robot.',
        },
        {
          kind: 'table',
          headers: ['Module', 'Responsibility'],
          rows: [
            ['<code>spikeprime.client</code>', 'Connection lifecycle, request/response matching, file transfer'],
            ['<code>spikeprime.devices</code>', 'Typed sensor and motor snapshots parsed from device notifications'],
            ['<code>spikeprime.protocol.messages</code>', 'Binary layout of every documented HubOS message'],
            ['<code>spikeprime.protocol.framing</code>', 'Frame encoding and BLE packet reassembly'],
            ['<code>spikeprime.protocol.cobs</code>', 'SPIKE-specific COBS, escaping <code>0x00</code>, <code>0x01</code> and <code>0x02</code>'],
            ['<code>spikeprime.protocol.crc</code>', 'CRC32 with the 4-byte alignment uploads require'],
          ],
        },
        {
          kind: 'prose',
          html: '<a href="docs/architecture">Architecture</a> draws how a call travels down through them, and <a href="docs/protocol-reference">Protocol reference</a> documents the bytes on the wire.',
        },
      ],
    },
    {
      id: 'requirements',
      title: 'Requirements and scope',
      blocks: [
        {
          kind: 'list',
          items: [
            '<strong>Python 3.10 or newer.</strong> The code uses <code>X | Y</code> type syntax and structural pattern-friendly enums.',
            '<strong>A working Bluetooth LE adapter</strong> on the host. Transport is handled by <a href="https://github.com/hbldh/bleak" target="_blank" rel="noopener">bleak</a>, so Linux (BlueZ), macOS (CoreBluetooth) and Windows (WinRT) are all viable.',
            '<strong>HubOS 3.</strong> That is the only firmware line this has been tested against. HubOS 2 uses a different, JSON-over-serial protocol and is not supported.',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Alpha software',
          html: 'The project is classified <em>Development Status :: 3 - Alpha</em>. The high-level <code>Hub</code> surface is stable in practice, but the protocol layer tracks a specification that the LEGO Group can revise.',
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Not a LEGO product',
          html: 'This project is not affiliated with, authorized by, or endorsed by the LEGO Group. It reimplements the protocol published at <a href="https://lego.github.io/spike-prime-docs/" target="_blank" rel="noopener">lego.github.io/spike-prime-docs</a>. LEGO, SPIKE and MINDSTORMS are trademarks of the LEGO Group.',
        },
      ],
    },
    {
      id: 'where-next',
      title: 'Where to go next',
      blocks: [
        {
          kind: 'cards',
          cards: [
            {
              title: 'Quick start',
              icon: 'pi pi-bolt',
              html: 'Connect, upload a program and read its output in about twenty lines.',
              slug: 'quickstart',
            },
            {
              title: 'Project setup',
              icon: 'pi pi-cog',
              html: 'Virtual environments, Bluetooth permissions per OS, editor and type-checker setup.',
              slug: 'project-setup',
            },
            {
              title: 'API reference',
              icon: 'pi pi-code',
              html: 'Every public class, function, dataclass and enum, with signatures.',
              slug: 'api-spikeprime',
            },
            {
              title: 'Troubleshooting',
              icon: 'pi pi-wrench',
              html: 'Scans that find nothing, links that drop mid-upload, and what the errors mean.',
              slug: 'troubleshooting',
            },
          ],
        },
      ],
    },
  ],
};
