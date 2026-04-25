import type { LayoutWarning } from '@maliang-deck/text-measure';
import type { TableCell, TableElement, TableObjectCell } from '../../../schema/src/types.js';
import { buildOpacityAttrs, buildTransform, escapeXml, n } from '../utils.js';
import type { RenderResult } from './index.js';

const DEFAULT_ROW_HEIGHT = 32;
const CELL_PADDING = 8;

export function renderTable(el: TableElement): RenderResult {
  const warnings: LayoutWarning[] = [];
  const rowCount = el.rows.length;
  const colCount = Math.max(1, ...el.rows.map((row) => row.length));
  const height = el.height ?? rowCount * DEFAULT_ROW_HEIGHT;
  const cellWidth = el.width / colCount;
  const cellHeight = height / Math.max(rowCount, 1);
  const transform = buildTransform({ ...el, height });
  const opacityAttrs = buildOpacityAttrs(el.opacity);

  if (el.options && Object.keys(el.options).length > 0) {
    warnings.push({
      type: 'unsupported-feature',
      elementId: el.id,
      message: `SVG table renderer ignores PowerPoint-specific table options for "${el.id}".`,
    });
  }

  const rows = el.rows.flatMap((row, rowIndex) => {
    const y = el.y + rowIndex * cellHeight;
    return Array.from({ length: colCount }, (_, colIndex) => {
      const x = el.x + colIndex * cellWidth;
      const cell = row[colIndex];
      const text = normalizeCellText(cell);
      const isHeader = rowIndex === 0;
      const style = cellStyle(cell, isHeader);
      const textX = textAnchorX(x, cellWidth, style.align);

      return [
        `<rect x="${n(x)}" y="${n(y)}" width="${n(cellWidth)}" height="${n(cellHeight)}" fill="${style.fill}" stroke="#d0d7de" stroke-width="1"/>`,
        `<text x="${n(textX)}" y="${n(y + cellHeight / 2 + 5)}" text-anchor="${style.anchor}" font-size="14" font-family="sans-serif" font-weight="${style.weight}"${style.italic ? ' font-style="italic"' : ''} fill="${style.textColor}">${escapeXml(text)}</text>`,
      ].join('\n');
    });
  }).join('\n');

  const attrs = [
    `data-maliang-deck-id="${escapeXml(el.id)}"`,
    `data-maliang-deck-kind="table"`,
    opacityAttrs,
    transform ? `transform="${transform}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    svg: `<g ${attrs}>\n${rows}\n</g>`,
    warnings,
  };
}

function normalizeCellText(cell: TableCell | undefined): string {
  if (cell == null) return '';
  if (typeof cell === 'object') return cell.text;
  return String(cell);
}

function isObjectCell(cell: TableCell | undefined): cell is TableObjectCell {
  return typeof cell === 'object' && cell !== null && 'text' in cell;
}

function cssColor(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? escapeXml(value) : undefined;
}

function cellAlign(value: unknown): 'left' | 'center' | 'right' | undefined {
  return value === 'left' || value === 'center' || value === 'right' ? value : undefined;
}

function cellStyle(cell: TableCell | undefined, isHeader: boolean): {
  fill: string;
  textColor: string;
  weight: 'bold' | 'normal';
  italic: boolean;
  align: 'left' | 'center' | 'right';
  anchor: 'start' | 'middle' | 'end';
} {
  const fill = isHeader ? '#f3f6fb' : '#ffffff';
  const textColor = isHeader ? '#1f2937' : '#111827';

  if (!isObjectCell(cell)) {
    return {
      fill,
      textColor,
      weight: isHeader ? 'bold' : 'normal',
      italic: false,
      align: 'left',
      anchor: 'start',
    };
  }

  const align = cellAlign(cell.options?.align) ?? 'left';
  return {
    fill: cssColor(cell.options?.fill ?? cell.options?.backgroundColor) ?? fill,
    textColor: cssColor(cell.options?.color ?? cell.options?.textColor) ?? textColor,
    weight: cell.options?.bold === true || isHeader ? 'bold' : 'normal',
    italic: cell.options?.italic === true,
    align,
    anchor: align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start',
  };
}

function textAnchorX(x: number, cellWidth: number, align: 'left' | 'center' | 'right'): number {
  if (align === 'center') return x + cellWidth / 2;
  if (align === 'right') return x + cellWidth - CELL_PADDING;
  return x + CELL_PADDING;
}
