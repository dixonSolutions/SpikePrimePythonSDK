import { Injectable } from '@angular/core';

import { ALL_PAGES, groupOf } from '../content';
import { blockText, plainText } from '../content/types';

export interface SearchHit {
  slug: string;
  fragment?: string;
  title: string;
  context: string;
  group: string;
  score: number;
}

interface IndexEntry {
  slug: string;
  fragment?: string;
  title: string;
  context: string;
  group: string;
  haystack: string;
}

function buildIndex(): IndexEntry[] {
  const entries: IndexEntry[] = [];
  for (const page of ALL_PAGES) {
    const group = groupOf(page.slug)?.title ?? 'Docs';
    const pageText = page.sections
      .map((section) => `${section.title} ${section.blocks.map(blockText).join(' ')}`)
      .join(' ');
    entries.push({
      slug: page.slug,
      title: page.title,
      context: page.summary,
      group,
      haystack: `${page.title} ${page.summary} ${(page.keywords ?? []).join(' ')} ${pageText}`.toLowerCase(),
    });
    for (const section of page.sections) {
      const text = section.blocks.map(blockText).join(' ');
      entries.push({
        slug: page.slug,
        fragment: section.id,
        title: section.title,
        context: `${page.title} · ${plainText(text).slice(0, 120)}`,
        group,
        haystack: `${section.title} ${page.title} ${text}`.toLowerCase(),
      });
    }
  }
  return entries;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly index = buildIndex();

  search(query: string, limit = 12): SearchHit[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      return [];
    }
    const hits: SearchHit[] = [];
    for (const entry of this.index) {
      const title = entry.title.toLowerCase();
      let score = 0;
      let matchedAll = true;
      for (const term of terms) {
        const inTitle = title.includes(term);
        const occurrences = countOccurrences(entry.haystack, term);
        if (!occurrences && !inTitle) {
          matchedAll = false;
          break;
        }
        // A term in the heading is worth far more than the same term buried in
        // a paragraph, so section headings surface ahead of passing mentions.
        score += (inTitle ? 24 : 0) + Math.min(occurrences, 6) * 2;
        if (title === term) {
          score += 40;
        }
      }
      if (!matchedAll) {
        continue;
      }
      // Whole pages outrank their own sections when the query is generic.
      if (!entry.fragment) {
        score += 6;
      }
      hits.push({
        slug: entry.slug,
        fragment: entry.fragment,
        title: entry.title,
        context: entry.context,
        group: entry.group,
        score,
      });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

function countOccurrences(haystack: string, term: string): number {
  let count = 0;
  let index = haystack.indexOf(term);
  while (index !== -1 && count < 10) {
    count += 1;
    index = haystack.indexOf(term, index + term.length);
  }
  return count;
}
