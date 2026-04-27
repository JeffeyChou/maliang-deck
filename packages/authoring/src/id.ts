import type { IdFactory } from './types.js';

export function slugId(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'node';
}

export function invocationSeed(component: string, path: string, invocationId?: string): string {
  return slugId(invocationId ? invocationId : `${component}-${path}`);
}

export function createScopedIdFactory(scopeId: string, allocate: (candidate: string) => string): IdFactory {
  return {
    forRole(role: string) {
      return allocate(`${slugId(scopeId)}__${slugId(role)}`);
    },
  };
}

export function createDeterministicAllocator(initialIds: Iterable<string> = []): (candidate: string) => string {
  const used = new Set(initialIds);
  return (candidate: string) => {
    const base = slugId(candidate);
    if (!used.has(base)) {
      used.add(base);
      return base;
    }
    let suffix = 2;
    while (used.has(`${base}__${suffix}`)) suffix += 1;
    const next = `${base}__${suffix}`;
    used.add(next);
    return next;
  };
}
