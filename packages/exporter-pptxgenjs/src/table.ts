import type { PptxGenJsTableCellInput } from './types.js';

export type PptxGenJsNormalizedTableCell = {
  text: string;
  options?: Record<string, unknown>;
};

export type PptxGenJsNormalizedTableRow = PptxGenJsNormalizedTableCell[];

export function normalizeTableRows(rows: PptxGenJsTableCellInput[][]): PptxGenJsNormalizedTableRow[] {
  return rows.map((row) => row.map(normalizeTableCell));
}

export function normalizeTableCell(cell: PptxGenJsTableCellInput): PptxGenJsNormalizedTableCell {
  if (isObjectCell(cell)) {
    return {
      text: cell.text,
      ...(cell.options ? { options: { ...cell.options } } : {}),
    };
  }
  return { text: cell == null ? '' : String(cell) };
}

function isObjectCell(cell: PptxGenJsTableCellInput): cell is { text: string; options?: Record<string, unknown> } {
  return typeof cell === 'object' && cell !== null && 'text' in cell;
}
