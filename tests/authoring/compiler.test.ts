import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateDeck } from '@vslidev/schema';
import { compileAuthoringDeck } from '@vslidev/authoring';

const baseMeta = { title: 'authoring test', canvas: { width: 1280, height: 720 } };

function authoringDeck(elements: unknown[]) {
  return {
    meta: baseMeta,
    slides: [{ id: 'slide-1', elements }],
  };
}

describe('compileAuthoringDeck', () => {
  it('expands built-ins into ordinary validated DSL with source maps', () => {
    const input = authoringDeck([
      {
        kind: 'component',
        id: 'metric-speed',
        component: 'stat-card',
        props: {
          x: 80,
          y: 120,
          width: 320,
          height: 180,
          label: 'Speed',
          value: '64% shorter',
          caption: 'macro authoring',
          tokens: ['glass', 'shadow', 'badge'],
        },
      },
      {
        kind: 'component',
        id: 'features',
        component: 'feature-grid',
        props: {
          x: 80,
          y: 340,
          width: 760,
          height: 220,
          columns: 2,
          items: [
            { title: 'Deterministic IDs', body: 'No random suffixes.' },
            { title: 'Source map', body: 'Every invocation is traceable.' },
          ],
        },
      },
    ]);

    const first = compileAuthoringDeck(input);
    const second = compileAuthoringDeck(input);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (!first.success || !second.success) return;

    expect(first.deck).toEqual(second.deck);
    expect(validateDeck(first.deck).success).toBe(true);
    expect(first.deck.slides[0].elements.every((element) => 'type' in element)).toBe(true);
    expect(JSON.stringify(first.deck)).not.toContain('"kind":"component"');
    expect(first.sourceMap.invocations).toHaveLength(2);
    expect(first.sourceMap.invocations[0]).toMatchObject({
      invocationId: 'metric-speed',
      component: 'metric-card',
      path: 'slides.0.elements.0',
    });
    expect(first.sourceMap.invocations[0].generatedElementIds.length).toBeGreaterThan(2);
  });

  it('rejects unknown components before rendering/export', () => {
    const result = compileAuthoringDeck(authoringDeck([
      { kind: 'component', id: 'unknown', component: 'not-real', props: {} },
    ]));

    expect(result.success).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'authoring.unknown-component',
      path: 'slides.0.elements.0',
    }));
  });

  it('rejects invalid props with component and invocation detail', () => {
    const result = compileAuthoringDeck(authoringDeck([
      {
        kind: 'component',
        id: 'bad-metric',
        component: 'metric-card',
        props: { value: 'missing label', tokens: ['glass'] },
      },
    ]));

    expect(result.success).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'authoring.invalid-props',
      path: 'slides.0.elements.0.props.label',
      detail: expect.objectContaining({ invocationId: 'bad-metric', component: 'metric-card' }),
    }));
  });

  it('hard-fails unknown finite visual tokens', () => {
    const result = compileAuthoringDeck(authoringDeck([
      {
        kind: 'component',
        id: 'bad-token',
        component: 'metric-card',
        props: { label: 'Token', value: 'bad', tokens: ['parallax'] },
      },
    ]));

    expect(result.success).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'authoring.invalid-props',
      path: 'slides.0.elements.0.props.tokens.0',
    }));
  });

  it('compiles the checked-in macro authoring demo', () => {
    const input = JSON.parse(readFileSync(join(process.cwd(), 'examples/macro-authoring-demo/authoring-deck.json'), 'utf8'));
    const result = compileAuthoringDeck(input);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(validateDeck(result.deck).success).toBe(true);
    expect(result.sourceMap.invocations.length).toBeGreaterThanOrEqual(6);
  });
});
