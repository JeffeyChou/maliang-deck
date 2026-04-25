import type { Deck, Element, Slide, MaliangDeckDiagnostic } from '@maliang-deck/schema';
import type { z } from 'zod';

export type ComponentName = string;

export type VisualToken =
  | 'glass'
  | 'gradient'
  | 'spotlight'
  | 'neon'
  | 'shadow'
  | 'badge'
  | 'connector'
  | 'stagger';

export interface ComponentInvocation {
  kind: 'component';
  id?: string;
  component: ComponentName;
  props?: Record<string, unknown>;
  slots?: Record<string, AuthoringNode[]>;
}

export type AuthoringNode = Element | ComponentInvocation;

export interface AuthoringSlideInput extends Omit<Slide, 'elements'> {
  elements: AuthoringNode[];
}

export interface AuthoringDeckInput extends Omit<Deck, 'slides'> {
  slides: AuthoringSlideInput[];
}

export interface AuthoringSourceMapEntry {
  invocationId: string;
  component: ComponentName;
  path: string;
  generatedElementIds: string[];
  passthroughElementIds?: string[];
}

export interface AuthoringSourceMap {
  invocations: AuthoringSourceMapEntry[];
}

export interface IdFactory {
  forRole(role: string): string;
}

export interface ComponentExpandContext<P = unknown> {
  invocation: ComponentInvocation;
  props: P;
  path: string;
  id: IdFactory;
  expandNodes(nodes: AuthoringNode[], path: string): Element[];
  expandSlot(slotName: string): Element[];
}

export interface ComponentDefinition<P = unknown> {
  name: ComponentName;
  propsSchema: z.ZodType<P, z.ZodTypeDef, unknown>;
  expand(context: ComponentExpandContext<P>): Element[];
}

export interface RegisteredComponent<P = unknown> extends ComponentDefinition<P> {
  canonicalName: ComponentName;
}

export interface CompileAuthoringDeckOptions {
  registry?: AuthoringRegistryLike;
}

export interface AuthoringRegistryLike {
  resolve(name: ComponentName): RegisteredComponent | undefined;
}

export type CompileAuthoringDeckResult =
  | {
      success: true;
      deck: Deck;
      sourceMap: AuthoringSourceMap;
      diagnostics: MaliangDeckDiagnostic[];
    }
  | {
      success: false;
      sourceMap: AuthoringSourceMap;
      diagnostics: MaliangDeckDiagnostic[];
      deck?: Deck;
    };
