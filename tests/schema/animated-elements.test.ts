import { describe, it, expect } from 'vitest';
import {
  AnimatedTextElementSchema,
  FormulaElementSchema,
  GraphElementSchema,
  ContinuousAnimationSchema,
  TextAnimEffectSchema,
  GraphFunctionSchema,
} from '@maliang-deck/schema';

describe('AnimatedTextElement schema', () => {
  it('validates a valid animatedText element', () => {
    const result = AnimatedTextElementSchema.safeParse({
      type: 'animatedText',
      id: 'test-anim',
      x: 100,
      y: 200,
      width: 800,
      fontSize: 32,
      content: 'Hello World',
      textAnimation: { name: 'stagger', stagger: 50 },
    });
    expect(result.success).toBe(true);
  });

  it('validates with array of text animations', () => {
    const result = AnimatedTextElementSchema.safeParse({
      type: 'animatedText',
      id: 'multi-anim',
      x: 0,
      y: 0,
      width: 500,
      fontSize: 24,
      content: 'Multi',
      textAnimation: [
        { name: 'stagger', duration: 500 },
        { name: 'wave', stagger: 100 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('validates with path config', () => {
    const result = AnimatedTextElementSchema.safeParse({
      type: 'animatedText',
      id: 'path-text',
      x: 0,
      y: 0,
      width: 600,
      fontSize: 20,
      content: 'On a path',
      textAnimation: { name: 'stagger' },
      path: { d: 'M 0,0 A 100,100 0 1,1 99,0', align: 'center', animate: true, animateDuration: 5000 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing content', () => {
    const result = AnimatedTextElementSchema.safeParse({
      type: 'animatedText',
      id: 'no-content',
      x: 0,
      y: 0,
      width: 500,
      fontSize: 24,
      textAnimation: { name: 'wave' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid effect name', () => {
    const result = TextAnimEffectSchema.safeParse({
      name: 'nonexistent-effect',
    });
    expect(result.success).toBe(false);
  });

  it('validates all effect names', () => {
    const names = [
      'stagger', 'wave', 'cascade', 'scramble', 'decode',
      'typewriter', 'fade-chars', 'bounce-chars', 'rotate-chars',
      'scale-chars', 'blur-reveal', 'glitch',
    ];
    names.forEach((name) => {
      const result = TextAnimEffectSchema.safeParse({ name });
      expect(result.success, `Effect "${name}" should be valid`).toBe(true);
    });
  });

  it('validates path offset range 0-1', () => {
    const valid = AnimatedTextElementSchema.safeParse({
      type: 'animatedText', id: 't', x: 0, y: 0, width: 100, fontSize: 16,
      content: 'x', textAnimation: { name: 'stagger' },
      path: { d: 'M 0,0 L 100,0', offset: 0.5 },
    });
    expect(valid.success).toBe(true);

    const invalid = AnimatedTextElementSchema.safeParse({
      type: 'animatedText', id: 't', x: 0, y: 0, width: 100, fontSize: 16,
      content: 'x', textAnimation: { name: 'stagger' },
      path: { d: 'M 0,0 L 100,0', offset: 1.5 },
    });
    expect(invalid.success).toBe(false);
  });
});

describe('FormulaElement schema', () => {
  it('validates a basic formula', () => {
    const result = FormulaElementSchema.safeParse({
      type: 'formula',
      id: 'euler',
      x: 100,
      y: 100,
      width: 600,
      latex: 'e^{i\\pi} + 1 = 0',
    });
    expect(result.success).toBe(true);
  });

  it('validates formula with steps', () => {
    const result = FormulaElementSchema.safeParse({
      type: 'formula',
      id: 'deriv',
      x: 0,
      y: 0,
      width: 800,
      latex: '\\frac{d}{dx} e^x',
      steps: [
        { latex: '\\lim_{h \\to 0} \\frac{e^{x+h} - e^x}{h}' },
        { latex: 'e^x', annotation: 'Result', highlight: [{ symbol: 'e^x', color: '#ff0000' }], morphMap: { '0': 0, '1': 1 } },
      ],
      morphMap: [[0, 0]],
      morphDuration: 800,
      stepTrigger: 'click',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty latex', () => {
    const result = FormulaElementSchema.safeParse({
      type: 'formula',
      id: 'empty',
      x: 0,
      y: 0,
      width: 400,
      latex: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('GraphElement schema', () => {
  it('validates a 2D graph', () => {
    const result = GraphElementSchema.safeParse({
      type: 'graph',
      id: 'sine',
      x: 0,
      y: 0,
      width: 800,
      height: 400,
      functions: [{ expr: 'sin(x)', color: '#ff0000', animate: 'draw-on' }],
      axes: { x: [-6.28, 6.28], y: [-1.5, 1.5] },
    });
    expect(result.success).toBe(true);
  });

  it('validates a 3D graph', () => {
    const result = GraphElementSchema.safeParse({
      type: 'graph',
      id: 'surface',
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      mode: '3d',
      functions: [{ expr: 'x*x - y*y' }],
      surface: { expr: 'x*x - y*y', colorMap: 'viridis', resolution: 64 },
      axes: { x: [-3, 3], y: [-3, 3] },
      zAxis: [-9, 9],
      camera: { distance: 12, phi: 1.0, theta: 0.8, orbit: true, orbitSpeed: 0.5 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects expression exceeding max length', () => {
    const result = GraphFunctionSchema.safeParse({
      expr: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 functions', () => {
    const fns = Array.from({ length: 11 }, (_, i) => ({ expr: 'x+' + i }));
    const result = GraphElementSchema.safeParse({
      type: 'graph', id: 'g', x: 0, y: 0, width: 400, height: 300,
      functions: fns,
      axes: { x: [0, 1], y: [0, 1] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 20 annotations', () => {
    const anns = Array.from({ length: 21 }, () => ({ type: 'point', at: 0 }));
    const result = GraphElementSchema.safeParse({
      type: 'graph', id: 'g', x: 0, y: 0, width: 400, height: 300,
      functions: [{ expr: 'x' }],
      axes: { x: [0, 1], y: [0, 1] },
      annotations: anns,
    });
    expect(result.success).toBe(false);
  });

  it('validates graph with annotations', () => {
    const result = GraphElementSchema.safeParse({
      type: 'graph', id: 'annotated', x: 0, y: 0, width: 600, height: 400,
      functions: [{ expr: 'x*x' }],
      axes: { x: [-5, 5], y: [0, 25] },
      annotations: [
        { type: 'point', at: 2, label: 'f(2)=4', animate: true },
        { type: 'tangent', at: 1, color: '#00ff00' },
        { type: 'vertical-line', at: 3 },
        { type: 'area', at: 2, color: '#0000ff' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('validates graph with parameter', () => {
    const result = GraphElementSchema.safeParse({
      type: 'graph', id: 'param', x: 0, y: 0, width: 600, height: 400,
      functions: [{ expr: 'sin(t*x)' }],
      axes: { x: [-6, 6], y: [-2, 2] },
      parameter: { name: 't', range: [0.5, 3], animate: true, duration: 4000 },
    });
    expect(result.success).toBe(true);
  });
});

describe('ContinuousAnimation schema', () => {
  it('validates a basic continuous animation', () => {
    const result = ContinuousAnimationSchema.safeParse({
      duration: 2000,
      loop: true,
      trigger: 'auto',
    });
    expect(result.success).toBe(true);
  });

  it('validates with step trigger', () => {
    const result = ContinuousAnimationSchema.safeParse({
      duration: 1000,
      trigger: 'step',
      step: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-positive duration', () => {
    const result = ContinuousAnimationSchema.safeParse({
      duration: 0,
    });
    expect(result.success).toBe(false);
  });
});
