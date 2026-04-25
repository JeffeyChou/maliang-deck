import { describe, expect, it } from 'vitest';
import { renderDeckToHtml } from '../../packages/renderer-html/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

function deckWithRuntime(htmlRuntime?: Deck['meta']['htmlRuntime']): Deck {
  return {
    meta: {
      title: 'Runtime transitions',
      canvas: { width: 1280, height: 720 },
      ...(htmlRuntime ? { htmlRuntime } : {}),
    },
    slides: [
      {
        id: 'slide-a',
        elements: [
          {
            type: 'text',
            id: 'logo',
            x: 20,
            y: 30,
            width: 240,
            fontSize: 32,
            content: 'Logo A',
            animation: { enter: 'fade-up', step: 1, duration: 350 },
          },
        ],
      },
      {
        id: 'slide-b',
        elements: [
          {
            type: 'text',
            id: 'logo',
            x: 320,
            y: 120,
            width: 280,
            fontSize: 36,
            content: 'Logo B',
          },
        ],
      },
    ],
  };
}

describe('HTML runtime transition rendering', () => {
  it('does not emit runtime config for decks that do not opt in', () => {
    const html = renderDeckToHtml(deckWithRuntime());

    expect(html).not.toContain('id="maliang-deck-runtime-config"');
    expect(html).toContain('data-slide-id="slide-a"');
    expect(html).toContain('id="slide-a__logo"');
    expect(html).toContain('data-maliang-deck-id="logo"');
    expect(html).not.toContain('data-maliang-deck-auto-animate-id="logo"');
  });

  it('emits opt-in runtime config, slide metadata, scoped DOM IDs, and shared keys', () => {
    const html = renderDeckToHtml(deckWithRuntime({
      transition: {
        type: 'slide',
        durationMs: 500,
        easing: 'ease-in-out',
        autoAnimate: true,
        unmatched: 'fade',
      },
    }));

    expect(html).toContain('<script id="maliang-deck-runtime-config" type="application/json">');
    expect(html).toContain('"type":"slide"');
    expect(html).toContain('"durationMs":500');
    expect(html).toContain('data-slide-id="slide-a"');
    expect(html).toContain('data-slide-id="slide-b"');
    expect(html).toContain('id="slide-a__logo"');
    expect(html).toContain('id="slide-b__logo"');
    expect(html.match(/\sid="logo"/g)).toBeNull();
    expect(html.match(/data-maliang-deck-id="logo"/g)).toHaveLength(2);
    expect(html.match(/data-maliang-deck-auto-animate-id="logo"/g)).toHaveLength(2);
    expect(html).toContain('data-anim-enter="fade-up"');
    expect(html).toContain('data-anim-step="1"');
  });

  it('keeps inactive slides laid out for transition measurement instead of display:none', () => {
    const html = renderDeckToHtml(deckWithRuntime({ transition: { type: 'fade', autoAnimate: true } }));

    expect(html).toContain('.slide { position: absolute; width: 1280px; height: 720px; overflow: hidden; background: #fff; transform-origin: center center; visibility: hidden; opacity: 0; pointer-events: none; z-index: 0; }');
    expect(html).toContain('.slide.is-transition-prev, .slide.is-transition-next { visibility: visible; pointer-events: none; }');
    expect(html).not.toContain('.slide { position: absolute; width: 1280px; height: 720px; overflow: hidden; background: #fff; transform-origin: center center; display: none; }');
  });
});
