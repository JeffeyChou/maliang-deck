import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { renderDeckToSvg } from '../../packages/renderer-svg/src/index.js';
import { renderDeckToHtml } from '../../packages/renderer-html/src/index.js';
import { FontRegistry } from '../../packages/text-measure/src/index.js';
import { validateDeck } from '../../packages/schema/src/index.js';
import {
  assessPptxAnimationPlan,
  createPptxAnimationPlan,
  PPTX_ANIMATION_MAPPINGS,
} from '../../packages/exporter/src/index.js';
import {
  collectAnimationEffects,
  comprehensiveTextMeasureDeck,
  CURRENT_ANIMATION_EFFECTS,
} from './fixtures/comprehensive-deck.js';

describe('export pipeline debug', () => {
  it('validates and renders the comprehensive fixture through static SVG', () => {
    const validation = validateDeck(comprehensiveTextMeasureDeck);
    expect(validation.success).toBe(true);

    const registry = new FontRegistry();
    const result = renderDeckToSvg(comprehensiveTextMeasureDeck, { fontRegistry: registry });

    expect(result.slides).toHaveLength(2);
    expect(result.slides[0].svg).toContain('data-vslidev-id="left-body-a"');
    expect(result.slides[1].svg).toContain('data-vslidev-id="anim-chart"');
    expect(result.slides[1].svg).toContain('data-vslidev-kind="table"');
    expect(result.slides[1].svg).not.toContain('data-anim-enter');
    expect(new Set(result.warnings.map((warning) => warning.type))).toEqual(new Set(['layout-flattened']));
  });

  it('emits every current timeline animation as HTML runtime attributes', () => {
    const html = renderDeckToHtml(comprehensiveTextMeasureDeck);

    for (const effect of CURRENT_ANIMATION_EFFECTS) {
      expect(html).toContain(`data-anim-enter="${effect}"`);
    }

    expect(html).toContain('data-anim-step="0"');
    expect(html).toContain('data-anim-duration="250"');
    expect(html).toContain('data-anim-delay="0"');
    expect(html).toContain('data-anim-easing="cubic-bezier(.2,.8,.2,1)"');
    expect(html).toContain('data-anim-final-opacity="0.7"');
    expect(html).toContain('data-vslidev-auto-animate-id="anim-layout-grid"');
    expect(html).toContain('data-fx="constellation"');
    expect(html).toContain('data-fx="firework"');
    expect(html).toContain('"transition":{"type":"slide","durationMs":450');
  });

  it('keeps the fixture, runtime keyframes, and PPTX mapping in sync', () => {
    const runtimeSource = readFileSync('runtime/timeline.js', 'utf-8');
    const runtimeEffects = [...runtimeSource.matchAll(/^\s+'([^']+)':\s*\[/gm)].map((match) => match[1]).sort();
    const fixtureEffects = [...new Set(collectAnimationEffects(comprehensiveTextMeasureDeck))].sort();
    const pptxEffects = Object.keys(PPTX_ANIMATION_MAPPINGS).sort();
    const expectedEffects = [...CURRENT_ANIMATION_EFFECTS].sort();

    expect(runtimeEffects).toEqual(expectedEffects);
    expect(fixtureEffects).toEqual(expectedEffects);
    expect(pptxEffects).toEqual(expectedEffects);

    const plan = createPptxAnimationPlan(comprehensiveTextMeasureDeck);
    const plannedEffects = [...new Set(plan.flatMap((slide) => slide.steps.flatMap((step) => step.items.map((item) => item.effect))))].sort();
    expect(plannedEffects).toEqual(expectedEffects);

    const support = assessPptxAnimationPlan(plan);
    expect(support.unsupported).toEqual([]);
    expect(support.supported.length + support.downgraded.length).toBeGreaterThanOrEqual(CURRENT_ANIMATION_EFFECTS.length);
  });
});
