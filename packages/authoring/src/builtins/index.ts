import type { Element, GroupElement, LayoutElement } from '@maliang-deck/schema';
import { z } from 'zod';
import { VisualTokenListSchema, visualTokenAnimation, visualTokenRectStyle } from '../effects.js';
import { createAuthoringRegistry, type AuthoringRegistry } from '../registry.js';
import type { ComponentDefinition, ComponentExpandContext, VisualToken } from '../types.js';

const finite = z.number().finite();
const positive = finite.positive();
const nonnegative = finite.nonnegative();
const color = z.string().min(1);
const tokens = VisualTokenListSchema.default([]);

const BoxSchema = z.object({
  x: finite.default(0),
  y: finite.default(0),
  width: positive.default(320),
  height: positive.default(180),
});

const MetricCardPropsSchema = BoxSchema.extend({
  label: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  caption: z.string().optional(),
  delta: z.string().optional(),
  badge: z.string().optional(),
  accent: color.default('#2563eb'),
  background: color.optional(),
  tokens,
}).strict();

type MetricCardProps = z.infer<typeof MetricCardPropsSchema>;

const TwoColumnPropsSchema = BoxSchema.extend({
  title: z.string().optional(),
  leftTitle: z.string().optional(),
  rightTitle: z.string().optional(),
  gap: nonnegative.default(32),
  leftRatio: positive.default(1),
  rightRatio: positive.default(1),
  alignItems: z.enum(['start', 'center', 'end', 'stretch']).default('stretch'),
  tokens,
}).strict();

type TwoColumnProps = z.infer<typeof TwoColumnPropsSchema>;

const FeatureItemSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  eyebrow: z.string().optional(),
  accent: color.optional(),
  tokens: VisualTokenListSchema.optional(),
}).strict();

const FeatureGridPropsSchema = BoxSchema.extend({
  items: z.array(FeatureItemSchema).min(1),
  columns: z.number().int().positive().max(4).default(3),
  gap: nonnegative.default(24),
  accent: color.default('#2563eb'),
  tokens,
}).strict();

type FeatureGridProps = z.infer<typeof FeatureGridPropsSchema>;

const TimelineStepSchema = z.object({
  label: z.string().optional(),
  title: z.string().min(1),
  body: z.string().optional(),
  accent: color.optional(),
  tokens: VisualTokenListSchema.optional(),
}).strict();

const TimelineSectionPropsSchema = BoxSchema.extend({
  title: z.string().optional(),
  steps: z.array(TimelineStepSchema).min(1),
  orientation: z.enum(['vertical', 'horizontal']).default('vertical'),
  accent: color.default('#2563eb'),
  tokens,
}).strict();

type TimelineSectionProps = z.infer<typeof TimelineSectionPropsSchema>;

const TimelineStepPropsSchema = BoxSchema.extend({
  label: z.string().optional(),
  title: z.string().min(1),
  body: z.string().optional(),
  index: z.number().int().positive().optional(),
  accent: color.default('#2563eb'),
  tokens,
}).strict();

type TimelineStepProps = z.infer<typeof TimelineStepPropsSchema>;

const SectionHeaderPropsSchema = BoxSchema.extend({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  accent: color.default('#2563eb'),
  align: z.enum(['left', 'center']).default('left'),
  tokens,
}).strict();

type SectionHeaderProps = z.infer<typeof SectionHeaderPropsSchema>;

export const metricCardComponent: ComponentDefinition<MetricCardProps> = {
  name: 'metric-card',
  propsSchema: MetricCardPropsSchema,
  expand: ({ props, id }) => metricCardElements(props, id.forRole.bind(id)),
};

export const twoColumnComponent: ComponentDefinition<TwoColumnProps> = {
  name: 'two-column',
  propsSchema: TwoColumnPropsSchema,
  expand: (context) => twoColumnElements(context),
};

export const featureGridComponent: ComponentDefinition<FeatureGridProps> = {
  name: 'feature-grid',
  propsSchema: FeatureGridPropsSchema,
  expand: ({ props, id }) => featureGridElements(props, id.forRole.bind(id)),
};

export const timelineSectionComponent: ComponentDefinition<TimelineSectionProps> = {
  name: 'timeline-section',
  propsSchema: TimelineSectionPropsSchema,
  expand: ({ props, id }) => timelineSectionElements(props, id.forRole.bind(id)),
};

