import type { BaseElement } from '../../schema/src/types.js';

/**
 * Build a transform attribute string for rotation.
 * Returns an empty string if no rotation is set.
 *
 * @param useLocalCenter - When true, rotation center is computed relative to
 *   local (0,0) origin. Use for elements that are already positioned via
 *   translate(x,y) — i.e. path, polygon, group. When false (default),
 *   center uses absolute (el.x, el.y) — for elements that set x/y directly.
 */
export function buildTransform(el: BaseElement, useLocalCenter = false): string {
    if (el.rotation == null || el.rotation === 0)
        return '';
    const w = el.width ?? 0;
    const h = el.height ?? 0;
    const cx = useLocalCenter ? w / 2 : el.x + w / 2;
    const cy = useLocalCenter ? h / 2 : el.y + h / 2;
    return `rotate(${el.rotation} ${cx} ${cy})`;
}

/**
 * Build fill-opacity / stroke-opacity attributes from a unified opacity value.
 * Returns an empty string when opacity is 1 or unset (SVG default).
 */
export function buildOpacityAttrs(opacity?: number): string {
    if (opacity == null || opacity === 1)
        return '';
    return `fill-opacity="${opacity}" stroke-opacity="${opacity}"`;
}

/**
 * Stringify a number, trimming unnecessary decimals.
 */
export function n(value: number): string {
    return parseFloat(value.toFixed(4)).toString();
}

/**
 * Escape text/attribute content for SVG output.
 */
export function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function dataAttr(name: string, value: string): string {
    return `${name}="${escapeXml(value)}"`;
}

export function jsonDataAttr(name: string, value: unknown): string {
    return dataAttr(name, Buffer.from(JSON.stringify(value), 'utf-8').toString('base64'));
}

export function animationDataAttrs(el: BaseElement): string[] {
    const attrs = [
        dataAttr('data-maliang-deck-id', el.id),
    ];
    if (el.animation) {
        attrs.push(jsonDataAttr('data-maliang-animation', el.animation));
        if (el.animation.step != null) attrs.push(dataAttr('data-maliang-step', String(el.animation.step)));
    }
    return attrs;
}
