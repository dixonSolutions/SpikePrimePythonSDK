import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { SeoService } from '../core/seo';
import { INSTALL_COMMAND, SITE } from '../core/site';
import { CodeBlock } from '../shared/code-block';

const QUICKSTART = `import asyncio
from spikeprime import connect

PROGRAM = """\\
import runloop
from hub import light_matrix

async def main():
    await light_matrix.write("Hi")

runloop.run(main())
"""

async def main():
    async with await connect() as hub:
        print(await hub.get_name(), hub.info.firmware_version)
        await hub.run(PROGRAM, slot=0)
        await hub.wait_until_stopped()

asyncio.run(main())`;

interface Feature {
  icon: string;
  title: string;
  text: string;
  slug: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'pi pi-wifi',
    title: 'Connect over BLE',
    text: 'Scan for the HubOS GATT service, connect by name or address, reattach to a link the OS already holds, and rebuild a dropped one without losing your session.',
    slug: 'connecting',
  },
  {
    icon: 'pi pi-play',
    title: 'Upload and run programs',
    text: 'Push MicroPython into any of the 20 slots, start and stop it, and wait for the hub to report that it finished.',
    slug: 'running-programs',
  },
  {
    icon: 'pi pi-desktop',
    title: 'Read the hub console',
    text: 'Every print() from the hub arrives as a console notification you can await as an async iterator or handle with a callback.',
    slug: 'console-output',
  },
  {
    icon: 'pi pi-sliders-h',
    title: 'Typed sensor snapshots',
    text: 'Device notifications are parsed into dataclasses for the battery, IMU, motors and every sensor, keyed by port.',
    slug: 'sensors-and-devices',
  },
  {
    icon: 'pi pi-refresh',
    title: 'Resumable firmware updates',
    text: 'The documented SHA-1 and CRC32 sequence, including resuming an interrupted upload from the byte count the hub reports.',
    slug: 'firmware-updates',
  },
  {
    icon: 'pi pi-microchip',
    title: 'The whole protocol',
    text: 'COBS framing, the XOR mask, the delimiter state machine and every documented message, all importable on their own.',
    slug: 'protocol-reference',
  },
];

@Component({
  selector: 'sp-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule, TagModule, CodeBlock],
  template: `
    <section class="hero">
      <div class="hero__text">
        <p-tag value="Unofficial · HubOS 3" severity="secondary" [rounded]="true" />
        <h1 class="hero__title">Drive a SPIKE&nbsp;Prime hub from <span>Python</span>.</h1>
        <p class="hero__lead">
          {{ site.name }} is a host-side SDK for SPIKE Prime HubOS 3 over Bluetooth Low Energy. It
          implements the protocol the LEGO Group publishes, so your editor, CLI or agent can scan for
          a hub, upload a program, watch its console and read its sensors — all from ordinary
          <code>asyncio</code> Python.
        </p>
        <div class="hero__actions">
          <p-button label="Get started" icon="pi pi-arrow-right" iconPos="right" routerLink="/docs/installation" />
          <p-button
            label="Quick start"
            icon="pi pi-bolt"
            severity="secondary"
            [outlined]="true"
            routerLink="/docs/quickstart"
          />
          <a class="hero__ghost" [href]="site.repo" target="_blank" rel="noopener">
            <i class="pi pi-github" aria-hidden="true"></i> Source
          </a>
        </div>
        <dl class="hero__facts">
          <div><dt>Python</dt><dd>{{ site.pythonRequires }}+</dd></div>
          <div><dt>Transport</dt><dd>BLE via bleak</dd></div>
          <div><dt>Import</dt><dd><code>{{ site.importName }}</code></dd></div>
          <div><dt>License</dt><dd>{{ site.license }}</dd></div>
        </dl>
      </div>

      <div class="hero__code">
        <sp-code [code]="quickstart" lang="python" caption="hello.py" />
      </div>
    </section>

    <section class="install">
      <div class="install__inner">
        <h2>Install</h2>
        <p>
          Releases are published to this project's own
          <a [href]="site.simpleIndex" target="_blank" rel="noopener">PEP&nbsp;503 index</a>, not to
          PyPI. Keep <code>--extra-index-url</code> so dependencies still resolve.
        </p>
        <sp-code [code]="installCommand" lang="bash" caption="Install from the GitHub Pages index" />
        <p class="install__more">
          Working from a checkout, pinning a tag, or setting Bluetooth up on Linux, macOS or Windows?
          See <a routerLink="/docs/installation">Installation</a> and
          <a routerLink="/docs/project-setup">Project setup</a>.
        </p>
      </div>
    </section>

    <section class="features">
      <h2 class="features__title">What it does</h2>
      <div class="features__grid">
        @for (feature of features; track feature.slug) {
          <a class="feature" [routerLink]="['/docs', feature.slug]">
            <i class="feature__icon {{ feature.icon }}" aria-hidden="true"></i>
            <h3 class="feature__title">{{ feature.title }}</h3>
            <p class="feature__text">{{ feature.text }}</p>
            <span class="feature__more">Read more <i class="pi pi-arrow-right" aria-hidden="true"></i></span>
          </a>
        }
      </div>
    </section>

    <section class="closing">
      <div class="closing__inner">
        <h2>Programs run on the hub. This library is the host.</h2>
        <p>
          Robot code still imports the on-hub modules — <code>hub</code>, <code>motor</code>,
          <code>color_sensor</code>. {{ site.name }} is the other half: the PC-side process that
          sends that code to the brick and listens to what comes back. Mixing the two up is the most
          common first mistake, so it has
          <a routerLink="/docs/hub-code-vs-host-code">a page of its own</a>.
        </p>
        <p-button
          label="Read the guide"
          icon="pi pi-book"
          severity="contrast"
          routerLink="/docs/hub-code-vs-host-code"
        />
      </div>
    </section>
  `,
  styleUrl: './home.scss',
})
export class Home {
  protected readonly site = SITE;
  protected readonly quickstart = QUICKSTART;
  protected readonly installCommand = INSTALL_COMMAND;
  protected readonly features = FEATURES;

  constructor() {
    inject(SeoService).set(
      '',
      `${SITE.tagline}. Connect over BLE, upload MicroPython, stream the console and read typed sensor snapshots from asyncio Python.`,
    );
  }
}
