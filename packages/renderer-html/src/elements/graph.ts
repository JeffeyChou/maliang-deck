import type { GraphElement } from '@maliang-deck/schema';
import { buildBaseStyle, escapeHtml, escapeJsonForScript } from '../utils.js';

export function renderGraph(el: GraphElement): string {
  const style = buildBaseStyle(el);

  // Config stored in companion <script> block
  const config = {
    functions: el.functions,
    axes: el.axes,
    parameter: el.parameter,
    annotations: el.annotations,
    mode: el.mode,
    surface: el.surface,
    zAxis: el.zAxis,
    camera: el.camera,
  };
  const configJson = escapeJsonForScript(JSON.stringify(config));

  return `<div data-graph style="${style}"></div><script type="application/json" data-for="${escapeHtml(el.id)}">${configJson}</script>`;
}
