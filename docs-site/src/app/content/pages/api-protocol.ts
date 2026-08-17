import type { DocPage } from '../types';

export const apiProtocol: DocPage = {
  slug: 'api-protocol',
  title: 'spikeprime.protocol',
  summary:
    'COBS, CRC32, frame assembly and every message struct — the layer under the client, usable on its own.',
  keywords: ['cobs', 'crc32', 'framing', 'FrameAssembler', 'messages', 'serialize', 'deserialize', 'encode_frame'],
  sections: [
    {
      id: 'importing',
      title: 'Importing',
      blocks: [
        {
          kind: 'prose',
          html: 'The protocol layer stays behind explicit submodule imports rather than being re-exported from the package root. It works with no hub and no Bluetooth adapter, which is what makes it usable for tests and packet analysis.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime.protocol import FrameAssembler, crc32, deserialize, encode_frame, pack, unpack
from spikeprime.protocol.messages import InfoRequest, InfoResponse, TunnelMessage`,
        },
      ],
    },
    {
      id: 'cobs',
      title: 'spikeprime.protocol.cobs',
      blocks: [
        {
          kind: 'prose',
          html: 'SPIKE Prime uses a variant of Consistent Overhead Byte Stuffing that escapes <strong>three</strong> byte values — <code>0x00</code>, <code>0x01</code> and <code>0x02</code> — and then XORs the whole buffer with <code>0x03</code>. That leaves <code>0x01</code> and <code>0x02</code> free to act as frame delimiters.',
        },
        {
          kind: 'api',
          entries: [
            {
              name: 'encode',
              kind: 'function',
              signature: 'def encode(data: bytes) -> bytearray',
              summary:
                'COBS-encode so the result contains no <code>0x00</code>, <code>0x01</code> or <code>0x02</code>. Blocks are at most 84 bytes.',
            },
            {
              name: 'decode',
              kind: 'function',
              signature: 'def decode(data: bytes) -> bytearray',
              summary: 'The inverse of <code>encode()</code>.',
            },
            {
              name: 'pack',
              kind: 'function',
              signature: 'def pack(data: bytes) -> bytes',
              summary:
                'COBS-encode, XOR every byte with <code>0x03</code>, and append the <code>0x02</code> frame delimiter. This is what a low-priority frame looks like on the wire.',
            },
            {
              name: 'unpack',
              kind: 'function',
              signature: 'def unpack(frame: bytes) -> bytes',
              summary:
                'Strip an optional leading <code>0x01</code> priority marker and the trailing <code>0x02</code>, un-XOR, and decode.',
              raises: [{ type: 'ValueError', doc: 'if the frame is shorter than two bytes.' }],
            },
          ],
        },
        {
          kind: 'table',
          headers: ['Constant', 'Value', 'Meaning'],
          rows: [
            ['<code>DELIMITER</code>', '<code>0x02</code>', 'End of frame'],
            ['<code>NO_DELIMITER</code>', '<code>0xFF</code>', 'Placeholder while a block is still open'],
            ['<code>COBS_CODE_OFFSET</code>', '<code>0x02</code>', 'Offset added to every block code'],
            ['<code>MAX_BLOCK_SIZE</code>', '<code>84</code>', 'Longest run before a new block starts'],
            ['<code>XOR</code>', '<code>0x03</code>', 'Mask applied after encoding'],
          ],
        },
        {
          kind: 'callout',
          tone: 'info',
          html: 'The implementation follows the reference in the LEGO Group\'s <a href="https://lego.github.io/spike-prime-docs/encoding.html" target="_blank" rel="noopener">encoding documentation</a>, and the test suite checks it against the official vectors from that page.',
        },
      ],
    },
    {
      id: 'crc',
      title: 'spikeprime.protocol.crc',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'crc32',
              kind: 'function',
              signature: 'def crc32(data: bytes, seed: int = 0, align: int = 4) -> int',
              summary:
                'The CRC32 HubOS expects for file transfers: <code>binascii.crc32</code> over the payload zero-padded to a 4-byte boundary.',
              params: [
                { name: 'data', type: 'bytes', doc: 'The payload.' },
                {
                  name: 'seed',
                  type: 'int',
                  default: '0',
                  doc: 'The previous digest. Passing it forward is what makes a per-chunk CRC cover the whole file.',
                },
                { name: 'align', type: 'int', default: '4', doc: 'Padding boundary.' },
              ],
              returns: { type: 'int', doc: '' },
              example: {
                lang: 'python',
                code: `from spikeprime.protocol import crc32

running = 0
for chunk in chunks:
    running = crc32(chunk, running)`,
              },
            },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Padding is per call, not per file',
          html: 'Because each chunk is padded before being folded in, a running CRC is only reproducible when every chunk has the same size. That is why a firmware resume offset must land on a chunk boundary — see <a href="docs/firmware-updates#resume">Resuming an interrupted upload</a>.',
        },
      ],
    },
    {
      id: 'framing',
      title: 'spikeprime.protocol.framing',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'encode_frame',
              kind: 'function',
              signature: 'def encode_frame(payload: bytes, *, high_priority: bool = False) -> bytes',
              summary:
                'Pack a serialized message into a frame, optionally prefixing <code>0x01</code> to mark it high priority.',
            },
            {
              name: 'split_packets',
              kind: 'function',
              signature: 'def split_packets(frame: bytes, max_packet_size: int) -> list[bytes]',
              summary:
                'Cut a frame into GATT-sized writes. The client uses <code>info.max_packet_size</code> from the handshake.',
              raises: [{ type: 'ValueError', doc: 'if <code>max_packet_size</code> is not positive.' }],
            },
            {
              name: 'FrameAssembler',
              id: 'frameassembler',
              kind: 'class',
              signature: 'class FrameAssembler',
              summary:
                'Turn a stream of GATT notification bytes into complete unpacked payloads. BLE may split or join frames, so <code>feed()</code> accepts any slice.',
            },
            {
              name: 'FrameAssembler.feed',
              kind: 'method',
              signature: 'def feed(self, data: bytes) -> list[bytes]',
              summary:
                'Consume bytes and return every complete payload they finished. Returns an empty list while a frame is still incomplete.',
              notes:
                'Implements the delimiter state machine from the encoding documentation: <code>0x01</code> starts a high-priority frame, <code>0x02</code> ends the current one and implicitly resumes low priority. High and low priority frames are buffered separately, so an urgent frame interleaved into a long one does not corrupt either.',
              example: {
                lang: 'python',
                code: `assembler = FrameAssembler()

for packet in notifications:
    for payload in assembler.feed(packet):
        print(deserialize(payload))`,
              },
            },
            {
              name: 'FrameAssembler.reset',
              kind: 'method',
              signature: 'def reset(self) -> None',
              summary: 'Drop both buffers and return to the neutral state. Useful after a link drop.',
            },
          ],
        },
      ],
    },
    {
      id: 'messages',
      title: 'spikeprime.protocol.messages',
      blocks: [
        {
          kind: 'prose',
          html: 'Every documented HubOS message is a dataclass with a <code>serialize()</code> method and a <code>deserialize()</code> classmethod, and a class-level <code>ID</code> that is its message id on the wire. All multi-byte fields are little-endian; strings are UTF-8 and null-terminated.',
        },
        {
          kind: 'api',
          entries: [
            {
              name: 'Message',
              kind: 'class',
              signature: `class Message(ABC):
    ID: ClassVar[int]

    def serialize(self) -> bytes: ...

    @classmethod
    def deserialize(cls, data: bytes) -> Message: ...`,
              summary:
                'The abstract base. <code>__str__</code> prints the class name and every public field, which is what makes the debug log readable.',
            },
            {
              name: 'StatusMessage',
              kind: 'class',
              signature: '@dataclass\nclass StatusMessage(Message):\n    success: bool = True',
              summary:
                'Base for every simple acknowledgement — id byte plus a status byte. <code>StartFileUploadResponse</code>, <code>TransferChunkResponse</code>, <code>ClearSlotResponse</code>, <code>ProgramFlowResponse</code>, <code>SetHubNameResponse</code>, <code>DeviceNotificationResponse</code> and <code>BeginFirmwareUpdateResponse</code> are all this shape.',
            },
            {
              name: 'deserialize',
              id: 'deserialize',
              kind: 'function',
              signature: 'def deserialize(data: bytes) -> Message',
              summary: 'Decode a payload into the right message class, dispatching on the leading id byte.',
              raises: [
                { type: 'HubProtocolError', doc: 'if the payload is empty or the id is not implemented.' },
              ],
            },
            {
              name: 'KNOWN_MESSAGES',
              kind: 'constant',
              signature: 'KNOWN_MESSAGES: dict[int, type[Message]]',
              summary:
                'Every implemented message, keyed by id. Built from the classes themselves, so it cannot fall out of sync with them.',
            },
          ],
        },
      ],
    },
    {
      id: 'message-ids',
      title: 'Every message',
      blocks: [
        {
          kind: 'table',
          headers: ['ID', 'Class', 'Payload after the id byte'],
          rows: [
            ['<code>0x00</code>', 'InfoRequest', '—'],
            [
              '<code>0x01</code>',
              'InfoResponse',
              'rpc major/minor/build, firmware major/minor/build, max packet, max message, max chunk, product group',
            ],
            ['<code>0x0A</code>', 'StartFirmwareUploadRequest', '20-byte SHA-1, <code>uint32</code> CRC'],
            ['<code>0x0B</code>', 'StartFirmwareUploadResponse', 'status, <code>uint32</code> bytes already uploaded'],
            ['<code>0x0C</code>', 'StartFileUploadRequest', 'file name (max 31 bytes + NUL), slot, <code>uint32</code> CRC'],
            ['<code>0x0D</code>', 'StartFileUploadResponse', 'status'],
            ['<code>0x10</code>', 'TransferChunkRequest', '<code>uint32</code> running CRC, <code>uint16</code> size, payload'],
            ['<code>0x11</code>', 'TransferChunkResponse', 'status'],
            ['<code>0x14</code>', 'BeginFirmwareUpdateRequest', '20-byte SHA-1, <code>uint32</code> CRC'],
            ['<code>0x15</code>', 'BeginFirmwareUpdateResponse', 'status'],
            ['<code>0x16</code>', 'SetHubNameRequest', 'name (max 29 bytes + NUL)'],
            ['<code>0x17</code>', 'SetHubNameResponse', 'status'],
            ['<code>0x18</code>', 'GetHubNameRequest', '—'],
            ['<code>0x19</code>', 'GetHubNameResponse', 'name'],
            ['<code>0x1A</code>', 'DeviceUuidRequest', '—'],
            ['<code>0x1B</code>', 'DeviceUuidResponse', '16-byte UUID'],
            ['<code>0x1E</code>', 'ProgramFlowRequest', 'action, slot'],
            ['<code>0x1F</code>', 'ProgramFlowResponse', 'status'],
            ['<code>0x20</code>', 'ProgramFlowNotification', 'action'],
            ['<code>0x21</code>', 'ConsoleNotification', 'text, null-terminated, up to 255 bytes'],
            ['<code>0x28</code>', 'DeviceNotificationRequest', '<code>uint16</code> interval in ms'],
            ['<code>0x29</code>', 'DeviceNotificationResponse', 'status'],
            ['<code>0x32</code>', 'TunnelMessage', '<code>uint16</code> size, payload'],
            ['<code>0x3C</code>', 'DeviceNotification', '<code>uint16</code> size, packed device messages'],
            ['<code>0x46</code>', 'ClearSlotRequest', 'slot'],
            ['<code>0x47</code>', 'ClearSlotResponse', 'status'],
          ],
        },
      ],
    },
    {
      id: 'notable',
      title: 'Messages worth a closer look',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'InfoResponse',
              kind: 'dataclass',
              signature: `@dataclass
class InfoResponse(Message):
    ID = 0x01
    rpc_major: int
    rpc_minor: int
    rpc_build: int
    firmware_major: int
    firmware_minor: int
    firmware_build: int
    max_packet_size: int
    max_message_size: int
    max_chunk_size: int
    product_group_device: int`,
              summary:
                'The handshake response, and the source of every size limit the client honours afterwards.',
              params: [
                { name: 'rpc_version', type: 'property → str', doc: 'The three RPC numbers joined with dots.' },
                { name: 'firmware_version', type: 'property → str', doc: 'The three firmware numbers joined with dots.' },
                {
                  name: 'product_group',
                  type: 'property → ProductGroup | None',
                  doc: 'The product group as an enum, or <code>None</code> when the hub reports one this build does not know.',
                },
              ],
            },
            {
              name: 'TransferChunkRequest',
              kind: 'dataclass',
              signature: `@dataclass
class TransferChunkRequest(Message):
    ID = 0x10
    running_crc: int
    payload: bytes`,
              summary:
                'One piece of a file or firmware transfer. <code>running_crc</code> covers everything sent so far, not just this chunk.',
            },
            {
              name: 'ProgramFlowNotification',
              kind: 'dataclass',
              signature: `@dataclass
class ProgramFlowNotification(Message):
    ID = 0x20
    action: ProgramAction

    @property
    def stop(self) -> bool: ...`,
              summary:
                'Pushed when a program starts or stops. <code>stop</code> is the convenience the client uses to drive <code>hub.running</code> and <code>wait_until_stopped()</code>.',
            },
            {
              name: 'DeviceNotification',
              id: 'devicenotification',
              kind: 'dataclass',
              signature: `@dataclass
class DeviceNotification(Message):
    ID = 0x3C
    payload: bytes
    messages: list[tuple[str, tuple]] = field(default_factory=list)`,
              summary:
                'A batch of device messages. <code>messages</code> holds the parsed <code>(name, fields)</code> pairs; <code>payload</code> keeps the raw bytes, so anything the parser stopped at is still recoverable.',
              notes:
                'Parsing walks the payload one device message at a time and stops at the first type byte it does not recognise, because without that message’s length the next one cannot be located. <code>DeviceSnapshot.from_notification()</code> turns the parsed list into typed dataclasses.',
            },
          ],
        },
      ],
    },
    {
      id: 'round-trip',
      title: 'A round trip, by hand',
      blocks: [
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime.protocol.framing import FrameAssembler, encode_frame
from spikeprime.protocol.messages import ProgramFlowRequest, deserialize
from spikeprime.enums import ProgramAction

request = ProgramFlowRequest(ProgramAction.START, slot=0)
frame = encode_frame(request.serialize())
print(frame.hex(" "))

assembler = FrameAssembler()
for payload in assembler.feed(frame):
    print(deserialize(payload))    # ProgramFlowRequest(action=..., slot=0)`,
        },
        {
          kind: 'prose',
          html: 'Feeding the frame in pieces — one byte at a time, even — produces exactly the same result, which is the whole point of the assembler.',
        },
      ],
    },
  ],
};
