#!/usr/bin/env python3
"""Write a sitemap for the prerendered documentation site.

Every documentation route is a real `index.html` on disk, so the sitemap is
simply a walk of the built tree. The package index under `simple/` is excluded:
it is for pip, not for search engines. Routes the app redirects away from are
prerendered as meta-refresh stubs and are excluded too, so the sitemap only
lists addresses that actually serve content.
"""

from __future__ import annotations

import argparse
import xml.etree.ElementTree as ET
from pathlib import Path

# `simple/` is the pip index, not content; `not-found/` is only there so it can
# be copied to 404.html. Neither belongs in a sitemap.
EXCLUDED_DIRS = {"simple", "not-found"}


def is_redirect(page: Path) -> bool:
    """True for the meta-refresh stub the prerenderer writes for a redirect route."""
    return 'http-equiv="refresh"' in page.read_text(encoding="utf-8", errors="ignore")


def page_paths(site: Path) -> list[str]:
    """Site-relative URL paths for every prerendered page, root first."""
    paths: list[str] = []
    for index in site.rglob("index.html"):
        relative = index.relative_to(site).parent
        if relative.parts and relative.parts[0] in EXCLUDED_DIRS:
            continue
        if is_redirect(index):
            continue
        paths.append("/".join(relative.parts))
    # The root sorts to "" and so comes first; the rest are alphabetical.
    return sorted(set(paths))


def write_sitemap(site: Path, base_url: str, lastmod: str | None = None) -> int:
    base = base_url.rstrip("/")
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    paths = page_paths(site)
    for path in paths:
        url = ET.SubElement(urlset, "url")
        ET.SubElement(url, "loc").text = f"{base}/{path}/" if path else f"{base}/"
        if lastmod:
            ET.SubElement(url, "lastmod").text = lastmod
        ET.SubElement(url, "priority").text = "1.0" if not path else "0.7"
    tree = ET.ElementTree(urlset)
    ET.indent(tree, space="  ")
    tree.write(site / "sitemap.xml", encoding="utf-8", xml_declaration=True)
    return len(paths)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, required=True, help="The built site directory")
    parser.add_argument("--base-url", required=True, help="Public URL the site is served from")
    parser.add_argument("--lastmod", help="ISO date to record for every page")
    args = parser.parse_args()

    if not args.site.is_dir():
        raise SystemExit(f"{args.site} is not a directory")
    count = write_sitemap(args.site, args.base_url, args.lastmod)
    if not count:
        raise SystemExit(f"no pages found under {args.site}")
    print(f"sitemap.xml: {count} pages")


if __name__ == "__main__":
    main()
