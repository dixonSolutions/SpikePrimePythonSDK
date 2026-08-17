import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DrawerModule } from '@openng/optimus-ui/drawer';

import { SITE } from './core/site';
import { ThemeService } from './core/theme';
import { SearchDialog } from './layout/search-dialog';
import { Sidebar } from './layout/sidebar';

@Component({
  selector: 'sp-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, ButtonModule, DrawerModule, Sidebar, SearchDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly site = SITE;
  protected readonly theme = inject(ThemeService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly menuOpen = signal(false);
  protected readonly searchOpen = signal(false);

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchOpen.set(true);
    } else if (event.key === '/' && !this.isTyping(event.target)) {
      event.preventDefault();
      this.searchOpen.set(true);
    }
  }

  protected get shortcut(): string {
    if (!this.isBrowser) {
      return 'Ctrl K';
    }
    return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘ K' : 'Ctrl K';
  }

  private isTyping(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    if (!element) {
      return false;
    }
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
  }
}
