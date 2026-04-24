import { describe, expect, it } from 'vitest';
import { validateDeck, type Element } from '@vslidev/schema';
import {
  compileAuthoringDeck,
  createAuthoringRegistry,
  type AuthoringDeckInput,
} from '@vslidev/authoring';
import { macroDemoDeck } from './fixtures/macro-demo.js';

function expectCompiled(input: AuthoringDeckInput) {
  const result = compileAuthoringDeck(input);
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(JSON.stringify(result.diagnostics));
  return result;
}

function collectIds(elements: Element[]): string[] {
  return elements.flatMap((element) => {
    if (element.type === 'group' || element.type === 'layout') return [element.id, ...collectIds(element.elements)];
    return [element.id];
  });
}

function containsComponentNode(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsComponentNode);
  if (typeof value !== 'object' || value == null) return false;
  const object = value as Record<string, unknown>;
  if (object.kind === 'component') return true;
  return Object.values(object).some(containsComponentNode);
}

describe('authoring compiler diagnostics', () => {
  it('rejects unknown component names with invocation path and source-map record', () => {
    const result = compileAuthoringDeck({
      meta: macroDemoDeck.meta,
      slides: [{ id: 's1', elements: [{ kind: 'component', id: 'missing', component: 'does-not-exist' }] }],
    });

    expect(result.success).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'authoring.unknown-component',
      path: 'slides.0.elements.0',
    }));
    expect(result.sourceMap.invocations).toEqual([
      expect.objectContaining({ invocationId: 'missing', component: 'does-not-exist', generatedElementIds: [] }),
    ]);
  });

  it('rejects invalid built-in props before expansion', () => {
    const result = compileAuthoringDeck({
      meta: macroDemoDeck.meta,
      slides: [{
        id: 's1',
        elements: [{
          kind: 'component',
          id: 'bad-card',
          component: 'metric-card',
          props: { width: 280, height: 140, value: '42', tokens: ['glass'] },
        }],
      }],
    });

    expect(result.success).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'authoring.invalid-props',
      path: 'slides.0.elements.0.props.label',
    }));
    expect(result.sourceMap.invocations[0]).toMatchObject({ invocationId: 'bad-card', generatedElementIds: [] });
  });

  it('reports final deck validation errors from custom expanders', () => {
    const registry = createAuthoringRegistry().register({
      name: 'bad-output',
      propsSchema: { safeParse: () => ({ success: true, data: {} }) } as any,
      expand: ({ id }) => [{ type: 'text', id: id.forRole('text'), x: 0, y: 0, content: 'missing width and fontSize' } as Element],
    });

    const result = compileAuthoringDeck({
      meta: macroDemoDeck.meta,
      slides: [{ id: 's1', elements: [{ kind: 'component', component: 'bad-output' }] }],
    }, { registry });

    expect(result.success).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('authoring.invalid-expanded-deck');
  });
});

describe('authoring compiler output contracts', () => {
  it('compiles the macro demo to ordinary Deck DSL that validates', () => {
    const result = expectCompiled(macroDemoDeck);

    expect(validateDeck(result.deck).success).toBe(true);
    expect(containsComponentNode(result.deck)).toBe(false);
    expect(result.deck.slides[0].elements.map((element) => element.type)).toEqual(['group', 'layout', 'layout', 'group']);
  });

  it('produces deterministic generated IDs across repeated compiles', () => {
    const first = expectCompiled(macroDemoDeck);
    const second = expectCompiled(macroDemoDeck);

    expect(collectIds(first.deck.slides[0].elements)).toEqual(collectIds(second.deck.slides[0].elements));
    expect(first.sourceMap).toEqual(second.sourceMap);
  });

  it('records source-map entries for top-level and nested invocations', () => {
    const result = expectCompiled(macroDemoDeck);
    const entriesById = new Map(result.sourceMap.invocations.map((entry) => [entry.invocationId, entry]));

    expect([...entriesById.keys()].sort()).toEqual(['features', 'nested-header', 'revenue', 'roadmap', 'split']);
    for (const entry of entriesById.values()) {
      expect(entry.generatedElementIds.length).toBeGreaterThan(0);
    }
    expect(entriesById.get('nested-header')?.path).toBe('slides.0.elements.1.slots.right.0');
  });

  it('keeps existing element IDs collision-safe when generated IDs share the same role', () => {
    const result = expectCompiled({
      meta: macroDemoDeck.meta,
      slides: [{
        id: 's1',
        elements: [
          { type: 'rect', id: 'revenue-group', x: 0, y: 0, width: 10, height: 10 },
          macroDemoDeck.slides[0].elements[0],
        ],
      }],
    });

    expect(collectIds(result.deck.slides[0].elements)).toContain('revenue-group__2');
  });
});
