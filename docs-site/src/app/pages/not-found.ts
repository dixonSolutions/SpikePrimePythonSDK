import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';

import { SeoService } from '../core/seo';

@Component({
  selector: 'sp-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule],
  template: `
    <section class="missing">
      <p class="missing__code">404</p>
      <h1 class="missing__title">That page is not here</h1>
      <p class="missing__text">
        The link may be from an older version of these docs, or the page may have been renamed.
        Try the documentation index, or press <kbd>Ctrl</kbd>&nbsp;<kbd>K</kbd> to search.
      </p>
      <div class="missing__actions">
        <p-button label="All documentation" icon="pi pi-book" routerLink="/docs" />
        <p-button label="Home" icon="pi pi-home" severity="secondary" [outlined]="true" routerLink="/" />
      </div>
    </section>
  `,
  styles: `
    .missing {
      max-width: 34rem;
      margin: 0 auto;
      padding: 6rem 1.25rem;
      text-align: center;

      &__code {
        margin: 0;
        font-size: 3.5rem;
        font-weight: 750;
        letter-spacing: -0.04em;
        color: var(--p-primary-color);
      }

      &__title {
        margin: 0.25rem 0 0.75rem;
        font-size: 1.6rem;
        letter-spacing: -0.02em;
      }

      &__text {
        margin: 0 0 1.6rem;
        line-height: 1.7;
        color: var(--p-text-muted-color);
      }

      &__actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      kbd {
        font-family: var(--sp-font-mono);
        font-size: 0.75rem;
        padding: 0.12rem 0.35rem;
        border: 1px solid var(--p-content-border-color);
        border-radius: 4px;
      }
    }
  `,
})
export class NotFound {
  constructor() {
    inject(SeoService).set('Page not found', 'That documentation page does not exist.', 'not-found');
  }
}
