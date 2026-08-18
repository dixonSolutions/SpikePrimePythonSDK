import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { docPath, groupOf, neighbours, pageBySlug } from '../content';
import { SeoService } from '../core/seo';
import { Sidebar } from '../layout/sidebar';
import { TableOfContents } from '../layout/toc';
import { Blocks } from '../shared/blocks';

@Component({
  selector: 'sp-doc-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Sidebar, TableOfContents, Blocks],
  template: `
    @if (page(); as page) {
      <div class="layout">
        <aside class="layout__nav">
          <div class="layout__sticky"><sp-sidebar /></div>
        </aside>

        <article class="doc">
          <p class="doc__eyebrow">{{ group()?.title }}</p>
          <h1 class="doc__title">{{ page.title }}</h1>
          <p class="doc__summary">{{ page.summary }}</p>

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
            @if (previous(); as previous) {
              <a class="pager__link pager__link--prev" [routerLink]="path(previous.slug)">
                <span class="pager__label"><i class="pi pi-arrow-left" aria-hidden="true"></i> Previous</span>
                <span class="pager__title">{{ previous.title }}</span>
              </a>
            } @else {
              <span></span>
            }
            @if (next(); as next) {
              <a class="pager__link pager__link--next" [routerLink]="path(next.slug)">
                <span class="pager__label">Next <i class="pi pi-arrow-right" aria-hidden="true"></i></span>
                <span class="pager__title">{{ next.title }}</span>
              </a>
            }
          </nav>
        </article>

        <aside class="layout__toc">
          <div class="layout__sticky"><sp-toc [sections]="page.sections" /></div>
        </aside>
      </div>
    }
  `,
  styleUrl: './doc-page.scss',
})
export class DocPageView {
  /** Bound from the `:slug` route parameter by `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly page = computed(() => pageBySlug(this.slug()));
  protected readonly group = computed(() => groupOf(this.slug()));
  protected readonly previous = computed(() => neighbours(this.slug()).previous);
  protected readonly next = computed(() => neighbours(this.slug()).next);

  protected path(slug: string): string[] {
    return docPath(slug);
  }

  constructor() {
    effect(() => {
      const page = this.page();
      if (!page) {
        // A slug that no longer exists should land on the 404 page rather than
        // rendering an empty shell.
        void this.router.navigate(['/not-found'], { skipLocationChange: true });
        return;
      }
      this.seo.set(page.title, page.summary, `docs/${page.slug}`);
    });
  }
}
