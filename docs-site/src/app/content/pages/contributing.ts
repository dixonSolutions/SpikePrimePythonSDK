import type { DocPage } from '../types';

export const contributing: DocPage = {
  slug: 'contributing',
  title: 'Contributing',
  summary:
    'Working on the SDK or on these docs: repository layout, tests, style, and what to include in a bug report.',
  keywords: ['contribute', 'develop', 'tests', 'pytest', 'ruff', 'style', 'license', 'trademark', 'issue'],
  sections: [
    {
      id: 'layout',
      title: 'Repository layout',
      blocks: [
        {
          kind: 'code',
          lang: 'text',
          code: `src/spikeprime/
  client.py              Hub, scan, connect
  devices.py             typed sensor/motor snapshots
  enums.py               protocol enumerations
  errors.py              exception hierarchy
  cli.py                 command-line entry point
  protocol/cobs.py       COBS + XOR framing
  protocol/crc.py        CRC32 with 4-byte alignment
  protocol/framing.py    frame assembly and packet splitting
  protocol/messages.py   every HubOS message
examples/                host scripts, plus examples/hub/ for the brick
tests/                   runs with no hub and no Bluetooth adapter
scripts/                 release tooling
docs-site/               this documentation app (Angular 21 + Optimus UI)
docs/                    short reference notes kept alongside the code`,
        },
      ],
    },
    {
      id: 'setup',
      title: 'Getting set up',
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `git clone https://github.com/dixonSolutions/SpikePrimePythonSDK.git
cd SpikePrimePythonSDK
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest -q`,
        },
        {
          kind: 'prose',
          html: 'The whole suite runs offline. If a change cannot be tested without a hub, that is usually a sign the logic wants pulling out into something pure — <code>match_open_link()</code> is the pattern: it takes “what the OS reports” as data, so the matching rules are testable with no Bluetooth stack at all.',
        },
      ],
    },
    {
      id: 'tests',
      title: 'Tests',
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `pytest                     # everything
pytest tests/test_cobs.py  # one file
pytest -k firmware         # by name
pytest -q -x               # stop at the first failure`,
        },
        {
          kind: 'prose',
          html: '<code>asyncio_mode = "auto"</code> is set, so an <code>async def</code> test needs no decorator. COBS vectors are the official ones from the protocol examples; keep it that way, because they are the only independent check that the encoder is right.',
        },
      ],
    },
    {
      id: 'style',
      title: 'Style',
      blocks: [
        {
          kind: 'list',
          items: [
            '<strong>Ruff</strong>, line length 100, target <code>py310</code>. Configured in <code>pyproject.toml</code>.',
            '<strong>Type annotations everywhere.</strong> The package ships <code>py.typed</code>, so its annotations are part of its public contract.',
            '<code>from __future__ import annotations</code> at the top of modules using modern syntax, since 3.10 is the floor.',
            '<strong>Comments explain the surprising thing</strong>, not the obvious one. Several decisions in <code>client.py</code> look wrong until you know the reason, and those are exactly the ones that carry a comment.',
          ],
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `ruff check .
ruff format .`,
        },
      ],
    },
    {
      id: 'protocol-changes',
      title: 'Changing the protocol layer',
      blocks: [
        {
          kind: 'prose',
          html: 'The protocol layer implements a published specification, so changes there should cite it. When adding a message:',
        },
        {
          kind: 'steps',
          steps: [
            {
              title: 'Add the dataclass to protocol/messages.py',
              html: 'with a <code>ClassVar</code> <code>ID</code>, <code>serialize()</code> and <code>deserialize()</code>. Simple acknowledgements can subclass <code>StatusMessage</code> and add nothing but an id.',
            },
            {
              title: 'Add it to KNOWN_MESSAGES',
              html: 'so <code>deserialize()</code> can dispatch to it.',
            },
            {
              title: 'Add a round-trip test',
              html: 'in <code>tests/test_messages.py</code>. Serialize, deserialize, and check the fields survive.',
            },
            {
              title: 'Surface it on Hub only if it belongs there',
              html: 'Not every message needs a high-level method. The <code>Hub</code> API is deliberately small.',
            },
          ],
        },
      ],
    },
    {
      id: 'docs',
      title: 'Changing these docs',
      blocks: [
        {
          kind: 'prose',
          html: 'The site is an Angular 21 application in <code>docs-site/</code>, using Optimus UI. Pages are <em>data</em>, not templates: one generic renderer draws them all, so the navigation, the search index, the previous/next links, the prerendered route list and the sitemap are all derived from the same source and cannot drift apart.',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `cd docs-site
npm ci
npm start        # http://localhost:4200
npm run build    # prerender every page into dist/docs-site/browser`,
        },
        {
          kind: 'steps',
          steps: [
            {
              title: 'Add a file under src/app/content/pages/',
              html: 'exporting a <code>DocPage</code>: a slug, a title, a one-sentence summary, and a list of sections.',
            },
            {
              title: 'List it in src/app/content/index.ts',
              html: 'inside the group it belongs to. Order in that array is the order in the sidebar and in the previous/next pager.',
            },
            {
              title: 'Build the page out of blocks',
              html: '<code>prose</code>, <code>code</code>, <code>list</code>, <code>table</code>, <code>callout</code>, <code>steps</code>, <code>cards</code>, <code>terminal</code> and <code>api</code>. Section ids are the anchors, so keep them stable — they end up in links.',
            },
            {
              title: 'Link between pages with a base-relative href',
              html: 'Write <code>&lt;a href="docs/installation"&gt;</code>, with no leading slash. It resolves against <code>&lt;base href&gt;</code>, so it is correct both locally and under the <code>/SpikePrimePythonSDK/</code> path — and an in-app click handler turns it into a router navigation.',
            },
          ],
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Prose is bound as HTML',
          html: 'Block <code>html</code> fields are rendered with <code>[innerHTML]</code> and sanitized by Angular. Inline tags — <code>&lt;code&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;em&gt;</code>, <code>&lt;a&gt;</code> — are what they are for. Code samples go in a <code>code</code> block instead, where they are highlighted and get a copy button.',
        },
      ],
    },
    {
      id: 'reporting',
      title: 'Reporting a bug',
      blocks: [
        {
          kind: 'prose',
          html: 'What makes a hub report actionable:',
        },
        {
          kind: 'list',
          items: [
            'Operating system and version — and on Linux, <code>bluetoothctl --version</code>.',
            'Python version and <code>spikeprime.__version__</code>.',
            'Hub firmware version, from <code>spikeprime info</code>.',
            'A debug log around the failing call: <code>logging.basicConfig(level=logging.DEBUG)</code>.',
            'The smallest script that reproduces it.',
          ],
        },
        {
          kind: 'prose',
          html: '<a href="https://github.com/dixonSolutions/SpikePrimePythonSDK/issues" target="_blank" rel="noopener">github.com/dixonSolutions/SpikePrimePythonSDK/issues</a>',
        },
      ],
    },
    {
      id: 'license',
      title: 'License and trademarks',
      blocks: [
        {
          kind: 'prose',
          html: 'The project is licensed under <strong>Apache 2.0</strong>. Contributions are accepted under the same terms.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Trademarks',
          html: 'LEGO, SPIKE and MINDSTORMS are trademarks of the LEGO Group. Protocol documentation is Copyright 2024 the LEGO Group. This project is not affiliated with, authorized by, or endorsed by the LEGO Group, and contributions must not imply otherwise. See <code>NOTICE</code> in the repository.',
        },
      ],
    },
  ],
};
