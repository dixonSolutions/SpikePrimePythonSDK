import type { DocPage } from '../types';

export const tunnel: DocPage = {
  slug: 'tunnel-messages',
  title: 'Tunnel messages',
  summary:
    'A raw byte channel between host and hub for data that does not fit the console, plus what high priority means.',
  keywords: ['tunnel', 'raw bytes', 'payload', 'high priority', 'custom protocol', 'telemetry'],
  sections: [
    {
      id: 'what',
      title: 'What a tunnel message is',
      blocks: [
        {
          kind: 'prose',
          html: 'A tunnel message carries an arbitrary byte payload in either direction, with no interpretation by HubOS. It exists for host and hub programs that need to exchange structured data rather than printed text — commands, telemetry, anything you want to define yourself.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.tunnel(b"\\x01speed=200")
await hub.tunnel(payload, high_priority=True)`,
        },
        {
          kind: 'prose',
          html: 'It is fire-and-forget: no acknowledgement, no response, no timeout. The call returns as soon as the frame has been written to the characteristic.',
        },
      ],
    },
    {
      id: 'versus-console',
      title: 'Tunnel vs console',
      blocks: [
        {
          kind: 'table',
          headers: ['', 'Console notification', 'Tunnel message'],
          rows: [
            ['Direction', 'Hub → host only', 'Both ways'],
            ['Payload', 'UTF-8 text, null-terminated', 'Arbitrary bytes with an explicit length'],
            ['Produced by', '<code>print()</code> in a hub program', 'An explicit send on either side'],
            ['Meaning', 'Human-readable output', 'Whatever you define'],
            ['On the host', '<code>hub.console()</code>, <code>hub.on_console()</code>', 'Queued internally; see below'],
          ],
        },
        {
          kind: 'prose',
          html: 'Use the console for anything a person will read. Use a tunnel for anything a program will parse — it avoids the parsing, escaping and line-splitting problems that come with pushing binary data through text.',
        },
      ],
    },
    {
      id: 'receiving',
      title: 'Receiving',
      blocks: [
        {
          kind: 'prose',
          html: 'Incoming tunnel messages are decoded and their payloads placed on an internal queue on the <code>Hub</code>. Unlike the console and device streams, there is no public iterator or callback hook for them yet, so reading them means going through the same layer the client uses:',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime.protocol.messages import TunnelMessage, deserialize
from spikeprime.protocol.framing import FrameAssembler

assembler = FrameAssembler()

for payload in assembler.feed(raw_bytes_from_the_link):
    message = deserialize(payload)
    if isinstance(message, TunnelMessage):
        handle(message.payload)`,
        },
        {
          kind: 'callout',
          tone: 'info',
          html: 'If you need a supported receive path on <code>Hub</code> itself, that is a reasonable feature request — <a href="https://github.com/dixonSolutions/SpikePrimePythonSDK/issues" target="_blank" rel="noopener">open an issue</a>. The send side and the wire format are both complete today.',
        },
      ],
    },
    {
      id: 'priority',
      title: 'High priority',
      blocks: [
        {
          kind: 'prose',
          html: 'HubOS framing has two lanes. A frame prefixed with <code>0x01</code> is high priority; everything else is low priority. High-priority frames may interleave with a low-priority frame that is still in flight, and the receiver keeps a separate buffer for each lane.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.tunnel(b"\\x00stop", high_priority=True)`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Normal traffic should stay low priority',
          html: 'Requests and responses are sent as low priority, which is what the hub expects for ordinary request/response traffic. Reserve the high lane for something genuinely urgent, such as an emergency stop that must not queue behind a file upload.',
        },
      ],
    },
    {
      id: 'framing',
      title: 'On the wire',
      blocks: [
        {
          kind: 'prose',
          html: 'A tunnel message is ID <code>0x32</code>, followed by a little-endian <code>uint16</code> length and that many payload bytes. Like every message it is then COBS-encoded, XORed with <code>0x03</code>, terminated with <code>0x02</code>, and — if high priority — prefixed with <code>0x01</code>.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime.protocol.framing import encode_frame
from spikeprime.protocol.messages import TunnelMessage

frame = encode_frame(TunnelMessage(b"hello").serialize(), high_priority=True)
print(frame.hex(" "))`,
        },
        {
          kind: 'prose',
          html: 'Payload length is bounded by the hub\'s <code>max_message_size</code>; longer payloads must be split by the sender. The framing itself is described in the <a href="docs/protocol-reference#framing">protocol reference</a>.',
        },
      ],
    },
  ],
};
