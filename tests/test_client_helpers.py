from pathlib import Path

from spikeprime.cli import _looks_like_host_script
from spikeprime.client import _read_source
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
