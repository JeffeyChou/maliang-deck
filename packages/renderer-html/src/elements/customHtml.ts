import type { CustomHtmlElement } from '@maliang-deck/schema';
import { buildBaseStyle } from '../utils.js';

function stripDangerousHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(?:iframe|object|embed)(?:\s[^>]*)?\/?>/gi, '')
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');
}

export function renderCustomHtml(el: CustomHtmlElement): string {
  const style = buildBaseStyle(el, ['overflow: hidden']);
  const sanitized = stripDangerousHtml(el.html);
  return `<div data-maliang-deck-element="customHtml" style="${style}">${sanitized}</div>`;
}
