/**
 * The documentation content model.
 *
 * Pages are data, not templates. One generic renderer draws every page, which
 * keeps the table of contents, the search index, the previous/next pager and
 * the prerendered route list all derived from the same source instead of drifting
 * apart the way hand-written page components do.
 */

/** A fragment of trusted HTML authored in this repository. Inline tags only. */
export type Html = string;

export type CodeLang = 'python' | 'bash' | 'text' | 'toml' | 'json' | 'yaml';

export interface ProseBlock {
  kind: 'prose';
  html: Html;
}

export interface CodeBlockContent {
  kind: 'code';
  lang: CodeLang;
  code: string;
  /** Shown above the snippet, e.g. a file name or a shell prompt hint. */
  caption?: string;
}

export interface ListBlock {
  kind: 'list';
  ordered?: boolean;
  items: Html[];
}

export interface TableBlock {
  kind: 'table';
  headers: string[];
  rows: Html[][];
  caption?: string;
}

export type CalloutTone = 'info' | 'success' | 'warn' | 'danger';

export interface CalloutBlock {
  kind: 'callout';
  tone: CalloutTone;
  title?: string;
  html: Html;
}

export interface StepsBlock {
  kind: 'steps';
  steps: { title: string; html: Html }[];
}

export interface CardsBlock {
  kind: 'cards';
  cards: { title: string; icon: string; html: Html; slug?: string; href?: string }[];
}

export interface TerminalBlock {
  kind: 'terminal';
  command: string;
  output: string;
}

/** One documented parameter, attribute or enum member. */
export interface ApiParam {
  name: string;
  type?: string;
  default?: string;
  doc: Html;
}

export type ApiKind =
  | 'class'
  | 'dataclass'
  | 'enum'
  | 'function'
  | 'method'
  | 'property'
  | 'attribute'
  | 'exception'
  | 'constant';

export interface ApiEntry {
  name: string;
  kind: ApiKind;
  signature: string;
  summary: Html;
  /** Anchor id. Defaults to a slug of the name. */
  id?: string;
  params?: ApiParam[];
  returns?: { type: string; doc: Html };
  raises?: { type: string; doc: Html }[];
  notes?: Html;
  example?: { lang: CodeLang; code: string };
}

export interface ApiBlock {
  kind: 'api';
  entries: ApiEntry[];
}

export type Block =
  | ProseBlock
  | CodeBlockContent
  | ListBlock
  | TableBlock
  | CalloutBlock
  | StepsBlock
  | CardsBlock
  | TerminalBlock
  | ApiBlock;

export interface DocSection {
  /** Anchor id, also the table-of-contents target. */
  id: string;
  title: string;
  blocks: Block[];
}

export interface DocPage {
  slug: string;
  title: string;
  /** One sentence. Used on cards, in search results and as the meta description. */
  summary: string;
  /** Extra search terms that do not appear in the prose. */
  keywords?: string[];
  sections: DocSection[];
}

export interface DocGroup {
  id: string;
  title: string;
  icon: string;
  pages: DocPage[];
}

/** Strip inline tags so page text can be indexed and matched. */
export function plainText(html: Html): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Everything on a page that should be searchable, as one string per block. */
export function blockText(block: Block): string {
  switch (block.kind) {
    case 'prose':
      return plainText(block.html);
    case 'code':
      return `${block.caption ?? ''} ${block.code}`;
    case 'list':
      return block.items.map(plainText).join(' ');
    case 'table':
      return [block.headers.join(' '), ...block.rows.map((row) => row.map(plainText).join(' '))].join(' ');
    case 'callout':
      return `${block.title ?? ''} ${plainText(block.html)}`;
    case 'steps':
      return block.steps.map((step) => `${step.title} ${plainText(step.html)}`).join(' ');
    case 'cards':
      return block.cards.map((card) => `${card.title} ${plainText(card.html)}`).join(' ');
    case 'terminal':
      return `${block.command} ${block.output}`;
    case 'api':
      return block.entries
        .map((entry) => `${entry.name} ${entry.signature} ${plainText(entry.summary)}`)
        .join(' ');
  }
}

export function entryId(entry: ApiEntry): string {
  return entry.id ?? entry.name.replace(/[^\w.]+/g, '').replace(/\./g, '-').toLowerCase();
}
