import type { CircleElement } from '../../../schema/src/types.js';
import { buildTransform, buildOpacityAttrs, n } from '../utils.js';

export function renderCircle(el: CircleElement): string {
    const fill = el.fill ?? 'none';
    const stroke = el.stroke ?? 'none';
    const strokeWidth = el.strokeWidth ?? 1;
    const transform = buildTransform(el);
    const opacityAttrs = buildOpacityAttrs(el.opacity);
    const attrs = [
        `cx="${n(el.x)}"`,
        `cy="${n(el.y)}"`,
        `r="${n(el.radius)}"`,
        `fill="${fill}"`,
        stroke !== 'none' ? `stroke="${stroke}"` : '',
        stroke !== 'none' ? `stroke-width="${strokeWidth}"` : '',
        opacityAttrs,
        transform ? `transform="${transform}"` : '',
    ]
        .filter(Boolean)
        .join(' ');
    return `<circle ${attrs}/>`;
}
