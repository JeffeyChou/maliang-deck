import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Deck } from '@maliang-deck/schema';
import {
  PPTX_ANIMATION_MAPPINGS,
  assessPptxAnimationPlan,
  createPptxAnimationPlan,
} from '../src/pptx-animation.js';

function timelineAnimationNames(): string[] {
  const timelinePath = fileURLToPath(new URL('../../../runtime/timeline.js', import.meta.url));
  const source = readFileSync(timelinePath, 'utf-8');
  const match = source.match(/const KEYFRAMES = \{([\s\S]*?)\n  \};/);
  if (!match) throw new Error('KEYFRAMES registry not found in runtime/timeline.js');
  return [...match[1].matchAll(/    '([^']+)': \[/g)].map((entry) => entry[1]);
}

describe('PPTX animation mapping table', () => {
  it('contains every current HTML timeline animation with an explicit fallback', () => {
    const runtimeNames = timelineAnimationNames();

    expect(Object.keys(PPTX_ANIMATION_MAPPINGS)).toEqual(runtimeNames);
    for (const name of runtimeNames) {
      expect(PPTX_ANIMATION_MAPPINGS).toHaveProperty(name);
      expect(PPTX_ANIMATION_MAPPINGS[name].fallback).toBeTruthy();
    }
  });

  it('reports known effects separately from unsupported future effects', () => {
    const report = assessPptxAnimationPlan([
      {
        slideId: 'capabilities',
        steps: [
          {
            step: 0,
            items: [
              { elementId: 'supported', effect: 'scale-in', durationMs: 600, delayMs: 0, sourceOrder: 0 },
              { elementId: 'downgraded', effect: 'blur-in', durationMs: 600, delayMs: 0, sourceOrder: 1 },
              {
                elementId: 'unsupported',
                effect: 'future-glitch-materialize',
                durationMs: 600,
                delayMs: 0,
                sourceOrder: 2,
              },
            ],
          },
        ],
      },
    ]);

    expect(report.supported.map((entry) => entry.effect)).toEqual(['scale-in']);
    expect(report.downgraded.map((entry) => entry.effect)).toEqual(['blur-in']);
    expect(report.unsupported.map((entry) => entry.effect)).toEqual(['future-glitch-materialize']);
    expect(report.unsupported[0].fallback).toBe('fade');
  });
});

describe('createPptxAnimationPlan', () => {
  it('groups DSL animations by slide and step while preserving per-element timing', () => {
    const deck: Deck = {
      meta: { title: 'Animation fixture', canvas: { width: 1280, height: 720 } },
      slides: [
        {
          id: 'intro',
          elements: [
            {
              id: 'title',
              type: 'text',
              x: 80,
              y: 80,
              width: 700,
              fontSize: 48,
              content: 'MinerU Workflow',
              animation: { enter: 'fade-up', step: 0, duration: 500, delay: 0, easing: 'ease-out' },
            },
            {
              id: 'chart',
              type: 'rect',
              x: 120,
              y: 220,
              width: 500,
              height: 280,
              animation: { enter: 'fade-up', step: 1, duration: 900, delay: 100, easing: 'linear' },
            },
            {
              id: 'caption',
              type: 'text',
              x: 120,
              y: 530,
              width: 500,
              fontSize: 22,
              content: 'Same step, different timing',
              animation: { enter: 'fade-up', step: 1, duration: 300, delay: 250, easing: 'ease-in' },
            },
          ],
        },
        {
          id: 'detail',
          elements: [
            {
              id: 'group',
              type: 'group',
              x: 0,
              y: 0,
              elements: [
                {
                  id: 'nested',
                  type: 'circle',
                  x: 10,
                  y: 10,
                  radius: 20,
                  animation: { enter: 'future-glitch-materialize', step: 2, duration: 600 },
                },
              ],
            },
          ],
        },
      ],
    };

    const plans = createPptxAnimationPlan(deck);
    const report = assessPptxAnimationPlan(plans);

    expect(plans.map((plan) => plan.slideId)).toEqual(['intro', 'detail']);
    expect(plans[0].steps.map((step) => step.step)).toEqual([0, 1]);
    expect(plans[0].steps[1].items).toEqual([
      {
        elementId: 'chart',
        effect: 'fade-up',
        durationMs: 900,
        delayMs: 100,
        easing: 'linear',
        sourceOrder: 1,
      },
      {
        elementId: 'caption',
        effect: 'fade-up',
        durationMs: 300,
        delayMs: 250,
        easing: 'ease-in',
        sourceOrder: 2,
      },
    ]);
    expect(plans[1].steps[0].items[0]).toMatchObject({
      elementId: 'nested',
      effect: 'future-glitch-materialize',
      durationMs: 600,
      delayMs: 0,
      sourceOrder: 0,
    });
    expect(report.warnings).toContainEqual(expect.objectContaining({
      code: 'pptx.animation.unsupported',
      slideId: 'detail',
      elementId: 'nested',
      effect: 'future-glitch-materialize',
      fallback: 'fade',
    }));
  });
});
