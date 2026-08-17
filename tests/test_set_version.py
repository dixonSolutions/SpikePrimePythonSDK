"""The release pipeline broke once because this logic lived untested in YAML."""

import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "set_version.py"

SPEC = importlib.util.spec_from_file_location("set_version", SCRIPT)
assert SPEC and SPEC.loader
set_version = importlib.util.module_from_spec(SPEC)
sys.modules["set_version"] = set_version
SPEC.loader.exec_module(set_version)


def build_repo(root: Path, version: str) -> None:
    (root / "src" / "spikeprime").mkdir(parents=True)
    (root / "pyproject.toml").write_text(
        '[project]\nname = "SpikePrimePythonSDK"\n'
        f'version = "{version}"\n'
        'requires-python = ">=3.10"\n\n'
        '[tool.ruff]\ntarget-version = "py310"\n',
        encoding="utf-8",
    )
    (root / "src" / "spikeprime" / "__init__.py").write_text(
        f'"""Docstring."""\n\n__version__ = "{version}"\n__all__ = ["Hub"]\n',
        encoding="utf-8",
    )


def read(root: Path) -> tuple[str, str]:
    return (
        (root / "pyproject.toml").read_text(encoding="utf-8"),
        (root / "src" / "spikeprime" / "__init__.py").read_text(encoding="utf-8"),
    )


def test_stamps_both_files(tmp_path: Path) -> None:
    build_repo(tmp_path, "0.1.0")

    set_version.set_version(tmp_path, "0.1.9")

    pyproject, init = read(tmp_path)
    assert 'version = "0.1.9"' in pyproject
    assert '__version__ = "0.1.9"' in init


def test_replaces_whatever_version_is_committed(tmp_path: Path) -> None:
    """The exact failure that stalled releases: a hand-edited version string."""
    build_repo(tmp_path, "0.1.7")

    set_version.set_version(tmp_path, "0.1.8")

    pyproject, init = read(tmp_path)
    assert 'version = "0.1.8"' in pyproject
    assert '__version__ = "0.1.8"' in init
    assert "0.1.7" not in pyproject


def test_leaves_other_settings_alone(tmp_path: Path) -> None:
    build_repo(tmp_path, "0.1.0")

    set_version.set_version(tmp_path, "1.2.3")

    pyproject, init = read(tmp_path)
    assert 'target-version = "py310"' in pyproject
    assert 'requires-python = ">=3.10"' in pyproject
    assert '__all__ = ["Hub"]' in init


def test_refuses_a_file_without_a_version(tmp_path: Path) -> None:
    build_repo(tmp_path, "0.1.0")
    (tmp_path / "pyproject.toml").write_text('[project]\nname = "x"\n', encoding="utf-8")

    try:
        set_version.set_version(tmp_path, "0.1.8")
    except SystemExit as exc:
        assert "pyproject.toml" in str(exc)
    else:
        raise AssertionError("expected SystemExit")


def test_cli_stamps_the_real_repository_layout(tmp_path: Path) -> None:
    build_repo(tmp_path, "0.1.0")

    subprocess.check_call(
        [sys.executable, str(SCRIPT), "--version", "2.0.0", "--root", str(tmp_path)]
    )

    pyproject, init = read(tmp_path)
    assert 'version = "2.0.0"' in pyproject
    assert '__version__ = "2.0.0"' in init


def test_the_real_repository_has_the_lines_the_script_expects() -> None:
    """Guards against the files drifting out from under the release pipeline."""
    assert set_version.PYPROJECT.search((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    assert set_version.DUNDER.search(
        (ROOT / "src" / "spikeprime" / "__init__.py").read_text(encoding="utf-8")
    )
