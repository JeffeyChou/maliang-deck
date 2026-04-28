import type {
  Element,
  LayoutElement,
  GridLayoutConfig,
  FlexLayoutConfig,
  LayoutChildPlacement,
  MaliangDeckDiagnostic,
} from './types.js';

export type ElementBox = { x: number; y: number; width?: number; height?: number };

export interface ResolvedElementRecord {
  element: Element;
  sourceElementId: string;
  sourcePath: string;
  box: ElementBox;
  diagnostics: MaliangDeckDiagnostic[];
}

export interface LayoutResolveContext {
  slideIndex?: number;
  originX: number;
  originY: number;
  path: string;
}

type Padding = { top: number; right: number; bottom: number; left: number };
type Gap = { row: number; column: number };
type GridPlacementRecord = {
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
};
type FlexPlacementRecord = {
  child: Element;
  index: number;
  mainSize: number;
  crossSize: number;
  size: { width: number; height: number };
};

function padding(value: LayoutElement['layout']['padding']): Padding {
  if (typeof value === 'number') return { top: value, right: value, bottom: value, left: value };
  return {
    top: value?.top ?? 0,
    right: value?.right ?? 0,
    bottom: value?.bottom ?? 0,
    left: value?.left ?? 0,
  };
}

function gridGap(value: GridLayoutConfig['gap']): Gap {
  if (typeof value === 'number') return { row: value, column: value };
  return { row: value?.row ?? 0, column: value?.column ?? 0 };
}

