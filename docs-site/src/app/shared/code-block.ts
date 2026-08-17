import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ButtonModule } from '@openng/optimus-ui/button';

import type { CodeLang } from '../content/types';
import { highlight } from './highlight';

const LABELS: Record<CodeLang, string> = {
  python: 'Python',
  bash: 'Shell',
  text: 'Text',
  toml: 'TOML',
  json: 'JSON',
  yaml: 'YAML',
};

@Component({
  selector: 'sp-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <figure class="code">
      <figcaption class="code__bar">
        <span class="code__label">{{ caption() || label() }}</span>
        <p-button
          size="small"
          [text]="true"
          severity="secondary"
          [icon]="copied() ? 'pi pi-check' : 'pi pi-copy'"
          [label]="copied() ? 'Copied' : 'Copy'"
          [ariaLabel]="'Copy the ' + label() + ' snippet'"
          (onClick)="copy()"
        />
      </figcaption>
      <pre class="code__pre"><code [class]="'language-' + lang()" [innerHTML]="rendered()"></code></pre>
    </figure>
  `,
  styleUrl: './code-block.scss',
})
export class CodeBlock {
  readonly code = input.required<string>();
  readonly lang = input<CodeLang>('text');
  readonly caption = input<string>();

  private readonly document = inject(DOCUMENT);
  protected readonly copied = signal(false);
  protected readonly rendered = computed(() => highlight(this.code(), this.lang()));
  protected readonly label = computed(() => LABELS[this.lang()]);

  protected async copy(): Promise<void> {
    const text = this.code();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access is denied outside a secure context; fall back to the
      // execCommand path rather than leaving the button doing nothing at all.
      const area = this.document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      this.document.body.appendChild(area);
      area.select();
      this.document.execCommand('copy');
      area.remove();
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1600);
  }
}
