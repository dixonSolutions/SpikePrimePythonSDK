"""Upload examples/hub/hello.py to a hub and print its console output."""

import asyncio
from pathlib import Path

from spikeprime import connect

HUB_PROGRAM = Path(__file__).parent / "hub" / "hello.py"


async def main() -> None:
    async with await connect() as hub:
        print(f"Connected to {await hub.get_name()} ({hub.info.firmware_version})")
        hub.on_console(lambda line: print(f"[hub] {line.rstrip()}"))
        await hub.run(HUB_PROGRAM, slot=0)
        await hub.wait_until_stopped()


if __name__ == "__main__":
    asyncio.run(main())
