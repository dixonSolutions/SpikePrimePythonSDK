#!/usr/bin/env python3
"""Stamp a release version into pyproject.toml and the package __init__.

CI decides the version at build time, so whatever is committed is only ever a
placeholder. Matching the version line by shape rather than by its current value
is what keeps that true: an earlier build of this pipeline hard-coded the string
it expected to find and broke every release the moment someone edited the file
by hand.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

PYPROJECT = re.compile(r'(?m)^version = "[^"]*"')
DUNDER = re.compile(r'(?m)^__version__ = "[^"]*"')


def replace_once(path: Path, pattern: re.Pattern[str], replacement: str) -> None:
    text = path.read_text(encoding="utf-8")
    new_text, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit(f"no line matching {pattern.pattern!r} in {path}")
    path.write_text(new_text, encoding="utf-8")


def set_version(root: Path, version: str) -> None:
    replace_once(root / "pyproject.toml", PYPROJECT, f'version = "{version}"')
    replace_once(
        root / "src" / "spikeprime" / "__init__.py",
        DUNDER,
        f'__version__ = "{version}"',
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True, help="The version to stamp, e.g. 0.1.8")
    parser.add_argument("--root", type=Path, default=Path("."), help="Repository root")
    args = parser.parse_args()

    if not re.fullmatch(r"\d+(\.\d+)*([a-z0-9.\-]*)", args.version):
        raise SystemExit(f"{args.version!r} does not look like a version")
    set_version(args.root, args.version)
    print(f"stamped {args.version}")


if __name__ == "__main__":
    main()
