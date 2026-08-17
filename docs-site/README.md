# docs-site

The SpikePrimePythonSDK documentation site: **Angular 21** with **[Optimus UI](https://www.openng.org/)**,
built as a static, prerendered site and deployed to GitHub Pages alongside the
PEP 503 package index at `/simple/`.

Published at <https://dixonsolutions.github.io/SpikePrimePythonSDK/>.

## Working on it

```bash
npm ci
npm start        # dev server on http://localhost:4200
npm run build    # prerender every page into dist/docs-site/browser
```

The production build sets `--base-href /SpikePrimePythonSDK/` to match the Pages
URL. To preview it locally, serve `dist/docs-site/browser` from a directory of
that name, or build with `ng build --base-href /`.

## How it is put together

Pages are **data, not templates**. Each one exports a `DocPage` from
`src/app/content/pages/`, and one generic renderer draws them all. Everything
else is derived from that single source, so nothing can drift apart:

| Derived from the content model | Where |
|---|---|
| Sidebar navigation | `layout/sidebar.ts` |
| On-page table of contents | `layout/toc.ts` |
| Full-text search (Ctrl/⌘ K) | `core/search.ts` |
| Previous/next pager | `content/index.ts` |
| Prerendered route list | `app.routes.server.ts` |
| `sitemap.xml` | `scripts/write_sitemap.py`, over the built output |

```
src/app/
  content/
    types.ts        the block and page model
    index.ts        groups, ordering, lookup helpers
    pages/*.ts      one file per documentation page
  shared/
    blocks.ts       renders a Block[]
    code-block.ts   code with a language label and copy button
    api-entry.ts    one API entry: signature, params, returns, raises
    highlight.ts    a small dependency-free highlighter
  layout/           sidebar, table of contents, search dialog
  pages/            home, docs index, doc page, 404
  core/             theme, search index, SEO, site constants
```

## Adding a page

1. Add a file to `src/app/content/pages/` exporting a `DocPage` — slug, title,
   one-sentence summary, and a list of sections.
2. List it in `src/app/content/index.ts`, in the group it belongs to. Order in
   that array is the order in the sidebar and in the pager.
3. Build the page out of blocks: `prose`, `code`, `list`, `table`, `callout`,
   `steps`, `cards`, `terminal`, `api`.

Section `id`s are the anchors and end up in links, so keep them stable.

Cross-references are authored as base-relative anchors — `<a href="docs/installation">`,
with no leading slash. That resolves correctly against `<base href>` both
locally and under the `/SpikePrimePythonSDK/` path, and a click handler in
`shared/blocks.ts` turns an ordinary left click into a router navigation.

`html` fields are bound with `[innerHTML]` and sanitized by Angular; they are
for inline tags only. Code samples belong in a `code` block, where they get
highlighting and a copy button.
