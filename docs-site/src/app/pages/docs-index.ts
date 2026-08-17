import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DOC_GROUPS } from '../content';
import { SeoService } from '../core/seo';
import { Sidebar } from '../layout/sidebar';

@Component({
  selector: 'sp-docs-index',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Sidebar],
  template: `
    <div class="layout">
      <aside class="layout__nav">
        <div class="layout__sticky"><sp-sidebar /></div>
      </aside>

      <article class="doc">
        <p class="doc__eyebrow">Documentation</p>
        <h1 class="doc__title">All pages</h1>
        <p class="doc__summary">
          Every page in the guide, from a first install through to the wire format. Press
          <kbd>Ctrl</kbd>&nbsp;<kbd>K</kbd> to search across all of it.
        </p>

        @for (group of groups; track group.id) {
          <section class="group">
            <h2 class="group__title">
              <i class="{{ group.icon }}" aria-hidden="true"></i> {{ group.title }}
            </h2>
            <ul class="group__list">
              @for (page of group.pages; track page.slug) {
                <li>
                  <a class="entry" [routerLink]="['/docs', page.slug]">
                    <span class="entry__title">{{ page.title }}</span>
                    <span class="entry__summary">{{ page.summary }}</span>
                  </a>
                </li>
              }
            </ul>
          </section>
        }
      </article>
    </div>
  `,
  styleUrls: ['./doc-page.scss', './docs-index.scss'],
})
export class DocsIndex {
  protected readonly groups = DOC_GROUPS;

  constructor() {
    inject(SeoService).set(
      'Documentation',
      'Every page of the SpikePrimePythonSDK guide: setup, guides, API reference and the HubOS 3 protocol.',
      'docs',
    );
  }
}
