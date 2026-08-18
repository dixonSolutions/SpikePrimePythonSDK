import type { DocGroup, DocPage } from './types';

import { overview } from './pages/overview';
import { installation } from './pages/installation';
import { projectSetup } from './pages/project-setup';
import { quickstart } from './pages/quickstart';
import { hubVsHost } from './pages/hub-vs-host';

import { connecting } from './pages/connecting';
import { programs } from './pages/programs';
import { consoleOutput } from './pages/console';
import { sensors } from './pages/sensors';
import { firmware } from './pages/firmware';
import { tunnel } from './pages/tunnel';
import { errorsGuide } from './pages/errors-guide';
import { troubleshooting } from './pages/troubleshooting';
import { examples } from './pages/examples';

import { apiSpikeprime } from './pages/api-spikeprime';
import { apiClient } from './pages/api-client';
import { apiDevices } from './pages/api-devices';
import { apiEnums } from './pages/api-enums';
import { apiErrors } from './pages/api-errors';
import { apiProtocol } from './pages/api-protocol';
import { cli } from './pages/cli';

import { protocol } from './pages/protocol';
import { architecture } from './pages/architecture';
import { packaging } from './pages/packaging';
import { contributing } from './pages/contributing';

export const DOC_GROUPS: DocGroup[] = [
  {
    id: 'start',
    title: 'Getting started',
    icon: 'pi pi-bolt',
    pages: [overview, installation, projectSetup, quickstart, hubVsHost],
  },
  {
    id: 'guides',
    title: 'Guides',
    icon: 'pi pi-book',
    pages: [
      connecting,
      programs,
      consoleOutput,
      sensors,
      firmware,
      tunnel,
      errorsGuide,
      troubleshooting,
      examples,
    ],
  },
  {
    id: 'api',
    title: 'API reference',
    icon: 'pi pi-code',
    pages: [apiSpikeprime, apiClient, apiDevices, apiEnums, apiErrors, apiProtocol, cli],
  },
  {
    id: 'internals',
    title: 'Protocol & internals',
    icon: 'pi pi-microchip',
    pages: [protocol, architecture],
  },
  {
    id: 'project',
    title: 'Project',
    icon: 'pi pi-github',
    pages: [packaging, contributing],
  },
];

/**
 * The overview is the site's landing page: it is served at `/` rather than at
 * `/docs/overview`, so the first thing a reader sees is documentation with the
 * sidebar beside it. It still lives in `DOC_GROUPS` so the sidebar, the search
 * index and the pager all treat it as an ordinary page; only its URL differs,
 * which is what `docPath` exists to hide from every call site.
 */
export const HOME_PAGE: DocPage = overview;

export function docPath(slug: string): string[] {
  return slug === HOME_PAGE.slug ? ['/'] : ['/docs', slug];
}

export const ALL_PAGES: DocPage[] = DOC_GROUPS.flatMap((group) => group.pages);

/** Slugs that `docs/:slug` actually renders — the home page is served at `/`. */
export const ROUTED_PAGES: DocPage[] = ALL_PAGES.filter((page) => page.slug !== HOME_PAGE.slug);

const BY_SLUG = new Map(ALL_PAGES.map((page) => [page.slug, page]));
const GROUP_BY_SLUG = new Map(
  DOC_GROUPS.flatMap((group) => group.pages.map((page) => [page.slug, group] as const)),
);

export function pageBySlug(slug: string): DocPage | undefined {
  return BY_SLUG.get(slug);
}

export function groupOf(slug: string): DocGroup | undefined {
  return GROUP_BY_SLUG.get(slug);
}

export interface Neighbours {
  previous?: DocPage;
  next?: DocPage;
}

export function neighbours(slug: string): Neighbours {
  const index = ALL_PAGES.findIndex((page) => page.slug === slug);
  if (index === -1) {
    return {};
  }
  return {
    previous: index > 0 ? ALL_PAGES[index - 1] : undefined,
    next: index < ALL_PAGES.length - 1 ? ALL_PAGES[index + 1] : undefined,
  };
}

export const FIRST_PAGE = ALL_PAGES[0];
