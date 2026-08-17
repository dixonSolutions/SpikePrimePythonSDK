import importlib.util
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

# scripts/ is release tooling rather than part of the package, so it is loaded
# by path instead of imported.
ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "write_sitemap", ROOT / "scripts" / "write_sitemap.py"
)
assert SPEC and SPEC.loader
write_sitemap = importlib.util.module_from_spec(SPEC)
sys.modules["write_sitemap"] = write_sitemap
SPEC.loader.exec_module(write_sitemap)

NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def build_site(root: Path) -> None:
    for path in ("", "docs", "docs/installation", "docs/api-client", "not-found"):
        page = root / path / "index.html" if path else root / "index.html"
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text("<html></html>", encoding="utf-8")
    # The pip index must stay out of the sitemap.
    package = root / "simple" / "spikeprimepythonsdk"
    package.mkdir(parents=True)
    (package / "index.html").write_text("<html></html>", encoding="utf-8")


def test_sitemap_lists_pages_and_skips_the_package_index(tmp_path: Path) -> None:
    build_site(tmp_path)

    count = write_sitemap.write_sitemap(
        tmp_path, "https://dixonsolutions.github.io/SpikePrimePythonSDK/"
    )

    assert count == 4  # root, docs, docs/installation, docs/api-client
    tree = ET.parse(tmp_path / "sitemap.xml")
    locations = [element.text for element in tree.getroot().findall("sm:url/sm:loc", NS)]
    assert "https://dixonsolutions.github.io/SpikePrimePythonSDK/" in locations
    assert "https://dixonsolutions.github.io/SpikePrimePythonSDK/docs/installation/" in locations
    assert not any("simple" in (location or "") for location in locations)
    assert not any("not-found" in (location or "") for location in locations)
