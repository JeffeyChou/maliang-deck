import type { GroupElement } from '@maliang-deck/schema';
import { buildCssTransform, escapeHtml, escapeJsonForScript } from '../utils.js';
import { childRenderContext, renderElement } from './index.js';

export function renderGroup(el: GroupElement): string {
  const parts: string[] = [
    `position: absolute`,
    `left: ${el.x}px`,
    `top: ${el.y}px`,
  ];

  if (el.width != null) parts.push(`width: ${el.width}px`);
  if (el.height != null) parts.push(`height: ${el.height}px`);

  // Support both the DSL transform string (passthrough) and rotation-based transform
  const cssTransform = buildCssTransform(el);
  if (el.transform) {
    // Raw CSS transform from DSL (e.g. "translate(10px, 20px) rotate(45deg)")
    parts.push(`transform: ${el.transform}`);
    parts.push(`transform-origin: center center`);
  } else if (cssTransform) {
    parts.push(`transform: ${cssTransform}`);
    parts.push(`transform-origin: center center`);
  }

  if (el.opacity != null && el.opacity !== 1) {
    parts.push(`opacity: ${el.opacity}`);
  }

  const style = parts.join('; ');
  const morphAttr = el.morphSteps?.length ? ' data-component-morph' : '';
  const childContext = childRenderContext();
  const children = el.elements.map((child) => renderElement(child, childContext)).join('\n');

  let html = `<div${morphAttr} style="${style}">\n${children}\n</div>`;

  if (el.morphSteps?.length) {
    const config = {
      elementType: 'group',
      morphSteps: el.morphSteps,
      morphStepTrigger: el.morphStepTrigger ?? 'click',
    };
    const configJson = escapeJsonForScript(JSON.stringify(config));
    html += `<script type="application/json" data-for="${escapeHtml(el.id)}">${configJson}</script>`;
  }

  return html;
}
