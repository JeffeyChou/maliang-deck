import { describe, expect, it } from 'vitest';
import { renderDeckToSvg } from '../../packages/renderer-svg/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

function deck(elements: Deck['slides'][number]['elements']): Deck {
  return {
    meta: { title: 'svg metadata', canvas: { width: 800, height: 450 } },
    slides: [{ id: 'slide-1', elements }],
  };
}

describe('SVG PPTX metadata', () => {
  it('renders formula metadata with MathML and step frames', () => {
    const result = renderDeckToSvg(deck([{
      type: 'formula',
      id: 'eq',
      x: 40,
      y: 40,
      width: 320,
      fontSize: 30,
      latex: 'E=mc^2',
      steps: [{ latex: '\\lambda=\\frac{h}{p}' }],
      animation: { enter: 'fade-up', step: 2 },
    }]), { mode: 'pptx-steps' });
    const svg = result.slides[0].svg;

    expect(svg).toContain('data-maliang-deck-kind="formula"');
    expect(svg).toContain('data-maliang-formula="');
    expect(svg).toContain('data-formula-layer="visual"');
    expect(svg).toContain('data-formula-fraction-bar="true"');
    expect(svg).not.toContain('\\frac');
    expect(svg.match(/data-maliang-frame="/g)).toHaveLength(2);
  });

  it('renders animated text as its final compensated static state', () => {
    const result = renderDeckToSvg(deck([{
      type: 'animatedText',
      id: 'motion',
      x: 40,
      y: 90,
      width: 260,
      fontSize: 24,
      content: 'Before',
      morphTo: 'After',
      textAnimation: { name: 'typewriter' },
    }]));

    expect(result.slides[0].svg).toContain('data-maliang-final-frame="true"');
    expect(result.slides[0].svg).toContain('>After</text>');
  });

  it('renders chart/table payloads and 2D graph vector artifacts', () => {
    const result = renderDeckToSvg(deck([
      { type: 'chart', id: 'chart', x: 10, y: 10, width: 220, height: 120, chartType: 'line', data: [{ labels: ['A', 'B'], values: [1, 2] }] },
      { type: 'table', id: 'table', x: 10, y: 150, width: 220, rows: [['A', 'B'], [1, 2]] },
      { type: 'graph', id: 'graph', x: 260, y: 40, width: 260, height: 180, axes: { x: [-3, 3], y: [-2, 2], grid: true }, functions: [{ expr: 'sin(x)' }] },
    ]));
    const svg = result.slides[0].svg;

    expect(svg).toContain('data-maliang-chart="');
    expect(svg).toContain('data-maliang-table="');
    expect(svg).toContain('data-maliang-graph="');
    expect(svg).toContain('data-graph-function="sin(x)"');
  });

  it('renders 3D graph final frames as projected SVG artifacts', () => {
    const result = renderDeckToSvg(deck([{
      type: 'graph',
      id: 'surface',
      x: 40,
      y: 40,
      width: 360,
      height: 240,
      mode: '3d',
      axes: { x: [-3, 3], y: [-3, 3] },
      zAxis: [-1, 1],
      surface: { expr: 'exp(-(x*x+y*y)/4) * cos(x) * cos(y)', colorMap: 'plasma', resolution: 18 },
      camera: { phi: 0.85, theta: 0.5 },
    }]));
    const svg = result.slides[0].svg;

    expect(svg).toContain('data-maliang-graph-final-frame="vector-projection"');
    expect(svg).toContain('<polygon');
    expect(svg).not.toContain('final frame unavailable');
    expect(result.warnings).toHaveLength(0);
  });
});
