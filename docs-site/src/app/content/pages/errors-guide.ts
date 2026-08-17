import type { DocPage } from '../types';

export const errorsGuide: DocPage = {
  slug: 'errors-and-timeouts',
  title: 'Errors and timeouts',
  summary:
    'The exception hierarchy, what each error actually means, and how to write a session that survives a bad link.',
  keywords: ['exception', 'error', 'timeout', 'nack', 'retry', 'HubError', 'handling', 'resilience'],
  sections: [
    {
      id: 'hierarchy',
      title: 'The hierarchy',
      blocks: [
        {
          kind: 'prose',
          html: 'Every error this SDK raises deliberately derives from <code>HubError</code>, so one <code>except</code> catches anything hub-related without swallowing genuine bugs.',
        },
        {
          kind: 'code',
          lang: 'text',
          code: `Exception
└── HubError
    ├── HubNotFoundError    no hub matched the scan
    ├── HubProtocolError    undecodable bytes, or the wrong response type
    ├── HubNackError        the hub refused the operation
    └── HubTimeoutError     no matching response in time`,
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime import HubError, connect

try:
    async with await connect(name="Sherlock") as hub:
        await hub.run(program, slot=0)
except HubError as exc:
    print("hub problem:", exc)`,
        },
        {
          kind: 'callout',
          tone: 'info',
          html: '<code>ValueError</code> is <em>not</em> in this tree, and that is intentional. A slot outside 0–19 or an empty firmware image is a mistake in your code, not a hub condition, and it is raised before anything is sent.',
        },
      ],
    },
    {
      id: 'not-found',
      title: 'HubNotFoundError',
      blocks: [
        {
          kind: 'prose',
          html: 'Nothing matching was advertising within the timeout, and — on Linux — no already-connected device matched either. The message names what was being looked for.',
        },
        {
          kind: 'terminal',
          command: 'python host/run.py',
          output: `spikeprime.errors.HubNotFoundError: no hub named 'Sherlock' found. Turn the hub on and make sure it is advertising.`,
        },
        {
          kind: 'prose',
          html: 'Usual causes: the hub is off or asleep; something else is connected to it, so it has stopped advertising; the name does not match; the scan window was too short in a busy radio environment. A longer <code>timeout=</code> is the first thing to try.',
        },
      ],
    },
    {
      id: 'nack',
      title: 'HubNackError',
      blocks: [
        {
          kind: 'prose',
          html: 'The hub understood the request and declined it — response status <code>0x01</code>. The exception carries the operation on <code>.operation</code>, which is more useful than string-matching the message.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime import HubNackError

try:
    await hub.start(5)
except HubNackError as exc:
    print("hub refused:", exc.operation)   # "start slot 5"`,
        },
        {
          kind: 'prose',
          html: 'Common causes are starting an empty slot, or a transfer chunk whose running CRC does not match what the hub computed. One NACK is expected and is <em>not</em> raised by default: clearing an already-empty slot. Pass <code>ignore_nack=False</code> to <code>clear_slot()</code> if you want to see it.',
        },
      ],
    },
    {
      id: 'timeout',
      title: 'HubTimeoutError',
      blocks: [
        {
          kind: 'prose',
          html: 'A request was sent and its matching response never arrived. Requests default to a 10-second timeout; <code>wait_until_stopped()</code> has none unless you pass one.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime import HubTimeoutError

try:
    await hub.wait_until_stopped(timeout=30)
except HubTimeoutError:
    print("still running after 30s; stopping it")
    await hub.stop(0)`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'A timeout is rarely about speed',
          html: 'Hubs answer in milliseconds. Ten seconds of silence almost always means the link is gone, not that the hub is slow — so the useful response is <code>reconnect()</code>, not a retry on the same link.',
        },
      ],
    },
    {
      id: 'protocol',
      title: 'HubProtocolError',
      blocks: [
        {
          kind: 'prose',
          html: 'Raised when bytes cannot be decoded, when a reply is not the type the request expected, or when the hub reports something inconsistent. It also covers a few state errors:',
        },
        {
          kind: 'list',
          items: [
            '<code>hub has not completed handshake</code> — <code>hub.info</code> was read before the handshake finished.',
            '<code>disconnected</code> — the link dropped while a request was outstanding, so its future was failed rather than left hanging.',
            '<code>unknown message id 0x…</code> — a message this build does not implement. Unknown <em>notifications</em> are logged and skipped rather than raised, so a firmware that adds messages does not break a session.',
            'A firmware resume offset that is not a multiple of the chunk size — see <a href="docs/firmware-updates#resume">Resuming</a>.',
          ],
        },
      ],
    },
    {
      id: 'resilient',
      title: 'A session that survives a bad link',
      blocks: [
        {
          kind: 'prose',
          html: 'The pattern that matters in practice: catch the loss, reconnect on the same <code>Hub</code>, and try once more. Callbacks and queues survive, so nothing has to be re-registered.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio

from spikeprime import HubNotFoundError, HubProtocolError, HubTimeoutError, connect

TRANSIENT = (HubTimeoutError, HubProtocolError)


async def run_with_retry(hub, program, *, attempts: int = 3) -> None:
    for attempt in range(1, attempts + 1):
        try:
            await hub.run(program, slot=0)
            await hub.wait_until_stopped()
            return
        except TRANSIENT as exc:
            if attempt == attempts:
                raise
            print(f"attempt {attempt} failed ({exc}); reconnecting")
            try:
                await hub.reconnect()
            except HubNotFoundError:
                # The hub may still be rebooting; back off and let the loop retry.
                await asyncio.sleep(2 * attempt)`,
        },
        {
          kind: 'prose',
          html: 'Two things worth noting. <code>reconnect()</code> is a no-op when the link is already up, so calling it speculatively is safe. And the backoff grows, because a hub that has just been power-cycled needs several seconds before it advertises again.',
        },
      ],
    },
    {
      id: 'noticing',
      title: 'Noticing a drop before the next write',
      blocks: [
        {
          kind: 'prose',
          html: 'Rather than discovering a lost link when a request times out, wait on the disconnect directly. This is also the cleanest way to structure a long-running supervisor.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `async def supervise(hub) -> None:
    while True:
        await hub.wait_disconnected()
        print("link lost")
        while True:
            try:
                await hub.reconnect()
                print("link restored")
                break
            except HubNotFoundError:
                await asyncio.sleep(2)`,
        },
      ],
    },
    {
      id: 'cli',
      title: 'How the CLI reports them',
      blocks: [
        {
          kind: 'prose',
          html: 'The command-line tool maps the same conditions onto exit codes, so scripts can branch without parsing text.',
        },
        {
          kind: 'table',
          headers: ['Exit code', 'Meaning'],
          rows: [
            ['<code>0</code>', 'Success'],
            ['<code>1</code>', 'A <code>HubError</code>, printed as <code>error: …</code> on stderr. Also an empty <code>scan</code>.'],
            ['<code>2</code>', 'Refused before contacting the hub: a host script offered to <code>upload</code>, or <code>firmware</code> without <code>--yes</code>'],
            ['<code>130</code>', 'Interrupted with Ctrl+C'],
          ],
        },
      ],
    },
  ],
};
