import type { DocPage } from '../types';

export const programs: DocPage = {
  slug: 'running-programs',
  title: 'Running programs',
  summary:
    'Uploading MicroPython into a slot, starting and stopping it, and knowing when it has finished.',
  keywords: [
    'upload',
    'slot',
    'run',
    'start',
    'stop',
    'clear',
    'chunk',
    'crc',
    'program flow',
    'wait_until_stopped',
    'running',
  ],
  sections: [
    {
      id: 'run',
      title: 'The short version',
      blocks: [
        {
          kind: 'prose',
          html: '<code>hub.run()</code> is upload plus start. It accepts a <code>str</code> of source, a <code>Path</code> to a file, or raw <code>bytes</code>.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.run(Path("hub/mission.py"), slot=0)   # from a file
await hub.run(SOURCE_STRING, slot=1)            # from a string
await hub.run(compiled_bytes, slot=2)           # from bytes`,
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'How a str is interpreted',
          html: 'A <code>str</code> that names an existing file is read from disk; anything else is treated as source code and encoded as UTF-8. A <code>Path</code> is always read from disk, and <code>bytes</code> are always sent as-is. If a string of source could ever collide with a filename, wrap the intended one in <code>Path()</code>.',
        },
      ],
    },
    {
      id: 'slots',
      title: 'Slots',
      blocks: [
        {
          kind: 'prose',
          html: 'HubOS stores programs in <strong>20 slots, numbered 0 to 19</strong> — the same slots the SPIKE app shows. Anything outside that range raises <code>ValueError</code> before a byte leaves the host.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.run(source, slot=0)     # fine
await hub.run(source, slot=19)    # fine
await hub.run(source, slot=20)    # ValueError: slot must be 0-19, got 20`,
        },
        {
          kind: 'prose',
          html: 'Uploading to a slot replaces whatever was there. Clearing a slot on its own is also available:',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.clear_slot(3)`,
        },
        {
          kind: 'prose',
          html: 'Clearing an <em>already empty</em> slot may be answered with a NACK. That is not a real failure, so <code>clear_slot()</code> ignores it by default. Pass <code>ignore_nack=False</code> if you want the refusal to raise <code>HubNackError</code>.',
        },
      ],
    },
    {
      id: 'upload',
      title: 'Uploading without starting',
      blocks: [
        {
          kind: 'prose',
          html: 'Sometimes you want the program on the hub but not yet running — staging several slots, or letting someone press the button on the brick.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.upload(Path("hub/mission.py"), slot=0)
await hub.upload(Path("hub/calibrate.py"), slot=1, filename="calibrate.py")

# ...later
await hub.start(0)`,
        },
        {
          kind: 'prose',
          html: '<code>filename=</code> is the name the hub records for the program; it defaults to <code>program.py</code> and is capped at 31 bytes of UTF-8. <code>clear=False</code> skips the clear that normally precedes an upload.',
        },
      ],
    },
    {
      id: 'sequence',
      title: 'What an upload sends',
      blocks: [
        {
          kind: 'steps',
          steps: [
            {
              title: 'ClearSlotRequest',
              html: 'Unless <code>clear=False</code>. A NACK here is treated as success, because an empty slot answers that way.',
            },
            {
              title: 'StartFileUploadRequest',
              html: 'Carries the file name, the slot, and the CRC32 of the <em>whole</em> file.',
            },
            {
              title: 'TransferChunkRequest, repeatedly',
              html: 'The source is cut into pieces of at most <code>hub.info.max_chunk_size</code> bytes. Each request carries the running CRC32 accumulated over everything sent so far, and each is acknowledged before the next goes out.',
            },
            {
              title: 'ProgramFlowRequest(START, slot)',
              html: 'Only from <code>run()</code> or an explicit <code>start()</code>. <code>upload()</code> stops after the last chunk.',
            },
          ],
        },
        {
          kind: 'prose',
          html: 'The CRC is <code>binascii.crc32</code> with the payload zero-padded to a 4-byte boundary, and each chunk seeds the next. The byte-level detail is in the <a href="docs/protocol-reference#crc32">protocol reference</a>.',
        },
      ],
    },
    {
      id: 'start-stop',
      title: 'Starting and stopping',
      blocks: [
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.start(slot=0)
await hub.stop(slot=0)`,
        },
        {
          kind: 'prose',
          html: 'Both are acknowledged by the hub, and a NACK raises <code>HubNackError</code> — starting an empty slot is the usual cause.',
        },
        {
          kind: 'prose',
          html: '<code>hub.running</code> tracks what the hub last reported: <code>True</code> while a program runs, <code>False</code> once it has stopped, and <code>None</code> when the state is genuinely unknown — before anything has been started, or after a start that was never acknowledged.',
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Why the flag is set before the request is sent',
          html: 'A very short program can finish before its own start is acknowledged. Marking the program as running only <em>after</em> the acknowledgement would let that late write resurrect a program that had already ended, so the flag is set first and cleared again if the request fails.',
        },
      ],
    },
    {
      id: 'waiting',
      title: 'Waiting for a program to finish',
      blocks: [
        {
          kind: 'prose',
          html: 'The hub emits a program-flow notification when a program stops, whether it ran to completion, was stopped from the host, or crashed. <code>wait_until_stopped()</code> waits for it.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.run(program, slot=0)
await hub.wait_until_stopped()          # waits as long as it takes
await hub.wait_until_stopped(timeout=30)  # or raise HubTimeoutError after 30s`,
        },
        {
          kind: 'prose',
          html: 'There is no default timeout on purpose. A hub program may legitimately run for hours, and a host that gave up would tear down a link to a hub that is working perfectly well.',
        },
        {
          kind: 'prose',
          html: 'It returns immediately if the hub has already reported a stop, so there is no race between starting a fast program and beginning to wait for it. The internal callback is removed when the wait ends, which keeps a long session that runs hundreds of programs from accumulating listeners.',
        },
        {
          kind: 'prose',
          html: 'For something that reacts to every transition instead of one, register a callback. It receives <code>True</code> when the program stopped and <code>False</code> when it started.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `def on_program(stopped: bool) -> None:
    print("program stopped" if stopped else "program started")

hub.on_program(on_program)`,
        },
      ],
    },
    {
      id: 'many-runs',
      title: 'Many programs over one link',
      blocks: [
        {
          kind: 'prose',
          html: 'This is the shape most sessions want: connect once, iterate, and let the link stay up between runs.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio
from pathlib import Path

from spikeprime import connect

PROGRAMS = sorted(Path("hub").glob("*.py"))


async def main() -> None:
    async with await connect(name="Sherlock") as hub:
        hub.on_console(lambda line: print("[hub]", line.rstrip()))

        for program in PROGRAMS:
            print("running", program.name)
            await hub.run(program, slot=0, filename=program.name)
            await hub.wait_until_stopped()
            # Console notifications can trail the stop by a few milliseconds.
            await asyncio.sleep(0.4)


asyncio.run(main())`,
        },
      ],
    },
    {
      id: 'progress',
      title: 'Large programs',
      blocks: [
        {
          kind: 'prose',
          html: 'Program uploads are chunked but do not report progress — the chunk size is typically around a kilobyte, so even a large program is a handful of round trips. Firmware images are the case where progress matters, and <code>update_firmware()</code> takes a <code>progress=</code> callback for exactly that. See <a href="docs/firmware-updates">Firmware updates</a>.',
        },
        {
          kind: 'prose',
          html: 'If an upload fails partway through, the slot holds a partial file. Re-uploading is the fix — the default <code>clear=True</code> wipes the slot first.',
        },
      ],
    },
  ],
};
