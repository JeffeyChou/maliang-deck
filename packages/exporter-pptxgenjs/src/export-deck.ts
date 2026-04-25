import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import PptxGenJSImport from 'pptxgenjs';
import type { Deck } from '@maliang-deck/schema';
import { resolveLayoutElement } from '@maliang-deck/schema';
import {
  createCanvasGeometry,
  elementPosition,
  offsetElementPosition,
  toSlideHeight,
  toSlideWidth,
  type CanvasGeometry,
} from './geometry.js';
import { normalizeTableRows } from './table.js';
import type {
  PptxGenJsChartElement,
  PptxGenJsExportRequest,
  PptxGenJsExportResult,
  PptxGenJsExportWarning,
  PptxGenJsRenderableElement,
  PptxGenJsTableElement,
} from './types.js';

const HEX_COLOR_RE = /^#?[0-9a-f]{6}$/iu;
const PptxGenJS = resolvePptxGenJsConstructor();

type PptxInstance = InstanceType<typeof PptxGenJS> & Record<string, unknown>;
type PptxSlide = ReturnType<PptxInstance['addSlide']> & Record<string, unknown>;

type RenderContext = {
  slide: PptxSlide;
  pptx: PptxInstance;
  geometry: CanvasGeometry;
  basePath: string;
  warnings: PptxGenJsExportWarning[];
  offset: { x: number; y: number };
};

function resolvePptxGenJsConstructor(): typeof PptxGenJSImport {
  if (typeof PptxGenJSImport === 'function') return PptxGenJSImport;
  const maybeDefault = (PptxGenJSImport as unknown as { default?: typeof PptxGenJSImport }).default;
  if (typeof maybeDefault === 'function') return maybeDefault;
  throw new Error('pptxgenjs module did not expose a constructor');
}

