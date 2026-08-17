import type { DocPage } from '../types';

export const hubVsHost: DocPage = {
  slug: 'hub-code-vs-host-code',
  title: 'Hub code vs host code',
  summary:
    'Two Pythons are involved and only one of them is this SDK. Getting them straight prevents most first-day confusion.',
  keywords: ['micropython', 'runloop', 'light_matrix', 'motor', 'on-hub', 'pc script', 'mistake'],
  sections: [
    {
      id: 'two-pythons',
      title: 'Two Pythons, one cable-free link',
      blocks: [
        {
          kind: 'prose',
          html: 'A SPIKE Prime session always involves two separate Python processes on two separate machines. They share almost nothing: different interpreters, different standard libraries, different available modules.',
        },
        {
          kind: 'table',
          headers: ['', 'Host code', 'Hub code'],
          rows: [
            ['Runs on', 'Your computer', 'The SPIKE Prime brick'],
            ['Interpreter', 'CPython 3.10+', 'MicroPython, HubOS 3'],
            ['Imports', '<code>spikeprime</code>, <code>asyncio</code>, <code>bleak</code>', '<code>runloop</code>, <code>hub</code>, <code>motor</code>, <code>color_sensor</code>'],
            ['Started by', 'You, with <code>python</code>', 'The hub, when a slot is started'],
            ['Talks to', 'The hub over BLE', 'Motors and sensors, directly'],
            ['Output goes', 'Your terminal', 'Back over BLE as console notifications'],
          ],
        },
        {
          kind: 'prose',
          html: '<strong>This SDK is entirely the left-hand column.</strong> It never runs on the hub, and it cannot be imported there.',
        },
      ],
    },
    {
      id: 'the-mistake',
      title: 'The mistake this page exists to prevent',
      blocks: [
        {
          kind: 'prose',
          html: 'The classic error is uploading the host script to the hub. It looks reasonable — it is a Python file about a SPIKE Prime hub — but the brick has no <code>bleak</code>, no BLE client stack, and no <code>spikeprime</code> package, so it fails at the first import.',
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'Never upload this — it is host code',
          code: `import asyncio
from spikeprime import connect     # <- the hub has no such module

async def main():
    async with await connect() as hub:
        await hub.run("...")

asyncio.run(main())`,
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'This is what belongs in a slot',
          code: `import runloop
from hub import light_matrix      # <- exists only on the hub


async def main():
    await light_matrix.write("Hi")


runloop.run(main())`,
        },
      ],
    },
    {
      id: 'guard',
      title: 'The CLI guards against it',
      blocks: [
        {
          kind: 'prose',
          html: '<code>spikeprime upload</code> scans the file before sending anything, and refuses it if it finds a marker that only makes sense on the host: <code>from spikeprime</code>, <code>import spikeprime</code>, <code>from bleak</code> or <code>import bleak</code>.',
        },
        {
          kind: 'terminal',
          command: 'spikeprime upload host/hello.py --slot 0',
          output: `error: host/hello.py looks like a PC script, not hub MicroPython.
Upload a file that uses hub modules, e.g. examples/hub/hello.py`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The library does not check',
          html: '<code>Hub.upload()</code> sends whatever bytes it is given. The guard is a convenience in the command-line tool, not a protocol-level protection — a programmatic caller is trusted to know what it is uploading.',
        },
      ],
    },
    {
      id: 'crossing',
      title: 'How the two sides actually talk',
      blocks: [
        {
          kind: 'prose',
          html: 'There is no shared memory and no function call across the gap. Four things cross it, all of them messages:',
        },
        {
          kind: 'table',
          headers: ['Direction', 'What crosses', 'On the host'],
          rows: [
            ['Host → hub', 'The program source, in chunks', '<code>hub.upload()</code> / <code>hub.run()</code>'],
            ['Host → hub', 'Start and stop commands', '<code>hub.start()</code>, <code>hub.stop()</code>'],
            ['Hub → host', 'Everything the program <code>print()</code>s', '<code>hub.console()</code>, <code>hub.on_console()</code>'],
            ['Hub → host', 'Motor and sensor state, on an interval', '<code>hub.device_updates()</code>'],
            ['Both ways', 'Arbitrary bytes you define', '<code>hub.tunnel()</code>'],
          ],
        },
        {
          kind: 'prose',
          html: 'If you want a hub program to send structured data back rather than printed text, <a href="docs/tunnel-messages">tunnel messages</a> are the intended channel.',
        },
      ],
    },
    {
      id: 'hub-modules',
      title: 'What the hub side has available',
      blocks: [
        {
          kind: 'prose',
          html: 'The on-hub API is the LEGO Group\'s, not this project\'s, and it is documented in the SPIKE app and the official reference. As a rough map:',
        },
        {
          kind: 'list',
          items: [
            '<code>runloop</code> — the hub\'s async scheduler; <code>runloop.run(main())</code> is the usual entry point.',
            '<code>hub</code> — <code>light_matrix</code>, <code>button</code>, <code>motion_sensor</code>, <code>sound</code>, <code>port</code>.',
            '<code>motor</code> and <code>motor_pair</code> — driving motors on a port.',
            '<code>color_sensor</code>, <code>distance_sensor</code>, <code>force_sensor</code> — reading sensors on a port.',
            '<code>print()</code> — goes nowhere visible on the hub, but arrives on the host as a console notification.',
          ],
        },
        {
          kind: 'callout',
          tone: 'info',
          html: 'A type checker pointed at your hub programs will flag every one of these as unresolved, because they are not installed anywhere on your computer. Exclude the hub directory — see <a href="docs/project-setup#typing">Types and editors</a>.',
        },
      ],
    },
    {
      id: 'this-repo',
      title: 'How the repository itself is arranged',
      blocks: [
        {
          kind: 'prose',
          html: 'The examples in the repository follow the same split, and the directory name is the signal:',
        },
        {
          kind: 'code',
          lang: 'text',
          code: `examples/
  hello.py             host: uploads examples/hub/hello.py and prints its output
  sensors.py           host: subscribes to device notifications
  upload_and_run.py    host: uploads a file named on the command line
  hub/
    hello.py           hub: import runloop, from hub import light_matrix`,
        },
      ],
    },
  ],
};
