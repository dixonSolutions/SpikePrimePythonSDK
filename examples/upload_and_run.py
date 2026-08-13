"""Upload a file from disk and start it."""

import argparse
import asyncio
from pathlib import Path

from spikeprime import connect


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    parser.add_argument("--slot", type=int, default=0)
    args = parser.parse_args()

    async with await connect() as hub:
        await hub.run(args.file, slot=args.slot)
        print(f"Running {args.file.name} in slot {args.slot}")
        await hub.wait_disconnected()


if __name__ == "__main__":
    asyncio.run(main())
