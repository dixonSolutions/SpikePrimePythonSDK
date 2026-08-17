import type { DocPage } from '../types';

export const installation: DocPage = {
  slug: 'installation',
  title: 'Installation',
  summary:
    'Install SpikePrimePythonSDK from the project package index, from git, or from a checkout — and confirm it works.',
  keywords: ['pip', 'install', 'index-url', 'pep 503', 'wheel', 'editable', 'uv', 'poetry', 'upgrade'],
  sections: [
    {
      id: 'requirements',
      title: 'Before you start',
      blocks: [
        {
          kind: 'list',
          items: [
            '<strong>Python 3.10 or newer.</strong> Check with <code>python --version</code>.',
            '<strong>A Bluetooth LE adapter</strong> the operating system already sees. Pairing the hub is <em>not</em> required — the SDK connects directly.',
            '<strong>A SPIKE Prime hub on HubOS 3</strong>, switched on and not already connected to the LEGO app.',
          ],
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Per-OS Bluetooth setup lives elsewhere',
          html: 'Adapter permissions, BlueZ versions and the macOS privacy prompt are covered in <a href="docs/project-setup">Project setup</a>. This page is only about getting the package installed.',
        },
      ],
    },
    {
      id: 'package-index',
      title: 'From the project package index',
      blocks: [
        {
          kind: 'prose',
          html: 'The package is <strong>not published to PyPI</strong>. Releases are served from a <a href="https://peps.python.org/pep-0503/" target="_blank" rel="noopener">PEP 503</a> index hosted on this same GitHub Pages site, so <code>pip</code> needs to be pointed at it:',
        },
        {
          kind: 'code',
          lang: 'bash',
          caption: 'The canonical install',
          code: `pip install SpikePrimePythonSDK \\
  --index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/ \\
  --extra-index-url https://pypi.org/simple`,
        },
        {
          kind: 'prose',
          html: 'Both flags matter. <code>--index-url</code> <em>replaces</em> pip\'s default index, so without <code>--extra-index-url</code> the dependency on <code>bleak</code> would fail to resolve.',
        },
        {
          kind: 'prose',
          html: 'To avoid repeating them, put the same two lines in a <code>pip.conf</code> (<code>pip.ini</code> on Windows), or in the project\'s <code>requirements.txt</code>:',
        },
        {
          kind: 'code',
          lang: 'text',
          caption: 'requirements.txt',
          code: `--index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/
--extra-index-url https://pypi.org/simple

SpikePrimePythonSDK`,
        },
      ],
    },
    {
      id: 'from-git',
      title: 'From git',
      blocks: [
        {
          kind: 'prose',
          html: 'If you would rather not point pip at a custom index, install the default branch straight from GitHub:',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `pip install git+https://github.com/dixonSolutions/SpikePrimePythonSDK.git`,
        },
        {
          kind: 'prose',
          html: 'Pin a released tag when you want a reproducible build. Tags are <code>v0.1.N</code>, one per merged change to <code>main</code>:',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `pip install git+https://github.com/dixonSolutions/SpikePrimePythonSDK.git@v0.1.7`,
        },
      ],
    },
    {
      id: 'development',
      title: 'From a checkout, for development',
      blocks: [
        {
          kind: 'prose',
          html: 'An editable install points your environment at the working tree, so edits take effect without reinstalling. The <code>dev</code> extra adds <code>pytest</code> and <code>pytest-asyncio</code>.',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `git clone https://github.com/dixonSolutions/SpikePrimePythonSDK.git
cd SpikePrimePythonSDK
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
pip install -e ".[dev]"
pytest -q`,
        },
        {
          kind: 'prose',
          html: 'The test suite runs entirely offline — no hub, no Bluetooth adapter — because it exercises the framing, CRC and message layers against the vectors from the official protocol documentation.',
        },
      ],
    },
    {
      id: 'other-tools',
      title: 'uv, Poetry and PDM',
      blocks: [
        {
          kind: 'prose',
          html: 'Any installer that understands a simple index works; each one spells the extra index differently.',
        },
        {
          kind: 'code',
          lang: 'bash',
          caption: 'uv',
          code: `uv pip install SpikePrimePythonSDK \\
  --index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/ \\
  --extra-index-url https://pypi.org/simple`,
        },
        {
          kind: 'code',
          lang: 'toml',
          caption: 'pyproject.toml, for Poetry',
          code: `[[tool.poetry.source]]
name = "spikeprime"
url = "https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/"
priority = "supplemental"

[tool.poetry.dependencies]
python = "^3.10"
SpikePrimePythonSDK = { version = "*", source = "spikeprime" }`,
        },
      ],
    },
    {
      id: 'verify',
      title: 'Verify the install',
      blocks: [
        {
          kind: 'prose',
          html: 'Two checks: the import name and the console script. Remember the distribution is <code>SpikePrimePythonSDK</code> but the module is <code>spikeprime</code>.',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `python -c "import spikeprime; print(spikeprime.__version__)"
spikeprime --help`,
        },
        {
          kind: 'prose',
          html: 'With a hub switched on nearby, the fastest end-to-end check is a scan. It needs no connection, so it fails fast when the problem is the adapter rather than the hub:',
        },
        {
          kind: 'terminal',
          command: 'spikeprime scan',
          output: `E4:B3:23:AA:11:02\tSherlock 2\t-54 dBm`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Nothing found?',
          html: 'A hub that is already connected to something else stops advertising and will not appear in a scan. <a href="docs/troubleshooting">Troubleshooting</a> walks through the usual causes.',
        },
      ],
    },
    {
      id: 'upgrading',
      title: 'Upgrading',
      blocks: [
        {
          kind: 'prose',
          html: 'Every push to <code>main</code> that passes tests publishes a new version, so upgrades are frequent and small. Pass the index flags again — <code>--upgrade</code> alone will look at PyPI and find nothing.',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `pip install --upgrade SpikePrimePythonSDK \\
  --index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/ \\
  --extra-index-url https://pypi.org/simple`,
        },
        {
          kind: 'prose',
          html: 'How versions are assigned and what CI publishes is described in <a href="docs/packaging-and-releases">Packaging and releases</a>.',
        },
      ],
    },
  ],
};
