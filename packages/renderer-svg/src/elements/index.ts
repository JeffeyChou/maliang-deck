import type { Element } from '@maliang-deck/schema';
import type { LayoutWarning } from '@maliang-deck/text-measure';
import type { FontRegistry } from '@maliang-deck/text-measure';
import { renderText } from './text.js';
import { renderRect } from './rect.js';
import { renderCircle } from './circle.js';
import { renderEllipse } from './ellipse.js';
import { renderLine } from './line.js';
import { renderPath } from './path.js';
import { renderPolygon } from './polygon.js';
import { renderImage } from './image.js';
import { renderGroup } from './group.js';
import { renderChart } from './chart.js';
import { renderTable } from './table.js';
import { renderLayout } from './layout.js';
import { renderCustomHtml } from './customHtml.js';
import { renderFormula } from './formula.js';
import { renderGraph } from './graph.js';

export interface RenderResult {
  svg: string;
  warnings: LayoutWarning[];
}

export type SvgElementRenderOptions = {
  mode?: 'pdf-final' | 'pptx-steps';
};

// ─── Static fallbacks for HTML-only animated elements ─────────────────────

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderAnimatedTextFallback(el: Extract<Element, { type: 'animatedText' }>, defaultFont?: string): RenderResult {
  const fontSize = el.fontSize;
  const fontFamily = el.fontFamily ?? defaultFont ?? 'sans-serif';
  const fill = el.color ?? '#000000';
  const finalContent = el.morphTo ?? el.content;
  return {
    svg: `<text x="${el.x}" y="${el.y + fontSize}" width="${el.width}" font-size="${fontSize}" font-family="${escapeXml(fontFamily)}" fill="${escapeXml(fill)}" data-maliang-deck-id="${escapeXml(el.id)}" data-maliang-deck-kind="animatedText" data-maliang-final-frame="true">${escapeXml(finalContent)}</text>`,
    warnings: [{
      type: 'unsupported-feature',
      message: 'AnimatedText rendered as its final static text frame for SVG/PPTX export.',
      elementId: el.id,
      phase: 'render-svg',
      policy: 'native',
    }],
  };
}

function renderGraphFallback(el: { id: string; x: number; y: number; width: number; height: number; fallbackImage?: string }): RenderResult {
  if (el.fallbackImage) {
    return {
      svg: `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${escapeXml(el.fallbackImage)}"/>`,
      warnings: [],
    };
  }
  return {
    svg: `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="none" stroke="#ccc" stroke-width="1" stroke-dasharray="4 2"/><text x="${el.x + el.width / 2}" y="${el.y + el.height / 2}" text-anchor="middle" font-size="12" fill="#999">[Graph]</text>`,
    warnings: [{
      type: 'unsupported-feature',
      message: 'Graph rendered as placeholder (runtime rendering is HTML-only)',
      elementId: el.id,
      phase: 'render-svg',
      policy: 'native',
    }],
  };
}

function renderModel3dFallback(el: { id: string; x: number; y: number; width: number; height: number; fallbackImage?: string }): RenderResult {
  if (el.fallbackImage) {
    return {
      svg: `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${escapeXml(el.fallbackImage)}"/>`,
      warnings: [],
    };
  }
  return {
    svg: `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="none" stroke="#ccc" stroke-width="1" stroke-dasharray="4 2"/><text x="${el.x + el.width / 2}" y="${el.y + el.height / 2}" text-anchor="middle" font-size="12" fill="#999">[3D Model]</text>`,
    warnings: [{
      type: 'unsupported-feature',
      message: '3D model rendered as placeholder (runtime rendering is HTML-only)',
      elementId: el.id,
      phase: 'render-svg',
      policy: 'native',
    }],
  };
}

function morphIgnoredWarning(el: Element): LayoutWarning | null {
  const morphable = el as { morphSteps?: unknown[] };
  if (morphable.morphSteps && Array.isArray(morphable.morphSteps) && morphable.morphSteps.length > 0) {
    return {
      type: 'unsupported-feature',
      message: `morphSteps on ${el.type} element "${el.id}" ignored in SVG/PDF export (morphing is HTML-only)`,
      elementId: el.id,
      phase: 'render-svg',
      policy: 'ignore',
    };
  }
  return null;
}

function withMorphWarning(result: RenderResult, el: Element): RenderResult {
  const w = morphIgnoredWarning(el);
  if (w) result.warnings.push(w);
  return result;
}

export function renderElement(el: Element, basePath?: string, registry?: FontRegistry, defaultFont?: string, options?: SvgElementRenderOptions): RenderResult {
  switch (el.type) {
    case 'text':
      return renderText(el, registry, defaultFont);
    case 'group':
      return withMorphWarning(renderGroup(el, basePath, registry, defaultFont, options), el);
    case 'rect':
      return withMorphWarning({ svg: renderRect(el), warnings: [] }, el);
    case 'circle':
      return withMorphWarning({ svg: renderCircle(el), warnings: [] }, el);
    case 'ellipse':
      return withMorphWarning({ svg: renderEllipse(el), warnings: [] }, el);
    case 'line':
      return { svg: renderLine(el), warnings: [] };
    case 'path':
      return { svg: renderPath(el), warnings: [] };
    case 'polygon':
      return { svg: renderPolygon(el), warnings: [] };
    case 'image':
      return { svg: renderImage(el, basePath), warnings: [] };
    case 'chart':
      return renderChart(el);
    case 'table':
      return renderTable(el);
    case 'layout':
      return withMorphWarning(renderLayout(el, basePath, registry, defaultFont, undefined, options), el);
    case 'customHtml':
      return renderCustomHtml(el as any);
    case 'animatedText':
      return renderAnimatedTextFallback(el, defaultFont);
    case 'formula':
      return renderFormula(el, options?.mode ?? 'pdf-final');
    case 'graph':
      return renderGraph(el);
    case 'model3d':
      return renderModel3dFallback(el as any);
    default:
      return {
        svg: `<g data-maliang-deck-unsupported-element="${(el as { id?: string }).id ?? 'unknown'}"></g>`,
        warnings: [{
          type: 'renderer-unsupported-element',
          message: `Unsupported SVG element type: ${(el as { type?: string }).type ?? 'unknown'}`,
          elementId: (el as { id?: string }).id,
          phase: 'render-svg',
          policy: 'fail',
        }],
      };
  }
}
