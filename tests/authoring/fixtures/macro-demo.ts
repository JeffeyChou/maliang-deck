import type { AuthoringDeckInput } from '@maliang-deck/authoring';

export const macroDemoDeck: AuthoringDeckInput = {
  meta: { title: 'Authoring macro demo', canvas: { width: 1280, height: 720 } },
  slides: [
    {
      id: 'slide-1',
      elements: [
        {
          kind: 'component',
          id: 'revenue',
          component: 'stat-card',
          props: {
            x: 40,
            y: 40,
            width: 320,
            height: 180,
            label: 'Revenue',
            value: '$42M',
            delta: '+12%',
            tokens: ['glass', 'shadow', 'badge', 'stagger'],
          },
        },
        {
          kind: 'component',
          id: 'split',
          component: 'split-section',
          props: { x: 400, y: 40, width: 760, height: 240, gap: 28 },
          slots: {
            left: [
              { type: 'text', id: 'left-copy', x: 0, y: 0, width: 300, content: 'Left slot copy', fontSize: 24 },
            ],
            right: [
              {
                kind: 'component',
                id: 'nested-header',
                component: 'section-header',
                props: { width: 320, height: 150, title: 'Nested macro', subtitle: 'Compiled from a slot' },
              },
            ],
          },
        },
        {
          kind: 'component',
          id: 'features',
          component: 'feature-grid',
          props: {
            x: 40,
            y: 280,
            width: 600,
            height: 300,
            columns: 2,
            items: [
              { title: 'Fast', body: 'Author less JSON' },
              { title: 'Safe', body: 'Validate expanded DSL' },
            ],
            tokens: ['gradient'],
          },
        },
        {
          kind: 'component',
          id: 'roadmap',
          component: 'timeline-sequence',
          props: {
            x: 700,
            y: 320,
            width: 420,
            height: 260,
            steps: [
              { title: 'Plan' },
              { title: 'Build', body: 'Compile to Deck' },
            ],
            tokens: ['connector'],
          },
        },
      ],
    },
  ],
};
