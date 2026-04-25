import type { RectElement } from '@maliang-deck/schema';
import { buildBaseStyle } from '../utils.js';

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
  return `<div style="${style}"></div>`;
}
