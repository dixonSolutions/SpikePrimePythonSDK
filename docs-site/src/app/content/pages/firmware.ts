import type { DocPage } from '../types';

export const firmware: DocPage = {
  slug: 'firmware-updates',
  title: 'Firmware updates',
  summary:
    'Uploading a firmware image and asking the hub to install it, including how an interrupted upload resumes.',
  keywords: ['firmware', 'flash', 'update', 'sha1', 'crc32', 'resume', 'staging', 'bootloader', 'danger'],
  sections: [
    {
      id: 'danger',
      title: 'Read this first',
      blocks: [
        {
          kind: 'callout',
          tone: 'danger',
          title: 'Flashing overwrites the hub operating system',
          html: 'A firmware update replaces HubOS on the brick. If the image is wrong, corrupt, or for a different product, you can leave the hub unusable — and this SDK offers no way to undo it. Only ever flash an image you obtained from the LEGO Group for this exact hub.',
        },
        {
          kind: 'prose',
          html: 'Everything else in this SDK is reversible. This one thing is not, which is why the CLI requires an explicit <code>--yes</code> and why staging exists.',
        },
      ],
    },
    {
      id: 'api',
      title: 'The call',
      blocks: [
        {
          kind: 'code',
          lang: 'python',
          code: `from pathlib import Path

async with await connect() as hub:
    await hub.update_firmware(Path("hub-firmware.bin"))`,
        },
        {
          kind: 'prose',
          html: 'The image may be a <code>Path</code>, a <code>str</code> path, or raw <code>bytes</code>. Unlike <code>upload()</code>, a <code>str</code> is <em>always</em> treated as a path — a firmware image is never inline source. An empty image raises <code>ValueError</code> before anything is sent.',
        },
      ],
    },
    {
      id: 'sequence',
      title: 'The documented sequence',
      blocks: [
        {
          kind: 'steps',
          steps: [
            {
              title: 'StartFirmwareUploadRequest',
              html: 'Carries the image\'s 20-byte SHA-1 and its CRC32. The response reports <strong>how many bytes the hub already holds for that SHA</strong>, which is what makes resuming possible.',
            },
            {
              title: 'TransferChunkRequest, per chunk',
              html: 'Same mechanism as a program upload: pieces of at most <code>max_chunk_size</code> bytes, each carrying the running CRC32 over everything sent so far.',
            },
            {
              title: 'BeginFirmwareUpdateRequest',
              html: 'Carries the same SHA-1 and CRC32 again. The hub reboots into its updater and installs the image — which drops the BLE link. Skipped when <code>begin=False</code>.',
            },
          ],
        },
      ],
    },
    {
      id: 'progress',
      title: 'Progress',
      blocks: [
        {
          kind: 'prose',
          html: 'Firmware images are large enough that silence is unnerving. <code>progress=</code> is called after each acknowledged chunk with the bytes sent so far and the total.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import sys


def show(sent: int, total: int) -> None:
    print(f"\\r{sent}/{total} bytes ({sent * 100 // total}%)", end="")
    sys.stdout.flush()


await hub.update_firmware("hub-firmware.bin", progress=show)
print()`,
        },
        {
          kind: 'prose',
          html: 'The callback is synchronous and is not called for chunks skipped by a resume, so the count starts at the resume point rather than at zero.',
        },
      ],
    },
    {
      id: 'resume',
      title: 'Resuming an interrupted upload',
      blocks: [
        {
          kind: 'prose',
          html: 'The hub keeps partial images keyed by SHA-1. Re-running <code>update_firmware()</code> with the same image after a link drop reports the bytes already held and continues from there.',
        },
        {
          kind: 'prose',
          html: 'Chunks the hub already has are skipped, but they are <strong>still folded into the running CRC</strong> — the CRC covers the whole file, so it cannot simply start over at the resume point.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'A resume offset must land on a chunk boundary',
          html: 'Because the running CRC is accumulated one chunk at a time, an offset that is not a multiple of the hub\'s chunk size cannot be reproduced. Rather than sending a CRC the hub is certain to reject, the SDK raises <code>HubProtocolError</code> explaining the mismatch. Power-cycling the hub clears the staged image and lets the upload start clean.',
        },
        {
          kind: 'prose',
          html: 'If the hub reports <em>more</em> bytes than the image contains, that is also refused — it means the staged image is not the one you are uploading.',
        },
      ],
    },
    {
      id: 'staging',
      title: 'Staging without installing',
      blocks: [
        {
          kind: 'prose',
          html: '<code>begin=False</code> uploads the image and stops. Nothing is installed, the hub does not reboot, and the link stays up. It is the safe way to test the transfer path, and to pre-load an image you intend to install later.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.update_firmware("hub-firmware.bin", begin=False, progress=show)
print("staged; the hub is untouched")`,
        },
      ],
    },
    {
      id: 'after',
      title: 'What happens after it begins',
      blocks: [
        {
          kind: 'prose',
          html: 'The hub reboots into its updater as soon as the begin request is acknowledged, so <strong>the connection drops immediately</strong>. That is expected, not a failure. The <code>Hub</code> object is no longer usable for the old link; installation takes place on the hub with no host involvement.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `await hub.update_firmware("hub-firmware.bin")
# The link is gone. Do not try to talk to this Hub.
# Wait for the hub to finish installing and come back, then connect fresh.`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          html: 'Do not power the hub off while it is installing. Give it time to finish and restart before scanning again.',
        },
      ],
    },
    {
      id: 'cli',
      title: 'From the command line',
      blocks: [
        {
          kind: 'code',
          lang: 'bash',
          code: `spikeprime firmware hub-firmware.bin --yes
spikeprime firmware hub-firmware.bin --yes --stage-only`,
        },
        {
          kind: 'prose',
          html: 'Without <code>--yes</code> the command refuses before touching Bluetooth:',
        },
        {
          kind: 'terminal',
          command: 'spikeprime firmware hub-firmware.bin',
          output: `error: flashing firmware overwrites the hub's operating system and cannot be undone from this SDK. Re-run with --yes to confirm.`,
        },
        {
          kind: 'prose',
          html: 'A missing file is caught in the same check, so a typo never becomes a half-finished flash. The CLI prints a byte counter as it uploads and exits once the update has begun.',
        },
      ],
    },
  ],
};
