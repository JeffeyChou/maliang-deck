import { buildBaseStyle, escapeHtml } from '../utils.js';
export function renderImage(el) {
    const fit = el.fit ?? 'cover';
    const extras = [`object-fit: ${fit}`];
    const style = buildBaseStyle(el, extras);
    return `<img src="${escapeHtml(el.src)}" style="${style}" alt="" loading="lazy"/>`;
}
//# sourceMappingURL=image.js.map