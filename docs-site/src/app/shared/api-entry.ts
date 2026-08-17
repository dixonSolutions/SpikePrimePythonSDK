import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from '@openng/optimus-ui/tag';

import { entryId, type ApiEntry, type ApiKind } from '../content/types';
import { CodeBlock } from './code-block';
import { highlight } from './highlight';

const SEVERITY: Record<ApiKind, 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
  class: 'info',
  dataclass: 'info',
  enum: 'contrast',
  function: 'success',
  method: 'success',
  property: 'warn',
  attribute: 'warn',
  exception: 'danger',
  constant: 'secondary',
};

@Component({
  selector: 'sp-api-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagModule, CodeBlock],
  template: `
    <article class="api" [id]="anchor()">
      <header class="api__head">
        <a class="api__anchor" [href]="'#' + anchor()" [attr.aria-label]="'Link to ' + entry().name">
          <h3 class="api__name">{{ entry().name }}</h3>
          <i class="pi pi-link" aria-hidden="true"></i>
        </a>
        <p-tag [value]="entry().kind" [severity]="severity()" />
      </header>

      <pre class="api__sig"><code [innerHTML]="signature()"></code></pre>

      <div class="api__summary" [innerHTML]="entry().summary"></div>

      @if (entry().params?.length) {
        <h4 class="api__label">Parameters</h4>
        <div class="api__scroll">
          <table class="api__table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Default</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              @for (param of entry().params; track param.name) {
                <tr>
                  <td><code>{{ param.name }}</code></td>
                  <td>@if (param.type) {<code class="api__type">{{ param.type }}</code>} @else {&mdash;}</td>
                  <td>@if (param.default) {<code>{{ param.default }}</code>} @else {&mdash;}</td>
                  <td [innerHTML]="param.doc"></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (entry().returns; as returns) {
        <h4 class="api__label">Returns</h4>
        <p class="api__returns">
          <code class="api__type">{{ returns.type }}</code>
          <span [innerHTML]="returns.doc"></span>
        </p>
      }

      @if (entry().raises?.length) {
        <h4 class="api__label">Raises</h4>
        <ul class="api__raises">
          @for (raise of entry().raises; track raise.type) {
            <li><code class="api__type">{{ raise.type }}</code> <span [innerHTML]="raise.doc"></span></li>
          }
        </ul>
      }

      @if (entry().notes; as notes) {
        <p class="api__notes" [innerHTML]="notes"></p>
      }

      @if (entry().example; as example) {
        <sp-code [code]="example.code" [lang]="example.lang" caption="Example" />
      }
    </article>
  `,
  styleUrl: './api-entry.scss',
})
export class ApiEntryCard {
  readonly entry = input.required<ApiEntry>();

  protected readonly anchor = computed(() => entryId(this.entry()));
  protected readonly severity = computed(() => SEVERITY[this.entry().kind]);
  protected readonly signature = computed(() => highlight(this.entry().signature, 'python'));
}
