import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import type { DocSection } from '../content/types';

@Component({
  selector: 'sp-toc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sections().length > 1) {
      <nav class="toc" aria-label="On this page">
        <h2 class="toc__title">On this page</h2>
        <ul class="toc__list">
          @for (section of sections(); track section.id) {
            <li>
              <a
                class="toc__link"
                [class.toc__link--active]="active() === section.id"
                [href]="'#' + section.id"
                (click)="jump($event, section.id)"
                >{{ section.title }}</a
              >
            </li>
          }
        </ul>
      </nav>
    }
  `,
  styleUrl: './toc.scss',
})
export class TableOfContents {
  readonly sections = input.required<readonly DocSection[]>();

  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;

  protected readonly active = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
    effect(() => {
      const sections = this.sections();
      if (!this.isBrowser) {
        return;
      }
      this.observer?.disconnect();
      this.active.set(sections[0]?.id ?? '');
      // Wait for the new page's headings to exist before watching them.
      queueMicrotask(() => this.observe(sections));
    });
  }

  protected jump(event: Event, id: string): void {
    if (!this.isBrowser) {
      return;
    }
    const target = this.document.getElementById(id);
    if (!target) {
      return;
    }
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.active.set(id);
    this.document.defaultView?.history.replaceState(null, '', `#${id}`);
  }

  private observe(sections: readonly DocSection[]): void {
    const targets = sections
      .map((section) => this.document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);
    if (!targets.length) {
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) {
          this.active.set(visible.target.id);
        }
      },
      // Bias the band towards the top of the viewport so the highlighted entry
      // matches the heading the reader is actually looking at.
      { rootMargin: '-72px 0px -65% 0px', threshold: 0 },
    );
    for (const target of targets) {
      this.observer.observe(target);
    }
  }
}
