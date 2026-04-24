import { describe, expect, it } from 'vitest';
import { compileAuthoringDeck } from '@vslidev/authoring';
import { macroDemoDeck } from './fixtures/macro-demo.js';

describe('authoring built-in components', () => {
  it('expands aliases to canonical source-map component names', () => {
    const result = compileAuthoringDeck(macroDemoDeck);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(JSON.stringify(result.diagnostics));

    expect(result.sourceMap.invocations).toContainEqual(expect.objectContaining({ invocationId: 'revenue', component: 'metric-card' }));
    expect(result.sourceMap.invocations).toContainEqual(expect.objectContaining({ invocationId: 'split', component: 'two-column' }));
    expect(result.sourceMap.invocations).toContainEqual(expect.objectContaining({ invocationId: 'roadmap', component: 'timeline-section' }));
  });

  it('emits layout elements for split sections and feature grids', () => {
    const result = compileAuthoringDeck(macroDemoDeck);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(JSON.stringify(result.diagnostics));

    const [_metric, split, featureGrid] = result.deck.slides[0].elements;
    expect(split).toMatchObject({ type: 'layout', layout: { mode: 'grid' } });
    expect(featureGrid).toMatchObject({ type: 'layout', layout: { mode: 'grid' } });
    if (split.type !== 'layout' || featureGrid.type !== 'layout') throw new Error('expected layout output');
    expect(split.elements).toHaveLength(2);
    expect(featureGrid.elements).toHaveLength(2);
  });

  it('rejects arbitrary visual tokens and arbitrary prop hooks', () => {
    const unknownToken = compileAuthoringDeck({
      meta: macroDemoDeck.meta,
      slides: [{ id: 's1', elements: [{ kind: 'component', component: 'metric-card', props: { width: 100, height: 100, label: 'Bad', value: 'x', tokens: ['drop-table'] } }] }],
    });
    expect(unknownToken.success).toBe(false);
    expect(unknownToken.diagnostics).toContainEqual(expect.objectContaining({ code: 'authoring.invalid-props' }));

    const arbitraryHook = compileAuthoringDeck({
      meta: macroDemoDeck.meta,
      slides: [{ id: 's1', elements: [{ kind: 'component', component: 'metric-card', props: { width: 100, height: 100, label: 'Bad', value: 'x', className: 'raw-css-hook' } }] }],
    });
    expect(arbitraryHook.success).toBe(false);
    expect(arbitraryHook.diagnostics).toContainEqual(expect.objectContaining({ code: 'authoring.invalid-props' }));
  });

  it('supports standalone timeline items and section-header hero alias', () => {
    const result = compileAuthoringDeck({
      meta: macroDemoDeck.meta,
      slides: [{ id: 's1', elements: [
        { kind: 'component', id: 'item', component: 'timeline-item', props: { x: 40, y: 40, width: 320, height: 140, title: 'Ship', body: 'Standalone item' } },
        { kind: 'component', id: 'hero', component: 'hero', props: { x: 40, y: 220, width: 640, height: 180, title: 'Hero title', subtitle: 'Alias support' } },
      ] }],
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error(JSON.stringify(result.diagnostics));
    expect(result.deck.slides[0].elements.map((element) => element.type)).toEqual(['group', 'group']);
    expect(result.sourceMap.invocations.map((entry) => entry.component)).toEqual(['timeline-step', 'section-header']);
  });
});
