import { DeckMetaSchema, ElementSchema } from '@vslidev/schema';
import { z } from 'zod';
import { VisualTokenSchema, VisualTokenListSchema } from './effects.js';
import type { AuthoringDeckInput, AuthoringNode, AuthoringSlideInput, ComponentInvocation } from './types.js';

export const ComponentInvocationSchema: z.ZodType<ComponentInvocation> = z.lazy(() => z.object({
  kind: z.literal('component'),
  id: z.string().min(1).optional(),
  component: z.string().min(1),
  props: z.record(z.unknown()).optional(),
  slots: z.record(z.array(AuthoringNodeSchema)).optional(),
}));

export const AuthoringNodeSchema: z.ZodType<AuthoringNode> = z.lazy(() => z.union([
  ComponentInvocationSchema,
  ElementSchema,
]));

export const AuthoringSlideInputSchema: z.ZodType<AuthoringSlideInput> = z.object({
  id: z.string().min(1),
  background: z.string().optional(),
  layout: z.string().optional(),
  elements: z.array(AuthoringNodeSchema),
  notes: z.string().optional(),
  fx: z.array(z.string()).optional(),
});

export const AuthoringDeckInputSchema: z.ZodType<AuthoringDeckInput> = z.object({
  meta: DeckMetaSchema,
  slides: z.array(AuthoringSlideInputSchema).min(1),
});

export { VisualTokenSchema, VisualTokenListSchema };
