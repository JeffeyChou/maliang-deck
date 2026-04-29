import type { EllipseElement } from '../../../schema/src/types.js';
import { animationDataAttrs, buildTransform, buildOpacityAttrs, n } from '../utils.js';

export function renderEllipse(el: EllipseElement): string {
    const fill = el.fill ?? 'none';
    const stroke = el.stroke ?? 'none';
    const strokeWidth = el.strokeWidth ?? 1;
    const transform = buildTransform(el);
    const opacityAttrs = buildOpacityAttrs(el.opacity);
    // cx/cy are the center; x/y in schema are the top-left corner
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const rx = el.width / 2;
    const ry = el.height / 2;
    const attrs = [
        `cx="${n(cx)}"`,
        `cy="${n(cy)}"`,
        `rx="${n(rx)}"`,
        `ry="${n(ry)}"`,
        `fill="${fill}"`,
        ...animationDataAttrs(el),
        stroke !== 'none' ? `stroke="${stroke}"` : '',
        stroke !== 'none' ? `stroke-width="${strokeWidth}"` : '',
        opacityAttrs,
        transform ? `transform="${transform}"` : '',
    ]
        .filter(Boolean)
        .join(' ');
    return `<ellipse ${attrs}/>`;
}