export async function exportDeckWithPptxGenJs(request: PptxGenJsExportRequest): Promise<PptxGenJsExportResult> {
  const outputPath = resolve(request.outputPath);
  const warnings: PptxGenJsExportWarning[] = [];

  try {
    const pptx = createPresentation(request.deck);
    renderDeck(request.deck, pptx, {
      basePath: request.basePath ? resolve(request.basePath) : process.cwd(),
      warnings,
    });
    await writePresentation(pptx, outputPath);
    return { format: 'pptx', outputPath, success: true, warnings };
  } catch (err) {
    return {
      format: 'pptx',
      outputPath,
      success: false,
      warnings,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function createPresentation(deck: Deck): PptxInstance {
  const geometry = createCanvasGeometry(deck.meta.canvas);
  const pptx = new PptxGenJS() as PptxInstance;
  pptx.author = 'Maliang Deck';
  pptx.subject = deck.meta.title;
  pptx.title = deck.meta.title;
  pptx.company = 'Maliang Deck';
  pptx.lang = 'en-US';
  pptx.defineLayout({ name: geometry.layoutName, width: geometry.widthIn, height: geometry.heightIn });
  pptx.layout = geometry.layoutName;
  return pptx;
}

export function renderDeck(
  deck: Deck,
  pptx: PptxInstance = createPresentation(deck),
  options: { basePath?: string; warnings?: PptxGenJsExportWarning[] } = {},
): PptxInstance {
  const geometry = createCanvasGeometry(deck.meta.canvas);
  const warnings = options.warnings ?? [];
  const basePath = options.basePath ? resolve(options.basePath) : process.cwd();

  for (const deckSlide of deck.slides) {
    const slide = pptx.addSlide() as PptxSlide;
    if (deckSlide.background) applySlideBackground(slide, deckSlide.background, warnings, deckSlide.id);

    for (const element of deckSlide.elements as PptxGenJsRenderableElement[]) {
      renderElement(element, {
        slide,
        pptx,
        geometry,
        basePath,
        warnings,
        offset: { x: 0, y: 0 },
      });
    }

    if (deckSlide.notes) addSpeakerNotes(slide, deckSlide.notes, warnings, deckSlide.id);
  }

  return pptx;
}

async function writePresentation(pptx: PptxInstance, outputPath: string): Promise<void> {
  const maybeWriteFile = pptx.writeFile as unknown;
  if (typeof maybeWriteFile !== 'function') {
    throw new Error('pptxgenjs instance does not expose writeFile');
  }
  await maybeWriteFile.call(pptx, { fileName: outputPath });
}

function addText(slide: PptxSlide, text: string, options: Record<string, unknown>): void {
  (slide.addText as unknown as (value: string, options: Record<string, unknown>) => unknown).call(slide, text, options);
}

function addShape(slide: PptxSlide, shape: unknown, options: Record<string, unknown>): void {
  (slide.addShape as unknown as (shape: unknown, options: Record<string, unknown>) => unknown).call(slide, shape, options);
}

function addImage(slide: PptxSlide, options: Record<string, unknown>): void {
  (slide.addImage as unknown as (options: Record<string, unknown>) => unknown).call(slide, options);
}

function addChart(slide: PptxSlide, type: unknown, data: unknown[], options: Record<string, unknown>): void {
  (slide.addChart as unknown as (type: unknown, data: unknown[], options: Record<string, unknown>) => unknown).call(slide, type, data, options);
}

function addTable(slide: PptxSlide, rows: unknown[], options: Record<string, unknown>): void {
  (slide.addTable as unknown as (rows: unknown[], options: Record<string, unknown>) => unknown).call(slide, rows, options);
}

function renderElement(element: PptxGenJsRenderableElement, context: RenderContext): void {
  switch (element.type) {
    case 'text':
      renderTextElement(element, context);
      break;
    case 'rect':
      renderRectElement(element, context);
      break;
    case 'circle':
      renderCircleElement(element, context);
      break;
    case 'ellipse':
      renderEllipseElement(element, context);
      break;
    case 'line':
      renderLineElement(element, context);
      break;
    case 'image':
      renderImageElement(element, context);
      break;
    case 'chart':
      renderChartElement(element, context);
      break;
    case 'table':
      renderTableElement(element, context);
      break;
    case 'group':
      renderGroupElement(element, context);
      break;
    case 'layout':
      renderLayoutElement(element, context);
      break;
    case 'customHtml': {
      const customEl = element as { id: string; x: number; y: number; width: number; height: number; fallbackImage?: string; rotation?: number; opacity?: number };
      if (customEl.fallbackImage) {
        const position = offsetElementPosition(customEl as any, context.geometry, context.offset);
        addImage(context.slide, { data: customEl.fallbackImage, ...position });
      } else {
        context.warnings.push({
          code: 'pptxgenjs.customHtml.no-fallback',
          message: `customHtml element "${customEl.id}" has no fallbackImage and cannot be rendered in PPTX.`,
          detail: { elementId: customEl.id },
        });
      }
      break;
    }
    default:
      context.warnings.push({
        code: 'pptxgenjs.element.unsupported',
        message: `Skipping unsupported element type "${element.type}" in pptxgenjs exporter.`,
        detail: { elementId: element.id, type: element.type },
      });
  }
}

function renderLayoutElement(element: Extract<PptxGenJsRenderableElement, { type: 'layout' }>, context: RenderContext): void {
  if (element.rotation) {
    context.warnings.push({
      code: 'pptxgenjs.layout.transform-unsupported',
      message: `Layout rotation is not preserved by the v1 pptxgenjs exporter for layout "${element.id}".`,
      detail: { elementId: element.id, rotation: element.rotation },
    });
  }
  if (element.opacity != null && element.opacity !== 1) {
    context.warnings.push({
      code: 'pptxgenjs.layout.opacity-unsupported',
      message: `Layout opacity is not preserved by the v1 pptxgenjs exporter for layout "${element.id}".`,
      detail: { elementId: element.id, opacity: element.opacity },
    });
  }
  if (element.overflow === 'clip') {
    context.warnings.push({
      code: 'pptxgenjs.layout.clip-unsupported',
      message: `Layout clipping is not preserved by the v1 pptxgenjs exporter for layout "${element.id}".`,
      detail: { elementId: element.id, overflow: element.overflow },
    });
  }
  const records = resolveLayoutElement(element, {
    originX: context.offset.x,
    originY: context.offset.y,
    path: `layout#${element.id}`,
  });
  for (const record of records) {
    for (const diagnostic of record.diagnostics) {
      context.warnings.push({
        code: diagnostic.code,
        message: diagnostic.message,
        detail: {
          elementId: diagnostic.elementId,
          path: diagnostic.path,
          phase: 'export-pptx',
          policy: diagnostic.policy,
          sourceElementId: record.sourceElementId,
        },
      });
    }
    renderElement(record.element as PptxGenJsRenderableElement, {
      ...context,
      offset: { x: 0, y: 0 },
    });
  }
}

function renderTextElement(element: Extract<PptxGenJsRenderableElement, { type: 'text' }>, context: RenderContext): void {
  const position = offsetElementPosition(element, context.geometry, context.offset);
  const fontSizePt = pxToPt(element.fontSize, context.geometry);
  addText(context.slide, element.content, {
    ...position,
    h: position.h ?? Math.max(fontSizePt / 72, 0.1),
    fontFace: element.fontFamily,
    fontSize: fontSizePt,
    color: normalizeColor(element.color ?? '#000000'),
    bold: element.fontWeight === 'bold',
    italic: element.fontStyle === 'italic',
    align: element.align,
    valign: element.verticalAlign === 'middle' ? 'mid' : element.verticalAlign,
    rotate: element.rotation,
    transparency: opacityToTransparency(element.opacity),
    margin: 0,
    fit: 'shrink',
  });
}

function renderRectElement(element: Extract<PptxGenJsRenderableElement, { type: 'rect' }>, context: RenderContext): void {
  addShape(context.slide, shapeType(context.pptx, 'rect'), {
    ...offsetElementPosition(element, context.geometry, context.offset),
    rotate: element.rotation,
    transparency: opacityToTransparency(element.opacity),
    fill: element.fill ? { color: normalizeColor(element.fill), transparency: opacityToTransparency(element.opacity) } : { transparency: 100 },
    line: element.stroke
      ? { color: normalizeColor(element.stroke), width: element.strokeWidth ?? 1 }
      : { transparency: 100 },
    radius: element.radius == null ? undefined : toSlideWidth(element.radius, context.geometry),
  });
}

function renderCircleElement(element: Extract<PptxGenJsRenderableElement, { type: 'circle' }>, context: RenderContext): void {
  const box = {
    type: element.type,
    id: element.id,
    x: element.x - element.radius + context.offset.x,
    y: element.y - element.radius + context.offset.y,
    width: element.radius * 2,
    height: element.radius * 2,
    rotation: element.rotation,
    opacity: element.opacity,
  };
  addShape(context.slide, shapeType(context.pptx, 'ellipse'), {
    ...elementPosition(box, context.geometry),
    rotate: element.rotation,
    transparency: opacityToTransparency(element.opacity),
    fill: element.fill ? { color: normalizeColor(element.fill), transparency: opacityToTransparency(element.opacity) } : { transparency: 100 },
    line: element.stroke
      ? { color: normalizeColor(element.stroke), width: element.strokeWidth ?? 1 }
      : { transparency: 100 },
  });
}

function renderEllipseElement(element: Extract<PptxGenJsRenderableElement, { type: 'ellipse' }>, context: RenderContext): void {
  addShape(context.slide, shapeType(context.pptx, 'ellipse'), {
    ...offsetElementPosition(element, context.geometry, context.offset),
    rotate: element.rotation,
    transparency: opacityToTransparency(element.opacity),
    fill: element.fill ? { color: normalizeColor(element.fill), transparency: opacityToTransparency(element.opacity) } : { transparency: 100 },
    line: element.stroke
      ? { color: normalizeColor(element.stroke), width: element.strokeWidth ?? 1 }
      : { transparency: 100 },
  });
}

function renderLineElement(element: Extract<PptxGenJsRenderableElement, { type: 'line' }>, context: RenderContext): void {
  const x = Math.min(element.x, element.x2);
  const y = Math.min(element.y, element.y2);
  const width = Math.abs(element.x2 - element.x);
  const height = Math.abs(element.y2 - element.y);
  addShape(context.slide, shapeType(context.pptx, 'line'), {
    ...elementPosition({ ...element, x: x + context.offset.x, y: y + context.offset.y, width, height }, context.geometry),
    rotate: element.rotation,
    transparency: opacityToTransparency(element.opacity),
    line: { color: normalizeColor(element.stroke ?? '#000000'), width: element.strokeWidth ?? 1 },
  });
}

function renderImageElement(element: Extract<PptxGenJsRenderableElement, { type: 'image' }>, context: RenderContext): void {
  const position = offsetElementPosition(element, context.geometry, context.offset);
  if (element.src.startsWith('data:')) {
    addImage(context.slide, { data: element.src, ...position, rotate: element.rotation, transparency: opacityToTransparency(element.opacity) });
    return;
  }

  const imagePath = isAbsolute(element.src) ? element.src : join(context.basePath, element.src);
  if (!existsSync(imagePath)) {
    context.warnings.push({
      code: 'pptxgenjs.image.missing',
      message: `Skipping missing image "${element.src}" in pptxgenjs exporter.`,
      detail: { elementId: element.id, src: element.src, resolvedPath: imagePath },
    });
    return;
  }

  addImage(context.slide, { path: imagePath, ...position, rotate: element.rotation, transparency: opacityToTransparency(element.opacity) });
}

function chartStyleToOptions(style: PptxGenJsChartElement['style']): Record<string, unknown> {
  if (!style) return {};
  const opts: Record<string, unknown> = {};
  if (style.palette) opts.chartColors = style.palette.map((c) => c.replace('#', ''));
  if (style.showLegend === false) opts.showLegend = false;
  if (style.showDataLabels) opts.showValue = true;
  if (style.backgroundColor) opts.plotArea = { fill: { color: style.backgroundColor.replace('#', '') } };
  return opts;
}

function renderChartElement(element: PptxGenJsChartElement, context: RenderContext): void {
  const chartType = pptxChartType(element, context);
  if (!chartType) return;
  addChart(context.slide, chartType, element.data, {
    ...chartStyleToOptions(element.style),
    ...(element.options ?? {}),
    ...offsetElementPosition(element, context.geometry, context.offset),
  });
}

function tableStyleToOptions(style: PptxGenJsTableElement['style']): Record<string, unknown> {
  if (!style) return {};
  const opts: Record<string, unknown> = {};
  if (style.borderColor) opts.border = { type: 'solid', color: style.borderColor.replace('#', '') };
  if (style.fontSize) opts.fontSize = style.fontSize;
  if (style.fontFamily) opts.fontFace = style.fontFamily;
  return opts;
}

function renderTableElement(element: PptxGenJsTableElement, context: RenderContext): void {
  addTable(context.slide, normalizeTableRows(element.rows), {
    ...tableStyleToOptions(element.style),
    ...(element.options ?? {}),
    ...offsetElementPosition(element, context.geometry, context.offset),
  });
}

function renderGroupElement(element: Extract<PptxGenJsRenderableElement, { type: 'group' }>, context: RenderContext): void {
  if (element.transform || element.rotation) {
    context.warnings.push({
      code: 'pptxgenjs.group.transform-unsupported',
      message: `Group transforms are not preserved by the v1 pptxgenjs exporter for group "${element.id}".`,
      detail: { elementId: element.id, transform: element.transform, rotation: element.rotation },
    });
  }
  for (const child of element.elements) {
    renderElement(child, {
      ...context,
      offset: {
        x: context.offset.x + element.x,
        y: context.offset.y + element.y,
      },
    });
  }
}

function pptxChartType(element: PptxGenJsChartElement, context: RenderContext): unknown {
  const source = ((context.pptx as { ChartType?: Record<string, unknown> }).ChartType
    ?? (PptxGenJS as unknown as { ChartType?: Record<string, unknown> }).ChartType
    ?? {}) as Record<string, unknown>;
  const key = element.chartType === 'doughnut' ? 'doughnut' : element.chartType;
  const type = source[key];
  if (!type) {
    context.warnings.push({
      code: 'pptxgenjs.chart.unsupported-type',
      message: `Skipping unsupported chart type "${element.chartType}" in pptxgenjs exporter.`,
      detail: { elementId: element.id, chartType: element.chartType },
    });
  }
  return type;
}

function addSpeakerNotes(slide: PptxSlide, notes: string, warnings: PptxGenJsExportWarning[], slideId: string): void {
  const addNotes = slide.addNotes as unknown;
  if (typeof addNotes === 'function') {
    addNotes.call(slide, notes);
    return;
  }
  warnings.push({
    code: 'pptxgenjs.notes.unsupported',
    message: `Speaker notes could not be written for slide "${slideId}" because this pptxgenjs version does not expose addNotes().`,
    detail: { slideId },
  });
}

function applySlideBackground(slide: PptxSlide, color: string, warnings: PptxGenJsExportWarning[], slideId: string): void {
  if (!HEX_COLOR_RE.test(color)) {
    warnings.push({
      code: 'pptxgenjs.background.unsupported',
      message: `Slide background "${color}" is not a hex color and was not applied by the pptxgenjs exporter.`,
      detail: { slideId, background: color },
    });
    return;
  }
  slide.background = { color: normalizeColor(color) };
}

function shapeType(pptx: PptxInstance, key: string): unknown {
  const source = ((pptx as { ShapeType?: Record<string, unknown> }).ShapeType
    ?? (PptxGenJS as unknown as { ShapeType?: Record<string, unknown> }).ShapeType
    ?? {}) as Record<string, unknown>;
  return source[key] ?? key;
}

function normalizeColor(color: string): string {
  return color.startsWith('#') ? color.slice(1) : color;
}

function opacityToTransparency(opacity?: number): number | undefined {
  if (opacity == null || opacity >= 1) return undefined;
  if (opacity <= 0) return 100;
  return Math.round((1 - opacity) * 100);
}

function pxToPt(value: number, geometry: CanvasGeometry): number {
  return Math.max(1, Math.round(toSlideHeight(value, geometry) * 72));
}
