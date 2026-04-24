import { z } from 'zod';
import type { VisualToken } from './types.js';

export const VISUAL_TOKENS = [
  'glass',
  'gradient',
  'spotlight',
  'neon',
  'shadow',
  'badge',
  'connector',
  'stagger',
] as const satisfies readonly VisualToken[];

export const VisualTokenSchema = z.enum(VISUAL_TOKENS);
export const VisualTokenListSchema = z.array(VisualTokenSchema);


export interface VisualTokenRectStyle {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
}

export interface VisualTokenAnimation {
  enter: string;
  duration: number;
  delay: number;
  easing: string;
}

export function visualTokenRectStyle(tokens: readonly VisualToken[] = [], accent = '#2563eb', fill = '#ffffff'): VisualTokenRectStyle {
  const set = new Set(tokens);
  return {
    fill: set.has('gradient') ? accent : set.has('neon') ? '#020617' : fill,
    stroke: set.has('glass') || set.has('neon') ? accent : '#e5e7eb',
    strokeWidth: set.has('neon') ? 2 : 1,
    radius: set.has('badge') ? 18 : 24,
    opacity: set.has('glass') ? 0.82 : undefined,
  };
}

export function visualTokenAnimation(tokens: readonly VisualToken[] = [], index = 0): VisualTokenAnimation | undefined {
  if (!tokens.includes('stagger')) return undefined;
  return {
    enter: 'fade-up',
    duration: 360,
    delay: index * 90,
    easing: 'ease-out',
  };
}
