import type { Element } from '@maliang-deck/schema';
import type { AuthoringSourceMap, AuthoringSourceMapEntry } from './types.js';

export function createAuthoringSourceMap(): AuthoringSourceMap {
  return { invocations: [] };
}

export function addSourceMapEntry(sourceMap: AuthoringSourceMap, entry: AuthoringSourceMapEntry): void {
  sourceMap.invocations.push({
    invocationId: entry.invocationId,
    component: entry.component,
    path: entry.path,
    generatedElementIds: [...entry.generatedElementIds],
    ...(entry.passthroughElementIds ? { passthroughElementIds: [...entry.passthroughElementIds] } : {}),
  });
}

export function collectElementIds(elements: Element[]): string[] {
  const ids: string[] = [];
  const visit = (element: Element): void => {
    ids.push(element.id);
    if (element.type === 'group' || element.type === 'layout') {
      element.elements.forEach(visit);
    }
  };
  elements.forEach(visit);
  return ids;
}
