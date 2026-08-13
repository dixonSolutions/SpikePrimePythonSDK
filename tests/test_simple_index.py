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
