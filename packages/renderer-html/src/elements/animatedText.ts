import type { AnimatedTextElement } from '@maliang-deck/schema';
import { buildBaseStyle, escapeHtml, escapeJsonForScript } from '../utils.js';
import { getActiveDefaultFont } from './index.js';

export function renderAnimatedText(el: AnimatedTextElement): string {
  const fontFamily = el.fontFamily ?? getActiveDefaultFont() ?? 'sans-serif';
  const color = el.color ?? '#000000';
  const fontWeight = el.fontWeight ?? 'normal';
  const textAlign = el.align ?? 'left';
  const lineHeight = el.lineHeight ?? 1.2;

  const style = buildBaseStyle(el, [
    `font-size: ${el.fontSize}px`,
    `font-family: ${fontFamily}`,
    `font-weight: ${fontWeight}`,
    `color: ${color}`,
    `text-align: ${textAlign}`,
    `line-height: ${lineHeight}`,
    `white-space: pre-wrap`,
    `overflow-wrap: anywhere`,
  ]);

  // Config stored in a companion <script> block (not data-attributes) for safe JSON escaping
  const config = {
    textAnimation: el.textAnimation,
    path: el.path,
    morphTo: el.morphTo,
    morphDuration: el.morphDuration,
  };
  const configJson = escapeJsonForScript(JSON.stringify(config));

  // Hidden SVG for path reference (if text-on-path is used)
  const pathSvg = el.path
    ? `<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><path id="${escapeHtml(el.id)}-path" d="${escapeHtml(el.path.d)}"/></svg>`
    : '';

  return `<div data-animated-text style="${style}">${escapeHtml(el.content)}</div>${pathSvg}<script type="application/json" data-for="${escapeHtml(el.id)}">${configJson}</script>`;
}
