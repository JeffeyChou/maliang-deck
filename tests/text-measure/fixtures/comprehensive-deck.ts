import type { Animation, Deck, Element } from '../../../packages/schema/src/types.js';

export const CURRENT_ANIMATION_EFFECTS = [
  'fade-up',
  'fade-down',
  'fade-left',
  'fade-right',
  'scale-in',
  'blur-in',
  'slide-from-left',
  'slide-from-right',
  'rise-in',
  'zoom-pop',
  'rotate-in',
] as const;

export type CurrentAnimationEffect = typeof CURRENT_ANIMATION_EFFECTS[number];

const DATA_URI_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNjAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iI2Y4ZGU2OCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzAiIHI9IjIwIiBmaWxsPSIjMjU2M2ViIi8+PC9zdmc+';

export function animated(
  enter: CurrentAnimationEffect,
  index: number,
  overrides: Partial<Animation> = {},
): Animation {
  return {
    enter,
    step: index % 5,
    duration: 250 + index * 35,
    delay: index * 12,
    easing: index % 2 === 0 ? 'ease-out' : 'cubic-bezier(.2,.8,.2,1)',
    ...overrides,
  };
}

export const comprehensiveTextMeasureDeck = {
  meta: {
    title: 'Comprehensive text-measure and animation fixture',
    theme: 'minimal-white',
    canvas: { width: 1280, height: 720 },
    htmlRuntime: {
      transition: {
        type: 'slide',
        durationMs: 450,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        autoAnimate: true,
        unmatched: 'instant',
      },
    },
  },
  slides: [
    {
      id: 'text-edge-cases',
      background: '#f8fafc',
      fx: ['gradient-blob', 'constellation'],
      notes: 'Deliberately overlaps text in two independent columns for deterministic reflow coverage.',
      elements: [
        { type: 'rect', id: 'left-panel-bg', x: 64, y: 82, width: 508, height: 430, fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 2, radius: 18 },
        { type: 'rect', id: 'right-panel-bg', x: 708, y: 82, width: 508, height: 430, fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 2, radius: 18 },
        {
          type: 'text',
          id: 'left-title',
          x: 92,
          y: 104,
          width: 420,
          fontSize: 34,
          fontWeight: 'bold',
          color: '#0f172a',
          textRole: 'heading',
          content: 'Dense left column',
          animation: animated('fade-up', 0),
        },
        {
          type: 'text',
          id: 'left-body-a',
          x: 92,
          y: 150,
          width: 410,
          fontSize: 24,
          lineHeight: 1.15,
          color: '#334155',
          content: 'Long prose intentionally starts too close to the next paragraph so the reflow pass must measure wrapped lines and shift subsequent content down without touching the panel background.',
          animation: animated('fade-down', 1),
        },
        {
          type: 'text',
          id: 'left-body-b',
          x: 96,
          y: 188,
          width: 402,
          fontSize: 23,
          lineHeight: 1.2,
          color: '#475569',
          content: 'Second paragraph includes punctuation, (parentheses), and a forced newline.\nIt should remain in the same approximate column and move below the first paragraph.',
          animation: animated('fade-left', 2),
        },
        {
          type: 'text',
          id: 'left-mono-token',
          x: 92,
          y: 252,
          width: 410,
          fontSize: 20,
          fontFamily: 'monospace',
          lineHeight: 1.1,
          color: '#1e293b',
          content: 'SuperLongIdentifierWithoutSpaces_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_and_wrap_fallback',
          animation: animated('fade-right', 3),
        },
        {
          type: 'text',
          id: 'right-title',
          x: 734,
          y: 104,
          width: 426,
          fontSize: 32,
          fontWeight: 'bold',
          color: '#0f172a',
          textRole: 'heading',
          content: 'International text',
          animation: animated('scale-in', 4),
        },
        {
          type: 'text',
          id: 'right-body-a',
          x: 734,
          y: 148,
          width: 418,
          fontSize: 24,
          lineHeight: 1.15,
          color: '#334155',
          content: 'CJK and emoji coverage: 測試文字、かなカナ、한글, accents café naïve, symbols ±×÷, and emoji 🚀📊 all inside one measured box.',
          animation: animated('blur-in', 5),
        },
        {
          type: 'text',
          id: 'right-body-b',
          x: 738,
          y: 190,
          width: 414,
          fontSize: 22,
          lineHeight: 1.25,
          color: '#475569',
          content: 'Middle aligned fixed-height text box\nwith two explicit lines and enough body copy to exercise height-aware rendering.',
          verticalAlign: 'middle',
          height: 190,
          animation: animated('slide-from-left', 6, { step: 3 }),
        },
        {
          type: 'text',
          id: 'spanning-footer',
          x: 90,
          y: 610,
          width: 1100,
          fontSize: 20,
          color: '#64748b',
          textRole: 'label',
          content: 'Full-width footer is intentionally wider than the column threshold and must not be shifted by column reflow.',
          animation: animated('slide-from-right', 7, { step: 4 }),
        },
      ],
    },
    {
      id: 'animation-and-primitives',
      background: '#0f172a',
      fx: ['gradient-blob', 'firework'],
      notes: 'Covers every timeline animation and every current renderable element family.',
      elements: [
        { type: 'text', id: 'anim-title', x: 64, y: 42, width: 600, fontSize: 36, fontWeight: 'bold', color: '#f8fafc', content: 'Animation + primitive matrix', animation: animated('rise-in', 8) },
        { type: 'rect', id: 'anim-rect', x: 64, y: 116, width: 170, height: 92, fill: '#2563eb', stroke: '#93c5fd', strokeWidth: 3, radius: 16, opacity: 0.7, animation: animated('zoom-pop', 9, { step: 1 }) },
        { type: 'circle', id: 'anim-circle', x: 318, y: 162, radius: 48, fill: '#dc2626', stroke: '#fecaca', strokeWidth: 4, animation: animated('rotate-in', 10, { step: 1 }) },
        { type: 'ellipse', id: 'anim-ellipse', x: 398, y: 116, width: 154, height: 92, fill: '#16a34a', stroke: '#bbf7d0', strokeWidth: 4, animation: animated('fade-up', 11, { step: 2 }) },
        { type: 'line', id: 'anim-line', x: 604, y: 122, x2: 748, y2: 204, stroke: '#facc15', strokeWidth: 8, strokeDasharray: '14 8', animation: animated('fade-down', 12, { step: 2 }) },
        { type: 'path', id: 'anim-path', x: 792, y: 112, width: 150, height: 110, d: 'M 8 88 C 38 4, 110 4, 140 88 Z', fill: '#a855f7', stroke: '#e9d5ff', strokeWidth: 3, animation: animated('fade-left', 13, { step: 2 }) },
        { type: 'polygon', id: 'anim-polygon', x: 1000, y: 110, width: 150, height: 120, points: '75,0 92,50 145,50 102,80 120,120 75,94 30,120 48,80 5,50 58,50', fill: '#f97316', stroke: '#fed7aa', strokeWidth: 3, animation: animated('fade-right', 14, { step: 3 }) },
        { type: 'image', id: 'anim-image', x: 64, y: 262, width: 150, height: 92, src: DATA_URI_IMAGE, fit: 'contain', animation: animated('scale-in', 15, { step: 3 }) },
        {
          type: 'chart',
          id: 'anim-chart',
          x: 248,
          y: 248,
          width: 330,
          height: 180,
          chartType: 'bar',
          data: [{ name: 'Actual', labels: ['A', 'B', 'C'], values: [4, 7, 5] }],
          animation: animated('blur-in', 16, { step: 4 }),
        },
        {
          type: 'table',
          id: 'anim-table',
          x: 612,
          y: 250,
          width: 330,
          height: 178,
          rows: [
            [{ text: 'Case', options: { bold: true, fill: '#e0f2fe' } }, { text: 'Status', options: { bold: true, align: 'center', fill: '#e0f2fe' } }],
            ['SVG/PDF', { text: 'static', options: { align: 'center' } }],
            ['HTML', { text: 'animated', options: { align: 'center', italic: true } }],
          ],
          animation: animated('slide-from-left', 17, { step: 4 }),
        },
        {
          type: 'group',
          id: 'anim-group',
          x: 982,
          y: 260,
          width: 214,
          height: 150,
          rotation: -4,
          opacity: 0.85,
          animation: animated('slide-from-right', 18, { step: 5 }),
          elements: [
            { type: 'rect', id: 'group-card', x: 0, y: 0, width: 214, height: 150, fill: '#1e293b', stroke: '#38bdf8', strokeWidth: 2, radius: 14 },
            { type: 'text', id: 'group-label', x: 18, y: 24, width: 170, fontSize: 22, color: '#e0f2fe', content: 'Nested group child', animation: animated('rise-in', 19, { step: 5 }) },
          ],
        },
        {
          type: 'layout',
          id: 'anim-layout-grid',
          x: 64,
          y: 478,
          width: 540,
          height: 160,
          overflow: 'clip',
          layout: {
            mode: 'grid',
            columns: [160, 160, 160],
            rows: [110],
            gap: { column: 18, row: 0 },
            padding: { top: 18, right: 18, bottom: 18, left: 18 },
            alignItems: 'stretch',
            justifyItems: 'stretch',
          },
          animation: animated('zoom-pop', 20, { step: 6 }),
          elements: [
            { type: 'text', id: 'layout-cell-text', x: 0, y: 0, width: 150, fontSize: 18, color: '#f8fafc', content: 'Grid child text', placement: { column: 0, row: 0 }, animation: animated('rotate-in', 21, { step: 6 }) },
            { type: 'rect', id: 'layout-cell-rect', x: 0, y: 0, width: 150, height: 78, fill: '#0369a1', radius: 10, placement: { column: 1, row: 0 }, animation: animated('fade-up', 22, { step: 7 }) },
            { type: 'text', id: 'layout-absolute-text', x: 346, y: 54, width: 150, fontSize: 16, color: '#bae6fd', content: 'absolute child', placement: { mode: 'absolute', x: 346, y: 54 }, animation: animated('fade-down', 23, { step: 7 }) },
          ],
        },
        {
          type: 'layout',
          id: 'anim-layout-flex',
          x: 664,
          y: 476,
          width: 500,
          height: 164,
          overflow: 'visible',
          layout: {
            mode: 'flex',
            direction: 'row',
            wrap: true,
            gap: 14,
            padding: 18,
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          animation: animated('fade-left', 24, { step: 8 }),
          elements: [
            { type: 'text', id: 'flex-child-a', x: 0, y: 0, width: 142, fontSize: 17, color: '#fef3c7', content: 'flex A', placement: { basis: 142 }, animation: animated('fade-right', 25, { step: 8 }) },
            { type: 'text', id: 'flex-child-b', x: 0, y: 0, width: 142, fontSize: 17, color: '#fef3c7', content: 'flex B', placement: { basis: 142 }, animation: animated('scale-in', 26, { step: 9 }) },
          ],
        },
      ],
    },
  ],
} satisfies Deck;

export function collectAnimationEffects(deck: Deck): string[] {
  const effects: string[] = [];

  const visit = (elements: Element[]): void => {
    for (const element of elements) {
      if (element.animation?.enter) effects.push(element.animation.enter);
      if (element.type === 'group' || element.type === 'layout') visit(element.elements);
    }
  };

  for (const slide of deck.slides) visit(slide.elements);
  return effects;
}
