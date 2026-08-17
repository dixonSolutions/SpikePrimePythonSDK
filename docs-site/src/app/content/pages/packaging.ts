import type { DocPage } from '../types';

export const packaging: DocPage = {
  slug: 'packaging-and-releases',
  title: 'Packaging and releases',
  summary:
    'How a push to main becomes a version, a GitHub Release, a PEP 503 index entry and this documentation site.',
  keywords: ['release', 'ci', 'github actions', 'pep 503', 'index', 'wheel', 'sdist', 'version', 'pages', 'deploy'],
  sections: [
    {
      id: 'pipeline',
      title: 'What CI does',
      blocks: [
        {
          kind: 'prose',
          html: 'Every push to <code>main</code> that passes tests publishes a new version of <strong>SpikePrimePythonSDK</strong>. Pull requests run the tests only.',
        },
        {
          kind: 'steps',
          steps: [
            { title: 'Run pytest', html: 'On Python 3.12. A failure stops everything else.' },
            {
              title: 'Set the version',
              html: 'to <code>0.1.{run_number}</code>. <code>scripts/set_version.py</code> stamps it into both <code>pyproject.toml</code> and <code>spikeprime.__version__</code>, so a wheel always reports the version it was released as. The number is the workflow run, so it only ever increases.',
            },
            { title: 'Build', html: 'a wheel and an sdist with <code>python -m build</code>.' },
            {
              title: 'Tag and release',
              html: 'Create the git tag <code>v0.1.N</code> and a GitHub Release carrying both artifacts.',
            },
            {
              title: 'Rebuild the package index',
              html: 'from <strong>every</strong> release artifact, not just the new one, so older versions stay installable.',
            },
            {
              title: 'Build this documentation site',
              html: 'and deploy it to GitHub Pages alongside the index.',
            },
          ],
        },
        {
          kind: 'prose',
          html: 'Skip a release with <code>[skip release]</code> in the commit message. A manual run is available from <em>Actions → Release → Run workflow</em>.',
        },
      ],
    },
    {
      id: 'site-layout',
      title: 'What ends up on GitHub Pages',
      blocks: [
        {
          kind: 'code',
          lang: 'text',
          code: `https://dixonsolutions.github.io/SpikePrimePythonSDK/
  index.html                     this documentation site
  docs/<page>/index.html         one prerendered file per page
  simple/                        the PEP 503 package index
    spikeprimepythonsdk/
      index.html                 links to every wheel and sdist
      SpikePrimePythonSDK-0.1.7-py3-none-any.whl
      ...
  404.html
  sitemap.xml`,
        },
        {
          kind: 'prose',
          html: 'The two live side by side deliberately. <code>/simple/</code> is the URL in every install command, so it must not move; the documentation takes the root.',
        },
      ],
    },
    {
      id: 'installing',
      title: 'Installing from the index',
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `pip install SpikePrimePythonSDK \\
  --index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/ \\
  --extra-index-url https://pypi.org/simple`,
        },
        {
          kind: 'prose',
          html: '<code>--index-url</code> is this project\'s index. <code>--extra-index-url</code> is PyPI, so <code>bleak</code> still resolves — <code>--index-url</code> replaces the default rather than adding to it. Every link in the generated index carries a <code>#sha256=</code> fragment, so pip verifies what it downloads.',
        },
        {
          kind: 'prose',
          html: 'Git works too, with or without a tag:',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `pip install git+https://github.com/dixonSolutions/SpikePrimePythonSDK.git
pip install git+https://github.com/dixonSolutions/SpikePrimePythonSDK.git@v0.1.7`,
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Not on PyPI',
          html: 'The package is not published to PyPI, so <code>pip install SpikePrimePythonSDK</code> on its own will not find it. The public install path is this GitHub Pages index.',
        },
      ],
    },
    {
      id: 'local-build',
      title: 'Building locally',
      blocks: [
        {
          kind: 'prose',
          html: 'The whole pipeline runs on a laptop, which is the fastest way to check a packaging change before pushing it.',
        },
        {
          kind: 'code',
          lang: 'bash',
          caption: 'The Python package and its index',
          code: `python -m pip install build
python -m build
python scripts/write_simple_index.py \\
  --dist dist \\
  --site site \\
  --repo-url https://github.com/dixonSolutions/SpikePrimePythonSDK \\
  --pages-url https://dixonsolutions.github.io/SpikePrimePythonSDK \\
  --version 0.1.0`,
        },
        {
          kind: 'code',
          lang: 'bash',
          caption: 'This documentation site',
          code: `cd docs-site
npm ci
npm start                       # dev server on http://localhost:4200
npm run build                   # prerenders into dist/docs-site/browser`,
        },
        {
          kind: 'prose',
          html: 'The production build sets a base href of <code>/SpikePrimePythonSDK/</code>, matching the Pages URL. To preview a production build locally, serve it from a directory of that name, or build with <code>ng build --base-href /</code>.',
        },
      ],
    },
    {
      id: 'index-generator',
      title: 'The index generator',
      blocks: [
        {
          kind: 'prose',
          html: '<code>scripts/write_simple_index.py</code> turns a directory of wheels and sdists into a <a href="https://peps.python.org/pep-0503/" target="_blank" rel="noopener">PEP 503</a> tree.',
        },
        {
          kind: 'table',
          headers: ['Flag', 'Meaning'],
          rows: [
            ['<code>--dist</code>', 'Directory of wheels and sdists to index'],
            ['<code>--site</code>', 'Output directory for the generated site'],
            ['<code>--repo-url</code>', 'Repository URL, used in the generated page'],
            ['<code>--pages-url</code>', 'Public site URL, used to build the install command'],
            ['<code>--version</code>', 'The version to describe as the latest release'],
            ['<code>--install-name</code>', 'Distribution name, defaulting to <code>SpikePrimePythonSDK</code>'],
            ['<code>--no-home</code>', 'Skip the standalone landing page, leaving the root to this documentation app'],
          ],
        },
        {
          kind: 'prose',
          html: 'It normalises names per PEP 503, groups files by distribution, computes a SHA-256 for each, and writes <code>.nojekyll</code> so GitHub Pages serves the tree verbatim. Its behaviour is covered by <code>tests/test_simple_index.py</code>.',
        },
      ],
    },
    {
      id: 'docs-deploy',
      title: 'How this site is deployed',
      blocks: [
        {
          kind: 'prose',
          html: 'The documentation is an Angular 21 application using Optimus UI, built with static prerendering: every page becomes a real HTML file, so a deep link works on GitHub Pages without a client-side fallback and is crawlable.',
        },
        {
          kind: 'list',
          items: [
            'The release workflow runs <code>npm ci</code> and <code>npm run build</code> in <code>docs-site/</code>.',
            'The prerendered output is copied to the root of the Pages artifact.',
            'The package index is generated into <code>simple/</code> under the same artifact, with <code>--no-home</code> so it leaves the root alone.',
            'The prerendered <code>not-found</code> page is copied to <code>404.html</code>, so an unknown URL still lands on a styled page.',
            'A <code>sitemap.xml</code> is generated from the page list.',
          ],
        },
        {
          kind: 'prose',
          html: 'Adding a documentation page means adding one file under <code>docs-site/src/app/content/pages/</code> and listing it in <code>content/index.ts</code>. The navigation, search index, previous/next links, prerendered routes and sitemap all follow from that — see <a href="docs/contributing#docs">Contributing</a>.',
        },
      ],
    },
    {
      id: 'versioning',
      title: 'Versioning',
      blocks: [
        {
          kind: 'prose',
          html: 'Versions are <code>0.1.N</code> where <code>N</code> is the CI run number. It is not semantic versioning: the project is alpha, and every release is simply the state of <code>main</code> at that moment.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The committed version is a placeholder',
          html: 'Whatever <code>pyproject.toml</code> holds in git is overwritten at build time, so editing it by hand achieves nothing — and hand-creating a <code>v0.1.N</code> tag will collide with a future run number and fail the release outright. Let CI own both.',
        },
        {
          kind: 'prose',
          html: 'Pin a tag if you need reproducibility. The high-level <code>Hub</code> surface is stable in practice, but the protocol layer tracks a specification the LEGO Group can revise.',
        },
      ],
    },
  ],
};
