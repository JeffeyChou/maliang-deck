import type { RectElement } from '../../../schema/src/types.js';
import { animationDataAttrs, buildTransform, buildOpacityAttrs, n } from '../utils.js';

export function renderRect(el: RectElement): string {
    const fill = el.fill ?? 'none';
    const stroke = el.stroke ?? 'none';
    const strokeWidth = el.strokeWidth ?? 1;
    const radius = el.radius ?? 0;
    const transform = buildTransform(el);
    const opacityAttrs = buildOpacityAttrs(el.opacity);
    const commonAttrs = [
        `fill="${fill}"`,
        stroke !== 'none' ? `stroke="${stroke}"` : '',
        stroke !== 'none' ? `stroke-width="${strokeWidth}"` : '',
        ...animationDataAttrs(el),
        opacityAttrs,
        transform ? `transform="${transform}"` : '',
    ]
        .filter(Boolean)
        .join(' ');
    if (radius > 0) {
        const d = roundedRectPath(el.x, el.y, el.width, el.height, radius);
        return `<path d="${d}" ${commonAttrs}/>`;
    }
    return `<rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}" ${commonAttrs}/>`;
}

/**
 * Build an SVG path string for a rectangle with uniform corner radius.
 * Compliant: no <rect rx>, uses explicit arc commands.
 */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
    // Clamp radius so it never exceeds half the shorter side
    const rx = Math.min(r, w / 2, h / 2);
    const x1 = n(x + rx);
    const x2 = n(x + w - rx);
    const y1 = n(y + rx);
    const y2 = n(y + h - rx);
    const X = n(x);
    const Y = n(y);
    const XW = n(x + w);
    const YH = n(y + h);
    const R = n(rx);
    return [
        `M ${x1} ${Y}`,
        `L ${x2} ${Y}`,
        `A ${R} ${R} 0 0 1 ${XW} ${y1}`,
        `L ${XW} ${y2}`,
        `A ${R} ${R} 0 0 1 ${x2} ${YH}`,
        `L ${x1} ${YH}`,
        `A ${R} ${R} 0 0 1 ${X} ${y2}`,
        `L ${X} ${y1}`,
        `A ${R} ${R} 0 0 1 ${x1} ${Y}`,
        `Z`,
    ].join(' ');
}
