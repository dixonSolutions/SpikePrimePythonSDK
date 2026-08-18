import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home').then((m) => m.Home),
  },
  {
    path: 'docs',
    loadComponent: () => import('./pages/docs-index').then((m) => m.DocsIndex),
  },
  {
    // The overview *is* the home page. Keep the old URL working rather than
    // serving the same page from two addresses.
    path: 'docs/overview',
    redirectTo: '/',
    pathMatch: 'full',
  },
  {
    path: 'docs/:slug',
    loadComponent: () => import('./pages/doc-page').then((m) => m.DocPageView),
  },
  {
    path: 'not-found',
    loadComponent: () => import('./pages/not-found').then((m) => m.NotFound),
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];
