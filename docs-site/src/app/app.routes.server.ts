import { RenderMode, ServerRoute } from '@angular/ssr';

import { ROUTED_PAGES } from './content';

export const serverRoutes: ServerRoute[] = [
  {
    // Every documentation page is a real file in the deployed site, so GitHub
    // Pages can serve a deep link without a client-side fallback.
    path: 'docs/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => ROUTED_PAGES.map((page) => ({ slug: page.slug })),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
