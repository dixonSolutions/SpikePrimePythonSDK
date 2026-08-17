import type { CodeLang } from '../content/types';

/**
 * A small, dependency-free highlighter for the handful of languages these docs
 * use. It escapes first and only ever emits `<span class="tok-*">`, so the
 * result is safe to bind with `[innerHTML]`.
 */

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (char) => ESCAPES[char]);
}

const PYTHON_KEYWORDS =
  'False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|' +
  'finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|' +
  'with|yield|match|case|self|cls';

const PYTHON_BUILTINS =
  'abs|bool|bytearray|bytes|dict|enumerate|float|frozenset|getattr|hasattr|int|isinstance|len|' +
  'list|max|min|open|print|range|repr|reversed|set|sorted|str|sum|super|tuple|type|zip';

// Order matters: strings and comments are listed first so a `#` inside a string
// is consumed as part of the string, and a quote inside a comment is not treated
// as the start of one.
const PYTHON = new RegExp(
  [
    String.raw`(?<comment>#[^\n]*)`,
    String.raw`(?<string>[fFrRbBuU]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'))`,
    String.raw`(?<decorator>@[A-Za-z_][\w.]*)`,
    String.raw`(?<defkw>\b(?:def|class)\s+)(?<defname>[A-Za-z_]\w*)`,
    String.raw`(?<kw>\b(?:${PYTHON_KEYWORDS})\b)`,
    String.raw`(?<builtin>\b(?:${PYTHON_BUILTINS})\b)`,
    String.raw`(?<num>\b(?:0[xX][0-9a-fA-F_]+|\d[\d_]*(?:\.\d+)?)\b)`,
  ].join('|'),
  'g',
);

const SHELL_BUILTINS =
  'pip|python|python3|pytest|spikeprime|cd|ls|npm|npx|ng|git|source|export|sudo|apt|brew|' +
  'echo|mkdir|rm|curl|node|deactivate|systemctl|bluetoothctl|hcitool';

const SHELL = new RegExp(
  [
    String.raw`(?<comment>#[^\n]*)`,
    String.raw`(?<string>"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')`,
    String.raw`(?<flag>(?<=\s)--?[A-Za-z][\w-]*)`,
    String.raw`(?<builtin>(?<![\w./-])(?:${SHELL_BUILTINS})(?![\w./-]))`,
    String.raw`(?<var>\$\{?[A-Za-z_]\w*\}?)`,
  ].join('|'),
  'g',
);

const TOML = new RegExp(
  [
    String.raw`(?<comment>#[^\n]*)`,
    String.raw`(?<string>"(?:\\.|[^"\\\n])*"|'(?:[^'\n])*')`,
    String.raw`(?<section>^\s*\[[^\]\n]+\])`,
    String.raw`(?<key>^\s*[A-Za-z_][\w.-]*(?=\s*=))`,
    String.raw`(?<kw>\b(?:true|false)\b)`,
    String.raw`(?<num>\b\d[\d_.]*\b)`,
  ].join('|'),
  'gm',
);

const JSON_RE = new RegExp(
  [
    String.raw`(?<key>"(?:\\.|[^"\\])*"(?=\s*:))`,
    String.raw`(?<string>"(?:\\.|[^"\\])*")`,
    String.raw`(?<kw>\b(?:true|false|null)\b)`,
    String.raw`(?<num>-?\b\d[\d.eE+-]*\b)`,
  ].join('|'),
  'g',
);

const YAML = new RegExp(
  [
    String.raw`(?<comment>#[^\n]*)`,
    String.raw`(?<string>"(?:\\.|[^"\\\n])*"|'(?:[^'\n])*')`,
    String.raw`(?<key>^\s*-?\s*[A-Za-z_][\w.-]*(?=\s*:))`,
    String.raw`(?<kw>\b(?:true|false|null)\b)`,
    String.raw`(?<num>\b\d[\d.]*\b)`,
  ].join('|'),
  'gm',
);

const GRAMMARS: Partial<Record<CodeLang, RegExp>> = {
  python: PYTHON,
  bash: SHELL,
  toml: TOML,
  json: JSON_RE,
  yaml: YAML,
};

function wrap(token: string, value: string): string {
  return `<span class="tok-${token}">${value}</span>`;
}

export function highlight(code: string, lang: CodeLang): string {
  const escaped = escapeHtml(code);
  const grammar = GRAMMARS[lang];
  if (!grammar) {
    return escaped;
  }
  // A fresh lastIndex per call keeps the shared /g regexes reentrant.
  grammar.lastIndex = 0;
  return escaped.replace(grammar, (match, ...rest) => {
    const groups = rest[rest.length - 1] as Record<string, string | undefined>;
    if (groups['defkw'] !== undefined && groups['defname'] !== undefined) {
      const keyword = groups['defkw'].trimEnd();
      const gap = groups['defkw'].slice(keyword.length);
      return wrap('kw', keyword) + gap + wrap('def', groups['defname']);
    }
    for (const [name, value] of Object.entries(groups)) {
      if (value !== undefined) {
        return wrap(name, value);
      }
    }
    return match;
  });
}
