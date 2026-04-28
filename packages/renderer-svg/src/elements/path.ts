import type { PathElement } from '../../../schema/src/types.js';
import { buildTransform, buildOpacityAttrs, n } from '../utils.js';

export function renderPath(el: PathElement): string {
    const fill = el.fill ?? 'none';
    const stroke = el.stroke ?? 'none';
    const strokeWidth = el.strokeWidth ?? 1;
    const transform = buildTransform(el, true);
    const opacityAttrs = buildOpacityAttrs(el.opacity);
    // Offset the path data by x/y translation via transform
    const translateTransform = el.x !== 0 || el.y !== 0
        ? `translate(${n(el.x)} ${n(el.y)})`
        : '';
    const combinedTransform = [translateTransform, transform]
        .filter(Boolean)
        .join(' ');
    const attrs = [
        `d="${el.d}"`,
        `fill="${fill}"`,
        stroke !== 'none' ? `stroke="${stroke}"` : '',
        stroke !== 'none' ? `stroke-width="${strokeWidth}"` : '',
        opacityAttrs,
        combinedTransform ? `transform="${combinedTransform}"` : '',
    ]
        .filter(Boolean)
        .join(' ');
    return `<path ${attrs}/>`;
}
