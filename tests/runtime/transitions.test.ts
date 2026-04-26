import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateDeck } from '@maliang-deck/schema';

const runtimeSource = readFileSync(join(process.cwd(), 'runtime', 'runtime.js'), 'utf-8');
const animationsSource = readFileSync(join(process.cwd(), 'assets', 'animations', 'animations.css'), 'utf-8');

function extractFunction(name: string, nextName: string) {
  const start = runtimeSource.indexOf(`function ${name}`);
  const end = runtimeSource.indexOf(`\n\n    function ${nextName}`, start);
  if (start < 0 || end < 0) throw new Error(`Unable to extract ${name}`);
  // eslint-disable-next-line no-new-func
  return new Function(`${runtimeSource.slice(start, end)}; return ${name};`)();
}

describe('HTML runtime transition config and lifecycle', () => {
  it('validates optional HTML runtime transition config without affecting existing decks', () => {
    expect(validateDeck({
      meta: { title: 'plain', canvas: { width: 1280, height: 720 } },
      slides: [{ id: 'slide-1', elements: [] }],
    }).success).toBe(true);

    expect(validateDeck({
      meta: {
        title: 'configured',
        canvas: { width: 1280, height: 720 },
        htmlRuntime: {
          transition: {
            type: 'fade',
            durationMs: 350,
            easing: 'ease-out',
            autoAnimate: true,
            unmatched: 'instant',
          },
        },
      },
      slides: [{ id: 'slide-1', elements: [] }],
    }).success).toBe(true);

    const invalid = validateDeck({
      meta: {
        title: 'invalid',
        canvas: { width: 1280, height: 720 },
        htmlRuntime: { transition: { type: 'zoom' } },
      },
      slides: [{ id: 'slide-1', elements: [] }],
    });

    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.errors.some((error) => error.path.join('.') === 'meta.htmlRuntime.transition.type')).toBe(true);
    }
  });

  it('computes FLIP deltas in slide-local space and handles zero dimensions safely', () => {
    const computeFlipDelta = extractFunction('computeFlipDelta', 'sharedElementMap') as (
      previous: { left: number; top: number; width: number; height: number },
      next: { left: number; top: number; width: number; height: number },
      scale: { x: number; y: number },
    ) => { translateX: number; translateY: number; scaleX: number; scaleY: number };

    expect(computeFlipDelta(
      { left: 100, top: 200, width: 160, height: 80 },
      { left: 340, top: 260, width: 80, height: 40 },
      { x: 2, y: 1.5 },
    )).toEqual({ translateX: -120, translateY: -40, scaleX: 2, scaleY: 2 });

    expect(computeFlipDelta(
      { left: 0, top: 0, width: 0, height: 0 },
      { left: 0, top: 0, width: 0, height: 0 },
      { x: 0, y: 0 },
    )).toEqual({ translateX: 0, translateY: 0, scaleX: 1, scaleY: 1 });
  });

  it('contains a measurable transition lifecycle with reduced-motion fallback', () => {
    expect(runtimeSource).toContain('function stageTransitionSlides');
    expect(runtimeSource).toContain('never measure inside display:none');
    expect(runtimeSource).toContain('function commitSlideTransition');
    expect(runtimeSource).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(runtimeSource).toContain('prefersReducedMotion()');
    expect(animationsSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(animationsSource).toContain('.slide.is-transition-prev');
  });

  it('keeps the transition layer independent from timeline step consumption', () => {
    const start = runtimeSource.indexOf('function runSlideTransition');
    const end = runtimeSource.indexOf('/* ===== navigation ===== */', start);
    const transitionBlock = runtimeSource.slice(start, end);

    expect(transitionBlock).not.toContain('__vsliTimeline');
    expect(transitionBlock).not.toContain('.advance(');
    expect(runtimeSource).toContain("case 'ArrowRight': case 'PageDown': go(idx+1, false, { skipTimeline: true })");
    expect(runtimeSource).toContain("case 'ArrowDown': advanceTimelineStep('forward')");
  });
});
