import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';

/** Class Optimus UI's dark-mode selector is configured to watch. */
export const DARK_CLASS = 'sp-dark';
const STORAGE_KEY = 'spikeprime-docs-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly dark = signal(false);

  constructor() {
    if (this.isBrowser) {
      this.dark.set(this.preferred());
    }
    effect(() => {
      const dark = this.dark();
      if (!this.isBrowser) {
        return;
      }
      this.document.documentElement.classList.toggle(DARK_CLASS, dark);
      this.document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
      } catch {
        // Private-mode browsers refuse storage; the toggle still works per session.
      }
    });
  }

  toggle(): void {
    this.dark.update((dark) => !dark);
  }

  private preferred(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored === 'dark';
      }
    } catch {
      // Fall through to the OS preference.
    }
    return this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ?? false;
  }
}
