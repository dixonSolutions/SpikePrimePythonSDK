import type { DocPage } from '../types';

export const overview: DocPage = {
  slug: 'overview',
  title: 'Overview',
  summary:
    'What SpikePrimePythonSDK is, what it talks to, and how the pieces fit together before you install anything.',
  keywords: ['introduction', 'about', 'what is', 'spike prime', 'hubos 3', 'unofficial'],
  sections: [
    {
      id: 'what-it-is',
      title: 'What it is',
      blocks: [
        {
          kind: 'prose',
          html: '<strong>SpikePrimePythonSDK</strong> is an unofficial, host-side Python SDK for the LEGO® Education SPIKE™ Prime hub running <strong>HubOS 3</strong>. It speaks the Bluetooth Low Energy protocol that the LEGO Group publishes at <a href="https://lego.github.io/spike-prime-docs/" target="_blank" rel="noopener">lego.github.io/spike-prime-docs</a>, so a program on your computer can find a hub, push MicroPython into a slot, start it, read everything it prints, and watch its motors and sensors as it runs.',
        },
        {
          kind: 'prose',
          html: 'The distribution is named <code>SpikePrimePythonSDK</code>, but the import and the command-line tool are both <code>spikeprime</code>:',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio
from spikeprime import connect

async def main():
    async with await connect() as hub:
        print(await hub.get_name())

asyncio.run(main())`,
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Not a LEGO product',
          html: 'This project is not affiliated with, authorized by, or endorsed by the LEGO Group. It reimplements a publicly documented protocol. LEGO, SPIKE and MINDSTORMS are trademarks of the LEGO Group.',
        },
      ],
    },
    {
      id: 'host-not-hub',
      title: 'Host side, not hub side',
      blocks: [
        {
          kind: 'prose',
          html: 'The single most important thing to understand before writing any code: <strong>this library runs on your computer, not on the hub.</strong> Robot programs still use the on-hub MicroPython modules — <code>hub</code>, <code>motor</code>, <code>color_sensor</code>, <code>runloop</code> — and those modules only exist on the brick. <code>spikeprime</code> is the other half of the conversation: the process that sends that code over and listens to what comes back.',
        },
        {
          kind: 'prose',
          html: 'Uploading a script that itself imports <code>spikeprime</code> will produce a hub program that immediately fails, because the hub has no BLE stack, no <code>bleak</code>, and no <code>spikeprime</code>. The CLI actively refuses to do it. There is a whole page on the distinction: <a href="docs/hub-code-vs-host-code">Hub code vs host code</a>.',
        },
      ],
    },
    {
      id: 'capabilities',
      title: 'What it can do',
      blocks: [
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
          html: 'Connecting costs a Bluetooth scan, so keeping one <code>Hub</code> across several runs is both faster and kinder to the link than reconnecting per program. See <a href="docs/connecting">Connecting to a hub</a>.',
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
              title: 'Installation',
              icon: 'pi pi-download',
              html: 'Install from the project index, from git, or from a checkout for development.',
              slug: 'installation',
            },
            {
              title: 'Project setup',
              icon: 'pi pi-cog',
              html: 'Virtual environments, Bluetooth permissions per OS, editor and type-checker setup.',
              slug: 'project-setup',
            },
            {
              title: 'Quick start',
              icon: 'pi pi-bolt',
              html: 'Connect, upload a program and read its output in about twenty lines.',
              slug: 'quickstart',
            },
            {
              title: 'API reference',
              icon: 'pi pi-code',
              html: 'Every public class, function, dataclass and enum, with signatures.',
              slug: 'api-spikeprime',
            },
          ],
        },
      ],
    },
  ],
};
