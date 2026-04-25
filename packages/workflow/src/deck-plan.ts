import { join } from 'node:path';
import { loadProject, projectRoot, saveProject } from './project.js';
import { pathExists, readJson, writeJson } from './fs-utils.js';
import { DeckPlanSchema, type DeckPlan, type ExtractedAsset, type ExtractedBlock, type GenerationWorkOrder, parseJsonWithSchema } from './schemas.js';
import { assertOutlineApproved } from './outline.js';
import { enrichDeckPlanWorkOrder } from './guidance/work-order-enricher.js';
import { registerConfiguredTemplatePacksForProject } from './templates/registry.js';

export function createDeckPlanWorkOrder(slugOrPath: string, mode: 'agent' | 'manual' = 'agent'): GenerationWorkOrder {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const templateRegistration = registerConfiguredTemplatePacksForProject(root);
  assertOutlineApproved(root);
  const order: GenerationWorkOrder = {
    id: `deck-plan-${manifest.slug}`,
    projectSlug: manifest.slug,
    kind: 'deck-plan',
    inputArtifacts: ['planning/outline-approved.md', 'extraction/normalized/blocks.json', 'extraction/normalized/assets.json'],
    outputArtifacts: ['planning/deck-plan.json'],
    constraints: [
      'Slide IDs must be unique.',
      'Every sourceBlockRef and candidateAssetRef must reference normalized artifacts.',
      'Fill speakerNotesIntent for each slide with a concrete description of the spoken explanation beats, not a generic summary.',
      'Speaker notes intent must support sentence-by-sentence presenter notes: derivation steps, transitions, audience prompts, caveats, and reveal timing where relevant.',
      mode === 'agent' ? 'Active Codex/OMX agent authors planning/deck-plan.json.' : 'Manual lane authors planning/deck-plan.json.',
    ],
    sourceRefs: manifest.sources.map((source) => source.id),
    writeScope: ['planning/deck-plan.json'],
    status: 'pending',
  };
  const styleId = manifest.styleId ?? templateRegistration.styleId;
  const enriched = styleId ? enrichDeckPlanWorkOrder(order, styleId, { includeDrafts: templateRegistration.includeDraftTemplatePacks }) : order;
  const tasksPath = join(root, 'planning', 'tasks.json');
  const current = pathExists(tasksPath) ? readJson(tasksPath) as { tasks?: GenerationWorkOrder[] } : {};
  const tasks = (current.tasks ?? []).filter((task) => task.kind !== 'deck-plan');
  writeJson(tasksPath, { tasks: [...tasks, enriched] });
  return enriched;
}

export function validateDeckPlan(slugOrPath: string): DeckPlan {
  const root = projectRoot(slugOrPath);
  const plan = parseJsonWithSchema(DeckPlanSchema, readJson(join(root, 'planning', 'deck-plan.json')), 'deck plan') as DeckPlan;
  const blocks = pathExists(join(root, 'extraction', 'normalized', 'blocks.json'))
    ? readJson(join(root, 'extraction', 'normalized', 'blocks.json')) as ExtractedBlock[]
    : [];
  const assets = pathExists(join(root, 'extraction', 'normalized', 'assets.json'))
    ? readJson(join(root, 'extraction', 'normalized', 'assets.json')) as ExtractedAsset[]
    : [];
  const blockIds = new Set(blocks.map((block) => block.id));
  const assetIds = new Set(assets.map((asset) => asset.id));
  const slideIds = new Set<string>();
  for (const slide of plan.slides) {
    if (slideIds.has(slide.id)) throw new Error(`Duplicate slide id in deck plan: ${slide.id}`);
    slideIds.add(slide.id);
    for (const ref of slide.sourceBlockRefs) {
      if (!blockIds.has(ref)) throw new Error(`Deck plan slide ${slide.id} references unknown source block ${ref}`);
    }
    for (const ref of slide.candidateAssetRefs) {
      if (!assetIds.has(ref)) throw new Error(`Deck plan slide ${slide.id} references unknown asset ${ref}`);
    }
  }
  const manifest = loadProject(root);
  saveProject(root, manifest, 'deck-planned');
  return plan;
}
