import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "write_simple_index.py"


def test_simple_index_lists_wheel_and_sdist(tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "SpikePrimePythonSDK-0.1.1-py3-none-any.whl").write_bytes(b"wheel")
    (dist / "SpikePrimePythonSDK-0.1.1.tar.gz").write_bytes(b"sdist")
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
            "https://github.com/dixonSolutions/SpikePrimePythonSDK",
            "--pages-url",
            "https://dixonsolutions.github.io/SpikePrimePythonSDK",
            "--version",
            "0.1.1",
        ]
    )

    package_index = (site / "simple" / "spikeprimepythonsdk" / "index.html").read_text(
        encoding="utf-8"
    )
    assert "SpikePrimePythonSDK-0.1.1-py3-none-any.whl#sha256=" in package_index
    assert "SpikePrimePythonSDK-0.1.1.tar.gz#sha256=" in package_index
    assert (site / ".nojekyll").exists()
    home = (site / "index.html").read_text(encoding="utf-8")
    assert "pip install SpikePrimePythonSDK" in home
    assert "--index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/" in home


def test_no_home_leaves_the_root_index_alone(tmp_path: Path) -> None:
    """The docs app owns index.html, so --no-home must not overwrite it."""
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "SpikePrimePythonSDK-0.1.1-py3-none-any.whl").write_bytes(b"wheel")
    site = tmp_path / "site"
    site.mkdir()
    (site / "index.html").write_text("<!doctype html><title>docs app</title>", encoding="utf-8")

    subprocess.check_call(
        [
            sys.executable,
            str(SCRIPT),
            "--dist",
            str(dist),
            "--site",
            str(site),
            "--repo-url",
            "https://github.com/dixonSolutions/SpikePrimePythonSDK",
            "--pages-url",
            "https://dixonsolutions.github.io/SpikePrimePythonSDK",
            "--version",
            "0.1.1",
            "--no-home",
        ]
    )

    assert (site / "index.html").read_text(encoding="utf-8") == (
        "<!doctype html><title>docs app</title>"
    )
    assert (site / "simple" / "spikeprimepythonsdk" / "index.html").exists()
    assert (site / ".nojekyll").exists()