export const timelineStepComponent: ComponentDefinition<TimelineStepProps> = {
  name: 'timeline-step',
  propsSchema: TimelineStepPropsSchema,
  expand: ({ props, id }) => timelineStepGroup(props, id.forRole.bind(id)),
};

export const sectionHeaderComponent: ComponentDefinition<SectionHeaderProps> = {
  name: 'section-header',
  propsSchema: SectionHeaderPropsSchema,
  expand: ({ props, id }) => sectionHeaderElements(props, id.forRole.bind(id)),
};

export function registerBuiltinComponents(registry: AuthoringRegistry = createAuthoringRegistry()): AuthoringRegistry {
  registry
    .register(metricCardComponent)
    .alias('stat-card', 'metric-card')
    .register(twoColumnComponent)
    .alias('split-section', 'two-column')
    .register(featureGridComponent)
    .register(timelineSectionComponent)
    .alias('timeline-sequence', 'timeline-section')
    .register(timelineStepComponent)
    .alias('timeline-item', 'timeline-step')
    .register(sectionHeaderComponent)
    .alias('hero', 'section-header');
  return registry;
}

export function createBuiltinAuthoringRegistry(): AuthoringRegistry {
  return registerBuiltinComponents(createAuthoringRegistry());
}

function metricCardElements(props: MetricCardProps, makeId: (role: string) => string): Element[] {
  const style = visualTokenRectStyle(props.tokens, props.accent, props.background);
  const card: GroupElement = {
    type: 'group',
    id: makeId('group'),
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    elements: [
      ...tokenBackdrop(props, makeId, props.tokens, props.accent),
      {
        type: 'rect',
        id: makeId('card-bg'),
        x: 0,
        y: 0,
        width: props.width,
        height: props.height,
        ...style,
      },
      {
        type: 'text',
        id: makeId('label'),
        x: 24,
        y: 20,
        width: props.width - 48,
        content: props.label,
        fontSize: 18,
        fontWeight: 'bold',
        color: props.accent,
        textRole: 'label',
        animation: visualTokenAnimation(props.tokens, 0),
      },
      {
        type: 'text',
        id: makeId('value'),
        x: 24,
        y: 52,
        width: props.width - 48,
        content: String(props.value),
        fontSize: 42,
        fontWeight: 'bold',
        color: '#111827',
        textRole: 'stat',
        animation: visualTokenAnimation(props.tokens, 1),
      },
      ...optionalText(props.caption, makeId('caption'), 24, props.height - 42, props.width - 48, 16, '#4b5563'),
      ...optionalBadge(props.delta ?? props.badge, makeId, props.width - 116, 22, props.accent, props.tokens),
    ],
  };
  return [card];
}

function twoColumnElements(context: ComponentExpandContext<TwoColumnProps>): Element[] {
  const { props, id } = context;
  const left = [
    ...optionalText(props.leftTitle, id.forRole('left-title'), 0, 0, props.width / 2, 18, '#111827'),
    ...context.expandSlot('left'),
  ];
  const right = [
    ...optionalText(props.rightTitle, id.forRole('right-title'), 0, 0, props.width / 2, 18, '#111827'),
    ...context.expandSlot('right'),
  ];
  const totalRatio = props.leftRatio + props.rightRatio;
  const innerWidth = props.width - props.gap;
  const leftWidth = innerWidth * (props.leftRatio / totalRatio);
  const rightWidth = innerWidth - leftWidth;
  const layout: LayoutElement = {
    type: 'layout',
    id: id.forRole('layout'),
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    layout: {
      mode: 'grid',
      columns: [leftWidth, rightWidth],
      rows: [props.height],
      gap: { column: props.gap, row: 0 },
      alignItems: props.alignItems,
      justifyItems: 'stretch',
    },
    elements: [
      slotGroup(id.forRole('left'), 0, leftWidth, props.height, left, { column: 0, row: 0 }),
      slotGroup(id.forRole('right'), 1, rightWidth, props.height, right, { column: 1, row: 0 }),
    ],
  };
  return [layout];
}

