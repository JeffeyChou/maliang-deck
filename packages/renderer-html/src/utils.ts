import type { BaseElement } from '@maliang-deck/schema';

/**
 * Build CSS transform string for rotation.
 * Returns empty string if no rotation is set.
 */
export function buildCssTransform(el: BaseElement): string {
  if (el.rotation == null || el.rotation === 0) return '';
  return `rotate(${el.rotation}deg)`;
}

/**
 * Build animation data attributes string for an element.
 * Returns empty string if no animation is set.
 */
export function buildAnimAttrs(el: BaseElement): string {
  if (!el.animation || !el.animation.enter) return '';

  const anim = el.animation;
  const step = anim.step ?? 0;
  const duration = anim.duration ?? 600;
  const delay = anim.delay ?? 0;
  const easing = anim.easing ?? 'ease';

  const attrs: string[] = [
    `data-anim-enter="${anim.enter}"`,
    `data-anim-step="${step}"`,
    `data-anim-duration="${duration}"`,
    `data-anim-delay="${delay}"`,
    `data-anim-easing="${easing}"`,
  ];

  if (el.opacity != null && el.opacity !== 1) {
    attrs.push(`data-anim-final-opacity="${el.opacity}"`);
  }

  return ' ' + attrs.join(' ');
}

/**
 * Build initial hidden style for animated elements.
 * Step 0: opacity: 0 (will animate in)
 * Step >= 1: visibility: hidden; opacity: 0 (will reveal on click)
 */
export function buildAnimInitialStyle(el: BaseElement): string {
  if (!el.animation || !el.animation.enter) return '';
  return 'opacity: 0; visibility: hidden';
}

/**
 * Build inline style string for positioned absolute element.
 * Applies rotation and opacity when present.
 */
export function buildBaseStyle(
  el: BaseElement,
  extras: string[] = [],
): string {
  const parts: string[] = [
    `position: absolute`,
    `left: ${el.x}px`,
    `top: ${el.y}px`,
  ];

  if (el.width != null) parts.push(`width: ${el.width}px`);
  if (el.height != null) parts.push(`height: ${el.height}px`);

  const transform = buildCssTransform(el);
  if (transform) {
    parts.push(`transform: ${transform}`);
    parts.push(`transform-origin: center center`);
  }

  if (el.opacity != null && el.opacity !== 1) {
    parts.push(`opacity: ${el.opacity}`);
  }

  parts.push(...extras);
  return parts.join('; ');
}

/**
 * Escape HTML special characters to prevent XSS / broken markup.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
