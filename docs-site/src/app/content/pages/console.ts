import type { DocPage } from '../types';

export const consoleOutput: DocPage = {
  slug: 'console-output',
  title: 'Console output',
  summary:
    'Reading everything a hub program prints, either as an async iterator or through callbacks.',
  keywords: ['print', 'stdout', 'console', 'notification', 'async for', 'callback', 'logging', 'debug'],
  sections: [
    {
      id: 'why',
      title: 'Why this is how you debug',
      blocks: [
        {
          kind: 'prose',
          html: 'A hub has a 5×5 light matrix and no screen. <code>print()</code> inside a hub program does not go to a terminal — HubOS turns it into a <strong>console notification</strong> and pushes it over Bluetooth. On the host, that is your <code>stdout</code>, your logging and your debugger output all at once.',
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'hub/mission.py',
          code: `import runloop
from hub import port
import motor

print("mission starting")


async def main():
    for degrees in range(0, 360, 90):
        await motor.run_to_absolute_position(port.A, degrees, 360)
        print("at", degrees)


runloop.run(main())`,
        },
      ],
    },
    {
      id: 'iterator',
      title: 'As an async iterator',
      blocks: [
        {
          kind: 'prose',
          html: '<code>hub.console()</code> yields lines as they arrive and ends when the link closes.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `async with await connect() as hub:
    await hub.run(program, slot=0)
    async for line in hub.console():
        print("[hub]", line.rstrip())`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'This loop does not end on its own',
          html: 'It runs until the hub disconnects, not until the program stops. To follow one program and then move on, run the reader as a task and cancel it — the pattern below.',
        },
      ],
    },
    {
      id: 'one-program',
      title: 'Following one program, then stopping',
      blocks: [
        {
          kind: 'prose',
          html: 'This is what the CLI does behind <code>spikeprime upload --run</code>: print in the background, wait for the stop, allow a moment for trailing lines, then cancel the reader.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio


async def print_console(hub) -> None:
    async for line in hub.console():
        print(line, end="" if line.endswith("\\n") else "\\n")


async def run_and_watch(hub, program) -> None:
    printer = asyncio.create_task(print_console(hub))
    try:
        await hub.run(program, slot=0)
        await hub.wait_until_stopped()
        await asyncio.sleep(0.4)   # let the last notifications land
    finally:
        printer.cancel()
        try:
            await printer
        except asyncio.CancelledError:
            pass`,
        },
        {
          kind: 'prose',
          html: 'The small sleep matters. A stop notification and the final <code>print()</code> are separate messages, and the stop can arrive first.',
        },
      ],
    },
    {
      id: 'callbacks',
      title: 'As callbacks',
      blocks: [
        {
          kind: 'prose',
          html: '<code>hub.on_console()</code> registers a listener instead of a loop, which suits a program that is doing something else at the same time. Callbacks may be plain functions or coroutine functions — a returned coroutine is scheduled on the running loop.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `hub.on_console(lambda line: print("[hub]", line.rstrip()))


async def to_file(line: str) -> None:
    async with aiofiles.open("hub.log", "a") as handle:
        await handle.write(line)

hub.on_console(to_file)`,
        },
        {
          kind: 'prose',
          html: 'Several callbacks can be registered and all of them are called. They survive <code>reconnect()</code>, so a session that recovers from a dropped link keeps logging without re-registering anything.',
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Callbacks and the queue both receive every line',
          html: 'Registering a callback does not consume the line — <code>console()</code> still yields it. Use whichever fits, or both.',
        },
      ],
    },
    {
      id: 'framing',
      title: 'What a line actually is',
      blocks: [
        {
          kind: 'list',
          items: [
            'Each notification carries <strong>up to 255 bytes</strong> of UTF-8 text, null-terminated. Longer output is split across notifications.',
            'The text arrives exactly as the hub sent it, trailing newline included. That is why the examples use <code>line.rstrip()</code>.',
            'A notification is not guaranteed to be one whole line. Very long output can be split mid-line, and two quick prints can arrive as separate notifications.',
            'Nothing is buffered on the host: what the hub sends is what you get, when it sends it.',
          ],
        },
        {
          kind: 'prose',
          html: 'To be strict about line boundaries, buffer and split yourself:',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `async def whole_lines(hub):
    buffer = ""
    async for chunk in hub.console():
        buffer += chunk
        while "\\n" in buffer:
            line, buffer = buffer.split("\\n", 1)
            yield line`,
        },
      ],
    },
    {
      id: 'cli',
      title: 'From the command line',
      blocks: [
        {
          kind: 'prose',
          html: 'For watching a hub without writing anything:',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `spikeprime console                      # print until Ctrl+C
spikeprime console --notifications 200  # also enable device notifications
spikeprime upload hub/mission.py --run  # upload, start, then follow the console`,
        },
      ],
    },
    {
      id: 'gotchas',
      title: 'Common surprises',
      blocks: [
        {
          kind: 'table',
          headers: ['Symptom', 'Cause'],
          rows: [
            [
              'Nothing prints',
              'The link is up but no program is running. Console notifications only exist while a hub program is executing.',
            ],
            [
              'The last line is missing',
              'The reader was cancelled the moment the program stopped. Sleep briefly after <code>wait_until_stopped()</code>.',
            ],
            [
              'Lines arrive in bursts',
              'Normal. BLE notifications are batched by the radio; ordering is preserved, timing is not.',
            ],
            [
              'A traceback appears',
              'The hub program raised. The traceback is hub-side output, so it comes back through this same channel.',
            ],
          ],
        },
      ],
    },
  ],
};
