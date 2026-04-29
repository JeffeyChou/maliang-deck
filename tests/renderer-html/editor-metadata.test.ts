import { describe, expect, it } from 'vitest';
import { renderDeckToHtml } from '../../packages/renderer-html/src/index.js';
import type { Deck, Element } from '../../packages/schema/src/index.js';

function deckWith(elements: Element[], htmlRuntime?: Deck['meta']['htmlRuntime']): Deck {
  return {
    meta: {
      title: 'HTML editor metadata',
      canvas: { width: 800, height: 450 },
      ...(htmlRuntime ? { htmlRuntime } : {}),
    },
    slides: [{ id: 'slide 1/<unsafe>', elements }],
  };
}

function attrsFor(html: string, domId: string): string {
  const escapedId = domId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<[^>]+id="${escapedId}"[^>]*>`));
  expect(match, `missing element with id ${domId}`).not.toBeNull();
  return match![0];
}

describe('HTML editor renderer metadata', () => {
  it('adds stable editable metadata to top-level text and rect while preserving scoped IDs', () => {
    const html = renderDeckToHtml(deckWith([
      {
        type: 'text',
        id: 'headline',
        x: 10,
        y: 20,
        width: 300,
        fontSize: 32,
        content: 'Editable headline',
      },
      {
        type: 'rect',
        id: 'panel',
        x: 20,
        y: 80,
        width: 240,
        height: 120,
        fill: '#f8fafc',
      },
    ]));

    expect(html).toContain('<section class="slide" data-slide-id="slide 1/&lt;unsafe&gt;"');

    const textAttrs = attrsFor(html, 'slide-1-unsafe-__headline');
    expect(textAttrs).toContain('data-maliang-deck-id="headline"');
    expect(textAttrs).toContain('data-maliang-deck-type="text"');
    expect(textAttrs).toContain('data-maliang-deck-editable="geometry text"');
    expect(textAttrs).not.toContain('data-maliang-deck-readonly-reason');

    const rectAttrs = attrsFor(html, 'slide-1-unsafe-__panel');
    expect(rectAttrs).toContain('data-maliang-deck-id="panel"');
    expect(rectAttrs).toContain('data-maliang-deck-type="rect"');
    expect(rectAttrs).toContain('data-maliang-deck-editable="geometry rect-style"');
    expect(rectAttrs).not.toContain('data-maliang-deck-readonly-reason');
  });

  it('marks unsupported top-level, group, and layout elements read-only without editable metadata', () => {
    const html = renderDeckToHtml(deckWith([
      { type: 'circle', id: 'badge', x: 80, y: 80, radius: 24, fill: '#2563eb' },
      {
        type: 'group',
        id: 'grouped',
        x: 100,
        y: 120,
        elements: [
          { type: 'rect', id: 'inside-group', x: 0, y: 0, width: 40, height: 30 },
        ],
      },
      {
        type: 'layout',
        id: 'grid',
        x: 200,
        y: 120,
        width: 200,
        height: 100,
        layout: { mode: 'grid', columns: [80], rows: [40] },
        elements: [
          { type: 'text', id: 'inside-layout', x: 999, y: 999, width: 70, fontSize: 14, content: 'Nested' },
        ],
      },
    ]));

    const circleAttrs = attrsFor(html, 'slide-1-unsafe-__badge');
    expect(circleAttrs).toContain('data-maliang-deck-type="circle"');
    expect(circleAttrs).toContain('data-maliang-deck-editable="geometry circle-style"');
    expect(circleAttrs).not.toContain('data-maliang-deck-readonly-reason');

    const groupAttrs = attrsFor(html, 'slide-1-unsafe-__grouped');
    expect(groupAttrs).toContain('data-maliang-deck-type="group"');
    expect(groupAttrs).toContain('data-maliang-deck-readonly-reason="container-element"');
    expect(groupAttrs).not.toContain('data-maliang-deck-editable');

    const layoutAttrs = attrsFor(html, 'slide-1-unsafe-__grid');
    expect(layoutAttrs).toContain('data-maliang-deck-type="layout"');
    expect(layoutAttrs).toContain('data-maliang-deck-readonly-reason="container-element"');
    expect(layoutAttrs).not.toContain('data-maliang-deck-editable');
  });

  it('marks additional v1 editor elements editable at the top level', () => {
    const html = renderDeckToHtml(deckWith([
      { type: 'animatedText', id: 'motion', x: 10, y: 20, width: 200, height: 60, fontSize: 24, content: 'Animated', textAnimation: { name: 'typewriter' } } as any,
      { type: 'ellipse', id: 'oval', x: 80, y: 80, width: 100, height: 60, fill: '#2563eb' },
      { type: 'path', id: 'path1', x: 120, y: 120, width: 100, height: 80, d: 'M0 0L10 0L10 10Z', fill: '#fff' },
      { type: 'polygon', id: 'poly1', x: 160, y: 160, width: 100, height: 80, points: '0,0 10,0 10,10', fill: '#fff' },
      { type: 'formula', id: 'eq', x: 10, y: 20, width: 120, latex: 'x^2', fontSize: 24 } as any,
    ]));

    expect(attrsFor(html, 'slide-1-unsafe-__motion')).toContain('data-maliang-deck-editable="geometry text"');
    expect(attrsFor(html, 'slide-1-unsafe-__oval')).toContain('data-maliang-deck-editable="geometry circle-style"');
    expect(attrsFor(html, 'slide-1-unsafe-__path1')).toContain('data-maliang-deck-editable="geometry shape-style"');
    expect(attrsFor(html, 'slide-1-unsafe-__poly1')).toContain('data-maliang-deck-editable="geometry shape-style"');
    expect(attrsFor(html, 'slide-1-unsafe-__eq')).toContain('data-maliang-deck-editable="geometry formula"');
  });

  it('keeps unsupported rich runtime elements read-only', () => {
    const html = renderDeckToHtml(deckWith([
      { type: 'customHtml', id: 'html', x: 20, y: 40, width: 100, height: 40, html: '<b>HTML</b>' } as any,
    ]));

    expect(attrsFor(html, 'slide-1-unsafe-__html')).toContain('data-maliang-deck-readonly-reason="unsupported-element"');
    expect(attrsFor(html, 'slide-1-unsafe-__html')).not.toContain('data-maliang-deck-editable');
  });

  it('does not mark nested group/layout descendants persistently editable', () => {
    const html = renderDeckToHtml(deckWith([
      {
        type: 'group',
        id: 'grouped',
        x: 10,
        y: 20,
        elements: [
          { type: 'text', id: 'group-text', x: 1, y: 2, width: 120, fontSize: 18, content: 'Nested group text' },
          { type: 'rect', id: 'group-rect', x: 4, y: 8, width: 80, height: 24 },
        ],
      },
      {
        type: 'layout',
        id: 'grid',
        x: 200,
        y: 20,
        width: 220,
        height: 120,
        layout: { mode: 'grid', columns: [100], rows: [60], padding: 8 },
        elements: [
          { type: 'text', id: 'layout-text', x: 999, y: 999, width: 90, fontSize: 16, content: 'Nested layout text' },
        ],
      },
    ]));

    for (const id of ['group-text', 'group-rect', 'layout-text']) {
      const attrs = attrsFor(html, `slide-1-unsafe-__${id}`);
      expect(attrs).toContain(`data-maliang-deck-id="${id}"`);
      expect(attrs).toContain('data-maliang-deck-readonly-reason="nested-element"');
      expect(attrs).not.toContain('data-maliang-deck-editable');
    }
  });

  it('preserves auto-animate metadata and escapes metadata values for unusual IDs', () => {
    const html = renderDeckToHtml(deckWith([
      {
        type: 'text',
        id: 'copy & <id>',
        x: 10,
        y: 20,
        width: 200,
        fontSize: 18,
        content: 'Animated',
      },
    ], { transition: { autoAnimate: true } }));

    const attrs = attrsFor(html, 'slide-1-unsafe-__copy-id-');
    expect(attrs).toContain('data-maliang-deck-id="copy &amp; &lt;id&gt;"');
    expect(attrs).toContain('data-maliang-deck-type="text"');
    expect(attrs).toContain('data-maliang-deck-editable="geometry text"');
    expect(attrs).toContain('data-maliang-deck-auto-animate-id="copy &amp; &lt;id&gt;"');
    expect(html).toContain('<script id="maliang-deck-runtime-config" type="application/json">{"transition":{"autoAnimate":true}}</script>');
  });
});
