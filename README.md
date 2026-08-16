# SpikePrimePythonSDK

Unofficial Python SDK for **SPIKE Prime HubOS 3** over Bluetooth Low Energy.
The import and CLI stay `spikeprime`.

It implements the protocol published by the LEGO Group at
[lego.github.io/spike-prime-docs](https://lego.github.io/spike-prime-docs/).
This project is not affiliated with, authorized by, or endorsed by the LEGO Group.

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
| `bundle("robot/main.py")` | multi-file project into one slot-sized file |

Robot programs still use the **on-hub** modules (`hub`, `motor`, `color_sensor`, …).
This library is the host side: editor/CLI/agent talking to the brick.

A slot holds one file, but your source tree does not have to. `spikeprime build`
inlines a multi-module project into the single file a slot wants, and `upload`
does it automatically when the entry file imports from the project. See
[docs/BUILD.md](docs/BUILD.md).

## CLI

```bash
spikeprime scan
spikeprime info
spikeprime upload examples/hub/hello.py --slot 0 --run
spikeprime build examples/hub/robot/main.py -o build/program.py
spikeprime upload examples/hub/robot/main.py --run   # bundles the project first
spikeprime console
spikeprime stop --slot 0
spikeprime firmware hub-firmware.bin --yes   # overwrites HubOS; see docs/PROTOCOL.md
```

`examples/hub/` is hub MicroPython (`import runloop`, `from hub import …`).
`examples/hello.py` is a PC script that uploads that file — do not send it to the brick.

## Layout

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PROTOCOL.md](docs/PROTOCOL.md).

```
src/spikeprime/
  client.py              Hub, scan, connect
  devices.py             typed sensor/motor snapshots
  protocol/cobs.py       COBS + XOR framing
  protocol/messages.py   every HubOS message
```

## Tests

```bash
pytest
```

COBS vectors are the official ones from the protocol examples.

## License

Apache 2.0. Protocol documentation Copyright 2024 the LEGO Group.
LEGO, SPIKE, and MINDSTORMS are trademarks of the LEGO Group.
See [NOTICE](NOTICE).
