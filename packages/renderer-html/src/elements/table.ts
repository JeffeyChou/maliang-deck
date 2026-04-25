import type { TableCell, TableElement, TableObjectCell } from '@maliang-deck/schema';
import { buildBaseStyle, escapeHtml } from '../utils.js';

function isObjectCell(cell: TableCell | undefined): cell is TableObjectCell {
  return typeof cell === 'object' && cell !== null && 'text' in cell;
}

function cellText(cell: TableCell | undefined): string {
  if (cell == null) return '';
  if (isObjectCell(cell)) return cell.text;
  return String(cell);
}

function cssColor(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function cellStyle(cell: TableCell | undefined): string {
  const parts = [
    'border: 1px solid #cbd5e1',
    'padding: 6px 8px',
    'vertical-align: top',
    'font: 13px sans-serif',
    'color: #0f172a',
    'background: #ffffff',
    'overflow-wrap: anywhere',
  ];

  if (isObjectCell(cell)) {
    const fill = cssColor(cell.options?.fill ?? cell.options?.backgroundColor);
    const color = cssColor(cell.options?.color ?? cell.options?.textColor);
    if (fill) parts.push(`background: ${fill}`);
    if (color) parts.push(`color: ${color}`);
    if (cell.options?.bold === true) parts.push('font-weight: 700');
    if (cell.options?.italic === true) parts.push('font-style: italic');
    if (cell.options?.align === 'center' || cell.options?.align === 'right' || cell.options?.align === 'left') {
      parts.push(`text-align: ${cell.options.align}`);
    }
  }

  return parts.join('; ');
}

function ignoredOptionsAttr(options: Record<string, unknown> | undefined): string {
  const keys = Object.keys(options ?? {});
  return keys.length > 0 ? ` data-maliang-deck-ignored-options="${escapeHtml(keys.join(','))}"` : '';
}

export function renderTable(el: TableElement): string {
  const maxColumns = Math.max(...el.rows.map((row) => row.length), 1);
  const rowHeight = el.height != null ? Math.max(1, el.height / el.rows.length) : undefined;
  const style = buildBaseStyle(el, [
    `overflow: hidden`,
    `font-family: sans-serif`,
  ]);
  const colgroup = Array.from({ length: maxColumns }, () => `<col style="width:${100 / maxColumns}%">`).join('');
  const rows = el.rows.map((row) => {
    const cells = Array.from({ length: maxColumns }, (_, columnIndex) => {
      const cell = row[columnIndex];
      const heightStyle = rowHeight != null ? `; height: ${rowHeight}px` : '';
      return `<td style="${cellStyle(cell)}${heightStyle}">${escapeHtml(cellText(cell))}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('\n');

  return [
    `<div data-maliang-deck-element="table"${ignoredOptionsAttr(el.options)} style="${style}">`,
    `<table style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed;background:#ffffff">`,
    `<colgroup>${colgroup}</colgroup>`,
    `<tbody>`,
    rows,
    `</tbody>`,
    `</table>`,
    `</div>`,
  ].join('\n');
}