export function estimateFormulaHeight(element: { fontSize?: number; latex?: string; displayMode?: boolean }): number {
  const fs = element.fontSize ?? 20;
  const latex = element.latex ?? '';
  // Display-mode fractions, integrals, sums, and superscripts/subscripts are
  // significantly taller than inline single-line formulas.
  const hasVerticalStructure = /\\frac|\\dfrac|\\sum|\\prod|\\int|\\iint|\\iiint|\\oint|\\binom|\\begin\{(matrix|pmatrix|bmatrix|cases|array)\}|\^{|_{/.test(latex);
  if (hasVerticalStructure) return Math.ceil(fs * 2.8);
  // Superscript/subscript shorthand (single-char) adds moderate height
  const hasSimpleScript = /[\^_]/.test(latex);
  if (hasSimpleScript) return Math.ceil(fs * 2.0);
  return Math.ceil(fs * 1.6);
}

function elementSize(element: Element): { width: number; height: number } {
  switch (element.type) {
    case 'text':
      return { width: element.width, height: element.height ?? element.fontSize * (element.lineHeight ?? 1.2) };
    case 'circle':
      return { width: element.radius * 2, height: element.radius * 2 };
    case 'line':
      return { width: Math.abs(element.x2 - element.x), height: Math.abs(element.y2 - element.y) };
    case 'table':
      return { width: element.width, height: element.height ?? Math.max(element.rows.length * 28, 1) };
    case 'formula':
      return { width: element.width, height: element.height ?? estimateFormulaHeight(element) };
    case 'group':
    case 'layout':
    case 'rect':
    case 'ellipse':
    case 'path':
    case 'polygon':
    case 'image':
    case 'chart':
      return { width: element.width ?? 0, height: element.height ?? 0 };
    default: {
      const base = element as { width?: number; height?: number };
      return { width: base.width ?? 0, height: base.height ?? 0 };
    }
  }
}

function alignOffset(space: number, item: number, align: 'start' | 'center' | 'end' | 'stretch' | undefined): number {
  if (align === 'center') return Math.max((space - item) / 2, 0);
  if (align === 'end') return Math.max(space - item, 0);
  return 0;
}

function overflowDiagnostic(layout: LayoutElement, context: LayoutResolveContext, child: Element, box: ElementBox): MaliangDeckDiagnostic | undefined {
  if (layout.overflow !== 'warn') return undefined;
  const lx = box.x - context.originX - layout.x;
  const ly = box.y - context.originY - layout.y;
  const width = box.width ?? elementSize(child).width;
  const height = box.height ?? elementSize(child).height;
  if (lx >= 0 && ly >= 0 && lx + width <= layout.width && ly + height <= layout.height) return undefined;
  return {
    code: 'layout-overflow',
    severity: 'warning',
    phase: 'compile',
    message: `Element "${child.id}" overflows layout "${layout.id}".`,
    slideIndex: context.slideIndex,
    elementId: child.id,
    path: `${context.path}.elements`,
    policy: 'native',
    detail: { layoutId: layout.id, box, layoutBox: { x: layout.x, y: layout.y, width: layout.width, height: layout.height } },
  };
}

export function cloneElementWithBox(element: Element, box: ElementBox): Element {
  const cloned: Element = { ...element, x: box.x, y: box.y } as Element;
  if ('width' in cloned && box.width != null) (cloned as { width?: number }).width = box.width;
  if ('height' in cloned && box.height != null) (cloned as { height?: number }).height = box.height;
  if (cloned.type === 'circle') {
    cloned.x = box.x + cloned.radius;
    cloned.y = box.y + cloned.radius;
  }
  if (cloned.type === 'line') {
    const dx = cloned.x2 - element.x;
    const dy = cloned.y2 - element.y;
    cloned.x = box.x;
    cloned.y = box.y;
    cloned.x2 = box.x + dx;
    cloned.y2 = box.y + dy;
  }
  delete (cloned as { placement?: LayoutChildPlacement }).placement;
  return cloned;
}

function resolveGrid(layout: LayoutElement & { layout: GridLayoutConfig }, context: LayoutResolveContext): ResolvedElementRecord[] {
  const pad = padding(layout.layout.padding);
  const gap = gridGap(layout.layout.gap);
  const explicitRows = layout.layout.rows;
  const columns = layout.layout.columns;
  const occupied = new Set<string>();
  const placements = new Map<number, GridPlacementRecord>();

  const reserve = (row: number, column: number, rowSpan: number, columnSpan: number) => {
    for (let r = row; r < row + rowSpan; r += 1) {
      for (let c = column; c < column + columnSpan; c += 1) occupied.add(`${r}:${c}`);
    }
  };
  const fits = (row: number, column: number, rowSpan: number, columnSpan: number) => {
    if (column + columnSpan > columns.length) return false;
    if (explicitRows && row + rowSpan > explicitRows.length) return false;
    for (let r = row; r < row + rowSpan; r += 1) {
      for (let c = column; c < column + columnSpan; c += 1) {
        if (occupied.has(`${r}:${c}`)) return false;
      }
    }
    return true;
  };
  const findAutoPlacement = (
    startCursor: number,
    rowHint: number | undefined,
    columnHint: number | undefined,
    rowSpan: number,
    columnSpan: number,
  ) => {
    const maxRows = explicitRows?.length ?? Number.POSITIVE_INFINITY;
    let cursor = startCursor;
    while (cursor < 100000) {
      const row = rowHint ?? Math.floor(cursor / columns.length);
      const column = columnHint ?? (cursor % columns.length);
      if (row < maxRows && fits(row, column, rowSpan, columnSpan)) return { row, column, cursor };
      cursor += 1;
      if (rowHint != null && cursor >= (rowHint + 1) * columns.length) break;
      if (explicitRows && cursor > explicitRows.length * columns.length) break;
    }
    return { row: rowHint ?? Math.floor(startCursor / columns.length), column: columnHint ?? (startCursor % columns.length), cursor: startCursor };
  };

  for (const [index, child] of layout.elements.entries()) {
    const placement = child.placement as LayoutChildPlacement | undefined;
    if (placement?.mode === 'absolute') continue;
    const gridPlacement = placement && 'column' in placement ? placement : undefined;
    if (gridPlacement?.column == null || gridPlacement.row == null) continue;
    const columnSpan = gridPlacement.columnSpan ?? 1;
    const rowSpan = gridPlacement.rowSpan ?? 1;
    placements.set(index, { column: gridPlacement.column, row: gridPlacement.row, columnSpan, rowSpan });
    reserve(gridPlacement.row, gridPlacement.column, rowSpan, columnSpan);
  }

  let cursor = 0;
  for (const [index, child] of layout.elements.entries()) {
    if (placements.has(index)) continue;
    const placement = child.placement as LayoutChildPlacement | undefined;
    if (placement?.mode === 'absolute') continue;
    const gridPlacement = placement && 'column' in placement ? placement : undefined;
    const columnSpan = gridPlacement?.columnSpan ?? 1;
    const rowSpan = gridPlacement?.rowSpan ?? 1;
    const placed = findAutoPlacement(cursor, gridPlacement?.row, gridPlacement?.column, rowSpan, columnSpan);
    placements.set(index, { column: placed.column, row: placed.row, columnSpan, rowSpan });
    reserve(placed.row, placed.column, rowSpan, columnSpan);
    cursor = placed.cursor + 1;
  }

  const maxPlacedRow = Math.max(-1, ...Array.from(placements.values()).map((placement) => placement.row + placement.rowSpan - 1));
  const rowCount = explicitRows?.length ?? Math.max(maxPlacedRow + 1, 1);
  const rows = explicitRows ?? Array.from({ length: rowCount }, () => {
    const available = layout.height - pad.top - pad.bottom - gap.row * Math.max(rowCount - 1, 0);
    return Math.max(available / rowCount, 1);
  });

  const colStarts = columns.map((_, index) => pad.left + columns.slice(0, index).reduce((sum, v) => sum + v, 0) + gap.column * index);
  const rowStarts = rows.map((_, index) => pad.top + rows.slice(0, index).reduce((sum, v) => sum + v, 0) + gap.row * index);

  return layout.elements.flatMap((child, index) => {
    const placement = child.placement as LayoutChildPlacement | undefined;
    if (placement?.mode === 'absolute') {
      const left = context.originX + layout.x + (placement.x ?? child.x);
      const top = context.originY + layout.y + (placement.y ?? child.y);
      const size = elementSize(child);
      return makeRecord(layout, context, child, index, { x: left, y: top, width: child.width ?? size.width, height: child.height ?? size.height });
    }

    const resolvedPlacement = placements.get(index);
    if (!resolvedPlacement) return [];
    const spanCol = resolvedPlacement.columnSpan;
    const spanRow = resolvedPlacement.rowSpan;
    const col = resolvedPlacement.column;
    const row = resolvedPlacement.row;

    const cellX = colStarts[col] ?? pad.left;
    const cellY = rowStarts[row] ?? pad.top;
    const cellW = columns.slice(col, col + spanCol).reduce((sum, v) => sum + v, 0) + gap.column * Math.max(spanCol - 1, 0);
    const cellH = rows.slice(row, row + spanRow).reduce((sum, v) => sum + v, 0) + gap.row * Math.max(spanRow - 1, 0);
    const size = elementSize(child);
    const stretchW = layout.layout.justifyItems === 'stretch' && child.type !== 'circle' && child.type !== 'line';
    const stretchH = layout.layout.alignItems === 'stretch' && child.type !== 'circle' && child.type !== 'line';
    const width = stretchW ? cellW : (child.width ?? size.width);
    const height = stretchH ? cellH : (child.height ?? size.height);
    const left = context.originX + layout.x + cellX + alignOffset(cellW, width, layout.layout.justifyItems);
    const top = context.originY + layout.y + cellY + alignOffset(cellH, height, layout.layout.alignItems);
    return makeRecord(layout, context, child, index, { x: left, y: top, width, height });
  });
}

function resolveFlex(layout: LayoutElement & { layout: FlexLayoutConfig }, context: LayoutResolveContext): ResolvedElementRecord[] {
  const pad = padding(layout.layout.padding);
  const gap = layout.layout.gap ?? 0;
  const direction = layout.layout.direction ?? 'row';
  const wrap = layout.layout.wrap === true;
  const mainLimit = (direction === 'row' ? layout.width - pad.left - pad.right : layout.height - pad.top - pad.bottom);
  const recordsByIndex = new Map<number, ResolvedElementRecord[]>();
  const lines: FlexPlacementRecord[][] = [[]];
  let currentMain = 0;

  for (const [index, child] of layout.elements.entries()) {
    const placement = child.placement as LayoutChildPlacement | undefined;
    const size = elementSize(child);
    if (placement?.mode === 'absolute') {
      const left = context.originX + layout.x + (placement.x ?? child.x);
      const top = context.originY + layout.y + (placement.y ?? child.y);
      recordsByIndex.set(index, makeRecord(layout, context, child, index, { x: left, y: top, width: child.width ?? size.width, height: child.height ?? size.height }));
      continue;
    }

    const flexPlacement = placement && 'basis' in placement ? placement : undefined;
    const mainSize = flexPlacement?.basis ?? (direction === 'row' ? size.width : size.height);
    const crossSize = direction === 'row' ? size.height : size.width;
    let line = lines[lines.length - 1];
    if (wrap && line.length > 0 && currentMain + gap + mainSize > mainLimit) {
      line = [];
      lines.push(line);
      currentMain = 0;
    }
    line.push({ child, index, mainSize, crossSize, size });
    currentMain += (line.length > 1 ? gap : 0) + mainSize;
  }

  let cross = 0;
  for (const line of lines) {
    const lineCross = Math.max(0, ...line.map((item) => item.crossSize));
    const totalMain = line.reduce((sum, item) => sum + item.mainSize, 0);
    const defaultGapTotal = gap * Math.max(line.length - 1, 0);
    const free = Math.max(mainLimit - totalMain - defaultGapTotal, 0);
    const justify = layout.layout.justifyContent ?? 'start';
    const mainOffset = justify === 'center' ? free / 2 : justify === 'end' ? free : 0;
    const itemGap = justify === 'space-between' && line.length > 1 ? gap + free / (line.length - 1) : gap;
    let main = mainOffset;

    for (const item of line) {
      const crossOffset = alignOffset(lineCross, item.crossSize, layout.layout.alignItems);
      const left = context.originX + layout.x + pad.left + (direction === 'row' ? main : crossOffset);
      const top = context.originY + layout.y + pad.top + (direction === 'row' ? cross + crossOffset : main);
      const width = direction === 'row' ? item.mainSize : item.size.width;
      const height = direction === 'row' ? item.size.height : item.mainSize;
      recordsByIndex.set(item.index, makeRecord(layout, context, item.child, item.index, { x: left, y: top, width, height }));
      main += item.mainSize + itemGap;
    }
    cross += lineCross + gap;
  }

  return layout.elements.flatMap((_, index) => recordsByIndex.get(index) ?? []);
}

function makeRecord(layout: LayoutElement, context: LayoutResolveContext, child: Element, index: number, box: ElementBox): ResolvedElementRecord[] {
  const sourcePath = `${context.path}.elements[${index}]`;
  const diagnostic = overflowDiagnostic(layout, context, child, box);
  const diagnostics = diagnostic ? [diagnostic] : [];
  return [{ element: cloneElementWithBox(child, box), sourceElementId: child.id, sourcePath, box, diagnostics }];
}

export function resolveLayoutElement(layout: LayoutElement, context: LayoutResolveContext): ResolvedElementRecord[] {
  return layout.layout.mode === 'grid'
    ? resolveGrid(layout as LayoutElement & { layout: GridLayoutConfig }, context)
    : resolveFlex(layout as LayoutElement & { layout: FlexLayoutConfig }, context);
}

export function resolveLayoutChildren(layout: LayoutElement, context: LayoutResolveContext): Element[] {
  return resolveLayoutElement(layout, context).map((record) => record.element);
}
