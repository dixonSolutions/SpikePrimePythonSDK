import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HOME_PAGE, docPath, neighbours } from '../content';
import { SeoService } from '../core/seo';
import { SITE } from '../core/site';
import { Sidebar } from '../layout/sidebar';
import { TableOfContents } from '../layout/toc';
import { Blocks } from '../shared/blocks';

/**
 * The landing page. It is the same three-column documentation shell as every
 * other page — sidebar, content, table of contents — rendering the overview
 * from `content/pages/overview.ts`. There is deliberately no marketing hero:
 * the first screen a reader gets is the install command.
 */
@Component({
  selector: 'sp-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Sidebar, TableOfContents, Blocks],
  template: `
    <div class="layout">
      <aside class="layout__nav">
        <div class="layout__sticky"><sp-sidebar /></div>
      </aside>

      <article class="doc">
        <p class="doc__eyebrow">Unofficial &middot; HubOS 3 &middot; Bluetooth LE</p>
        <h1 class="doc__title">{{ site.name }}</h1>
        <p class="doc__summary">
          A host-side Python SDK for the LEGO&reg; Education SPIKE&trade; Prime hub. Scan for a hub,
          upload MicroPython, stream its console and read typed sensor snapshots — all from ordinary
          <code>asyncio</code> code on your own machine.
        </p>

        <dl class="facts">
          <div><dt>Python</dt><dd>{{ site.pythonRequires }}+</dd></div>
          <div><dt>Transport</dt><dd>BLE via bleak</dd></div>
          <div><dt>Import</dt><dd><code>{{ site.importName }}</code></dd></div>
          <div><dt>License</dt><dd>{{ site.license }}</dd></div>
        </dl>

        @for (section of page.sections; track section.id) {
          <section class="doc__section" [id]="section.id">
            <h2 class="doc__heading">
              <a [href]="'#' + section.id" [attr.aria-label]="'Link to ' + section.title">
                {{ section.title }}<i class="pi pi-link" aria-hidden="true"></i>
              </a>
            </h2>
            <sp-blocks [blocks]="section.blocks" />
          </section>
        }

        <nav class="pager" aria-label="Pagination">
          <span></span>
          @if (next; as target) {
            <a class="pager__link pager__link--next" [routerLink]="path(target.slug)">
              <span class="pager__label">Next <i class="pi pi-arrow-right" aria-hidden="true"></i></span>
              <span class="pager__title">{{ target.title }}</span>
            </a>
          }
        </nav>
      </article>

      <aside class="layout__toc">
        <div class="layout__sticky"><sp-toc [sections]="page.sections" /></div>
      </aside>
    </div>
  `,
  styleUrls: ['./doc-page.scss', './home.scss'],
})
export class Home {
  protected readonly site = SITE;
  protected readonly page = HOME_PAGE;
  protected readonly next = neighbours(HOME_PAGE.slug).next;

  constructor() {
    inject(SeoService).set(
      '',
      `${SITE.tagline}. Install it, connect over BLE, upload MicroPython, stream the console and read typed sensor snapshots from asyncio Python.`,
    );
  }

  protected path(slug: string): string[] {
    return docPath(slug);
  }
}
