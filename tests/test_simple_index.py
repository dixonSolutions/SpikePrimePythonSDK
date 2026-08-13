import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "write_simple_index.py"


def test_simple_index_lists_wheel_and_sdist(tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "spikeprime-0.1.1-py3-none-any.whl").write_bytes(b"wheel")
    (dist / "spikeprime-0.1.1.tar.gz").write_bytes(b"sdist")
    site = tmp_path / "site"

    subprocess.check_call(
        [
            sys.executable,
            str(SCRIPT),
            "--dist",
            str(dist),
            "--site",
            str(site),
            "--repo-url",
            "https://github.com/dixonSolutions/spikeprime",
            "--pages-url",
            "https://dixonsolutions.github.io/spikeprime",
            "--version",
            "0.1.1",
        ]
    )

    package_index = (site / "simple" / "spikeprime" / "index.html").read_text(encoding="utf-8")
    assert "spikeprime-0.1.1-py3-none-any.whl#sha256=" in package_index
    assert "spikeprime-0.1.1.tar.gz#sha256=" in package_index
    assert (site / ".nojekyll").exists()
    home = (site / "index.html").read_text(encoding="utf-8")
    assert "--index-url https://dixonsolutions.github.io/spikeprime/simple/" in home
