import type { CircleElement } from '@maliang-deck/schema';
import { buildCssTransform, escapeHtml, escapeJsonForScript } from '../utils.js';

export function renderCircle(el: CircleElement): string {
  const fill = el.fill ?? 'transparent';
  const stroke = el.stroke ?? 'none';
  const strokeWidth = el.strokeWidth ?? 1;
  const diameter = el.radius * 2;

  // CircleElement x/y is center; offset to get top-left
  const left = el.x - el.radius;
  const top = el.y - el.radius;

  const parts: string[] = [
    `position: absolute`,
    `left: ${left}px`,
    `top: ${top}px`,
    `width: ${diameter}px`,
    `height: ${diameter}px`,
    `border-radius: 50%`,
    `background-color: ${fill}`,
  ];

  if (stroke !== 'none') {
    parts.push(`border: ${strokeWidth}px solid ${stroke}`);
  }

  const transform = buildCssTransform(el);
  if (transform) {
    parts.push(`transform: ${transform}`);
    parts.push(`transform-origin: center center`);
  }

  if (el.opacity != null && el.opacity !== 1) {
    parts.push(`opacity: ${el.opacity}`);
  }

  const style = parts.join('; ');
  const morphAttr = el.morphSteps?.length ? ' data-shape-morph' : '';
  let html = `<div${morphAttr} style="${style}" data-maliang-deck-radius="${el.radius}"></div>`;

  if (el.morphSteps?.length) {
    const config = {
      elementType: 'circle',
      morphSteps: el.morphSteps,
      morphStepTrigger: el.morphStepTrigger ?? 'click',
    };
    const configJson = escapeJsonForScript(JSON.stringify(config));
    html += `<script type="application/json" data-for="${escapeHtml(el.id)}">${configJson}</script>`;
  }

  return html;
}
