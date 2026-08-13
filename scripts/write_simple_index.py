#!/usr/bin/env python3
"""Build a PEP 503 simple index and a human landing page from dist files."""

from __future__ import annotations

import argparse
import hashlib
import html
from pathlib import Path

PACKAGE = "spikeprime"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def dist_files(directory: Path) -> list[Path]:
    files = [
        path
        for path in directory.iterdir()
        if path.is_file()
        and (path.suffix in {".whl", ".zip"} or path.name.endswith(".tar.gz"))
    ]
    return sorted(files, key=lambda path: path.name)


def write_simple_index(files: list[Path], dest: Path, package: str = PACKAGE) -> None:
    simple = dest / "simple"
    package_dir = simple / package
    package_dir.mkdir(parents=True, exist_ok=True)

    for path in files:
        target = package_dir / path.name
        if path.resolve() != target.resolve():
            target.write_bytes(path.read_bytes())

    links = []
    for path in sorted(package_dir.iterdir(), key=lambda item: item.name):
        if path.name == "index.html" or not path.is_file():
            continue
        digest = sha256_file(path)
        name = html.escape(path.name)
        links.append(f'    <a href="{name}#sha256={digest}" data-requires-python="&gt;=3.10">{name}</a><br/>')

    package_dir.joinpath("index.html").write_text(
        "<!DOCTYPE html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">"
        f"<title>{html.escape(package)}</title></head>\n<body>\n"
        + "\n".join(links)
        + "\n</body></html>\n",
        encoding="utf-8",
    )
    simple.joinpath("index.html").write_text(
        "<!DOCTYPE html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">"
        "<title>simple</title></head>\n<body>\n"
        f'    <a href="{html.escape(package)}/">{html.escape(package)}</a>\n'
        "</body></html>\n",
        encoding="utf-8",
    )


def write_home(dest: Path, *, repo_url: str, pages_url: str, version: str) -> None:
    simple_url = pages_url.rstrip("/") + "/simple/"
    dest.joinpath("index.html").write_text(
        f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>spikeprime</title>
  <style>
    :root {{ color-scheme: light dark; }}
    body {{
      font-family: ui-sans-serif, system-ui, sans-serif;
      max-width: 40rem;
      margin: 3rem auto;
      padding: 0 1.25rem;
      line-height: 1.5;
    }}
    h1 {{ font-size: 1.6rem; margin-bottom: 0.25rem; }}
    .muted {{ opacity: 0.72; margin-top: 0; }}
    pre {{
      background: Canvas;
      border: 1px solid color-mix(in srgb, CanvasText 16%, transparent);
      padding: 0.9rem 1rem;
      overflow-x: auto;
      border-radius: 8px;
    }}
    code {{ font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.92em; }}
    a {{ color: inherit; }}
  </style>
</head>
<body>
  <h1>spikeprime</h1>
  <p class="muted">Unofficial HubOS 3 SDK. Latest release {html.escape(version)}.</p>
  <p>Install from this GitHub Pages package index (dependencies still come from PyPI):</p>
  <pre><code>pip install spikeprime \\
  --index-url {html.escape(simple_url)} \\
  --extra-index-url https://pypi.org/simple</code></pre>
  <p>Or install the git default branch:</p>
  <pre><code>pip install git+{html.escape(repo_url)}.git</code></pre>
  <p><a href="{html.escape(repo_url)}">Source</a> · <a href="simple/">PEP 503 index</a></p>
</body>
</html>
""",
        encoding="utf-8",
    )
    dest.joinpath(".nojekyll").write_text("", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", type=Path, required=True, help="Directory of wheels/sdists")
    parser.add_argument("--site", type=Path, required=True, help="Output site directory")
    parser.add_argument("--repo-url", required=True)
    parser.add_argument("--pages-url", required=True)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()

    args.site.mkdir(parents=True, exist_ok=True)
    files = dist_files(args.dist)
    if not files:
        raise SystemExit(f"no dist files in {args.dist}")
    write_simple_index(files, args.site)
    write_home(
        args.site,
        repo_url=args.repo_url,
        pages_url=args.pages_url,
        version=args.version,
    )


if __name__ == "__main__":
    main()
