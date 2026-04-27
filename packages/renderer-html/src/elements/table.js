import { buildBaseStyle, escapeHtml } from '../utils.js';
function isObjectCell(cell) {
    return typeof cell === 'object' && cell !== null && 'text' in cell;
}
function cellText(cell) {
    if (cell == null)
        return '';
    if (isObjectCell(cell))
        return cell.text;
    return String(cell);
}
function cssColor(value) {
    return typeof value === 'string' && value.trim() ? value : undefined;
}
function resolveTableStyle(el) {
    const s = el.style;
    return {
        headerBg: s?.headerBackground ?? 'var(--table-header-bg, #f1f5f9)',
        headerColor: s?.headerColor ?? 'var(--table-header-color, #0f172a)',
        borderColor: s?.borderColor ?? 'var(--table-border, #cbd5e1)',
        borderWidth: s?.borderWidth ?? 1,
        bg: 'var(--table-bg, #ffffff)',
        cellColor: 'var(--table-cell-color, #0f172a)',
        cellPadding: s?.cellPadding ?? '6px 8px',
        fontSize: s?.fontSize ?? 13,
        fontFamily: s?.fontFamily ?? 'var(--table-font, sans-serif)',
        rowStripe: s?.rowStripe ?? false,
        stripeColor: s?.stripeColor ?? 'var(--table-stripe-bg, #f8fafc)',
        rounded: s?.rounded ?? false,
    };
}
function cellStyle(cell, rowIndex, ts) {
    const parts = [
        `border: ${ts.borderWidth}px solid ${ts.borderColor}`,
        `padding: ${ts.cellPadding}`,
        'vertical-align: top',
        `font: ${ts.fontSize}px ${ts.fontFamily}`,
        `color: ${ts.cellColor}`,
        `background: ${ts.bg}`,
        'overflow-wrap: anywhere',
    ];
    // Header row defaults (row 0) — only when cell has no explicit options
    if (rowIndex === 0 && !isObjectCell(cell)) {
        parts.push(`background: ${ts.headerBg}`);
        parts.push(`color: ${ts.headerColor}`);
        parts.push('font-weight: 700');
    }
    // Row striping (skip header row 0)
    if (ts.rowStripe && rowIndex > 0 && rowIndex % 2 === 0 && !isObjectCell(cell)) {
        parts.push(`background: ${ts.stripeColor}`);
    }
    if (isObjectCell(cell)) {
        const fill = cssColor(cell.options?.fill ?? cell.options?.backgroundColor);
        const color = cssColor(cell.options?.color ?? cell.options?.textColor);
        if (fill)
            parts.push(`background: ${fill}`);
        if (color)
            parts.push(`color: ${color}`);
        if (cell.options?.bold === true)
            parts.push('font-weight: 700');
        if (cell.options?.italic === true)
            parts.push('font-style: italic');
        if (cell.options?.align === 'center' || cell.options?.align === 'right' || cell.options?.align === 'left') {
            parts.push(`text-align: ${cell.options.align}`);
        }
    }
    return parts.join('; ');
}
function ignoredOptionsAttr(options) {
    const keys = Object.keys(options ?? {});
    return keys.length > 0 ? ` data-maliang-deck-ignored-options="${escapeHtml(keys.join(','))}"` : '';
}
export function renderTable(el) {
    const ts = resolveTableStyle(el);
    const maxColumns = Math.max(...el.rows.map((row) => row.length), 1);
    const rowHeight = el.height != null ? Math.max(1, el.height / el.rows.length) : undefined;
    const style = buildBaseStyle(el, [
        `overflow: hidden`,
        `font-family: ${ts.fontFamily}`,
        ...(ts.rounded ? ['border-radius: 12px'] : []),
    ]);
    const colgroup = Array.from({ length: maxColumns }, () => `<col style="width:${100 / maxColumns}%">`).join('');
    const rows = el.rows.map((row, rowIndex) => {
        const cells = Array.from({ length: maxColumns }, (_, columnIndex) => {
            const cell = row[columnIndex];
            const heightStyle = rowHeight != null ? `; height: ${rowHeight}px` : '';
            return `<td style="${cellStyle(cell, rowIndex, ts)}${heightStyle}">${escapeHtml(cellText(cell))}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('\n');
    return [
        `<div data-maliang-deck-element="table"${ignoredOptionsAttr(el.options)} style="${style}">`,
        `<table style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed;background:${ts.bg}">`,
        `<colgroup>${colgroup}</colgroup>`,
        `<tbody>`,
        rows,
        `</tbody>`,
        `</table>`,
        `</div>`,
    ].join('\n');
}
//# sourceMappingURL=table.js.map