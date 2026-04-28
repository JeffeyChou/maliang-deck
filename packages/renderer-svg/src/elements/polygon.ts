import type { PolygonElement } from '../../../schema/src/types.js';
import { buildTransform, buildOpacityAttrs, n } from '../utils.js';

export function renderPolygon(el: PolygonElement): string {
    const fill = el.fill ?? 'none';
    const stroke = el.stroke ?? 'none';
    const strokeWidth = el.strokeWidth ?? 1;
    const transform = buildTransform(el, true);
    const opacityAttrs = buildOpacityAttrs(el.opacity);
    // Offset polygon points by x/y via transform
    const translateTransform = el.x !== 0 || el.y !== 0
        ? `translate(${n(el.x)} ${n(el.y)})`
        : '';
    const combinedTransform = [translateTransform, transform]
        .filter(Boolean)
        .join(' ');
    const attrs = [
        `points="${el.points}"`,
        `fill="${fill}"`,
        stroke !== 'none' ? `stroke="${stroke}"` : '',
        stroke !== 'none' ? `stroke-width="${strokeWidth}"` : '',
        opacityAttrs,
        combinedTransform ? `transform="${combinedTransform}"` : '',
    ]
        .filter(Boolean)
        .join(' ');
    return `<polygon ${attrs}/>`;
}
