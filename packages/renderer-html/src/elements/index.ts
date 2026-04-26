import type { Element, CustomHtmlElement, AnimatedTextElement, FormulaElement, GraphElement } from '@maliang-deck/schema';
import { buildAnimAttrs, buildAnimInitialStyle, escapeHtml } from '../utils.js';
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
import { renderAnimatedText } from './animatedText.js';
import { renderFormula } from './formula.js';
import { renderGraph } from './graph.js';

export interface RenderElementContext {
  slideId?: string;
  autoAnimate?: boolean;
  depth?: number;
  /** Deck-level default font family for text elements that omit fontFamily. */
  defaultFont?: string;
}

/** Return the active context's defaultFont (used by text renderer). */
export function getActiveDefaultFont(): string | undefined {
  return activeContext?.defaultFont;
}

let activeContext: RenderElementContext | undefined;

function normalizeDomIdPart(value: string): string {
  const normalized = value.trim().replace(/[^A-Za-z0-9_-]+/g, '-');
  return normalized || 'item';
}

function scopedDomId(el: Element, context: RenderElementContext | undefined): string {
  if (!context?.slideId) return normalizeDomIdPart(el.id);
  return `${normalizeDomIdPart(context.slideId)}__${normalizeDomIdPart(el.id)}`;
}

/**
 * Inject animation data attributes and id into rendered element HTML.
 * Inserts after the opening tag name (e.g., after `<div` or `<img`).
 */
function editorMetadataAttrs(
  el: Element,
  context: RenderElementContext | undefined,
): string[] {
  const typeAttr = `data-maliang-deck-type="${escapeHtml(el.type)}"`;
  const isTopLevel = (context?.depth ?? 0) === 0;

  if (isTopLevel && el.type === 'text') {
    return [typeAttr, 'data-maliang-deck-editable="geometry text"'];
  }

  if (isTopLevel && el.type === 'rect') {
    return [typeAttr, 'data-maliang-deck-editable="geometry rect-style"'];
  }

  if (isTopLevel && el.type === 'image') {
    return [typeAttr, 'data-maliang-deck-editable="geometry"'];
  }

  if (isTopLevel && el.type === 'circle') {
    return [typeAttr, 'data-maliang-deck-editable="geometry circle-style"'];
  }

  if (isTopLevel && el.type === 'line') {
    return [typeAttr, 'data-maliang-deck-editable="geometry line-style"'];
  }

  const readOnlyReason = !isTopLevel
    ? 'nested-element'
    : el.type === 'group' || el.type === 'layout'
      ? 'container-element'
      : el.type === 'animatedText' || el.type === 'formula' || el.type === 'graph'
        ? 'extension-element'
        : 'unsupported-element';

  return [
    typeAttr,
    `data-maliang-deck-readonly-reason="${readOnlyReason}"`,
  ];
}

export function childRenderContext(): RenderElementContext | undefined {
  if (!activeContext) return undefined;
  return {
    ...activeContext,
    depth: (activeContext.depth ?? 0) + 1,
  };
}

function injectAnimAttrs(
  html: string,
  el: Element,
  context: RenderElementContext | undefined,
): string {
  const animAttrs = buildAnimAttrs(el);

  const idAttr = ` id="${escapeHtml(scopedDomId(el, context))}"`;
  const sharedAttrs = [
    `data-maliang-deck-id="${escapeHtml(el.id)}"`,
    ...editorMetadataAttrs(el, context),
    context?.autoAnimate ? `data-maliang-deck-auto-animate-id="${escapeHtml(el.id)}"` : '',
  ].filter(Boolean).join(' ');
  const animStyle = buildAnimInitialStyle(el);

  // Inject id and data-anim-* after the opening tag
  let result = html.replace(/^(<\w+)/, `$1${idAttr} ${sharedAttrs}${animAttrs}`);

  // If element has animation, add hidden initial state to inline style
  if (animStyle) {
    result = result.replace(/style="([^"]*)"/, `style="$1; ${animStyle}"`);
  }

  return result;
}

export function renderElement(el: Element, context?: RenderElementContext | number): string {
  const previousContext = activeContext;
  const explicitContext = typeof context === 'object' ? context : undefined;
  const inheritedContext = explicitContext ?? activeContext;
  const currentContext: RenderElementContext = {
    ...inheritedContext,
    depth: inheritedContext?.depth ?? 0,
  };
  activeContext = currentContext;

  let html: string;
  try {
    switch (el.type) {
      case 'text':
        html = renderText(el);
        break;
      case 'rect':
        html = renderRect(el);
        break;
      case 'circle':
        html = renderCircle(el);
        break;
      case 'ellipse':
        html = renderEllipse(el);
        break;
      case 'line':
        html = renderLine(el);
        break;
      case 'path':
        html = renderPath(el);
        break;
      case 'polygon':
        html = renderPolygon(el);
        break;
      case 'image':
        html = renderImage(el);
        break;
      case 'group':
        html = renderGroup(el);
        break;
      case 'chart':
        html = renderChart(el);
        break;
      case 'table':
        html = renderTable(el);
        break;
      case 'layout':
        html = renderLayout(el);
        break;
      case 'customHtml':
        html = renderCustomHtml(el as CustomHtmlElement);
        break;
      case 'animatedText':
        html = renderAnimatedText(el as AnimatedTextElement);
        break;
      case 'formula':
        html = renderFormula(el as FormulaElement);
        break;
      case 'graph':
        html = renderGraph(el as GraphElement);
        break;
      default:
        throw new Error(`Unsupported element type: ${(el as { type: string }).type}`);
    }
    return injectAnimAttrs(html, el, currentContext);
  } finally {
    activeContext = previousContext;
  }
}
