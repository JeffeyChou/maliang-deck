import { describe, it, expect } from 'vitest';
import { FontRegistry, layoutTextBox, reflowDeck, reflowSlide, toTextBoxInput } from '../../packages/text-measure/src/index.js';
import type { Slide, TextElement } from '../../packages/schema/src/types.js';
import { comprehensiveTextMeasureDeck } from './fixtures/comprehensive-deck.js';

const registry = new FontRegistry();

describe('reflow algorithm', () => {
  it('shifts overlapping text elements down', () => {
    const slide: Slide = {
      id: 'test',
      elements: [
        { type: 'text', id: 'a', x: 10, y: 10, width: 200, fontSize: 20, content: 'First element with enough text to wrap onto multiple lines for testing purposes' },
        { type: 'text', id: 'b', x: 10, y: 30, width: 200, fontSize: 20, content: 'Second element' },
      ],
    };

    const result = reflowSlide(slide, registry, { canvasWidth: 1280 });
    const elB = result.slide.elements.find((e) => e.id === 'b') as TextElement;
    expect(elB.y).toBeGreaterThan(30); // should have been shifted
    expect(result.adjustments.length).toBeGreaterThan(0);
  });

  it('does not group elements in different columns', () => {
    const slide: Slide = {
      id: 'test',
      elements: [
        { type: 'text', id: 'left', x: 10, y: 10, width: 200, fontSize: 20, content: 'Left column text that wraps across lines' },
        { type: 'text', id: 'right', x: 500, y: 10, width: 200, fontSize: 20, content: 'Right column text' },
      ],
    };

    const result = reflowSlide(slide, registry, { canvasWidth: 1280 });
    const elRight = result.slide.elements.find((e) => e.id === 'right') as TextElement;
    expect(elRight.y).toBe(10); // unchanged -- different column
  });

  it('excludes spanning elements from column grouping', () => {
    const slide: Slide = {
      id: 'test',
      elements: [
        { type: 'text', id: 'narrow', x: 100, y: 100, width: 200, fontSize: 20, content: 'Narrow column text that wraps onto several lines to test the algorithm behavior' },
        { type: 'text', id: 'footer', x: 100, y: 200, width: 1080, fontSize: 20, content: 'Full-width footer text' },
      ],
    };

    const result = reflowSlide(slide, registry, { canvasWidth: 1280 });
    const footer = result.slide.elements.find((e) => e.id === 'footer') as TextElement;
    expect(footer.y).toBe(200); // spanning element NOT shifted
  });

  it('does not move non-text elements', () => {
    const slide: Slide = {
      id: 'test',
      elements: [
        { type: 'rect', id: 'bg', x: 10, y: 10, width: 200, height: 100, fill: '#eee' },
        { type: 'text', id: 'a', x: 10, y: 10, width: 200, fontSize: 20, content: 'Text overlapping with next' },
        { type: 'text', id: 'b', x: 10, y: 30, width: 200, fontSize: 20, content: 'Should shift down' },
      ],
    };

    const result = reflowSlide(slide, registry, { canvasWidth: 1280 });
    const rect = result.slide.elements.find((e) => e.id === 'bg')!;
    expect(rect.y).toBe(10); // rect unchanged
  });

  it('is idempotent', () => {
    const slide: Slide = {
      id: 'test',
      elements: [
        { type: 'text', id: 'a', x: 10, y: 10, width: 200, fontSize: 20, content: 'First element with long text to test wrapping behavior' },
        { type: 'text', id: 'b', x: 10, y: 30, width: 200, fontSize: 20, content: 'Second element' },
      ],
    };

    const first = reflowSlide(slide, registry, { canvasWidth: 1280 });
    const second = reflowSlide(first.slide, registry, { canvasWidth: 1280 });
    expect(second.adjustments.length).toBe(0); // no further changes
  });

  it('returns a deep clone (original unchanged)', () => {
    const slide: Slide = {
      id: 'test',
      elements: [
        { type: 'text', id: 'a', x: 10, y: 10, width: 200, fontSize: 20, content: 'Text' },
        { type: 'text', id: 'b', x: 10, y: 20, width: 200, fontSize: 20, content: 'More' },
      ],
    };

    const originalY = (slide.elements[1] as TextElement).y;
    reflowSlide(slide, registry, { canvasWidth: 1280 });
    expect((slide.elements[1] as TextElement).y).toBe(originalY); // original untouched
  });
});

describe('comprehensive in-repo fixture reflow', () => {
  it('reflows overlapping text without mutating the source fixture or spanning footer', () => {
    const originalJson = JSON.stringify(comprehensiveTextMeasureDeck);
    const { deck: reflowed, report } = reflowDeck(comprehensiveTextMeasureDeck, registry);

    expect(JSON.stringify(comprehensiveTextMeasureDeck)).toBe(originalJson);
    expect(report.slidesModified).toBeGreaterThan(0);
    expect(report.adjustments.map((adjustment) => adjustment.elementId)).toEqual(
      expect.arrayContaining(['left-body-b', 'left-mono-token', 'right-body-b']),
    );

    const originalFooter = comprehensiveTextMeasureDeck.slides[0].elements.find((element) => element.id === 'spanning-footer') as TextElement;
    const reflowedFooter = reflowed.slides[0].elements.find((element) => element.id === 'spanning-footer') as TextElement;
    expect(reflowedFooter.y).toBe(originalFooter.y);

    for (const slide of reflowed.slides) {
      expectColumnTextToHaveNoVerticalOverlap(slide, reflowed.meta.canvas.width);
    }
  });
});

function expectColumnTextToHaveNoVerticalOverlap(slide: Slide, canvasWidth: number): void {
  const spanThreshold = canvasWidth * 0.6;
  const columns: TextElement[][] = [];

  for (const element of slide.elements) {
    if (element.type !== 'text') continue;
    if (element.width > spanThreshold) continue;

    const column = columns.find((candidate) => Math.abs(element.x - candidate[0].x) <= 20);
    if (column) column.push(element);
    else columns.push([element]);
  }

  for (const column of columns) {
    column.sort((a, b) => a.y - b.y);
    for (let index = 0; index < column.length - 1; index += 1) {
      const current = column[index];
      const next = column[index + 1];
      const measuredHeight = layoutTextBox(
        toTextBoxInput(current),
        { width: current.width, height: current.height },
        registry,
      ).totalHeight;
      expect(current.y + measuredHeight).toBeLessThanOrEqual(next.y + 1);
    }
  }
}
