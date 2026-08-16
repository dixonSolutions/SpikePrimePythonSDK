import argparse
from pathlib import Path

import pytest

from spikeprime.cli import _firmware_objection, _looks_like_host_script
from spikeprime.client import _read_binary, _read_source
from spikeprime.enums import Color


def test_color_from_int8() -> None:
    assert Color.from_int8(9) is Color.RED
    assert Color.from_int8(-1) is Color.UNKNOWN
    assert Color.from_int8(0xFF) is Color.UNKNOWN
    assert Color.from_int8(99) is Color.UNKNOWN


def test_host_script_detection() -> None:
    hub = Path("examples/hub/hello.py").read_bytes()
    host = Path("examples/hello.py").read_bytes()
    assert not _looks_like_host_script(hub)
    assert _looks_like_host_script(host)


def test_read_source_bytes_and_text(tmp_path) -> None:
    assert _read_source(b"abc") == b"abc"
    assert _read_source("print(1)") == b"print(1)"
    path = tmp_path / "program.py"
    path.write_text("print(2)\n")
    assert _read_source(path) == b"print(2)\n"
    assert _read_source(str(path)) == b"print(2)\n"


def test_read_binary_treats_str_as_a_path(tmp_path) -> None:
    path = tmp_path / "hub.bin"
    path.write_bytes(b"\x00\x01\x02")
    assert _read_binary(b"\xff") == b"\xff"
    assert _read_binary(path) == b"\x00\x01\x02"
    assert _read_binary(str(path)) == b"\x00\x01\x02"
    with pytest.raises(OSError):
        _read_binary("not-a-firmware-file.bin")


def test_firmware_needs_confirmation_and_a_real_file(tmp_path) -> None:
    missing = argparse.Namespace(file=tmp_path / "absent.bin", yes=True)
    assert "does not exist" in (_firmware_objection(missing) or "")

    path = tmp_path / "hub.bin"
    path.write_bytes(b"\x00")
    assert "--yes" in (_firmware_objection(argparse.Namespace(file=path, yes=False)) or "")
    assert _firmware_objection(argparse.Namespace(file=path, yes=True)) is None
