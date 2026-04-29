import type { GroupElement } from '@maliang-deck/schema';
import type { LayoutWarning } from '@maliang-deck/text-measure';
import type { FontRegistry } from '@maliang-deck/text-measure';
import { animationDataAttrs, buildTransform, buildOpacityAttrs, n } from '../utils.js';
import { renderElement, type RenderResult, type SvgElementRenderOptions } from './index.js';

export function renderGroup(el: GroupElement, basePath?: string, registry?: FontRegistry, defaultFont?: string, options?: SvgElementRenderOptions): RenderResult {
  const transform = buildTransform(el, true);
  const opacityAttrs = buildOpacityAttrs(el.opacity);

  // Combine position offset translate with any explicit transform and rotation
  const translatePart =
    el.x !== 0 || el.y !== 0 ? `translate(${n(el.x)} ${n(el.y)})` : '';

  const combinedTransform = [
    translatePart,
    el.transform ?? '',
    transform,
  ]
    .filter(Boolean)
    .join(' ');

  const attrs = [
    ...animationDataAttrs(el),
    combinedTransform ? `transform="${combinedTransform}"` : '',
    opacityAttrs,
  ]
    .filter(Boolean)
    .join(' ');

  const childResults: RenderResult[] = el.elements.map(
    (child: import('../../../schema/src/types.js').Element) => renderElement(child, basePath, registry, defaultFont, options),
  );

  const children = childResults.map((r) => r.svg).join('\n');
  const warnings: LayoutWarning[] = childResults.flatMap((r) => r.warnings);

  const svg = attrs ? `<g ${attrs}>\n${children}\n</g>` : `<g>\n${children}\n</g>`;
  return { svg, warnings };
}
