import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadProject, projectRoot, saveProject } from './project.js';
import { pathExists, writeJson, writeText } from './fs-utils.js';
import type { GenerationWorkOrder } from './schemas.js';
import { enrichOutlineWorkOrder } from './guidance/work-order-enricher.js';
import { registerConfiguredTemplatePacksForProject } from './templates/registry.js';

export function createOutlineWorkOrder(slugOrPath: string, mode: 'agent' | 'manual' = 'agent'): GenerationWorkOrder {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const templateRegistration = registerConfiguredTemplatePacksForProject(root);
  const order: GenerationWorkOrder = {
    id: `outline-${manifest.slug}`,
    projectSlug: manifest.slug,
    kind: 'outline',
    inputArtifacts: ['requirements.md', 'extraction/normalized/source-summary.md', 'extraction/normalized/blocks.json', 'extraction/normalized/assets.json'],
    outputArtifacts: ['planning/outline-draft.md'],
    constraints: [
      'Do not generate DSL before planning/outline-approved.md exists.',
      'Use normalized source block and asset references for traceability.',
      mode === 'agent' ? 'Active Codex/OMX agent authors the outline artifact.' : 'Human/manual lane fills the outline artifact.',
    ],
    sourceRefs: manifest.sources.map((source) => source.id),
    writeScope: ['planning/outline-draft.md'],
    status: 'pending',
  };
  const styleId = manifest.styleId ?? templateRegistration.styleId;
  const enriched = styleId ? enrichOutlineWorkOrder(order, styleId, { includeDrafts: templateRegistration.includeDraftTemplatePacks }) : order;
  writeJson(join(root, 'planning', 'tasks.json'), { tasks: [enriched] });
  if (!pathExists(join(root, 'planning', 'outline-draft.md'))) {
    writeText(join(root, 'planning', 'outline-draft.md'), `# Outline Draft: ${manifest.slug}\n\n<!-- Fill this artifact from requirements and normalized source materials. -->\n\n## Slide outline\n\n1. TBD\n`);
  }
  saveProject(root, manifest, 'outline-drafted');
  return enriched;
}

export function approveOutline(slugOrPath: string): string {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const draft = join(root, 'planning', 'outline-draft.md');
  const approved = join(root, 'planning', 'outline-approved.md');
  if (!pathExists(draft)) throw new Error(`Cannot approve missing outline draft: ${draft}`);
  copyFileSync(draft, approved);
  saveProject(root, manifest, 'outline-approved');
  return approved;
}

export function assertOutlineApproved(slugOrPath: string): void {
  const root = projectRoot(slugOrPath);
  const approved = join(root, 'planning', 'outline-approved.md');
  if (!pathExists(approved)) {
    throw new Error(`Outline approval gate is closed. Create ${approved} with workflow approve-outline before DSL generation.`);
  }
}
