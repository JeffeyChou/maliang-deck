import { buildCssTransform, escapeHtml } from '../utils.js';
import { getActiveDefaultFont } from './index.js';
export function renderText(el) {
    const fontFamily = el.fontFamily ?? getActiveDefaultFont() ?? 'sans-serif';
    const color = el.color ?? '#000000';
    const fontWeight = el.fontWeight ?? 'normal';
    const fontStyle = el.fontStyle ?? 'normal';
    const textDecoration = el.textDecoration ?? 'none';
    const textAlign = el.align ?? 'left';
    const lineHeight = el.lineHeight ?? 1.2;
    const parts = [
        `position: absolute`,
        `left: ${el.x}px`,
        `top: ${el.y}px`,
        `width: ${el.width}px`,
        `font-size: ${el.fontSize}px`,
        `font-family: ${fontFamily}`,
        `font-weight: ${fontWeight}`,
        `font-style: ${fontStyle}`,
        textDecoration !== 'none' ? `text-decoration: ${textDecoration}` : '',
        `color: ${color}`,
        `text-align: ${textAlign}`,
        `line-height: ${lineHeight}`,
        `white-space: pre-wrap`,
        `overflow-wrap: anywhere`,
    ];
    if (el.verticalAlign === 'middle' || el.verticalAlign === 'bottom') {
        parts.push(`display: flex`);
        parts.push(`flex-direction: column`);
        parts.push(`justify-content: ${el.verticalAlign === 'middle' ? 'center' : 'flex-end'}`);
        if (el.height != null)
            parts.push(`height: ${el.height}px`);
    }
    else if (el.height != null) {
        parts.push(`height: ${el.height}px`);
    }
    const transform = buildCssTransform(el);
    if (transform) {
        parts.push(`transform: ${transform}`);
        parts.push(`transform-origin: center center`);
    }
    if (el.opacity != null && el.opacity !== 1) {
        parts.push(`opacity: ${el.opacity}`);
    }
    const style = parts.filter(Boolean).join('; ');
    return `<div style="${style}">${escapeHtml(el.content)}</div>`;
}
//# sourceMappingURL=text.js.map