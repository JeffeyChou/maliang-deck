import { validateDeck, type Deck, type Element, type Slide, type MaliangDeckDiagnostic } from '@maliang-deck/schema';
import { AuthoringDeckInputSchema } from './schemas.js';
import { createAuthoringDiagnostic, diagnosticsFromZodError } from './diagnostics.js';
import { createDeterministicAllocator, createScopedIdFactory, invocationSeed } from './id.js';
import { createBuiltinAuthoringRegistry } from './builtins/index.js';
import { addSourceMapEntry, collectElementIds, createAuthoringSourceMap } from './source-map.js';
import type {
  AuthoringDeckInput,
  AuthoringNode,
  AuthoringRegistryLike,
  AuthoringSourceMap,
  CompileAuthoringDeckOptions,
  CompileAuthoringDeckResult,
  ComponentInvocation,
} from './types.js';

export function compileAuthoringDeck(input: unknown, options: CompileAuthoringDeckOptions = {}): CompileAuthoringDeckResult {
  const diagnostics: MaliangDeckDiagnostic[] = [];
  const sourceMap = createAuthoringSourceMap();
  const parsed = AuthoringDeckInputSchema.safeParse(input);

  if (!parsed.success) {
    diagnostics.push(...diagnosticsFromZodError('authoring.invalid-input', parsed.error, 'deck'));
    return { success: false, diagnostics, sourceMap };
  }

  const authoringDeck = parsed.data as AuthoringDeckInput;
  const registry = options.registry ?? createBuiltinAuthoringRegistry();
  const allocateId = createDeterministicAllocator(collectExistingIds(authoringDeck));
  const slides: Slide[] = authoringDeck.slides.map((slide: AuthoringDeckInput['slides'][number], slideIndex: number) => ({
    ...slide,
    elements: expandNodes(
      slide.elements,
      `slides.${slideIndex}.elements`,
      registry,
      diagnostics,
      sourceMap,
      allocateId,
    ),
  }));

  const deck: Deck = {
    meta: authoringDeck.meta,
    slides,
  };

  const validation = validateDeck(deck);
  if (!validation.success) {
    diagnostics.push(...validation.errors.map((error) => createAuthoringDiagnostic(
      'authoring.invalid-expanded-deck',
      error.message,
      `deck.${error.path.map(String).join('.')}`,
      { schemaPath: error.path },
    )));
    return { success: false, deck, diagnostics, sourceMap };
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    return { success: false, deck, diagnostics, sourceMap };
  }

  return { success: true, deck: validation.data, sourceMap, diagnostics };
}

function expandNodes(
  nodes: AuthoringNode[],
  path: string,
  registry: AuthoringRegistryLike,
  diagnostics: MaliangDeckDiagnostic[],
  sourceMap: AuthoringSourceMap,
  allocateId: (candidate: string) => string,
): Element[] {
  return nodes.flatMap((node, index) => {
    const nodePath = `${path}.${index}`;
    if (isComponentInvocation(node)) {
      return expandInvocation(node, nodePath, registry, diagnostics, sourceMap, allocateId);
    }
    return [node];
  });
}

function expandInvocation(
  invocation: ComponentInvocation,
  path: string,
  registry: AuthoringRegistryLike,
  diagnostics: MaliangDeckDiagnostic[],
  sourceMap: AuthoringSourceMap,
  allocateId: (candidate: string) => string,
): Element[] {
  const component = registry.resolve(invocation.component);
  const invocationId = invocationSeed(invocation.component, path, invocation.id);

  if (!component) {
    diagnostics.push(createAuthoringDiagnostic(
      'authoring.unknown-component',
      `Unknown authoring component "${invocation.component}".`,
      path,
      { invocationId, component: invocation.component },
    ));
    addSourceMapEntry(sourceMap, {
      invocationId,
      component: invocation.component,
      path,
      generatedElementIds: [],
    });
    return [];
  }

  const props = component.propsSchema.safeParse(invocation.props ?? {});
  if (!props.success) {
    diagnostics.push(...props.error.issues.map((issue) => createAuthoringDiagnostic(
      'authoring.invalid-props',
      issue.message,
      `${path}.props${issue.path.length > 0 ? `.${issue.path.map(String).join('.')}` : ''}`,
      {
        invocationId,
        component: component.canonicalName,
        requestedComponent: invocation.component,
        zodCode: issue.code,
      },
    )));
    addSourceMapEntry(sourceMap, {
      invocationId,
      component: component.canonicalName,
      path,
      generatedElementIds: [],
    });
    return [];
  }

  let elements: Element[] = [];
  const passthroughElementIds = new Set<string>();
  const expandPassthroughNodes = (nodes: AuthoringNode[], childPath: string): Element[] => {
    const expanded = expandNodes(nodes, childPath, registry, diagnostics, sourceMap, allocateId);
    collectElementIds(expanded).forEach((id) => passthroughElementIds.add(id));
    return expanded;
  };

  try {
    const id = createScopedIdFactory(invocationId, allocateId);
    elements = component.expand({
      invocation,
      props: props.data,
      path,
      id,
      expandNodes: expandPassthroughNodes,
      expandSlot: (slotName) => expandPassthroughNodes(
        invocation.slots?.[slotName] ?? [],
        `${path}.slots.${slotName}`,
      ),
    });
  } catch (error) {
    diagnostics.push(createAuthoringDiagnostic(
      'authoring.expansion-failed',
      error instanceof Error ? error.message : `Component "${component.canonicalName}" expansion failed.`,
      path,
      { invocationId, component: component.canonicalName },
    ));
    elements = [];
  }

  const emittedElementIds = collectElementIds(elements);
  const generatedElementIds = emittedElementIds.filter((id) => !passthroughElementIds.has(id));
  addSourceMapEntry(sourceMap, {
    invocationId,
    component: component.canonicalName,
    path,
    generatedElementIds,
    ...(passthroughElementIds.size > 0 ? { passthroughElementIds: emittedElementIds.filter((id) => passthroughElementIds.has(id)) } : {}),
  });

  return elements;
}

function isComponentInvocation(node: AuthoringNode): node is ComponentInvocation {
  return typeof node === 'object' && node != null && 'kind' in node && node.kind === 'component';
}

function collectExistingIds(deck: AuthoringDeckInput): string[] {
  return deck.slides.flatMap((slide) => collectExistingNodeIds(slide.elements));
}

function collectExistingNodeIds(nodes: AuthoringNode[]): string[] {
  return nodes.flatMap((node) => {
    if (isComponentInvocation(node)) {
      return Object.values(node.slots ?? {}).flatMap((slotNodes) => collectExistingNodeIds(slotNodes));
    }
    return collectElementIds([node]);
  });
}
