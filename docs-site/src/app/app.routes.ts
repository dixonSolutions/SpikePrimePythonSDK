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
