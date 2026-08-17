import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { SITE } from './site';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  /**
   * @param heading Page title, without the site suffix.
   * @param description One sentence for search results and link previews.
   * @param path Path relative to the site root, for the canonical URL.
   */
  set(heading: string, description: string, path = ''): void {
    const full = heading ? `${heading} · ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
    const url = `${SITE.pages}/${path}`.replace(/\/+$/, '/');

    this.title.setTitle(full);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE.name });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: full });
    this.meta.updateTag({ name: 'twitter:description', content: description });
  }
}
