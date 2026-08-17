import type { DocPage } from '../types';

export const troubleshooting: DocPage = {
  slug: 'troubleshooting',
  title: 'Troubleshooting',
  summary:
    'Symptom-first fixes for the problems that actually come up: nothing found, connection refused, no output, sensors silent.',
  keywords: ['not found', 'no hubs', 'error', 'fix', 'debug', 'bluetooth', 'permission', 'stuck', 'faq'],
  sections: [
    {
      id: 'no-hubs',
      title: 'The scan finds nothing',
      blocks: [
        {
          kind: 'prose',
          html: 'Work down this list; the causes are roughly in order of how often they turn out to be the answer.',
        },
        {
          kind: 'steps',
          steps: [
            {
              title: 'Something else is connected to the hub',
              html: 'This is the most common cause by a wide margin. A connected Bluetooth peripheral <strong>stops advertising entirely</strong>, so a hub paired with the SPIKE app, a tablet, or a Python process you killed earlier looks exactly like a hub that is switched off. Close the app, or power-cycle the hub.',
            },
            {
              title: 'The hub is asleep',
              html: 'Hubs power down after a period of inactivity. Press the centre button and watch for the light.',
            },
            {
              title: 'Bluetooth is off or blocked on the host',
              html: 'On Linux: <code>rfkill list bluetooth</code> and <code>systemctl status bluetooth</code>. On macOS and Windows, check the system Bluetooth toggle.',
            },
            {
              title: 'macOS has not been given permission',
              html: 'CoreBluetooth needs an explicit grant for the application running Python — Terminal, iTerm or your IDE. Without it, scans silently return nothing. <strong>System Settings → Privacy &amp; Security → Bluetooth</strong>.',
            },
            {
              title: 'The scan window was too short',
              html: 'Advertising intervals vary. Try <code>spikeprime --timeout 20 scan</code> before concluding the hub is unreachable.',
            },
          ],
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'On Linux, try connecting anyway',
          html: 'If a previous process left the link open, <code>connect()</code> will find and attach to it even though <code>scan()</code> shows nothing. That recovery is BlueZ-only — see <a href="docs/connecting#already-connected">Hubs that are already connected</a>.',
        },
      ],
    },
    {
      id: 'wrong-hub',
      title: 'It connects to the wrong hub',
      blocks: [
        {
          kind: 'prose',
          html: '<code>connect()</code> with no arguments takes the first hub that answers, which in a room full of them is arbitrary. Name matching is case-insensitive and accepts a substring, so <code>name="Hub"</code> will happily match <em>every</em> hub called “Hub 1”, “Hub 2” and so on.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await connect(address="E4:B3:23:AA:11:02")   # unambiguous
await hub.set_name("Table 3")                # then match on a real name`,
        },
        {
          kind: 'prose',
          html: 'Names set with <code>set_name()</code> persist across power cycles. Naming your hubs once is worth the two minutes.',
        },
      ],
    },
    {
      id: 'connect-fails',
      title: 'The scan works but connecting fails or hangs',
      blocks: [
        {
          kind: 'list',
          items: [
            '<strong>Another process still holds the link.</strong> Two clients cannot own the same hub. Find and stop the other one.',
            '<strong>A stale OS pairing.</strong> On Windows in particular, a hub paired through Settings can leave the OS holding the connection. Remove the pairing — the SDK does not need it.',
            '<strong>The hub is mid-firmware-update.</strong> It is running the updater, not HubOS, and will not answer. Wait for it to finish and restart.',
            '<strong>An address from another machine.</strong> macOS reports per-host UUIDs rather than MAC addresses, so an address copied from a Linux box will never resolve there. Use <code>name=</code>.',
          ],
        },
        {
          kind: 'prose',
          html: 'Turn on debug logging to see exactly where it stops:',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import logging
logging.basicConfig(level=logging.DEBUG)`,
        },
      ],
    },
    {
      id: 'no-console',
      title: 'The program runs but nothing prints',
      blocks: [
        {
          kind: 'table',
          headers: ['Check', 'What to do'],
          rows: [
            [
              'Is a program actually running?',
              'Console notifications only exist while a hub program executes. <code>hub.running</code> should be <code>True</code>.',
            ],
            [
              'Did the upload go to the slot you started?',
              '<code>hub.run()</code> handles both; separate <code>upload()</code> and <code>start()</code> calls can drift apart.',
            ],
            [
              'Did you upload host code by mistake?',
              'A file importing <code>spikeprime</code> fails instantly on the hub. See <a href="docs/hub-code-vs-host-code">Hub code vs host code</a>.',
            ],
            [
              'Is the reader still alive?',
              'A console task cancelled the moment the program stopped will miss the final lines. Sleep ~0.4&nbsp;s first.',
            ],
            [
              'Did the program crash on the hub?',
              'The traceback comes back through the same console channel — read it before assuming nothing ran.',
            ],
          ],
        },
      ],
    },
    {
      id: 'no-devices',
      title: 'Sensors and motors never appear',
      blocks: [
        {
          kind: 'prose',
          html: 'Device notifications are off until you switch them on. Nothing arrives from <code>device_updates()</code> until then:',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.enable_notifications(200)`,
        },
        {
          kind: 'prose',
          html: 'If some devices show up and others do not, check that the missing ones are physically attached — the hub only reports what is plugged in. And note that the parser stops at the first device type it does not recognise, so a very new firmware can truncate a snapshot; that shows up as devices missing from the <em>end</em> of the list, consistently.',
        },
      ],
    },
    {
      id: 'nack',
      title: 'HubNackError on upload or start',
      blocks: [
        {
          kind: 'table',
          headers: ['Operation', 'Likely cause'],
          rows: [
            ['<code>start slot N</code>', 'The slot is empty. Upload before starting.'],
            ['<code>transfer chunk at N</code>', 'The running CRC did not match. Re-upload; if it repeats, the link is corrupting data.'],
            ['<code>start file upload</code>', 'The file name exceeds 31 bytes of UTF-8, or the slot is unavailable.'],
            ['<code>clear slot N</code>', 'Only raised when you passed <code>ignore_nack=False</code>. An empty slot answers this way and it is harmless.'],
            ['<code>set hub name</code>', 'The name exceeds 29 bytes of UTF-8.'],
          ],
        },
      ],
    },
    {
      id: 'slow',
      title: 'Everything is slow or stutters',
      blocks: [
        {
          kind: 'list',
          items: [
            '<strong>Turn the notification interval down.</strong> 20&nbsp;ms of device notifications competes with uploads and console traffic on the same radio. 200–500&nbsp;ms is plenty for watching a robot.',
            '<strong>Do not reconnect between runs.</strong> Each <code>connect()</code> pays for a full scan. Hold one <code>Hub</code> — see <a href="docs/connecting#one-link">Holding one link</a>.',
            '<strong>Move closer.</strong> A weak signal costs retransmissions. Check <code>rssi</code> from a scan; below roughly −85&nbsp;dBm things get unreliable.',
            '<strong>Reduce radio contention.</strong> Crowded 2.4&nbsp;GHz — a classroom full of hubs and laptops — slows everything down.',
          ],
        },
      ],
    },
    {
      id: 'import',
      title: 'ModuleNotFoundError: spikeprime',
      blocks: [
        {
          kind: 'prose',
          html: 'The distribution is <code>SpikePrimePythonSDK</code>; the import is <code>spikeprime</code>. Installing one name and importing the other is correct. What usually goes wrong is the environment:',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `which python           # is it the .venv one?
python -m pip show SpikePrimePythonSDK
python -c "import spikeprime; print(spikeprime.__file__)"`,
        },
        {
          kind: 'prose',
          html: 'If your editor reports the error but the terminal does not, the editor is using a different interpreter — see <a href="docs/project-setup#typing">Types and editors</a>.',
        },
      ],
    },
    {
      id: 'pip',
      title: 'pip cannot find the package',
      blocks: [
        {
          kind: 'prose',
          html: 'It is not on PyPI. Without <code>--index-url</code> pointing at the project index, pip will search PyPI and correctly report that nothing matches.',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `pip install SpikePrimePythonSDK \\
  --index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/ \\
  --extra-index-url https://pypi.org/simple`,
        },
        {
          kind: 'prose',
          html: 'If <code>bleak</code> then fails to resolve, the <code>--extra-index-url</code> is missing: <code>--index-url</code> replaces PyPI rather than adding to it.',
        },
      ],
    },
    {
      id: 'reporting',
      title: 'Still stuck',
      blocks: [
        {
          kind: 'prose',
          html: 'Open an issue with the details that make a report actionable:',
        },
        {
          kind: 'list',
          items: [
            'Operating system and version, and on Linux the output of <code>bluetoothctl --version</code>.',
            'Python version, and <code>spikeprime.__version__</code>.',
            'Hub firmware version — <code>spikeprime info</code> prints it.',
            'A debug log: <code>logging.basicConfig(level=logging.DEBUG)</code> around the failing call.',
            'The smallest script that reproduces it.',
          ],
        },
        {
          kind: 'prose',
          html: '<a href="https://github.com/dixonSolutions/SpikePrimePythonSDK/issues" target="_blank" rel="noopener">github.com/dixonSolutions/SpikePrimePythonSDK/issues</a>',
        },
      ],
    },
  ],
};
