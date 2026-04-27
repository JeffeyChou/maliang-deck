import { buildBaseStyle } from '../utils.js';
function stripDangerousHtml(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<\/?(?:iframe|object|embed)(?:\s[^>]*)?\/?>/gi, '')
        .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');
}
export function renderCustomHtml(el) {
    const style = buildBaseStyle(el, ['overflow: hidden']);
    const sanitized = stripDangerousHtml(el.html);
    return `<div data-maliang-deck-element="customHtml" style="${style}">${sanitized}</div>`;
}
//# sourceMappingURL=customHtml.js.map