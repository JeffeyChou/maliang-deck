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

export interface RenderResult {
  svg: string;
  warnings: LayoutWarning[];
}

// ─── Static fallbacks for HTML-only animated elements ─────────────────────

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderAnimatedTextFallback(el: { id: string; x: number; y: number; width: number; height?: number; fontSize: number; fontFamily?: string; content: string }): RenderResult {
  const fontSize = el.fontSize;
  const fontFamily = el.fontFamily ?? 'sans-serif';
  return {
    svg: `<text x="${el.x}" y="${el.y + fontSize}" width="${el.width}" font-size="${fontSize}" font-family="${escapeXml(fontFamily)}">${escapeXml(el.content)}</text>`,
    warnings: [{
      type: 'unsupported-feature',
      message: 'AnimatedText rendered as static text (animations are HTML-only)',
      elementId: el.id,
      phase: 'render-svg',
      policy: 'native',
    }],
  };
}

function renderFormulaFallback(el: { id: string; x: number; y: number; width: number; height?: number; latex: string; fontSize?: number }): RenderResult {
  const fontSize = el.fontSize ?? 16;
  return {
    svg: `<text x="${el.x}" y="${el.y + fontSize}" font-size="${fontSize}" font-family="serif" font-style="italic">${escapeXml(el.latex)}</text>`,
    warnings: [{
      type: 'unsupported-feature',
      message: 'Formula rendered as raw LaTeX text (KaTeX rendering is HTML-only)',
      elementId: el.id,
      phase: 'render-svg',
      policy: 'native',
    }],
  };
}

function renderGraphFallback(el: { id: string; x: number; y: number; width: number; height: number }): RenderResult {
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

export function renderElement(el: Element, basePath?: string, registry?: FontRegistry, defaultFont?: string): RenderResult {
  switch (el.type) {
    case 'text':
      return renderText(el, registry, defaultFont);
    case 'group':
      return renderGroup(el, basePath, registry, defaultFont);
    case 'rect':
      return { svg: renderRect(el), warnings: [] };
    case 'circle':
      return { svg: renderCircle(el), warnings: [] };
    case 'ellipse':
      return { svg: renderEllipse(el), warnings: [] };
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
      return renderLayout(el, basePath, registry, defaultFont, undefined);
    case 'customHtml':
      return renderCustomHtml(el as any);
    case 'animatedText':
      return renderAnimatedTextFallback(el as any);
    case 'formula':
      return renderFormulaFallback(el as any);
    case 'graph':
      return renderGraphFallback(el as any);
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
