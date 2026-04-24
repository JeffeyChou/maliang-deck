export type {
  AuthoringDeckInput,
  AuthoringNode,
  AuthoringRegistryLike,
  AuthoringSlideInput,
  AuthoringSourceMap,
  AuthoringSourceMapEntry,
  CompileAuthoringDeckOptions,
  CompileAuthoringDeckResult,
  ComponentDefinition,
  ComponentExpandContext,
  ComponentInvocation,
  ComponentName,
  IdFactory,
  RegisteredComponent,
  VisualToken,
} from './types.js';

export {
  AuthoringDeckInputSchema,
  AuthoringNodeSchema,
  AuthoringSlideInputSchema,
  ComponentInvocationSchema,
  VisualTokenListSchema,
  VisualTokenSchema,
} from './schemas.js';

export { compileAuthoringDeck } from './compiler.js';
export { createAuthoringDiagnostic, diagnosticsFromZodError, joinPath } from './diagnostics.js';
export { VISUAL_TOKENS, visualTokenAnimation, visualTokenRectStyle } from './effects.js';
export { createDeterministicAllocator, createScopedIdFactory, invocationSeed, slugId } from './id.js';
export { AuthoringRegistry, createAuthoringRegistry } from './registry.js';
export { addSourceMapEntry, collectElementIds, createAuthoringSourceMap } from './source-map.js';
export { createBuiltinAuthoringRegistry, registerBuiltinComponents } from './builtins/index.js';
