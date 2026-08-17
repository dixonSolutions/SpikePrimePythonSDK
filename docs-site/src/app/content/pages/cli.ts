import type { DocPage } from '../types';

export const cli: DocPage = {
  slug: 'cli-reference',
  title: 'CLI reference',
  summary: 'Every command, flag and exit code of the spikeprime command-line tool.',
  keywords: ['cli', 'command line', 'scan', 'info', 'upload', 'run', 'stop', 'clear', 'console', 'firmware', 'exit code'],
  sections: [
    {
      id: 'usage',
      title: 'Usage',
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `spikeprime [--address ADDRESS] [--name NAME] [--timeout SECONDS] <command> [options]`,
        },
        {
          kind: 'prose',
          html: 'The tool is installed as a console script by the package. <code>python -m spikeprime</code> is equivalent, which is handy when the script directory is not on your <code>PATH</code>.',
        },
        {
          kind: 'table',
          headers: ['Global flag', 'Default', 'Meaning'],
          rows: [
            ['<code>--address ADDRESS</code>', '—', 'Connect to this BLE address'],
            ['<code>--name NAME</code>', '—', 'Connect to a hub whose advertised name matches, case-insensitively'],
            ['<code>--timeout SECONDS</code>', '<code>10.0</code>', 'Scan timeout'],
          ],
        },
        {
          kind: 'prose',
          html: 'Global flags come <em>before</em> the command. Every command except <code>scan</code> opens a connection, closes it on the way out, and honours these flags.',
        },
      ],
    },
    {
      id: 'scan',
      title: 'scan',
      blocks: [
        {
          kind: 'prose',
          html: 'List nearby hubs. The only command that never connects, which makes it the right first check when something is not working.',
        },
        {
          kind: 'terminal',
          command: 'spikeprime scan',
          output: `E4:B3:23:AA:11:02\tSherlock 2\t-54 dBm
E4:B3:23:BB:07:9C\t(unnamed)\t-77 dBm`,
        },
        {
          kind: 'prose',
          html: 'Tab-separated: address, name, signal strength. Exits <code>1</code> and prints <code>No hubs found.</code> when nothing answers.',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `spikeprime --timeout 20 scan     # longer window in a busy room`,
        },
      ],
    },
    {
      id: 'info',
      title: 'info',
      blocks: [
        {
          kind: 'prose',
          html: 'Connect and print identity and firmware. The quickest way to confirm end-to-end that host and hub can talk.',
        },
        {
          kind: 'terminal',
          command: 'spikeprime info',
          output: `address:   E4:B3:23:AA:11:02
ble name:  Sherlock 2
hub name:  Sherlock 2
uuid:      6f9619ff-8b86-d011-b42d-00c04fc964ff
firmware:  3.4.3
rpc:       3.4.0
packet:    244 bytes
message:   32768 bytes
chunk:     1000 bytes`,
        },
        {
          kind: 'prose',
          html: 'The last three lines are the limits from the handshake, and they are worth knowing: they govern how writes are fragmented and how uploads are chunked.',
        },
      ],
    },
    {
      id: 'upload',
      title: 'upload',
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `spikeprime upload FILE [--slot N] [--filename NAME] [--run]`,
        },
        {
          kind: 'table',
          headers: ['Flag', 'Default', 'Meaning'],
          rows: [
            ['<code>FILE</code>', '—', 'The hub MicroPython file to upload'],
            ['<code>--slot N</code>', '<code>0</code>', 'Target slot, 0–19'],
            ['<code>--filename NAME</code>', '<code>program.py</code>', 'The name the hub records'],
            ['<code>--run</code>', 'off', 'Start the program after uploading, then follow its console until it stops'],
          ],
        },
        {
          kind: 'terminal',
          command: 'spikeprime upload examples/hub/hello.py --slot 0 --run',
          output: `Uploaded examples/hub/hello.py to slot 0.
Started. Console (Ctrl+C to stop):
hello from Sherlock 2
wrote Hi on the matrix`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'It refuses host scripts',
          html: 'A file containing <code>from spikeprime</code>, <code>import spikeprime</code>, <code>from bleak</code> or <code>import bleak</code> is rejected with exit code <code>2</code> before anything is sent — those are PC scripts, and they cannot run on a hub. See <a href="docs/hub-code-vs-host-code">Hub code vs host code</a>.',
        },
      ],
    },
    {
      id: 'run-stop-clear',
      title: 'run, stop, clear',
      blocks: [
        {
          kind: 'prose',
          html: 'Three small commands that operate on a slot the hub already holds. Note that <code>run</code> here means “start what is already in the slot” — uploading is <code>upload</code>.',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `spikeprime run --slot 0      # start the program already in slot 0
spikeprime stop --slot 0     # stop it
spikeprime clear --slot 0    # erase the slot`,
        },
        {
          kind: 'prose',
          html: 'Each prints a one-line confirmation and exits. <code>run</code> does not wait for the program or stream its console — use <code>console</code>, or <code>upload --run</code>.',
        },
      ],
    },
    {
      id: 'console',
      title: 'console',
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `spikeprime console [--notifications MS]`,
        },
        {
          kind: 'prose',
          html: 'Print everything the hub prints, until Ctrl+C. With <code>--notifications MS</code> it also enables device notifications at that interval first — handy when you want a program\'s output and its sensor traffic on one link.',
        },
        {
          kind: 'terminal',
          command: 'spikeprime console --notifications 200',
          output: `Listening for console output. Ctrl+C to stop.
mission starting
at 90
at 180`,
        },
        {
          kind: 'prose',
          html: 'Ctrl+C exits <code>130</code> after printing <code>Interrupted.</code> on stderr.',
        },
      ],
    },
    {
      id: 'firmware',
      title: 'firmware',
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `spikeprime firmware FILE --yes [--stage-only]`,
        },
        {
          kind: 'callout',
          tone: 'danger',
          title: 'This overwrites HubOS',
          html: 'Flashing replaces the hub\'s operating system and cannot be undone from this SDK. <code>--yes</code> is required, and its absence is checked before Bluetooth is touched at all.',
        },
        {
          kind: 'table',
          headers: ['Flag', 'Meaning'],
          rows: [
            ['<code>FILE</code>', 'The firmware image'],
            ['<code>--yes</code>', 'Required. Confirms you want to overwrite the hub\'s firmware'],
            ['<code>--stage-only</code>', 'Upload the image but do not begin the update'],
          ],
        },
        {
          kind: 'terminal',
          command: 'spikeprime firmware hub-firmware.bin --yes',
          output: `1245184/1245184 bytes (100%)
Update started. The hub reboots into the updater and disconnects.`,
        },
        {
          kind: 'prose',
          html: 'Both a missing file and a missing <code>--yes</code> exit <code>2</code> without contacting a hub. With <code>--stage-only</code> the image is uploaded and the hub is left untouched. Details in <a href="docs/firmware-updates">Firmware updates</a>.',
        },
      ],
    },
    {
      id: 'exit-codes',
      title: 'Exit codes',
      blocks: [
        {
          kind: 'table',
          headers: ['Code', 'Meaning'],
          rows: [
            ['<code>0</code>', 'Success'],
            ['<code>1</code>', 'A <code>HubError</code>, printed as <code>error: …</code> on stderr — or <code>scan</code> found nothing'],
            [
              '<code>2</code>',
              'Refused before contacting the hub: a host script offered to <code>upload</code>, a missing firmware file, or <code>firmware</code> without <code>--yes</code>',
            ],
            ['<code>130</code>', 'Interrupted with Ctrl+C'],
          ],
        },
        {
          kind: 'code',
          lang: 'bash',
          caption: 'Branching in a script',
          code: `if spikeprime --name "Table 3" info > /dev/null 2>&1; then
  spikeprime --name "Table 3" upload hub/mission.py --slot 0 --run
else
  echo "Table 3 is not reachable"
fi`,
        },
      ],
    },
  ],
};
