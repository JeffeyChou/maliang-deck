import type { Model3dElement } from '@maliang-deck/schema';
import { buildBaseStyle, escapeHtml, escapeJsonForScript } from '../utils.js';

export function renderModel3d(el: Model3dElement): string {
  const style = buildBaseStyle(el);
  const configJson = escapeJsonForScript(JSON.stringify(el));
  return `<div data-model3d style="${style}"></div>` +
    `<script type="application/json" data-for="${escapeHtml(el.id)}">${configJson}</script>`;
}
