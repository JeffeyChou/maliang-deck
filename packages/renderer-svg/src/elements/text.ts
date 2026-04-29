import type { TextElement } from '@maliang-deck/schema';
import type { LayoutWarning } from '@maliang-deck/text-measure';
import { layoutTextBox, FontRegistry } from '@maliang-deck/text-measure';
import { animationDataAttrs, buildTransform, buildOpacityAttrs, n, escapeXml } from '../utils.js';
import type { RenderResult } from './index.js';

export function renderText(el: TextElement, registry?: FontRegistry, defaultFont?: string): RenderResult {
  const anchor =
    el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start';

  const xOffset =
    el.align === 'center'
      ? el.x + el.width / 2
      : el.align === 'right'
        ? el.x + el.width
        : el.x;

  const fontSize = el.fontSize;
  const lineHeightFactor = el.lineHeight ?? 1.2;

  const fontFamily = el.fontFamily ?? defaultFont ?? 'sans-serif';
  const fontWeight = el.fontWeight ?? 'normal';
  const fontStyle = el.fontStyle ?? 'normal';
  const fill = el.color ?? '#000000';

  const transform = buildTransform(el);
  const opacityAttrs = buildOpacityAttrs(el.opacity);

  // Use text-measure engine for precise wrapping
  const reg = registry ?? new FontRegistry();
  const layout = layoutTextBox(
    { content: el.content, fontSize, fontFamily, fontWeight, fontStyle, lineHeight: lineHeightFactor },
    { width: el.width, height: el.height },
    reg,
  );

  const dy = layout.totalHeight / Math.max(layout.lines.length, 1);
  const lines = layout.lines;
  const warnings: LayoutWarning[] = [...layout.warnings];

  const baseAttrs = [
    `x="${n(xOffset)}"`,
    `font-size="${n(fontSize)}"`,
    `font-family="${fontFamily}"`,
    `font-weight="${fontWeight}"`,
    `font-style="${fontStyle}"`,
    `text-anchor="${anchor}"`,
    `fill="${fill}"`,
    opacityAttrs,
    transform ? `transform="${transform}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Data attributes for PPTX bridge
  const textRole = el.textRole ?? 'body';
  const wrapMode = textRole === 'body' ? 'reflow' : 'fixed';
  const originalContent = el.content.length > 200
    ? Buffer.from(el.content, 'utf-8').toString('base64')
    : escapeXml(el.content);
  const contentEncoding = el.content.length > 200 ? 'base64' : 'plain';

  const dataAttrs = [
    ...animationDataAttrs(el),
    `data-text-role="${textRole}"`,
    `data-box-x="${n(el.x)}"`,
    `data-box-y="${n(el.y)}"`,
    `data-box-w="${n(el.width)}"`,
    el.height != null ? `data-box-h="${n(el.height)}"` : '',
    `data-original-content="${originalContent}"`,
    `data-content-encoding="${contentEncoding}"`,
    `data-wrap-mode="${wrapMode}"`,
  ]
    .filter(Boolean)
    .join(' ');

  if (lines.length === 1) {
    // Single line: data-* directly on <text>
    const svg = `<text ${baseAttrs} ${dataAttrs} y="${n(el.y + fontSize)}">${escapeXml(lines[0])}</text>`;
    return { svg, warnings };
  }

  // Multiple lines: wrap in <g data-*> with child <text> elements
  const clipId = `clip-${el.id}`;
  const textElements = lines
    .map((line: string, i: number) => {
      const lineY = el.y + fontSize + i * dy;
      return `<text ${baseAttrs} y="${n(lineY)}">${escapeXml(line)}</text>`;
    })
    .join('\n');

  let svg: string;
  if (layout.overflow && el.height != null) {
    // Overflow clamping via clipPath
    svg = [
      `<clipPath id="${clipId}"><rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}"/></clipPath>`,
      `<g ${dataAttrs} clip-path="url(#${clipId})">`,
      textElements,
      `</g>`,
    ].join('\n');
  } else {
    svg = [
      `<g ${dataAttrs}>`,
      textElements,
      `</g>`,
    ].join('\n');
  }

  return { svg, warnings };
}