function featureGridElements(props: FeatureGridProps, makeId: (role: string) => string): Element[] {
  const rows = Math.ceil(props.items.length / props.columns);
  const columnWidth = (props.width - props.gap * (props.columns - 1)) / props.columns;
  const rowHeight = (props.height - props.gap * Math.max(rows - 1, 0)) / rows;
  const grid: LayoutElement = {
    type: 'layout',
    id: makeId('grid'),
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    layout: {
      mode: 'grid',
      columns: Array.from({ length: props.columns }, () => columnWidth),
      rows: Array.from({ length: rows }, () => rowHeight),
      gap: { column: props.gap, row: props.gap },
      alignItems: 'stretch',
      justifyItems: 'stretch',
    },
    elements: props.items.map((item, index) => featureCardGroup(
      item,
      makeId,
      columnWidth,
      rowHeight,
      props.accent,
      { column: index % props.columns, row: Math.floor(index / props.columns) },
      index,
      props.tokens,
    )),
  };
  return [grid];
}

function timelineSectionElements(props: TimelineSectionProps, makeId: (role: string) => string): Element[] {
  const vertical = props.orientation === 'vertical';
  const count = props.steps.length;
  const stepGap = 16;
  const stepWidth = vertical ? props.width - 40 : (props.width - stepGap * (count - 1)) / count;
  const stepHeight = vertical ? (props.height - stepGap * (count - 1)) / count : props.height - 36;
  const elements: Element[] = [
    ...optionalText(props.title, makeId('title'), 0, 0, props.width, 32, '#ffffff'),
    {
      type: 'line',
      id: makeId('connector'),
      x: vertical ? 16 : 0,
      y: vertical ? (props.title ? 52 : 0) : (props.title ? 66 : 14),
      x2: vertical ? 16 : props.width,
      y2: vertical ? props.height : (props.title ? 66 : 14),
      stroke: props.accent,
      strokeWidth: 3,
      opacity: 0.45,
    },
    ...props.steps.map((step, index) => timelineStepGroup({
      ...step,
      x: vertical ? 40 : index * (stepWidth + stepGap),
      y: (props.title ? 58 : 0) + (vertical ? index * (stepHeight + stepGap) : 36),
      width: stepWidth,
      height: stepHeight,
      index: index + 1,
      accent: step.accent ?? props.accent,
      tokens: step.tokens ?? props.tokens,
    }, (role) => makeId(`step-${index + 1}-${role}`))[0]),
  ];

  return [{
    type: 'group',
    id: makeId('timeline'),
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    elements,
  }];
}

function timelineStepGroup(props: TimelineStepProps, makeId: (role: string) => string): Element[] {
  const label = props.label ?? (props.index ? `Step ${props.index}` : undefined);
  const group: GroupElement = {
    type: 'group',
    id: makeId('group'),
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    elements: [
      ...tokenBackdrop(props, makeId, props.tokens, props.accent),
      {
        type: 'rect',
        id: makeId('card-bg'),
        x: 0,
        y: 0,
        width: props.width,
        height: props.height,
        ...visualTokenRectStyle(props.tokens, props.accent),
      },
      ...optionalBadge(label, makeId, 16, 16, props.accent, props.tokens),
      {
        type: 'text',
        id: makeId('title'),
        x: 16,
        y: label ? 52 : 22,
        width: props.width - 32,
        content: props.title,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        textRole: 'heading',
        animation: visualTokenAnimation(props.tokens, 0),
      },
      ...optionalText(props.body, makeId('body'), 16, label ? 84 : 56, props.width - 32, 16, '#4b5563'),
    ],
  };
  return [group];
}

function sectionHeaderElements(props: SectionHeaderProps, makeId: (role: string) => string): Element[] {
  const centered = props.align === 'center';
  const titleY = props.eyebrow ? 36 : 4;
  const group: GroupElement = {
    type: 'group',
    id: makeId('header'),
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    elements: [
      ...tokenBackdrop(props, makeId, props.tokens, props.accent),
      ...optionalText(props.eyebrow, makeId('eyebrow'), 0, 0, props.width, 16, props.accent, centered ? 'center' : 'left'),
      {
        type: 'text',
        id: makeId('title'),
        x: 0,
        y: titleY,
        width: props.width,
        content: props.title,
        fontSize: 46,
        fontWeight: 'bold',
        color: '#111827',
        align: centered ? 'center' : 'left',
        textRole: 'heading',
        animation: visualTokenAnimation(props.tokens, 0),
      },
      ...optionalText(props.subtitle, makeId('subtitle'), centered ? props.width * 0.15 : 0, titleY + 64, centered ? props.width * 0.7 : props.width * 0.8, 20, '#4b5563', centered ? 'center' : 'left'),
    ],
  };
  return [group];
}

