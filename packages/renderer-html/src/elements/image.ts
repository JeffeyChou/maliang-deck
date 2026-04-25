import type { ImageElement } from '@maliang-deck/schema';
import { buildBaseStyle, escapeHtml } from '../utils.js';

export function renderImage(el: ImageElement): string {
  const fit = el.fit ?? 'cover';

  const extras: string[] = [`object-fit: ${fit}`];

  const style = buildBaseStyle(el, extras);
  return `<img src="${escapeHtml(el.src)}" style="${style}" alt="" loading="lazy"/>`;
}
