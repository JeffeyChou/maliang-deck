import type { LayoutWarning } from '@maliang-deck/text-measure';
import { buildOpacityAttrs, buildTransform, escapeXml, n } from '../utils.js';
import type { RenderResult } from './index.js';

interface CustomHtmlLike {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  fallbackImage?: string;
}

export function renderCustomHtml(el: CustomHtmlLike): RenderResult {
  const warnings: LayoutWarning[] = [{
    type: 'unsupported-feature',
    elementId: el.id,
    message: `customHtml element "${el.id}" is not supported in SVG export.${el.fallbackImage ? ' Using fallback image.' : ' Showing placeholder.'}`,
  }];

  const transform = buildTransform(el as Parameters<typeof buildTransform>[0]);
  const opacityAttrs = buildOpacityAttrs(el.opacity);
  const attrs = [
    `data-maliang-deck-id="${escapeXml(el.id)}"`,
    `data-maliang-deck-kind="customHtml"`,
    opacityAttrs,
    transform ? `transform="${transform}"` : '',
  ].filter(Boolean).join(' ');

  if (el.fallbackImage) {
    return {
      svg: `<g ${attrs}><image href="${escapeXml(el.fallbackImage)}" x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}"/></g>`,
      warnings,
    };
  }

  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  return {
    svg: [
      `<g ${attrs}>`,
      `<rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}" fill="#f0f0f0" stroke="#cccccc" stroke-width="1"/>`,
      `<text x="${n(cx)}" y="${n(cy + 5)}" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#999999">Custom HTML</text>`,
      `</g>`,
    ].join('\n'),
    warnings,
  };
}
