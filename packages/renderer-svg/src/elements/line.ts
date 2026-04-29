import type { LineElement } from '../../../schema/src/types.js';
import { animationDataAttrs, buildTransform, buildOpacityAttrs, n } from '../utils.js';

export function renderLine(el: LineElement): string {
    const stroke = el.stroke ?? '#000000';
    const strokeWidth = el.strokeWidth ?? 1;
    const transform = buildTransform(el);
    const opacityAttrs = buildOpacityAttrs(el.opacity);
    const attrs = [
        `x1="${n(el.x)}"`,
        `y1="${n(el.y)}"`,
        `x2="${n(el.x2)}"`,
        `y2="${n(el.y2)}"`,
        `stroke="${stroke}"`,
        `stroke-width="${strokeWidth}"`,
        ...animationDataAttrs(el),
        el.strokeDasharray ? `stroke-dasharray="${el.strokeDasharray}"` : '',
        opacityAttrs,
        transform ? `transform="${transform}"` : '',
    ]
        .filter(Boolean)
        .join(' ');
    return `<line ${attrs}/>`;
}
