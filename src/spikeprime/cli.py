"""Command-line interface for a connected hub."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from spikeprime.build import bundle, has_local_imports
from spikeprime.client import Hub, connect, scan
from spikeprime.errors import BuildError, HubError

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

    build = sub.add_parser(
        "build", help="Bundle a multi-file hub project into one uploadable file"
    )
    build.add_argument("entry", type=Path, help="The program's entry point")
    build.add_argument("-o", "--output", type=Path, help="Write here instead of stdout")
    build.add_argument("--root", type=Path, help="Project root imports resolve against")

    upload = sub.add_parser("upload", help="Upload a Python file to a slot")
    upload.add_argument("file", type=Path)
    upload.add_argument("--slot", type=int, default=0)
    upload.add_argument("--filename", default="program.py")
    upload.add_argument("--run", action="store_true", help="Start the program after upload")
    upload.add_argument("--root", type=Path, help="Project root imports resolve against")
    upload.add_argument(
        "--no-bundle",
        action="store_true",
        help="Upload the file as-is, even if it imports other project modules",
    )

    run = sub.add_parser("run", help="Start the program in a slot")
    run.add_argument("--slot", type=int, default=0)

    stop = sub.add_parser("stop", help="Stop the program in a slot")
    stop.add_argument("--slot", type=int, default=0)

    clear = sub.add_parser("clear", help="Erase a program slot")
    clear.add_argument("--slot", type=int, default=0)

    console = sub.add_parser("console", help="Print hub stdout until Ctrl+C")
    console.add_argument("--notifications", type=int, default=0, metavar="MS")

    firmware = sub.add_parser("firmware", help="Flash a firmware image to the hub")
    firmware.add_argument("file", type=Path)
    firmware.add_argument(
        "--yes",
        action="store_true",
        help="Required. Confirms you want to overwrite the hub's firmware",
    )
    firmware.add_argument(
        "--stage-only",
        action="store_true",
        help="Upload the image but do not begin the update",
    )

    try:
        args = parser.parse_args(argv)
        if args.command == "firmware":
            problem = _firmware_objection(args)
            if problem:
                print(f"error: {problem}", file=sys.stderr)
                return 2
        if args.command == "build":
            return _build(args)
        return asyncio.run(_dispatch(args))
    except KeyboardInterrupt:
        print("Interrupted.", file=sys.stderr)
        return 130
    except BuildError as exc:
        print(f"build error: {exc}", file=sys.stderr)
        return 1
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
            source = _maybe_bundle(args, source)
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
        if args.command == "firmware":
            return await _firmware(hub, args)
        if args.command == "console":
            if args.notifications:
                await hub.enable_notifications(args.notifications)
            print("Listening for console output. Ctrl+C to stop.")
            await _print_console(hub)
    return 0


def _build(args: argparse.Namespace) -> int:
    result = bundle(args.entry, root=args.root)
    for note in result.notes:
        print(f"note: {note}", file=sys.stderr)
    if args.output:
        args.output.write_text(result.source, encoding="utf-8")
        print(
            f"Bundled {len(result.modules)} modules into {args.output} "
            f"({len(result.source.encode()):,} bytes).",
            file=sys.stderr,
        )
    else:
        print(result.source, end="")
    return 0


def _maybe_bundle(args: argparse.Namespace, source: bytes) -> bytes:
    """Inline local imports before upload, unless the caller opted out."""
    if args.no_bundle or not has_local_imports(args.file, root=args.root):
        return source
    result = bundle(args.file, root=args.root)
    for note in result.notes:
        print(f"note: {note}", file=sys.stderr)
    others = len(result.modules) - 1
    print(f"Bundled {others} imported module{'' if others == 1 else 's'} into the upload.")
    return result.encode()


def _firmware_objection(args: argparse.Namespace) -> str | None:
    """Reasons to refuse a flash, checked before we go anywhere near a hub."""
    if not args.file.is_file():
        return f"{args.file} does not exist"
    if not args.yes:
        return (
            "flashing firmware overwrites the hub's operating system and cannot "
            "be undone from this SDK. Re-run with --yes to confirm."
        )
    return None


async def _firmware(hub: Hub, args: argparse.Namespace) -> int:
    def _progress(sent: int, total: int) -> None:
        print(f"\r{sent}/{total} bytes ({sent * 100 // total}%)", end="")
        sys.stdout.flush()

    await hub.update_firmware(args.file, begin=not args.stage_only, progress=_progress)
    print()
    if args.stage_only:
        print("Image staged. The hub was not updated.")
    else:
        print("Update started. The hub reboots into the updater and disconnects.")
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
