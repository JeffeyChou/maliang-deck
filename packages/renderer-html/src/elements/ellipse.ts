import type { EllipseElement } from '@maliang-deck/schema';
import { buildBaseStyle } from '../utils.js';

export function renderEllipse(el: EllipseElement): string {
  const fill = el.fill ?? 'transparent';
  const stroke = el.stroke ?? 'none';
  const strokeWidth = el.strokeWidth ?? 1;

  const extras: string[] = [
    `background-color: ${fill}`,
    `border-radius: 50%`,
  ];

  if (stroke !== 'none') {
    extras.push(`border: ${strokeWidth}px solid ${stroke}`);
  }

  const style = buildBaseStyle(el, extras);
  return `<div style="${style}"></div>`;
}
