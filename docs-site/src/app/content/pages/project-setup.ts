import type { DocPage } from '../types';

export const projectSetup: DocPage = {
  slug: 'project-setup',
  title: 'Project setup',
  summary:
    'Lay out a project around the SDK: virtual environment, Bluetooth permissions per operating system, editor and type-checker configuration.',
  keywords: [
    'venv',
    'virtualenv',
    'bluez',
    'permissions',
    'macos',
    'windows',
    'linux',
    'mypy',
    'pyright',
    'vscode',
    'asyncio',
    'py.typed',
    'logging',
  ],
  sections: [
    {
      id: 'environment',
      title: 'A virtual environment first',
      blocks: [
        {
          kind: 'prose',
          html: 'The SDK pulls in <code>bleak</code>, which in turn pulls in platform-specific Bluetooth bindings. Keep that out of your system Python.',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `mkdir my-robot && cd my-robot
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate

pip install SpikePrimePythonSDK \\
  --index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/ \\
  --extra-index-url https://pypi.org/simple`,
        },
      ],
    },
    {
      id: 'layout',
      title: 'A layout that keeps the two sides apart',
      blocks: [
        {
          kind: 'prose',
          html: 'Host scripts and hub programs are different languages in practice — one has <code>asyncio</code> and <code>bleak</code>, the other has <code>runloop</code> and <code>hub</code>. Giving them separate directories stops you from uploading the wrong file, and it is the convention this repository itself uses.',
        },
        {
          kind: 'code',
          lang: 'text',
          caption: 'A project that will not confuse you at 11pm',
          code: `my-robot/
  .venv/
  pyproject.toml            your project, not the SDK's
  host/
    run_mission.py          imports spikeprime, runs on your PC
    watch_sensors.py
  hub/
    mission.py              imports runloop / hub, runs on the brick
    calibrate.py
  tests/`,
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The CLI checks, the library does not',
          html: '<code>spikeprime upload</code> refuses a file containing <code>import spikeprime</code> or <code>import bleak</code>, because that is almost always a mistake. <code>Hub.upload()</code> performs no such check — it sends whatever bytes you give it.',
        },
      ],
    },
    {
      id: 'first-script',
      title: 'A first host script',
      blocks: [
        {
          kind: 'prose',
          html: 'Every entry point looks the same: an <code>async def main()</code>, an <code>async with</code> around the hub, and <code>asyncio.run()</code> at the bottom.',
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'host/run_mission.py',
          code: `import asyncio
from pathlib import Path

from spikeprime import connect

PROGRAM = Path(__file__).parent.parent / "hub" / "mission.py"


async def main() -> None:
    async with await connect(name="Sherlock") as hub:
        print("connected to", await hub.get_name())
        hub.on_console(lambda line: print("[hub]", line.rstrip()))

        await hub.run(PROGRAM, slot=0)
        await hub.wait_until_stopped()


if __name__ == "__main__":
    asyncio.run(main())`,
        },
        {
          kind: 'code',
          lang: 'python',
          caption: 'hub/mission.py — this one runs on the brick',
          code: `import runloop
from hub import light_matrix

print("starting")


async def main():
    await light_matrix.write("Go")


runloop.run(main())`,
        },
      ],
    },
    {
      id: 'linux',
      title: 'Bluetooth on Linux',
      blocks: [
        {
          kind: 'prose',
          html: 'bleak uses BlueZ over D-Bus. BlueZ 5.55 or newer is a sensible floor; older builds have gaps in the advertisement callbacks the scanner relies on.',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `bluetoothctl --version
systemctl status bluetooth
rfkill list bluetooth          # make sure it is not soft-blocked`,
        },
        {
          kind: 'prose',
          html: 'Scanning normally works for a regular user through the D-Bus policy that ships with BlueZ. If you get a permission error instead of results, add yourself to the <code>bluetooth</code> group and log back in rather than reaching for <code>sudo</code>:',
        },
        {
          kind: 'code',
          lang: 'bash',
          code: `sudo usermod -aG bluetooth "$USER"`,
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Linux gets a bonus feature',
          html: 'Reattaching to a hub whose link is already open is implemented through BlueZ\'s device objects, so it only works on Linux. Elsewhere a hub in that state simply looks missing. See <a href="docs/connecting#already-connected">Hubs that are already connected</a>.',
        },
      ],
    },
    {
      id: 'macos',
      title: 'Bluetooth on macOS',
      blocks: [
        {
          kind: 'prose',
          html: 'CoreBluetooth requires an explicit privacy grant. The first scan triggers a system prompt attributed to the application running Python — Terminal, iTerm, VS Code, or whatever launched the process. If you dismiss it, no hub will ever be found and no error will explain why.',
        },
        {
          kind: 'list',
          items: [
            'Grant it under <strong>System Settings → Privacy &amp; Security → Bluetooth</strong>.',
            'Running from an IDE? The grant belongs to the <em>IDE</em>, not to Python. Adding it again for a different terminal is normal.',
            'macOS reports opaque UUIDs instead of MAC addresses, so an address that works on Linux will not be recognised here. Prefer <code>name=</code>.',
          ],
        },
      ],
    },
    {
      id: 'windows',
      title: 'Bluetooth on Windows',
      blocks: [
        {
          kind: 'list',
          items: [
            'Windows 10 build 16299 or newer, for the WinRT APIs bleak needs.',
            'The hub does <strong>not</strong> need to be paired in Windows Settings. Pairing it can actually get in the way, because Windows may then hold the connection itself.',
            'If a scan returns nothing, check that <em>Bluetooth</em> is on in Settings and that no other application — the LEGO SPIKE app in particular — is connected to the hub.',
          ],
        },
      ],
    },
    {
      id: 'typing',
      title: 'Types and editors',
      blocks: [
        {
          kind: 'prose',
          html: 'The package ships a <code>py.typed</code> marker, so mypy and Pyright read its annotations directly. No stub package is needed.',
        },
        {
          kind: 'code',
          lang: 'toml',
          caption: 'pyproject.toml',
          code: `[tool.mypy]
python_version = "3.10"
strict = true

[tool.pyright]
typeCheckingMode = "standard"`,
        },
        {
          kind: 'prose',
          html: 'Your editor should be pointed at the interpreter inside <code>.venv</code>. In VS Code that is <em>Python: Select Interpreter</em>; without it, imports resolve against a different environment and every <code>spikeprime</code> symbol shows as unknown.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The hub half will always look broken',
          html: 'A type checker pointed at <code>hub/mission.py</code> will report that <code>runloop</code> and <code>hub</code> cannot be resolved, because those modules exist only on the brick. Exclude the hub directory from your checker rather than trying to satisfy it.',
        },
        {
          kind: 'code',
          lang: 'toml',
          caption: 'pyproject.toml',
          code: `[tool.mypy]
exclude = ["hub/"]

[tool.pyright]
exclude = ["hub"]`,
        },
      ],
    },
    {
      id: 'logging',
      title: 'Logging',
      blocks: [
        {
          kind: 'prose',
          html: 'Every module logs through the standard library under its own name. The client logs connection events at <code>INFO</code> and every frame it sends or receives at <code>DEBUG</code>, which is the fastest way to see what the protocol layer is actually doing.',
        },
        {
          kind: 'code',
          lang: 'python',
          code: `import logging

logging.basicConfig(level=logging.INFO)
logging.getLogger("spikeprime.client").setLevel(logging.DEBUG)`,
        },
        {
          kind: 'terminal',
          command: 'python host/run_mission.py',
          output: `INFO:spikeprime.client:connected to E4:B3:23:AA:11:02 firmware=3.4.3 rpc=3.4.0 packet=244 chunk=1000
DEBUG:spikeprime.client:send StartFileUploadRequest(file_name='program.py', slot=0, crc=2364771037) (46 bytes)
DEBUG:spikeprime.client:recv StartFileUploadResponse(success=True)`,
        },
      ],
    },
    {
      id: 'ci',
      title: 'Running in CI',
      blocks: [
        {
          kind: 'prose',
          html: 'A build machine has no Bluetooth adapter, so anything that touches a hub cannot run there. What <em>can</em> run in CI is everything below the transport: framing, COBS, CRC and message round-trips. Structure your own tests the same way this repository does and keep hub interaction behind an explicit marker.',
        },
        {
          kind: 'code',
          lang: 'yaml',
          caption: '.github/workflows/test.yml',
          code: `- uses: actions/setup-python@v5
  with:
    python-version: "3.12"
- run: |
    pip install SpikePrimePythonSDK \\
      --index-url https://dixonsolutions.github.io/SpikePrimePythonSDK/simple/ \\
      --extra-index-url https://pypi.org/simple
    pip install pytest pytest-asyncio
- run: pytest -q -m "not hardware"`,
        },
      ],
    },
  ],
};
