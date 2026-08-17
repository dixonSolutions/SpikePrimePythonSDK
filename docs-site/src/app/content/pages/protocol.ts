import type { DocPage } from '../types';

export const protocol: DocPage = {
  slug: 'protocol-reference',
  title: 'Protocol reference',
  summary:
    'The HubOS 3 BLE protocol as this SDK implements it: GATT characteristics, framing, CRC, slots and priority.',
  keywords: ['gatt', 'ble', 'uuid', 'cobs', 'xor', 'delimiter', 'crc32', 'slot', 'priority', 'wire format', 'fd02'],
  sections: [
    {
      id: 'sources',
      title: 'Source of truth',
      blocks: [
        {
          kind: 'prose',
          html: 'This page describes what the SDK does and why. The specification it implements is published by the LEGO Group:',
        },
        {
          kind: 'list',
          items: [
            '<a href="https://lego.github.io/spike-prime-docs/connect.html" target="_blank" rel="noopener">Connection</a> — GATT service and characteristics',
            '<a href="https://lego.github.io/spike-prime-docs/encoding.html" target="_blank" rel="noopener">Encoding</a> — COBS, the XOR mask and the delimiter state machine',
            '<a href="https://lego.github.io/spike-prime-docs/messages.html" target="_blank" rel="noopener">Messages</a> — every message layout',
            '<a href="https://lego.github.io/spike-prime-docs/enums.html" target="_blank" rel="noopener">Enumerations</a> — the enum values',
          ],
        },
        {
          kind: 'callout',
          tone: 'info',
          html: 'Protocol documentation is Copyright 2024 the LEGO Group. This project reimplements it independently and is not affiliated with, authorized by, or endorsed by the LEGO Group.',
        },
      ],
    },
    {
      id: 'gatt',
      title: 'GATT',
      blocks: [
        {
          kind: 'table',
          headers: ['Item', 'UUID'],
          rows: [
            ['Service', '<code>0000fd02-0000-1000-8000-00805f9b34fb</code>'],
            ['RX — host → hub, write without response', '<code>0000fd02-0001-1000-8000-00805f9b34fb</code>'],
            ['TX — hub → host, notifications', '<code>0000fd02-0002-1000-8000-00805f9b34fb</code>'],
          ],
        },
        {
          kind: 'prose',
          html: 'RX and TX are named from the <em>hub\'s</em> point of view: the hub receives on RX and transmits on TX. Scanning filters on the service UUID, which is what keeps other Bluetooth devices out of the results.',
        },
      ],
    },
    {
      id: 'handshake',
      title: 'Handshake',
      blocks: [
        {
          kind: 'prose',
          html: 'After the GATT connection is up and TX notifications are subscribed, the first message must be <code>InfoRequest</code>. The reply establishes three limits that govern everything afterwards:',
        },
        {
          kind: 'table',
          headers: ['Field', 'Used for'],
          rows: [
            ['<code>max_packet_size</code>', 'Every write to RX is split into fragments of at most this many bytes'],
            ['<code>max_message_size</code>', 'Upper bound on a single serialized message'],
            ['<code>max_chunk_size</code>', 'The payload size of each <code>TransferChunkRequest</code>'],
          ],
        },
        {
          kind: 'prose',
          html: 'It also carries the RPC and firmware versions and the product group. Reading <code>hub.info</code> before this exchange completes raises <code>HubProtocolError</code>.',
        },
      ],
    },
    {
      id: 'framing',
      title: 'Framing',
      blocks: [
        {
          kind: 'steps',
          steps: [
            {
              title: 'COBS-encode',
              html: 'so the payload contains no <code>0x00</code>, <code>0x01</code> or <code>0x02</code>. Blocks are at most 84 bytes and codes carry an offset of <code>0x02</code>.',
            },
            { title: 'XOR every byte with 0x03', html: 'which is what frees the low byte values to act as markers.' },
            {
              title: 'Append 0x02',
              html: 'to end the frame. Optionally prefix <code>0x01</code> to mark it high priority.',
            },
          ],
        },
        {
          kind: 'prose',
          html: 'Incoming notifications can fragment or coalesce frames arbitrarily, so the receiver is a small state machine rather than a splitter. <code>FrameAssembler</code> implements it:',
        },
        {
          kind: 'table',
          headers: ['Byte', 'Effect'],
          rows: [
            ['<code>0x01</code>', 'Start a high-priority frame. An <code>0x01</code> arriving while one is already open discards both buffers, on the assumption the stream is out of sync.'],
            ['<code>0x02</code>', 'End the current frame and emit its payload; a high-priority frame ending implicitly resumes low priority.'],
            ['anything else', 'Append to whichever lane is currently open.'],
          ],
        },
        {
          kind: 'prose',
          html: 'Because the two lanes are buffered separately, an urgent frame interleaved into a long one leaves both intact.',
        },
      ],
    },
    {
      id: 'crc32',
      title: 'CRC32',
      blocks: [
        {
          kind: 'prose',
          html: 'File and firmware transfers are checked with <code>binascii.crc32</code> — the zlib/ITU polynomial — over the payload <strong>zero-padded to a 4-byte boundary</strong>.',
        },
        {
          kind: 'prose',
          html: 'A <code>StartFileUploadRequest</code> carries the CRC of the whole file. Each <code>TransferChunkRequest</code> then carries a <em>running</em> CRC: the previous digest is passed as the seed, so the value grows to cover everything sent so far.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `running = 0
for offset in range(0, len(data), chunk_size):
    chunk = data[offset:offset + chunk_size]
    running = crc32(chunk, running)
    ...`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          html: 'Padding is applied per call, so the running value depends on the chunk size used throughout. This is why a firmware resume offset must be a multiple of the hub\'s chunk size — see <a href="docs/firmware-updates#resume">Resuming</a>.',
        },
      ],
    },
    {
      id: 'slots',
      title: 'Slots',
      blocks: [
        {
          kind: 'prose',
          html: 'Program slots are <code>0</code>–<code>19</code> — the same slots the SPIKE app shows. Anything outside that raises <code>ValueError</code> before a byte leaves the host.',
        },
        {
          kind: 'prose',
          html: 'Clearing an empty slot may be answered with a NACK. The SDK treats that as success unless you pass <code>ignore_nack=False</code>, because it is a normal outcome rather than a failure.',
        },
      ],
    },
    {
      id: 'upload-sequence',
      title: 'Upload sequence',
      blocks: [
        {
          kind: 'code',
          lang: 'text',
          code: `host                                   hub
 │  ClearSlotRequest (optional)          │
 │ ────────────────────────────────────► │
 │            ClearSlotResponse          │
 │ ◄──────────────────────────────────── │
 │  StartFileUploadRequest(name, slot,   │
 │                        crc of file)   │
 │ ────────────────────────────────────► │
 │        StartFileUploadResponse        │
 │ ◄──────────────────────────────────── │
 │  TransferChunkRequest(running crc,    │
 │                       chunk)          │   repeated
 │ ────────────────────────────────────► │
 │          TransferChunkResponse        │
 │ ◄──────────────────────────────────── │
 │  ProgramFlowRequest(Start, slot)      │
 │ ────────────────────────────────────► │
 │           ProgramFlowResponse         │
 │ ◄──────────────────────────────────── │
 │        ConsoleNotification …          │
 │ ◄──────────────────────────────────── │
 │      ProgramFlowNotification(Stop)    │
 │ ◄──────────────────────────────────── │`,
        },
      ],
    },
    {
      id: 'firmware-sequence',
      title: 'Firmware sequence',
      blocks: [
        {
          kind: 'steps',
          steps: [
            {
              title: 'StartFirmwareUploadRequest',
              html: 'Carries the image\'s SHA-1 — the 20-byte “File SHA” — and its CRC32. The response reports how many bytes the hub already holds for that SHA.',
            },
            {
              title: 'TransferChunkRequest per chunk',
              html: 'Carrying the running CRC32, exactly as for a program upload.',
            },
            {
              title: 'BeginFirmwareUpdateRequest',
              html: 'Installs the image. The hub reboots into the updater and drops the connection. Skipped when staging.',
            },
          ],
        },
        {
          kind: 'prose',
          html: 'Resume uses the byte count from step 1: chunks the hub already has are skipped but still folded into the running CRC. Because that CRC is accumulated per chunk, an offset that is not a multiple of the chunk size cannot be reproduced, and the SDK raises rather than sending a CRC the hub will reject.',
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      blocks: [
        {
          kind: 'prose',
          html: 'Four messages arrive unsolicited and never complete a pending request. They go to queues and optional callbacks instead.',
        },
        {
          kind: 'table',
          headers: ['Message', 'Carries', 'Surfaces as'],
          rows: [
            ['<code>ConsoleNotification</code>', 'Up to 255 bytes of UTF-8', '<code>console()</code>, <code>on_console()</code>'],
            ['<code>DeviceNotification</code>', 'Packed device messages', '<code>device_updates()</code>, <code>on_device()</code>, <code>hub.devices</code>'],
            ['<code>ProgramFlowNotification</code>', 'Start or stop', '<code>hub.running</code>, <code>on_program()</code>, <code>wait_until_stopped()</code>'],
            ['<code>TunnelMessage</code>', 'Arbitrary bytes', 'An internal queue — see <a href="docs/tunnel-messages">Tunnel messages</a>'],
          ],
        },
        {
          kind: 'prose',
          html: 'A notification whose id this build does not implement is logged and skipped rather than raised, so a firmware that adds messages does not break a session.',
        },
      ],
    },
    {
      id: 'priority',
      title: 'Message priority',
      blocks: [
        {
          kind: 'prose',
          html: '<code>0x01</code> prefixes a high-priority frame; everything else is low priority. Requests and responses are sent as low priority, which is what the hub expects for ordinary traffic. <code>Hub.tunnel()</code> takes <code>high_priority=</code> for the cases where something genuinely must not queue behind a file upload.',
        },
      ],
    },
    {
      id: 'endianness',
      title: 'Conventions',
      blocks: [
        {
          kind: 'list',
          items: [
            'All multi-byte fields are <strong>little-endian</strong>.',
            'Strings are UTF-8 and <strong>null-terminated</strong>. A hub name is at most 29 bytes plus the terminator; a program file name at most 31 plus the terminator.',
            'Every message begins with its one-byte id.',
            'Acknowledgements are id plus a status byte: <code>0x00</code> ACK, <code>0x01</code> NACK.',
          ],
        },
        {
          kind: 'prose',
          html: 'The complete message table, with the payload layout of each, is in the <a href="docs/api-protocol#message-ids">protocol API reference</a>.',
        },
      ],
    },
  ],
};