function featureCardGroup(
  item: z.infer<typeof FeatureItemSchema>,
  makeId: (role: string) => string,
  width: number,
  height: number,
  fallbackAccent: string,
  placement: { column: number; row: number },
  index: number,
  inheritedTokens: VisualToken[],
): GroupElement {
  const accent = item.accent ?? fallbackAccent;
  const itemTokens = item.tokens ?? inheritedTokens;
  return {
    type: 'group',
    id: makeId(`feature-${index + 1}`),
    x: 0,
    y: 0,
    width,
    height,
    placement,
    elements: [
      ...tokenBackdrop({ width, height }, makeId, itemTokens, accent),
      {
        type: 'rect',
        id: makeId(`feature-${index + 1}-bg`),
        x: 0,
        y: 0,
        width,
        height,
        ...visualTokenRectStyle(itemTokens, accent),
      },
      ...optionalText(item.eyebrow, makeId(`feature-${index + 1}-eyebrow`), 20, 18, width - 40, 14, accent),
      {
        type: 'text',
        id: makeId(`feature-${index + 1}-title`),
        x: 20,
        y: item.eyebrow ? 48 : 24,
        width: width - 40,
        content: item.title,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        textRole: 'heading',
        animation: visualTokenAnimation(itemTokens, index),
      },
      {
        type: 'text',
        id: makeId(`feature-${index + 1}-body`),
        x: 20,
        y: item.eyebrow ? 84 : 62,
        width: width - 40,
        content: item.body,
        fontSize: 16,
        color: '#4b5563',
        lineHeight: 1.25,
        textRole: 'body',
      },
    ],
  };
}

function slotGroup(
  id: string,
  column: number,
  width: number,
  height: number,
  elements: Element[],
  placement: { column: number; row: number },
): GroupElement {
  return {
    type: 'group',
    id,
    x: 0,
    y: 0,
    width,
    height,
    placement,
    elements: elements.length > 0 ? elements : [{
      type: 'text',
      id: `${id}__empty`,
      x: 0,
      y: 0,
      width,
      content: column === 0 ? 'Left content' : 'Right content',
      fontSize: 18,
      color: '#9ca3af',
    }],
  };
}

function tokenBackdrop(
  box: { width: number; height: number },
  makeId: (role: string) => string,
  tokenList: VisualToken[] = [],
  accent = '#2563eb',
): Element[] {
  const elements: Element[] = [];
  if (tokenList.includes('shadow')) {
    elements.push({
      type: 'rect',
      id: makeId('shadow'),
      x: 8,
      y: 10,
      width: box.width,
      height: box.height,
      fill: '#111827',
      opacity: 0.12,
      radius: 24,
    });
  }
  if (tokenList.includes('spotlight')) {
    elements.push({
      type: 'circle',
      id: makeId('spotlight'),
      x: box.width - 30,
      y: 28,
      radius: Math.min(box.width, box.height) * 0.32,
      fill: accent,
      opacity: 0.14,
    });
  }
  return elements;
}

function optionalBadge(
  text: string | undefined,
  makeId: (role: string) => string,
  x: number,
  y: number,
  accent: string,
  tokenList: VisualToken[] = [],
): Element[] {
  if (!text) return [];
  const width = Math.max(72, text.length * 8 + 24);
  return [
    {
      type: 'rect',
      id: makeId('badge-bg'),
      x,
      y,
      width,
      height: 28,
      fill: tokenList.includes('badge') || tokenList.length === 0 ? accent : '#eef2ff',
      opacity: tokenList.includes('badge') || tokenList.length === 0 ? 0.95 : 1,
      radius: 999,
    },
    {
      type: 'text',
      id: makeId('badge-text'),
      x: x + 12,
      y: y + 6,
      width: width - 24,
      content: text,
      fontSize: 13,
      fontWeight: 'bold',
      color: tokenList.includes('badge') || tokenList.length === 0 ? '#ffffff' : accent,
      align: 'center',
    },
  ];
}

function optionalText(
  text: string | undefined,
  id: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  colorValue: string,
  align: 'left' | 'center' | 'right' = 'left',
): Element[] {
  if (!text) return [];
  return [{
    type: 'text',
    id,
    x,
    y,
    width,
    content: text,
    fontSize,
    color: colorValue,
    align,
    textRole: 'body',
  }];
}
