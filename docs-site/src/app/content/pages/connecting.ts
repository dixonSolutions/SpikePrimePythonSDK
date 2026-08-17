import type { DocPage } from '../types';

export const connecting: DocPage = {
  slug: 'connecting',
  title: 'Connecting to a hub',
  summary:
    'Scanning, picking a specific hub, the handshake, holding one link open across a session, and recovering when it drops.',
  keywords: [
    'scan',
    'connect',
    'ble',
    'gatt',
    'address',
    'name',
    'reconnect',
    'disconnect',
    'advertisement',
    'rssi',
    'bluez',
    'open link',
    'context manager',
  ],
  sections: [
    {
      id: 'scanning',
      title: 'Scanning',
      blocks: [
        {
          kind: 'prose',
          html: '<code>scan()</code> listens for advertisements and returns every device carrying the HubOS GATT service <code>0000fd02-…</code>. It does not connect to anything, which makes it the cheapest way to find out whether the host can see a hub at all.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio
from spikeprime import scan


async def main() -> None:
    for hub in await scan(timeout=5.0):
        print(hub.address, hub.name, hub.rssi)


asyncio.run(main())`,
        },
        {
          kind: 'prose',
          html: 'The scan runs for the full <code>timeout</code> — it does not stop at the first hit — so every hub in range is reported. Results are de-duplicated by address, keeping the most recent advertisement for each.',
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Addresses are not portable',
          html: 'On Linux and Windows <code>address</code> is a MAC address. On macOS, CoreBluetooth hides MACs and hands out a per-host UUID instead, so an address copied from one machine will not resolve on another. Match by <code>name</code> for anything you intend to share.',
        },
      ],
    },
    {
      id: 'connecting',
      title: 'Connecting',
      blocks: [
        {
          kind: 'prose',
          html: '<code>connect()</code> is the front door. With no arguments it takes the first hub advertising the service:',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime import connect

hub = await connect()`,
        },
        {
          kind: 'prose',
          html: 'With several hubs on a table that is a coin toss, so pick one explicitly. <code>name=</code> matches case-insensitively, either exactly or as a substring of the advertised name; <code>address=</code> goes straight to a known device and skips the service filter.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `hub = await connect(name="Sherlock")           # exact or substring, case-insensitive
hub = await connect(address="E4:B3:23:AA:11:02")
hub = await connect(name="Sherlock", timeout=20.0)`,
        },
        {
          kind: 'prose',
          html: 'If nothing matches within <code>timeout</code> seconds, <code>connect()</code> raises <code>HubNotFoundError</code> with a message naming what it was looking for.',
        },
      ],
    },
    {
      id: 'handshake',
      title: 'What connecting actually does',
      blocks: [
        {
          kind: 'steps',
          steps: [
            {
              title: 'Find the device',
              html: 'By address, or by a filter over advertisements that requires the HubOS service UUID and, optionally, a name match.',
            },
            {
              title: 'Open the GATT link',
              html: 'and subscribe to notifications on the TX characteristic, which is how everything from the hub arrives.',
            },
            {
              title: 'Send InfoRequest',
              html: 'The protocol requires this to be the first message. The reply carries the firmware and RPC versions and — critically — <code>max_packet_size</code>, <code>max_message_size</code> and <code>max_chunk_size</code>.',
            },
            {
              title: 'Honour those limits from then on',
              html: 'Every frame is split into packets no larger than <code>max_packet_size</code>, and every file upload is cut into chunks no larger than <code>max_chunk_size</code>. Reading <code>hub.info</code> before the handshake completes raises <code>HubProtocolError</code>.',
            },
          ],
        },
        {
          kind: 'code',
          lang: 'python',
          code: `async with await connect() as hub:
    print(hub.info.firmware_version)   # "3.4.3"
    print(hub.info.rpc_version)        # "3.4.0"
    print(hub.info.max_packet_size)    # frame fragment size
    print(hub.info.max_chunk_size)     # upload chunk size
    print(hub.info.product_group)      # ProductGroup.SPIKE_PRIME or None`,
        },
      ],
    },
    {
      id: 'context-manager',
      title: 'Closing the link',
      blocks: [
        {
          kind: 'prose',
          html: '<code>Hub</code> is an async context manager, and that is the form to prefer: leaving the block stops notifications and disconnects even if the body raised.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `async with await connect() as hub:
    await hub.run(program, slot=0)
# link closed here, error or not`,
        },
        {
          kind: 'prose',
          html: 'Note the double <code>await</code>: <code>connect()</code> is a coroutine that returns an already-connected <code>Hub</code>, and the <code>Hub</code> is then used as the context manager. Without a <code>with</code> block, call <code>await hub.close()</code> yourself.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Always close',
          html: 'A process killed without closing leaves the hub holding an open link. It will then be invisible to the next scan — see below.',
        },
      ],
    },
    {
      id: 'one-link',
      title: 'Holding one link across a session',
      blocks: [
        {
          kind: 'prose',
          html: 'Connecting costs a full BLE scan, so a session that runs several programs should keep one <code>Hub</code> rather than reconnecting per run.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `async with await connect(name="My Hub") as hub:
    for program in programs:
        await hub.run(program, slot=0)
        await hub.wait_until_stopped()   # no cap; the link stays up between runs`,
        },
        {
          kind: 'prose',
          html: '<code>wait_until_stopped()</code> waits indefinitely by default. That is deliberate: a hub program runs for as long as it likes, and a host that gave up mid-run would disconnect a hub that is working perfectly well. Pass <code>timeout=</code> only when you genuinely want to cap the wait, and be ready for <code>HubTimeoutError</code>.',
        },
      ],
    },
    {
      id: 'already-connected',
      title: 'Hubs that are already connected',
      blocks: [
        {
          kind: 'prose',
          html: 'A connected Bluetooth peripheral stops advertising. So a hub whose link was left open — by a process that was killed before it could disconnect, say — is invisible to a scan and looks exactly like a hub that is switched off.',
        },
        {
          kind: 'prose',
          html: '<code>connect()</code> handles this. When nothing answers the scan, it asks the operating system what it already has connected and attaches to that link instead of failing. Recovery is automatic; there is nothing to tear down by hand.',
        },
        {
          kind: 'prose',
          html: 'Two constraints keep that from misfiring. Only devices connected <em>right now</em> are considered, because the OS remembers devices long after they are gone and attaching to one of those would hang rather than fail. And a candidate matched by name must also carry the HubOS service, so a headphone whose name happens to contain the same word is never mistaken for a hub.',
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Linux only',
          html: 'This is implemented against BlueZ, where the device object survives for as long as the link does. On macOS and Windows the scan result stands, so a hub in this state stays invisible until the stale link is closed — power-cycle the hub, or close whatever is holding it.',
        },
      ],
    },
    {
      id: 'reconnecting',
      title: 'Recovering a dropped link',
      blocks: [
        {
          kind: 'prose',
          html: 'BLE links drop: the hub goes out of range, a program crashes the radio, someone switches the brick off. <code>await hub.reconnect()</code> finds the hub again by address and rebuilds the connection <em>on the same object</em>.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime import HubNotFoundError

async def resilient_run(hub, program):
    try:
        await hub.run(program, slot=0)
    except Exception:
        await hub.reconnect()      # same Hub, same callbacks, new link
        await hub.run(program, slot=0)`,
        },
        {
          kind: 'prose',
          html: 'Everything registered on the object survives: console and device callbacks, the queues behind <code>console()</code> and <code>device_updates()</code>, and the latest device snapshot. The session continues instead of being rebuilt from scratch.',
        },
        {
          kind: 'prose',
          html: 'The hub is located again <em>by address</em> rather than reused from the old handle, because a <code>BLEDevice</code> goes stale once the peer has gone away, and a power-cycled hub comes back behind a fresh handle. <code>reconnect()</code> is a no-op if the link is already up, so it is safe to call speculatively.',
        },
        {
          kind: 'prose',
          html: 'To notice a drop rather than discover it on the next write, wait on it:',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `async def watchdog(hub):
    while True:
        await hub.wait_disconnected()
        print("link lost; reconnecting")
        await hub.reconnect()`,
        },
      ],
    },
    {
      id: 'picking',
      title: 'Choosing between several hubs',
      blocks: [
        {
          kind: 'prose',
          html: 'In a classroom, scan first and choose deliberately — for example the strongest signal, which is almost always the hub on your own desk.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import asyncio
from spikeprime import Hub, connect, scan


async def nearest() -> Hub:
    found = await scan(timeout=5.0)
    if not found:
        raise SystemExit("no hubs in range")
    for advert in found:
        print(f"  {advert.address}  {advert.name}  {advert.rssi} dBm")
    best = max(found, key=lambda advert: advert.rssi or -999)
    print("connecting to", best.name)
    return await connect(address=best.address)`,
        },
        {
          kind: 'prose',
          html: 'Renaming hubs once makes every later session easier. <code>await hub.set_name("Table 3")</code> writes the name into the hub, and it persists across power cycles.',
        },
      ],
    },
  ],
};
