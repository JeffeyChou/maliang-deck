import type { TemplateActivationStatus } from '../templates/contracts.js';
import type { StyleDefinition } from './types.js';

type StyleRegistryMetadata = {
  source?: 'built-in' | 'template';
  activationStatus?: TemplateActivationStatus;
};

const registry = new Map<string, StyleDefinition>();
const metadata = new Map<string, StyleRegistryMetadata>();

export function registerStyle(style: StyleDefinition, meta: StyleRegistryMetadata = {}): void {
  registry.set(style.id, style);
  metadata.set(style.id, { source: meta.source ?? 'built-in', activationStatus: meta.activationStatus ?? 'approved' });
}

export function getStyle(id: string, options: { includeDrafts?: boolean } = {}): StyleDefinition | undefined {
  const style = registry.get(id);
  if (!style) return undefined;
  const meta = metadata.get(id);
  if (meta?.source === 'template' && meta.activationStatus !== 'approved' && !options.includeDrafts) return undefined;
  return style;
}

export function listStyles(options: { includeDrafts?: boolean } = {}): StyleDefinition[] {
  return Array.from(registry.values()).filter((style) => {
    const meta = metadata.get(style.id);
    return meta?.source !== 'template' || meta.activationStatus === 'approved' || Boolean(options.includeDrafts);
  });
}
