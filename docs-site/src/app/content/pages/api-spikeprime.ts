import type { DocPage } from '../types';

export const apiSpikeprime: DocPage = {
  slug: 'api-spikeprime',
  title: 'spikeprime',
  summary:
    'The top-level package: what it re-exports, what stays behind a submodule import, and the version marker.',
  keywords: ['__all__', 'imports', 're-export', 'version', 'package', 'public api'],
  sections: [
    {
      id: 'importing',
      title: 'Importing',
      blocks: [
        {
          kind: 'prose',
          html: 'Everything most programs need is re-exported from the package root, so a single import line is usually enough.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime import connect, scan, Hub, DeviceSnapshot, Port, HubError`,
        },
        {
          kind: 'prose',
          html: 'The protocol layer is deliberately <em>not</em> re-exported. It is a separate concern with a large surface, so it stays behind explicit submodule imports:',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `from spikeprime.protocol import FrameAssembler, crc32, deserialize, encode_frame
from spikeprime.protocol.messages import InfoRequest, TunnelMessage`,
        },
      ],
    },
    {
      id: 'exports',
      title: 'What the root re-exports',
      blocks: [
        {
          kind: 'table',
          headers: ['Name', 'Kind', 'Documented in'],
          rows: [
            ['<code>connect</code>', 'coroutine function', '<a href="docs/api-client#connect">client</a>'],
            ['<code>scan</code>', 'coroutine function', '<a href="docs/api-client#scan">client</a>'],
            ['<code>Hub</code>', 'class', '<a href="docs/api-client#hub">client</a>'],
            ['<code>HubAdvertisement</code>', 'dataclass', '<a href="docs/api-client#hubadvertisement">client</a>'],
            ['<code>DeviceSnapshot</code>', 'dataclass', '<a href="docs/api-devices#devicesnapshot">devices</a>'],
            [
              '<code>Battery</code>, <code>IMU</code>, <code>Matrix5x5</code>, <code>Motor</code>, <code>ForceSensor</code>, <code>ColorSensor</code>, <code>DistanceSensor</code>, <code>ColorMatrix</code>',
              'dataclasses',
              '<a href="docs/api-devices">devices</a>',
            ],
            [
              '<code>Color</code>, <code>Port</code>, <code>HubFace</code>, <code>MotorType</code>, <code>MotorDirection</code>, <code>MotorEndState</code>, <code>ProductGroup</code>, <code>ProgramAction</code>, <code>ResponseStatus</code>',
              'enums',
              '<a href="docs/api-enums">enums</a>',
            ],
            [
              '<code>HubError</code>, <code>HubNotFoundError</code>, <code>HubProtocolError</code>, <code>HubNackError</code>, <code>HubTimeoutError</code>',
              'exceptions',
              '<a href="docs/api-errors">errors</a>',
            ],
          ],
        },
        {
          kind: 'prose',
          html: 'The same list is available at runtime as <code>spikeprime.__all__</code>, so <code>from spikeprime import *</code> brings in exactly these names and nothing else.',
        },
      ],
    },
    {
      id: 'version',
      title: 'Version',
      blocks: [
        {
          kind: 'api',
          entries: [
            {
              name: '__version__',
              kind: 'constant',
              signature: '__version__: str',
              summary:
                'The installed version, as a string. CI rewrites it on every release, so it matches the tag the wheel came from.',
              example: {
                lang: 'python',
                code: `import spikeprime

print(spikeprime.__version__)   # "0.1.7"`,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'submodules',
      title: 'Submodules',
      blocks: [
        {
          kind: 'table',
          headers: ['Module', 'Contents'],
          rows: [
            ['<a href="docs/api-client"><code>spikeprime.client</code></a>', '<code>Hub</code>, <code>connect</code>, <code>scan</code>, link-recovery helpers, GATT UUIDs'],
            ['<a href="docs/api-devices"><code>spikeprime.devices</code></a>', 'Typed device snapshots'],
            ['<a href="docs/api-enums"><code>spikeprime.enums</code></a>', 'Protocol enumerations'],
            ['<a href="docs/api-errors"><code>spikeprime.errors</code></a>', 'The exception hierarchy'],
            ['<a href="docs/api-protocol"><code>spikeprime.protocol</code></a>', 'COBS, CRC32, framing and every message struct'],
            ['<a href="docs/cli-reference"><code>spikeprime.cli</code></a>', 'The command-line entry point'],
          ],
        },
        {
          kind: 'prose',
          html: 'The package ships a <code>py.typed</code> marker, so type checkers read these annotations directly without a stub package.',
        },
      ],
    },
  ],
};
