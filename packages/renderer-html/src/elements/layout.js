import { resolveLayoutElement } from '@maliang-deck/schema';
import { buildBaseStyle } from '../utils.js';
import { childRenderContext, renderElement } from './index.js';
function paddingCss(value) {
    if (value == null)
        return undefined;
    if (typeof value === 'number')
        return `${value}px`;
    return `${value.top ?? 0}px ${value.right ?? 0}px ${value.bottom ?? 0}px ${value.left ?? 0}px`;
}
function gapCss(value) {
    if (value == null)
        return undefined;
    if (typeof value === 'number')
        return `${value}px`;
    if ('row' in value || 'column' in value)
        return `${value.row ?? 0}px ${value.column ?? 0}px`;
    return undefined;
}
function layoutCss(el) {
    if (el.layout.mode === 'grid') {
        const styles = [
            'display: grid',
            `grid-template-columns: ${el.layout.columns.map((track) => `${track}px`).join(' ')}`,
        ];
        if (el.layout.rows)
            styles.push(`grid-template-rows: ${el.layout.rows.map((track) => `${track}px`).join(' ')}`);
        const gap = gapCss(el.layout.gap);
        if (gap)
            styles.push(`gap: ${gap}`);
        const pad = paddingCss(el.layout.padding);
        if (pad)
            styles.push(`padding: ${pad}`);
        if (el.layout.alignItems)
            styles.push(`align-items: ${cssAlign(el.layout.alignItems)}`);
        if (el.layout.justifyItems)
            styles.push(`justify-items: ${cssAlign(el.layout.justifyItems)}`);
        return styles;
    }
    const styles = [
        'display: flex',
        `flex-direction: ${el.layout.direction ?? 'row'}`,
    ];
    if (el.layout.wrap)
        styles.push('flex-wrap: wrap');
    if (el.layout.gap != null)
        styles.push(`gap: ${el.layout.gap}px`);
    const pad = paddingCss(el.layout.padding);
    if (pad)
        styles.push(`padding: ${pad}`);
    if (el.layout.alignItems)
        styles.push(`align-items: ${cssAlign(el.layout.alignItems)}`);
    if (el.layout.justifyContent)
        styles.push(`justify-content: ${cssJustify(el.layout.justifyContent)}`);
    return styles;
}
function cssAlign(value) {
    if (value === 'start')
        return 'flex-start';
    if (value === 'end')
        return 'flex-end';
    return value;
}
function cssJustify(value) {
    if (value === 'start')
        return 'flex-start';
    if (value === 'end')
        return 'flex-end';
    return value;
}
export function renderLayout(el) {
    const base = buildBaseStyle(el, [
        `overflow: ${el.overflow === 'clip' ? 'hidden' : 'visible'}`,
        ...layoutCss(el),
    ]);
    const records = resolveLayoutElement(el, {
        originX: -el.x,
        originY: -el.y,
        path: `layout#${el.id}`,
    });
    const childContext = childRenderContext();
    const children = records.map((record) => renderElement(record.element, childContext)).join('\n');
    return `<div data-maliang-deck-element="layout" data-maliang-deck-layout-mode="${el.layout.mode}" style="${base}">\n${children}\n</div>`;
}
//# sourceMappingURL=layout.js.map