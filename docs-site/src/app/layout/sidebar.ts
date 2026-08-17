import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { DOC_GROUPS } from '../content';

@Component({
  selector: 'sp-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="nav" aria-label="Documentation">
      @for (group of groups; track group.id) {
        <div class="nav__group">
          <h2 class="nav__title">
            <i class="{{ group.icon }}" aria-hidden="true"></i>
            {{ group.title }}
          </h2>
          <ul class="nav__list">
            @for (page of group.pages; track page.slug) {
              <li>
                <a
                  class="nav__link"
                  [routerLink]="['/docs', page.slug]"
                  routerLinkActive="nav__link--active"
                  [routerLinkActiveOptions]="{ exact: true }"
                  (click)="navigate.emit()"
                >
                  {{ page.title }}
                </a>
              </li>
            }
          </ul>
        </div>
      }
    </nav>
  `,
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  /** Emitted on every link click so a mobile drawer can close itself. */
  readonly navigate = output<void>();

  protected readonly groups = DOC_GROUPS;
}
