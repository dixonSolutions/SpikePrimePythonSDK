import type { DocPage } from '../types';

export const apiClient: DocPage = {
  slug: 'api-client',
  title: 'spikeprime.client',
  summary:
    'The Hub class and everything around it: discovery, the connection lifecycle, programs, notifications and firmware.',
  keywords: ['Hub', 'connect', 'scan', 'reconnect', 'upload', 'run', 'start', 'stop', 'client', 'bleak', 'gatt'],
  sections: [
    {
      id: 'discovery',
      title: 'Discovery',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'scan',
              id: 'scan',
              kind: 'function',
              signature: 'async def scan(timeout: float = 10.0) -> list[HubAdvertisement]',
              summary:
                'Return every hub advertising the HubOS GATT service. Runs for the full timeout rather than stopping at the first hit, and de-duplicates by address.',
              params: [
                {
                  name: 'timeout',
                  type: 'float',
                  default: '10.0',
                  doc: 'How long to listen, in seconds.',
                },
              ],
              returns: {
                type: 'list[HubAdvertisement]',
                doc: '— one entry per distinct hub, in the order they were first seen.',
              },
              example: {
                lang: 'python',
                code: `for advert in await scan(timeout=5.0):
    print(advert.address, advert.name, advert.rssi)`,
              },
            },
            {
              name: 'connect',
              id: 'connect',
              kind: 'function',
              signature:
                'async def connect(address: str | None = None, name: str | None = None, timeout: float = 10.0) -> Hub',
              summary:
                'Find a hub, open the link and complete the handshake. Equivalent to <code>Hub.connect(...)</code>.',
              params: [
                {
                  name: 'address',
                  type: 'str | None',
                  default: 'None',
                  doc: 'Connect to this BLE address directly, skipping the service filter. On macOS this is a per-host UUID rather than a MAC address.',
                },
                {
                  name: 'name',
                  type: 'str | None',
                  default: 'None',
                  doc: 'Match the advertised name, case-insensitively, either exactly or as a substring. Ignored when <code>address</code> is given.',
                },
                {
                  name: 'timeout',
                  type: 'float',
                  default: '10.0',
                  doc: 'How long to look before giving up, in seconds.',
                },
              ],
              returns: { type: 'Hub', doc: '— connected, with the handshake already done.' },
              raises: [
                {
                  type: 'HubNotFoundError',
                  doc: 'if nothing matched, and no already-connected device matched either.',
                },
              ],
              notes:
                'With neither argument, the first hub found wins. When nothing answers the scan, an already-open link is looked for before failing — see <a href="docs/api-client#find_open_link">find_open_link</a>.',
              example: {
                lang: 'python',
                code: `async with await connect(name="Sherlock") as hub:
    print(await hub.get_name())`,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'hubadvertisement',
      title: 'HubAdvertisement',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'HubAdvertisement',
              id: 'hubadvertisement',
              kind: 'dataclass',
              signature: '@dataclass(frozen=True)\nclass HubAdvertisement',
              summary: 'One hub seen while scanning. Frozen, so it is hashable and safe to keep.',
              params: [
                { name: 'address', type: 'str', doc: 'BLE address, or a per-host UUID on macOS.' },
                {
                  name: 'name',
                  type: 'str | None',
                  doc: 'The device name, falling back to the advertisement’s local name.',
                },
                { name: 'rssi', type: 'int | None', doc: 'Signal strength in dBm, if the backend reported one.' },
                {
                  name: 'device',
                  type: 'BLEDevice',
                  doc: 'The underlying bleak handle, for callers that need it.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'lifecycle',
      title: 'Hub — connection lifecycle',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'Hub',
              id: 'hub',
              kind: 'class',
              signature: 'class Hub:\n    def __init__(self, device: BLEDevice) -> None',
              summary:
                'Talk to one HubOS 3 hub over BLE. Construct it through <code>connect()</code> or <code>Hub.connect()</code> rather than directly, unless you already hold a <code>BLEDevice</code>.',
            },
            {
              name: 'Hub.connect',
              kind: 'method',
              signature:
                '@classmethod\nasync def connect(cls, address: str | None = None, name: str | None = None, timeout: float = 10.0) -> Hub',
              summary:
                'Find a hub, construct a <code>Hub</code> for it and open the link. The module-level <code>connect()</code> is a thin wrapper around this.',
              raises: [{ type: 'HubNotFoundError', doc: 'if no matching hub was found.' }],
            },
            {
              name: 'Hub.open',
              kind: 'method',
              signature: 'async def open(self) -> None',
              summary:
                'Connect the GATT client, subscribe to TX notifications and perform the <code>InfoRequest</code> handshake. Called for you by <code>connect()</code>; call it yourself only when you constructed the <code>Hub</code> by hand.',
            },
            {
              name: 'Hub.close',
              kind: 'method',
              signature: 'async def close(self) -> None',
              summary:
                'Stop notifications and disconnect. Failures during teardown are logged rather than raised, so closing never masks the error that led you here. Any outstanding request is failed with <code>HubProtocolError("disconnected")</code>.',
            },
            {
              name: 'Hub.reconnect',
              kind: 'method',
              signature: 'async def reconnect(self, *, timeout: float = 10.0) -> None',
              summary:
                'Re-establish a dropped link, keeping this <code>Hub</code> and everything registered on it. Does nothing if the link is already up.',
              params: [
                { name: 'timeout', type: 'float', default: '10.0', doc: 'Scan timeout while looking for the hub again.' },
              ],
              raises: [{ type: 'HubNotFoundError', doc: 'if the hub cannot be found again.' }],
              notes:
                'The hub is located again <em>by address</em>, because a <code>BLEDevice</code> handle goes stale once the peer has gone away and a power-cycled hub returns behind a fresh one. The old client is torn down first, since BlueZ keeps per-client state. Callbacks, queues and console history all survive.',
              example: {
                lang: 'python',
                code: `await hub.wait_disconnected()
await hub.reconnect()
# callbacks registered earlier are still attached`,
              },
            },
            {
              name: 'Hub.__aenter__ / __aexit__',
              id: 'hub-context-manager',
              kind: 'method',
              signature: 'async def __aenter__(self) -> Hub\nasync def __aexit__(self, *exc: object) -> None',
              summary:
                'Async context-manager protocol. Entering opens the link if it is not already up; leaving always closes it, error or not.',
              example: {
                lang: 'python',
                code: `async with await connect() as hub:
    ...`,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'properties',
      title: 'Hub — properties',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'Hub.address',
              kind: 'property',
              signature: 'address: str',
              summary: 'The BLE address of the connected device.',
            },
            {
              name: 'Hub.ble_name',
              kind: 'property',
              signature: 'ble_name: str | None',
              summary:
                'The name from the advertisement. This is the BLE-level name; <code>get_name()</code> asks the hub for the one it stores.',
            },
            {
              name: 'Hub.info',
              kind: 'property',
              signature: 'info: InfoResponse',
              summary:
                'The handshake response: firmware and RPC versions, and the packet, message and chunk size limits every later write honours.',
              raises: [
                {
                  type: 'HubProtocolError',
                  doc: 'if read before the handshake has completed.',
                },
              ],
              example: {
                lang: 'python',
                code: `print(hub.info.firmware_version)   # "3.4.3"
print(hub.info.rpc_version)        # "3.4.0"
print(hub.info.max_chunk_size)     # upload chunk size in bytes`,
              },
            },
            {
              name: 'Hub.devices',
              kind: 'property',
              signature: 'devices: DeviceSnapshot | None',
              summary:
                'The most recent device snapshot, or <code>None</code> if none has arrived. Read it synchronously when you need current state at an arbitrary moment rather than a stream.',
            },
            {
              name: 'Hub.running',
              kind: 'property',
              signature: 'running: bool | None',
              summary:
                '<code>True</code> while a program is running, <code>False</code> once one has stopped, and <code>None</code> when the state is unknown — before anything has been started, or after a start that was never acknowledged.',
            },
          ],
        },
      ],
    },
    {
      id: 'programs',
      title: 'Hub — programs',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'Hub.run',
              kind: 'method',
              signature:
                'async def run(self, source: str | Path | bytes, *, slot: int = 0, filename: str = "program.py") -> None',
              summary: 'Upload a program and start it. <code>upload()</code> followed by <code>start()</code>.',
              params: [
                {
                  name: 'source',
                  type: 'str | Path | bytes',
                  doc: 'A <code>Path</code> is read from disk; <code>bytes</code> are sent as-is; a <code>str</code> is read from disk if it names an existing file and otherwise treated as source code.',
                },
                { name: 'slot', type: 'int', default: '0', doc: 'Program slot, 0–19.' },
                { name: 'filename', type: 'str', default: '"program.py"', doc: 'The name the hub records. Max 31 bytes of UTF-8.' },
              ],
              raises: [
                { type: 'ValueError', doc: 'if the slot is outside 0–19, or the filename is too long.' },
                { type: 'HubNackError', doc: 'if the hub refuses the upload or the start.' },
              ],
            },
            {
              name: 'Hub.upload',
              kind: 'method',
              signature:
                'async def upload(self, source: str | Path | bytes, *, slot: int = 0, filename: str = "program.py", clear: bool = True) -> None',
              summary: 'Upload a Python program into a slot without starting it.',
              params: [
                { name: 'source', type: 'str | Path | bytes', doc: 'Interpreted as for <code>run()</code>.' },
                { name: 'slot', type: 'int', default: '0', doc: 'Program slot, 0–19.' },
                { name: 'filename', type: 'str', default: '"program.py"', doc: 'The name the hub records.' },
                { name: 'clear', type: 'bool', default: 'True', doc: 'Clear the slot first. Set <code>False</code> to skip it.' },
              ],
              notes:
                'Sends <code>StartFileUploadRequest</code> with the CRC32 of the whole file, then one <code>TransferChunkRequest</code> per chunk of at most <code>info.max_chunk_size</code> bytes, each carrying the running CRC.',
            },
            {
              name: 'Hub.start',
              kind: 'method',
              signature: 'async def start(self, slot: int = 0) -> None',
              summary: 'Start the program in a slot.',
              raises: [
                { type: 'ValueError', doc: 'if the slot is outside 0–19.' },
                { type: 'HubNackError', doc: 'if the hub refuses — an empty slot is the usual cause.' },
              ],
              notes:
                '<code>running</code> is set before the request goes out, because a short program can finish before its own start is acknowledged and that stop notification has to win. If the request fails, the flag is reset to <code>None</code> rather than <code>False</code>, since the state was never confirmed.',
            },
            {
              name: 'Hub.stop',
              kind: 'method',
              signature: 'async def stop(self, slot: int = 0) -> None',
              summary: 'Stop the program in a slot, and mark it as no longer running.',
              raises: [{ type: 'HubNackError', doc: 'if the hub refuses.' }],
            },
            {
              name: 'Hub.clear_slot',
              kind: 'method',
              signature: 'async def clear_slot(self, slot: int = 0, *, ignore_nack: bool = True) -> None',
              summary: 'Erase a program slot.',
              params: [
                { name: 'slot', type: 'int', default: '0', doc: 'Program slot, 0–19.' },
                {
                  name: 'ignore_nack',
                  type: 'bool',
                  default: 'True',
                  doc: 'Clearing an empty slot may be answered with a NACK, which is not a real failure. Pass <code>False</code> to raise on it.',
                },
              ],
            },
            {
              name: 'Hub.wait_until_stopped',
              kind: 'method',
              signature: 'async def wait_until_stopped(self, timeout: float | None = None) -> None',
              summary: 'Block until the hub reports that the running program has stopped.',
              params: [
                {
                  name: 'timeout',
                  type: 'float | None',
                  default: 'None',
                  doc: 'Seconds to wait. <code>None</code> waits indefinitely.',
                },
              ],
              raises: [{ type: 'HubTimeoutError', doc: 'if a timeout was given and it elapsed.' }],
              notes:
                'Waits with no cap by default: a hub program runs for as long as it likes, and a caller that gave up mid-run would disconnect a hub that is working perfectly well. Returns immediately if a stop has already been reported, and removes its internal callback when the wait ends, so a long session that runs many programs does not accumulate listeners.',
            },
          ],
        },
      ],
    },
    {
      id: 'identity',
      title: 'Hub — identity',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'Hub.get_name',
              kind: 'method',
              signature: 'async def get_name(self) -> str',
              summary: 'The name stored on the hub — the one the SPIKE app shows.',
            },
            {
              name: 'Hub.set_name',
              kind: 'method',
              signature: 'async def set_name(self, name: str) -> None',
              summary: 'Rename the hub. The name persists across power cycles.',
              params: [{ name: 'name', type: 'str', doc: 'Max 29 bytes of UTF-8.' }],
              raises: [
                { type: 'ValueError', doc: 'if the name is too long.' },
                { type: 'HubNackError', doc: 'if the hub refuses it.' },
              ],
            },
            {
              name: 'Hub.uuid',
              kind: 'method',
              signature: 'async def uuid(self) -> UUID',
              summary: "The hub's device UUID — a stable identity that does not change when it is renamed.",
              returns: { type: 'uuid.UUID', doc: '' },
            },
          ],
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Hub — notifications and callbacks',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'Hub.enable_notifications',
              kind: 'method',
              signature: 'async def enable_notifications(self, interval_ms: int = 500) -> None',
              summary:
                'Ask the hub to push device notifications — battery, IMU, display, motors and sensors — on the given interval.',
              params: [
                { name: 'interval_ms', type: 'int', default: '500', doc: 'Milliseconds between notifications. <code>0</code> turns them off.' },
              ],
            },
            {
              name: 'Hub.disable_notifications',
              kind: 'method',
              signature: 'async def disable_notifications(self) -> None',
              summary: 'Stop device notifications. Exactly <code>enable_notifications(0)</code>.',
            },
            {
              name: 'Hub.console',
              kind: 'method',
              signature: 'async def console(self) -> AsyncIterator[str]',
              summary:
                'Yield console text as the hub prints it. Ends when the link closes, not when a program stops.',
              example: {
                lang: 'python',
                code: `async for line in hub.console():
    print("[hub]", line.rstrip())`,
              },
            },
            {
              name: 'Hub.device_updates',
              kind: 'method',
              signature: 'async def device_updates(self) -> AsyncIterator[DeviceSnapshot]',
              summary:
                'Yield a parsed snapshot for each device notification. Requires <code>enable_notifications()</code> first, and ends when the link closes.',
            },
            {
              name: 'Hub.on_console',
              kind: 'method',
              signature: 'def on_console(self, callback: Callable[[str], Awaitable[None] | None]) -> None',
              summary:
                'Register a listener for console text. Plain functions and coroutine functions are both accepted; a returned coroutine is scheduled on the running loop. Several may be registered, and they survive <code>reconnect()</code>.',
            },
            {
              name: 'Hub.on_device',
              kind: 'method',
              signature: 'def on_device(self, callback: Callable[[DeviceSnapshot], Awaitable[None] | None]) -> None',
              summary: 'Register a listener for device snapshots.',
            },
            {
              name: 'Hub.on_program',
              kind: 'method',
              signature: 'def on_program(self, callback: Callable[[bool], Awaitable[None] | None]) -> None',
              summary:
                'Register a listener for program-flow notifications. The argument is <code>True</code> when the program stopped and <code>False</code> when it started.',
            },
            {
              name: 'Hub.wait_disconnected',
              kind: 'method',
              signature: 'async def wait_disconnected(self) -> None',
              summary:
                'Block until the link drops. The clean way to notice a lost hub without waiting for the next request to time out.',
            },
          ],
        },
      ],
    },
    {
      id: 'firmware',
      title: 'Hub — firmware',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'Hub.update_firmware',
              kind: 'method',
              signature:
                'async def update_firmware(self, firmware: str | Path | bytes, *, begin: bool = True, progress: Callable[[int, int], None] | None = None) -> None',
              summary:
                'Upload a firmware image and ask the hub to install it. <strong>This overwrites HubOS and cannot be undone from this SDK.</strong>',
              params: [
                {
                  name: 'firmware',
                  type: 'str | Path | bytes',
                  doc: 'The image. Unlike <code>upload()</code>, a <code>str</code> is <em>always</em> a path — firmware is never inline.',
                },
                {
                  name: 'begin',
                  type: 'bool',
                  default: 'True',
                  doc: 'Install after uploading. <code>False</code> stages the image and leaves the hub untouched.',
                },
                {
                  name: 'progress',
                  type: 'Callable[[int, int], None] | None',
                  default: 'None',
                  doc: 'Called after each acknowledged chunk with (bytes sent, total bytes). Not called for chunks skipped by a resume.',
                },
              ],
              raises: [
                { type: 'ValueError', doc: 'if the image is empty.' },
                { type: 'HubNackError', doc: 'if the hub refuses the upload or the update.' },
                {
                  type: 'HubProtocolError',
                  doc: 'if the hub reports more bytes than the image holds, or a resume offset that is not a multiple of the chunk size.',
                },
              ],
              notes:
                'Follows the documented sequence: <code>StartFirmwareUploadRequest</code> with the image SHA-1 and CRC32, one <code>TransferChunkRequest</code> per chunk, then <code>BeginFirmwareUpdateRequest</code>. The hub reports how many bytes it already holds for that SHA, so an interrupted upload resumes; skipped chunks are still folded into the running CRC. The hub reboots into its updater once the update begins, which drops the link.',
              example: {
                lang: 'python',
                code: `def show(sent: int, total: int) -> None:
    print(f"\\r{sent}/{total}", end="")

await hub.update_firmware("hub-firmware.bin", progress=show)`,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'tunnel',
      title: 'Hub — tunnel',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: 'Hub.tunnel',
              kind: 'method',
              signature: 'async def tunnel(self, payload: bytes, *, high_priority: bool = False) -> None',
              summary:
                'Send a raw byte payload to the hub as a tunnel message. Fire-and-forget: no acknowledgement and no response.',
              params: [
                { name: 'payload', type: 'bytes', doc: 'Arbitrary bytes, bounded by the hub’s <code>max_message_size</code>.' },
                {
                  name: 'high_priority',
                  type: 'bool',
                  default: 'False',
                  doc: 'Send in the high-priority lane, prefixed with <code>0x01</code>. Reserve it for something genuinely urgent.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'open-links',
      title: 'Already-open links',
      blocks: [
        {
          kind: 'prose',
          html: 'These back the automatic recovery in <code>connect()</code>. They are public so a caller can perform the same lookup deliberately.',
        },
        {
          kind: 'api',
          entries: [
            {
              name: 'find_open_link',
              id: 'find_open_link',
              kind: 'function',
              signature:
                'async def find_open_link(address: str | None = None, name: str | None = None) -> BLEDevice | None',
              summary:
                'Find a hub the OS is already connected to, without waiting for an advertisement. Returns <code>None</code> on any platform or bleak layout it does not recognise, so callers simply fall back to reporting the hub as missing.',
              notes:
                'Implemented for BlueZ only, where the device object survives for as long as the link does.',
            },
            {
              name: 'match_open_link',
              id: 'match_open_link',
              kind: 'function',
              signature:
                'def match_open_link(devices: Iterable[tuple[str, dict]], address: str | None = None, name: str | None = None) -> BLEDevice | None',
              summary:
                'Pick a hub out of the devices the OS reports, or <code>None</code>. Pure and synchronous, which is what makes the matching rules testable without a Bluetooth stack.',
              notes:
                'Only devices connected <em>right now</em> are considered, because the OS remembers devices long after they are gone and attaching to one of those would hang rather than fail. A name is matched the same way as during a scan, and the device must also carry the HubOS service, so a headphone with a similar name is never mistaken for a hub.',
            },
          ],
        },
      ],
    },
    {
      id: 'constants',
      title: 'Constants and type aliases',
      blocks: [
        {
          kind: 'table',
          headers: ['Name', 'Value', 'Meaning'],
          rows: [
            ['<code>SERVICE_UUID</code>', '<code>0000fd02-0000-1000-8000-00805f9b34fb</code>', 'The HubOS GATT service'],
            ['<code>RX_UUID</code>', '<code>0000fd02-0001-…</code>', 'Host → hub, written without response'],
            ['<code>TX_UUID</code>', '<code>0000fd02-0002-…</code>', 'Hub → host, notifications'],
            ['<code>DEFAULT_SCAN_TIMEOUT</code>', '<code>10.0</code>', 'Default scan and reconnect window, in seconds'],
            ['<code>DEFAULT_REQUEST_TIMEOUT</code>', '<code>10.0</code>', 'Default per-request response timeout'],
            ['<code>SLOTS</code>', '<code>range(20)</code>', 'Valid program slots'],
          ],
        },
        {
          kind: 'prose',
          html: 'RX and TX are named from the hub\'s point of view: the hub receives on RX and transmits on TX.',
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'Callback type aliases',
          code: `ConsoleCallback  = Callable[[str], Awaitable[None] | None]
DeviceCallback   = Callable[[DeviceSnapshot], Awaitable[None] | None]
ProgramCallback  = Callable[[bool], Awaitable[None] | None]
ProgressCallback = Callable[[int, int], None]`,
        },
      ],
    },
  ],
};
