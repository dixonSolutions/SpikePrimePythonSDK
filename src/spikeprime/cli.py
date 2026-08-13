"""Command-line interface for a connected hub."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from spikeprime.client import Hub, connect, scan
from spikeprime.errors import HubError

_HOST_MARKERS = (
    b"from spikeprime",
    b"import spikeprime",
    b"from bleak",
    b"import bleak",
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="spikeprime",
        description="SpikePrimePythonSDK: talk to a SPIKE Prime hub over Bluetooth (HubOS 3).",
    )
    parser.add_argument("--address", help="Connect to this BLE address")
    parser.add_argument("--name", help="Connect to a hub whose advertised name matches")
    parser.add_argument("--timeout", type=float, default=10.0, help="Scan timeout in seconds")

    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("scan", help="List nearby hubs")
    sub.add_parser("info", help="Print firmware and identity")

    upload = sub.add_parser("upload", help="Upload a Python file to a slot")
    upload.add_argument("file", type=Path)
    upload.add_argument("--slot", type=int, default=0)
    upload.add_argument("--filename", default="program.py")
    upload.add_argument("--run", action="store_true", help="Start the program after upload")

    run = sub.add_parser("run", help="Start the program in a slot")
    run.add_argument("--slot", type=int, default=0)

    stop = sub.add_parser("stop", help="Stop the program in a slot")
    stop.add_argument("--slot", type=int, default=0)

    clear = sub.add_parser("clear", help="Erase a program slot")
    clear.add_argument("--slot", type=int, default=0)

    console = sub.add_parser("console", help="Print hub stdout until Ctrl+C")
    console.add_argument("--notifications", type=int, default=0, metavar="MS")

    try:
        args = parser.parse_args(argv)
        return asyncio.run(_dispatch(args))
    except KeyboardInterrupt:
        print("Interrupted.", file=sys.stderr)
        return 130
    except HubError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


async def _dispatch(args: argparse.Namespace) -> int:
    if args.command == "scan":
        hubs = await scan(timeout=args.timeout)
        if not hubs:
            print("No hubs found.")
            return 1
        for hub in hubs:
            rssi = f"{hub.rssi} dBm" if hub.rssi is not None else "n/a"
            print(f"{hub.address}\t{hub.name or '(unnamed)'}\t{rssi}")
        return 0

    async with await connect(address=args.address, name=args.name, timeout=args.timeout) as hub:
        if args.command == "info":
            return await _info(hub)
        if args.command == "upload":
            source = args.file.read_bytes()
            if _looks_like_host_script(source):
                print(
                    f"error: {args.file} looks like a PC script, not hub MicroPython.\n"
                    "Upload a file that uses hub modules, e.g. examples/hub/hello.py",
                    file=sys.stderr,
                )
                return 2
            await hub.upload(source, slot=args.slot, filename=args.filename)
            print(f"Uploaded {args.file} to slot {args.slot}.")
            if args.run:
                await hub.start(args.slot)
                print("Started. Console (Ctrl+C to stop):")
                await _listen(hub)
            return 0
        if args.command == "run":
            await hub.start(args.slot)
            print(f"Started slot {args.slot}.")
            return 0
        if args.command == "stop":
            await hub.stop(args.slot)
            print(f"Stopped slot {args.slot}.")
            return 0
        if args.command == "clear":
            await hub.clear_slot(args.slot)
            print(f"Cleared slot {args.slot}.")
            return 0
        if args.command == "console":
            if args.notifications:
                await hub.enable_notifications(args.notifications)
            print("Listening for console output. Ctrl+C to stop.")
            await _print_console(hub)
    return 0


def _looks_like_host_script(source: bytes) -> bool:
    return any(marker in source for marker in _HOST_MARKERS)


def _print_line(line: str) -> None:
    print(line, end="" if line.endswith("\n") else "\n")
    sys.stdout.flush()


async def _print_console(hub: Hub) -> None:
    async for line in hub.console():
        _print_line(line)


async def _listen(hub: Hub) -> None:
    printer = asyncio.create_task(_print_console(hub))
    try:
        await hub.wait_until_stopped()
        await asyncio.sleep(0.4)
    finally:
        printer.cancel()
        try:
            await printer
        except asyncio.CancelledError:
            pass


async def _info(hub: Hub) -> int:
    info = hub.info
    print(f"address:   {hub.address}")
    print(f"ble name:  {hub.ble_name or ''}")
    print(f"hub name:  {await hub.get_name()}")
    print(f"uuid:      {await hub.uuid()}")
    print(f"firmware:  {info.firmware_version}")
    print(f"rpc:       {info.rpc_version}")
    print(f"packet:    {info.max_packet_size} bytes")
    print(f"message:   {info.max_message_size} bytes")
    print(f"chunk:     {info.max_chunk_size} bytes")
    return 0
