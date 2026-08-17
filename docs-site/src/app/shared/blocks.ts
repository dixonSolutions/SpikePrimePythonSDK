import { ChangeDetectionStrategy, Component, HostListener, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from '@openng/optimus-ui/card';
import { MessageModule } from '@openng/optimus-ui/message';

import type { Block, CalloutTone } from '../content/types';
import { ApiEntryCard } from './api-entry';
import { CodeBlock } from './code-block';

const TONE: Record<CalloutTone, 'info' | 'success' | 'warn' | 'error'> = {
  info: 'info',
  success: 'success',
  warn: 'warn',
  danger: 'error',
};

const TONE_ICON: Record<CalloutTone, string> = {
  info: 'pi pi-info-circle',
  success: 'pi pi-check-circle',
  warn: 'pi pi-exclamation-triangle',
  danger: 'pi pi-ban',
};

@Component({
  selector: 'sp-blocks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CardModule, MessageModule, CodeBlock, ApiEntryCard],
  template: `
    @for (block of blocks(); track $index) {
      @switch (block.kind) {
        @case ('prose') {
          <p class="prose" [innerHTML]="block.html"></p>
        }

        @case ('code') {
          <sp-code [code]="block.code" [lang]="block.lang" [caption]="block.caption" />
        }

        @case ('list') {
          @if (block.ordered) {
            <ol class="list">
              @for (item of block.items; track $index) {
                <li [innerHTML]="item"></li>
              }
            </ol>
          } @else {
            <ul class="list">
              @for (item of block.items; track $index) {
                <li [innerHTML]="item"></li>
              }
            </ul>
          }
        }

        @case ('table') {
          <div class="table-wrap">
            <table class="table">
              @if (block.caption) {
                <caption>{{ block.caption }}</caption>
              }
              <thead>
                <tr>
                  @for (header of block.headers; track $index) {
                    <th scope="col">{{ header }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of block.rows; track $index) {
                  <tr>
                    @for (cell of row; track $index) {
                      <td [innerHTML]="cell"></td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @case ('callout') {
          <p-message
            class="callout"
            [severity]="tone(block.tone)"
            [icon]="toneIcon(block.tone)"
            variant="outlined"
          >
            <div class="callout__body">
              @if (block.title) {
                <strong class="callout__title">{{ block.title }}</strong>
              }
              <span [innerHTML]="block.html"></span>
            </div>
          </p-message>
        }

        @case ('steps') {
          <ol class="steps">
            @for (step of block.steps; track $index) {
              <li class="steps__item">
                <strong class="steps__title">{{ step.title }}</strong>
                <span [innerHTML]="step.html"></span>
              </li>
            }
          </ol>
        }

        @case ('cards') {
          <div class="cards">
            @for (card of block.cards; track card.title) {
              <p-card styleClass="cards__card">
                <div class="cards__inner">
                  <i class="cards__icon {{ card.icon }}" aria-hidden="true"></i>
                  <h3 class="cards__title">{{ card.title }}</h3>
                  <p class="cards__text" [innerHTML]="card.html"></p>
                  @if (card.slug) {
                    <a class="cards__link" [routerLink]="['/docs', card.slug]">
                      Read more <i class="pi pi-arrow-right" aria-hidden="true"></i>
                    </a>
                  } @else if (card.href) {
                    <a class="cards__link" [href]="card.href" target="_blank" rel="noopener">
                      Open <i class="pi pi-external-link" aria-hidden="true"></i>
                    </a>
                  }
                </div>
              </p-card>
            }
          </div>
        }

        @case ('terminal') {
          <div class="terminal">
            <div class="terminal__command"><span aria-hidden="true">$</span> {{ block.command }}</div>
            <pre class="terminal__output">{{ block.output }}</pre>
          </div>
        }

        @case ('api') {
          @for (entry of block.entries; track entry.name) {
            <sp-api-entry [entry]="entry" />
          }
        }
      }
    }
  `,
  styleUrl: './blocks.scss',
})
export class Blocks {
  readonly blocks = input.required<readonly Block[]>();

  private readonly router = inject(Router);

  /**
   * Prose is bound with `[innerHTML]`, so cross-references inside it are plain
   * anchors that the router never sees. They are authored relative to
   * `<base href>` — `docs/installation` — which keeps right-click and
   * middle-click honest; this handler turns an ordinary left click into an
   * in-app navigation instead of a full page load.
   */
  @HostListener('click', ['$event'])
  protected onClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const anchor = (event.target as HTMLElement | null)?.closest('a');
    const href = anchor?.getAttribute('href');
    if (!anchor || !href || anchor.target === '_blank') {
      return;
    }
    if (/^([a-z]+:|\/\/|#)/i.test(href)) {
      return;
    }
    event.preventDefault();
    const [path, fragment] = href.split('#');
    void this.router.navigateByUrl(`/${path}${fragment ? `#${fragment}` : ''}`);
  }

  protected tone(value: CalloutTone) {
    return TONE[value];
  }

  protected toneIcon(value: CalloutTone) {
    return TONE_ICON[value];
  }
}
