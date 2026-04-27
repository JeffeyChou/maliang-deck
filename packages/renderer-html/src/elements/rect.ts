import type { RectElement } from '@maliang-deck/schema';
import { buildBaseStyle, escapeHtml, escapeJsonForScript } from '../utils.js';

export function renderRect(el: RectElement): string {
  const fill = el.fill ?? 'transparent';
  const stroke = el.stroke ?? 'none';
  const strokeWidth = el.strokeWidth ?? 1;
  const radius = el.radius ?? 0;

  const extras: string[] = [`background-color: ${fill}`];

  if (stroke !== 'none') {
    extras.push(`border: ${strokeWidth}px solid ${stroke}`);
  }

  if (radius > 0) {
    extras.push(`border-radius: ${radius}px`);
  }

  const style = buildBaseStyle(el, extras);
  const morphAttr = el.morphSteps?.length ? ' data-shape-morph' : '';
  let html = `<div${morphAttr} style="${style}"></div>`;

  if (el.morphSteps?.length) {
    const config = {
      elementType: 'rect',
      morphSteps: el.morphSteps,
      morphStepTrigger: el.morphStepTrigger ?? 'click',
    };
    const configJson = escapeJsonForScript(JSON.stringify(config));
    html += `<script type="application/json" data-for="${escapeHtml(el.id)}">${configJson}</script>`;
  }

  return html;
}
