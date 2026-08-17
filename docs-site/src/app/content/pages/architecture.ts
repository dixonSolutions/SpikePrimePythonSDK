import type { DocPage } from '../types';

export const architecture: DocPage = {
  slug: 'architecture',
  title: 'Architecture',
  summary: 'How a call travels from your code down to the radio, and which module owns which concern.',
  keywords: ['layers', 'design', 'internals', 'structure', 'modules', 'request response', 'queue', 'callback'],
  sections: [
    {
      id: 'layers',
      title: 'The layers',
      blocks: [
        {
          kind: 'code',
          lang: 'text',
          code: `Your Python script
        │
        ▼
   spikeprime.Hub          high-level: scan, connect, upload, start/stop
        │
        ▼
   protocol.messages       typed request/response/notification structs
        │
        ▼
   protocol.framing        COBS + XOR + 0x02 delimiters, packet reassembly
        │
        ▼
   bleak (GATT)            write RX, notify TX
        │
        ▼
   HubOS 3`,
        },
        {
          kind: 'table',
          headers: ['Module', 'Responsibility'],
          rows: [
            ['<code>spikeprime.client</code>', 'Connection lifecycle, request/response matching, file transfer'],
            ['<code>spikeprime.devices</code>', 'Parsed sensor and motor snapshots from <code>DeviceNotification</code>'],
            ['<code>spikeprime.protocol.messages</code>', 'Binary layout of every HubOS message'],
            ['<code>spikeprime.protocol.framing</code>', 'Encode and decode frames, reassemble BLE packets'],
            ['<code>spikeprime.protocol.cobs</code>', 'SPIKE-specific COBS, escaping <code>0x00</code>, <code>0x01</code>, <code>0x02</code>'],
            ['<code>spikeprime.protocol.crc</code>', 'CRC32 with the 4-byte alignment uploads require'],
            ['<code>spikeprime.enums</code>', 'Protocol enumerations'],
            ['<code>spikeprime.errors</code>', 'The exception hierarchy'],
            ['<code>spikeprime.cli</code>', 'The command-line front end'],
          ],
        },
        {
          kind: 'prose',
          html: 'Each layer depends only on the ones below it. That is what lets the protocol layer be imported and tested with no hub, no adapter and no event loop.',
        },
      ],
    },
    {
      id: 'outbound',
      title: 'A request, on its way out',
      blocks: [
        {
          kind: 'steps',
          steps: [
            {
              title: 'A method builds a message',
              html: 'e.g. <code>hub.start(0)</code> constructs <code>ProgramFlowRequest(START, 0)</code>.',
            },
            {
              title: 'The request lock is taken',
              html: 'One request is outstanding at a time. Responses carry no correlation id, so the only way to match a reply to its request is to have exactly one in flight.',
            },
            {
              title: 'A future is registered for the expected response id',
              html: 'The dispatcher completes it when a message with that id arrives.',
            },
            {
              title: 'The message is serialized and framed',
              html: 'COBS-encoded, XORed with <code>0x03</code>, terminated with <code>0x02</code>.',
            },
            {
              title: 'The frame is split and written',
              html: 'into packets of at most <code>info.max_packet_size</code> bytes, written to RX without response.',
            },
            {
              title: 'The future is awaited',
              html: 'with a timeout. Elapsing raises <code>HubTimeoutError</code>; a reply of an unexpected type raises <code>HubProtocolError</code>; a NACK raises <code>HubNackError</code> unless the caller asked to ignore it.',
            },
          ],
        },
      ],
    },
    {
      id: 'inbound',
      title: 'Bytes, on their way in',
      blocks: [
        {
          kind: 'steps',
          steps: [
            {
              title: 'bleak calls back with a notification',
              html: 'possibly on another thread, so the payload is handed to the event loop with <code>call_soon_threadsafe</code>. Everything after this point runs on the loop.',
            },
            {
              title: 'FrameAssembler.feed()',
              html: 'accumulates bytes and returns whichever payloads they completed — zero, one or several.',
            },
            {
              title: 'deserialize()',
              html: 'turns each payload into a message. An unknown id is logged and dropped rather than raised.',
            },
            {
              title: 'The dispatcher decides where it goes',
              html: 'If a request is pending and the id matches, its future is completed. Otherwise it is a notification: console text and device snapshots go to queues <em>and</em> callbacks, program flow updates <code>hub.running</code>, and tunnel payloads go to their own queue.',
            },
          ],
        },
        {
          kind: 'prose',
          html: 'The split matters: a notification never completes a pending request, so console output arriving mid-upload cannot be mistaken for an acknowledgement.',
        },
      ],
    },
    {
      id: 'queues',
      title: 'Queues and callbacks',
      blocks: [
        {
          kind: 'prose',
          html: 'Both delivery styles run at once and neither consumes the other. A console line is put on the queue behind <code>console()</code> <em>and</em> passed to every registered callback.',
        },
        {
          kind: 'list',
          items: [
            'Callbacks may be plain functions or coroutine functions; a returned coroutine is scheduled as a task on the running loop.',
            'The async iterators poll their queue with a short timeout rather than blocking forever, so they notice a disconnect and end cleanly instead of hanging.',
            'Everything registered lives on the <code>Hub</code>, not on the BLE client — which is why it all survives <code>reconnect()</code>.',
          ],
        },
      ],
    },
    {
      id: 'reconnect',
      title: 'Why reconnect rebuilds rather than reuses',
      blocks: [
        {
          kind: 'prose',
          html: '<code>reconnect()</code> deliberately discards the old <code>BleakClient</code> and the old <code>BLEDevice</code> and looks the hub up again by address. A device handle goes stale once the peer has gone away, and a power-cycled hub comes back behind a fresh one. BlueZ also keeps per-client state, so the old client is disconnected first.',
        },
        {
          kind: 'prose',
          html: 'What is <em>not</em> rebuilt is the <code>Hub</code> itself. Callbacks, queues and the latest snapshot all belong to it, so a caller keeps the same object across a drop and the session continues rather than being reassembled.',
        },
      ],
    },
    {
      id: 'decisions',
      title: 'Decisions worth knowing about',
      blocks: [
        {
          kind: 'table',
          headers: ['Decision', 'Reason'],
          rows: [
            [
              '<code>running</code> is set before the start request is sent',
              'A short program can finish before its own start is acknowledged. Setting the flag afterwards would let that write resurrect a program that had already ended.',
            ],
            [
              '<code>wait_until_stopped()</code> has no default timeout',
              'A hub program may run for hours. A host that gave up would disconnect a hub that is working perfectly well.',
            ],
            [
              'Its internal callback is removed in a <code>finally</code>',
              'Otherwise the callback list grows on every call, which matters for a session that runs hundreds of programs over one link.',
            ],
            [
              'Clearing an empty slot ignores a NACK',
              'That is what an empty slot answers. Treating it as failure would make the common case noisy.',
            ],
            [
              'Device parsing stops at the first unknown type',
              'Without that type’s length, the next message cannot be located. Truncating is honest; guessing would produce wrong data.',
            ],
            [
              'Only currently-connected devices are considered for link recovery',
              'The OS remembers devices long after they are gone, and attaching to one of those hangs rather than fails.',
            ],
          ],
        },
      ],
    },
    {
      id: 'testing',
      title: 'How it is tested',
      blocks: [
        {
          kind: 'prose',
          html: 'The suite runs with no hub and no Bluetooth adapter, which is what lets it run in CI on every push.',
        },
        {
          kind: 'table',
          headers: ['Test file', 'Covers'],
          rows: [
            ['<code>test_cobs.py</code>', 'COBS encode/decode against the official vectors'],
            ['<code>test_crc.py</code>', 'CRC32 alignment and seeding'],
            ['<code>test_framing.py</code>', 'The delimiter state machine, including split and interleaved frames'],
            ['<code>test_messages.py</code>', 'Serialize/deserialize round trips for every message'],
            ['<code>test_transfer.py</code>', 'Chunking and the running CRC, including firmware resume'],
            ['<code>test_program_flow.py</code>', 'Start/stop bookkeeping and <code>wait_until_stopped()</code>'],
            ['<code>test_client_helpers.py</code>', 'Slot validation and source reading'],
            ['<code>test_open_link.py</code>', 'The matching rules for attaching to an already-open link'],
            ['<code>test_simple_index.py</code>', 'The PEP 503 index generator used at release time'],
          ],
        },
        {
          kind: 'prose',
          html: '<code>match_open_link()</code> being a pure function of “what the OS reports” is what makes that last piece of behaviour testable without a Bluetooth stack at all.',
        },
      ],
    },
  ],
};
