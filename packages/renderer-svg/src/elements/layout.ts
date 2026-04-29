import type { LayoutElement } from '@maliang-deck/schema';
import { resolveLayoutElement } from '@maliang-deck/schema';
import type { LayoutWarning } from '@maliang-deck/text-measure';
import type { FontRegistry } from '@maliang-deck/text-measure';
import { animationDataAttrs, buildTransform, escapeXml, n } from '../utils.js';
import { renderElement, type RenderResult, type SvgElementRenderOptions } from './index.js';

function diagnosticWarnings(el: LayoutElement, path: string): LayoutWarning[] {
  return [{
    type: 'layout-flattened',
    message: `Layout "${el.id}" was flattened to static SVG geometry for export.`,
    elementId: el.id,
    path,
    phase: 'render-svg',
    policy: 'native',
  }];
}

export function renderLayout(el: LayoutElement, basePath?: string, registry?: FontRegistry, defaultFont?: string, path = `layout#${el.id}`, options?: SvgElementRenderOptions): RenderResult {
  const records = resolveLayoutElement(el, { originX: 0, originY: 0, path });
  const warnings: LayoutWarning[] = diagnosticWarnings(el, path);
  const svgParts: string[] = [];

  for (const record of records) {
    warnings.push(...record.diagnostics.map((diagnostic): LayoutWarning => ({
      type: diagnostic.code as LayoutWarning['type'],
      message: diagnostic.message,
      slideIndex: diagnostic.slideIndex,
      elementId: diagnostic.elementId,
      path: diagnostic.path,
      phase: diagnostic.phase,
      policy: diagnostic.policy,
      detail: diagnostic.detail,
    })));
    const rendered = renderElement(record.element, basePath, registry, defaultFont, options);
    svgParts.push(rendered.svg);
    warnings.push(...rendered.warnings);
  }

  const clipId = `maliang-deck-layout-clip-${el.id.replace(/[^A-Za-z0-9_-]/g, '-')}`;
  const defs = el.overflow === 'clip'
    ? `<defs><clipPath id="${escapeXml(clipId)}" clipPathUnits="userSpaceOnUse"><rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}"/></clipPath></defs>\n`
    : '';
  const attrs = [
    `data-maliang-deck-layout-id="${escapeXml(el.id)}"`,
    `data-maliang-deck-layout-mode="${el.layout.mode}"`,
    ...animationDataAttrs(el),
    buildTransform(el),
    el.opacity != null && el.opacity !== 1 ? `opacity="${n(el.opacity)}"` : '',
    el.overflow === 'clip' ? `clip-path="url(#${escapeXml(clipId)})"` : '',
  ].filter(Boolean).join(' ');

  return { svg: `${defs}<g ${attrs}>\n${svgParts.join('\n')}\n</g>`, warnings };
}
