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

export interface RenderResult {
  svg: string;
  warnings: LayoutWarning[];
}

export function renderElement(el: Element, basePath?: string, registry?: FontRegistry): RenderResult {
  switch (el.type) {
    case 'text':
      return renderText(el, registry);
    case 'group':
      return renderGroup(el, basePath, registry);
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
      return renderLayout(el, basePath, registry);
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
