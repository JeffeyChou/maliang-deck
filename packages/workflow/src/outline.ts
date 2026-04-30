import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadProject, projectRoot, saveProject } from './project.js';
import { pathExists, readJson, writeJson, writeText } from './fs-utils.js';
import type { GenerationWorkOrder } from './schemas.js';
import { enrichOutlineWorkOrder } from './guidance/work-order-enricher.js';
import { registerConfiguredTemplatePacksForProject } from './templates/registry.js';

export type OutlineApprovalOptions = {
  reviewedBy: string;
  approvalNote?: string;
  approvedAt?: Date;
};

function requireHumanReviewer(input: string): string {
  const reviewer = input.trim();
  if (!reviewer) throw new Error('Outline approval requires --reviewed-by with the human reviewer name.');
  if (/^(agent|codex|assistant|ai|llm|omx)$/iu.test(reviewer)) {
    throw new Error('Outline approval must identify the human reviewer, not an agent.');
  }
  return reviewer;
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

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
      'Do not run workflow approve-outline yourself. Present planning/outline-draft.md to the user and wait for explicit approval or revision requests.',
      'The approved outline must include title/thesis, audience, style, duration, per-slide outline, source coverage, omissions, and outputs.',
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

export function approveOutline(slugOrPath: string, options: OutlineApprovalOptions): string {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const draft = join(root, 'planning', 'outline-draft.md');
  const approved = join(root, 'planning', 'outline-approved.md');
  if (!pathExists(draft)) throw new Error(`Cannot approve missing outline draft: ${draft}`);
  const reviewedBy = requireHumanReviewer(options.reviewedBy);
  copyFileSync(draft, approved);
  writeJson(join(root, 'planning', 'outline-approval.json'), {
    status: 'approved',
    reviewedBy,
    approvalNote: options.approvalNote,
    approvedAt: (options.approvedAt ?? new Date()).toISOString(),
    draftPath: 'planning/outline-draft.md',
    approvedPath: 'planning/outline-approved.md',
    draftSha256: sha256File(draft),
    approvalGate: 'human-review',
  });
  saveProject(root, manifest, 'outline-approved');
  return approved;
}

export function assertOutlineApproved(slugOrPath: string): void {
  const root = projectRoot(slugOrPath);
  const approved = join(root, 'planning', 'outline-approved.md');
  if (!pathExists(approved)) {
    throw new Error(`Outline approval gate is closed. Create ${approved} with workflow approve-outline before DSL generation.`);
  }
  const approvalMetadata = join(root, 'planning', 'outline-approval.json');
  if (!pathExists(approvalMetadata)) {
    throw new Error(`Outline approval metadata is missing. Run workflow approve-outline with --reviewed-by after human review: ${approvalMetadata}`);
  }
  const metadata = readJson(approvalMetadata) as Record<string, unknown>;
  if (metadata.status !== 'approved' || typeof metadata.reviewedBy !== 'string' || !metadata.reviewedBy.trim()) {
    throw new Error(`Invalid outline approval metadata: ${approvalMetadata}`);
  }
}
