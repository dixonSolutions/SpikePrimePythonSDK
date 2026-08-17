import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

import { SearchService, type SearchHit } from '../core/search';

@Component({
  selector: 'sp-search-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, InputTextModule],
  template: `
    <p-dialog
      [visible]="open()"
      (visibleChange)="open.set($event)"
      [modal]="true"
      [dismissableMask]="true"
      [showHeader]="false"
      [draggable]="false"
      [resizable]="false"
      position="top"
      styleClass="sp-search-dialog"
      [breakpoints]="{ '640px': '94vw' }"
      [style]="{ width: '38rem' }"
    >
      <div class="search">
        <div class="search__field">
          <i class="pi pi-search" aria-hidden="true"></i>
          <input
            #field
            pInputText
            type="search"
            class="search__input"
            placeholder="Search the documentation…"
            aria-label="Search the documentation"
            [value]="query()"
            (input)="onInput($event)"
            (keydown)="onKeydown($event)"
          />
          <kbd class="search__kbd">Esc</kbd>
        </div>

        @if (query().length > 0) {
          @if (hits().length) {
            <ul class="search__results" role="listbox">
              @for (hit of hits(); track hit.slug + (hit.fragment ?? '')) {
                <li>
                  <button
                    type="button"
                    class="search__hit"
                    [class.search__hit--active]="$index === cursor()"
                    role="option"
                    [attr.aria-selected]="$index === cursor()"
                    (click)="go(hit)"
                    (mouseenter)="cursor.set($index)"
                  >
                    <span class="search__hit-title">
                      {{ hit.title }}
                      @if (hit.fragment) {
                        <i class="pi pi-hashtag" aria-hidden="true"></i>
                      }
                    </span>
                    <span class="search__hit-context">{{ hit.context }}</span>
                    <span class="search__hit-group">{{ hit.group }}</span>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="search__empty">No matches for &ldquo;{{ query() }}&rdquo;.</p>
          }
        } @else {
          <p class="search__hint">
            Search page titles, headings, prose and every code sample. Use
            <kbd>↑</kbd> <kbd>↓</kbd> to move and <kbd>Enter</kbd> to open.
          </p>
        }
      </div>
    </p-dialog>
  `,
  styleUrl: './search-dialog.scss',
})
export class SearchDialog {
  readonly open = model.required<boolean>();

  private readonly search = inject(SearchService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  protected readonly query = signal('');
  protected readonly cursor = signal(0);
  protected readonly hits = computed<SearchHit[]>(() => this.search.search(this.query()));

  constructor() {
    effect(() => {
      if (this.open() && this.isBrowser) {
        // The dialog renders its content lazily, so the input only exists after
        // the open flag has been through a render pass.
        setTimeout(() => this.field()?.nativeElement.focus(), 60);
      }
    });
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.cursor.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const hits = this.hits();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.cursor.update((index) => (hits.length ? (index + 1) % hits.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.cursor.update((index) => (hits.length ? (index - 1 + hits.length) % hits.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const hit = hits[this.cursor()];
      if (hit) {
        this.go(hit);
      }
    } else if (event.key === 'Escape') {
      this.open.set(false);
    }
  }

  protected go(hit: SearchHit): void {
    this.open.set(false);
    this.query.set('');
    void this.router.navigate(['/docs', hit.slug], { fragment: hit.fragment });
  }
}
