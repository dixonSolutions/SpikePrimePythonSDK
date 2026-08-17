# SpikePrimePythonSDK

Unofficial Python SDK for **SPIKE Prime HubOS 3** over Bluetooth Low Energy.
The import and CLI stay `spikeprime`.

It implements the protocol published by the LEGO Group at
[lego.github.io/spike-prime-docs](https://lego.github.io/spike-prime-docs/).
This project is not affiliated with, authorized by, or endorsed by the LEGO Group.

📚 **[Full documentation](https://dixonsolutions.github.io/SpikePrimePythonSDK/)** —
installation, project setup, guides, the complete API reference and the protocol.

## Install

From the GitHub Pages package index:

```bash
pip install SpikePrimePythonSDK \
  --index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/ \
  --extra-index-url https://pypi.org/simple
```

From git:

```bash
pip install git+https://github.com/dixonSolutions/SpikePrimePythonSDK.git
```

For local development:

```bash
pip install -e ".[dev]"
```

Needs Python 3.10+ and Bluetooth on the host. Tested against HubOS 3 only.
Every push to `main` that passes tests publishes a new release; see [docs/PACKAGING.md](docs/PACKAGING.md).

## Quick start

```python
import asyncio
from spikeprime import connect

PROGRAM = """\
import runloop
from hub import light_matrix

async def main():
    await light_matrix.write("Hi")

runloop.run(main())
"""

async def main():
    async with await connect() as hub:
        print(await hub.get_name(), hub.info.firmware_version)
        await hub.run(PROGRAM, slot=0)

asyncio.run(main())
```

`connect()` scans for the HubOS GATT service and uses the first hub it finds.
Pass `name=` or `address=` to pick one.

## What it can do

| Method | Protocol messages |
|---|---|
| `hub.run(source, slot=0)` | clear + upload chunks + start |
| `hub.upload(...)` / `hub.start()` / `hub.stop()` | file transfer + program flow |
| `hub.get_name()` / `hub.set_name()` | hub name |
| `hub.uuid()` | device UUID |
| `hub.enable_notifications(ms)` | IMU, motors, sensors, display |
| `async for line in hub.console()` | `print()` from hub Python |
| `async for snap in hub.device_updates()` | typed device snapshot |
| `hub.tunnel(payload, high_priority=…)` | tunnel message |
| `hub.update_firmware(image)` | firmware upload + update (resumable) |
| `hub.wait_until_stopped()` | block until the running program ends |
| `hub.reconnect()` | rebuild a dropped link, keeping the same `Hub` |

### Holding one connection open

Connecting costs a BLE scan, so a session that runs several programs should keep
one `Hub` rather than reconnecting per run. `wait_until_stopped()` waits with no
timeout by default — a hub program runs for as long as it likes, and a host that
gives up mid-run would disconnect a hub that is working perfectly well. Pass
`timeout=` only when you genuinely want to cap the wait.

```python
async with await connect(name="My Hub") as hub:
    for program in programs:
        await hub.run(program, slot=0)
        await hub.wait_until_stopped()   # no cap; the link stays up between runs
```

If the link does drop, `await hub.reconnect()` finds the hub again by address and
rebuilds the connection. Callbacks and queues registered on the `Hub` survive, so
the session continues instead of being rebuilt.

### Hubs that are already connected

A connected peripheral stops advertising, so a hub whose link was left open — by a
process that was killed before it could disconnect, say — is invisible to a scan
and looks switched off. `connect()` handles this: when nothing answers the scan it
checks what the OS already has connected and attaches to that link instead of
failing. Recovery is automatic, with no need to tear the link down by hand.

Only devices that are connected *right now* are considered, because the OS
remembers devices long after they are gone and attaching to one of those would
hang rather than fail. Implemented for BlueZ; elsewhere the scan result stands.

Robot programs still use the **on-hub** modules (`hub`, `motor`, `color_sensor`, …).
This library is the host side: editor/CLI/agent talking to the brick.

## CLI

```bash
spikeprime scan
spikeprime info
spikeprime upload examples/hub/hello.py --slot 0 --run
spikeprime console
spikeprime stop --slot 0
spikeprime firmware hub-firmware.bin --yes   # overwrites HubOS; see docs/PROTOCOL.md
```

`examples/hub/` is hub MicroPython (`import runloop`, `from hub import …`).
`examples/hello.py` is a PC script that uploads that file — do not send it to the brick.

## Layout

```
src/spikeprime/
  client.py              Hub, scan, connect
  devices.py             typed sensor/motor snapshots
  protocol/cobs.py       COBS + XOR framing
  protocol/messages.py   every HubOS message
docs-site/               the documentation site (Angular 21 + Optimus UI)
docs/                    short reference notes kept alongside the code
```

The full guide lives at
[dixonsolutions.github.io/SpikePrimePythonSDK](https://dixonsolutions.github.io/SpikePrimePythonSDK/);
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PROTOCOL.md](docs/PROTOCOL.md)
are the condensed versions.

## Documentation site

```bash
cd docs-site
npm ci
npm start        # http://localhost:4200
npm run build    # prerenders every page into dist/docs-site/browser
```

Pages are data rather than templates — one file per page under
`docs-site/src/app/content/pages/`, from which the navigation, search index,
pager, prerendered routes and sitemap are all derived. See
[docs-site/README.md](docs-site/README.md).

## Tests

```bash
pytest
```

COBS vectors are the official ones from the protocol examples.

## License

Apache 2.0. Protocol documentation Copyright 2024 the LEGO Group.
LEGO, SPIKE, and MINDSTORMS are trademarks of the LEGO Group.
See [NOTICE](NOTICE).
