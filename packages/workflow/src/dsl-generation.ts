import { join } from 'node:path';
import { loadProject, projectRoot, saveProject } from './project.js';
import { readJson, pathExists, writeJson } from './fs-utils.js';
import type { GenerationWorkOrder, RequirementSet } from './schemas.js';
import { assertOutlineApproved } from './outline.js';
import { validateDeckPlan } from './deck-plan.js';
import { enrichDslWorkOrder } from './guidance/work-order-enricher.js';
import { registerConfiguredTemplatePacksForProject } from './templates/registry.js';

export function createDslWorkOrders(slugOrPath: string, options: { mode?: 'agent' | 'manual'; parallel?: boolean } = {}): GenerationWorkOrder[] {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const templateRegistration = registerConfiguredTemplatePacksForProject(root);
  assertOutlineApproved(root);
  const deckPlan = validateDeckPlan(root);
  const lockedTokens = deckPlan.deckDesign?.lockedTokens;
  const styleId = manifest.styleId ?? templateRegistration.styleId;

  // Check if speaker notes are enabled (default: true)
  const reqPath = join(root, 'requirements.md');
  let speakerNotesEnabled = true;
  const reqJsonPath = join(root, 'requirements.json');
  if (pathExists(reqJsonPath)) {
    const req = readJson(reqJsonPath) as Partial<RequirementSet>;
    speakerNotesEnabled = req.speakerNotes !== false;
  }

  const orders = deckPlan.slides.map((slide) => {
    const notesConstraints: string[] = [];
    if (speakerNotesEnabled) {
      const intent = slide.speakerNotesIntent && slide.speakerNotesIntent !== 'TBD'
        ? ` Intent: ${slide.speakerNotesIntent}`
        : '';
      notesConstraints.push(
        `Include a "notes" field with sentence-by-sentence speaker notes for presenter mode.${intent}`,
        'Speaker notes must be a presenter script, not a slide summary: use one numbered sentence per spoken beat, normally at least 4 sentences.',
        'Speaker notes should cover what to say, transitions, derivation steps, audience prompts, caveats, and answer-reveal timing when relevant.',
      );
    }

    const baseOrder: GenerationWorkOrder = {
      id: `slide-dsl-${slide.id}`,
      projectSlug: manifest.slug,
      kind: 'slide-dsl',
      inputArtifacts: ['planning/deck-plan.json', 'planning/outline-approved.md', 'extraction/normalized/blocks.json', 'extraction/normalized/assets.json'],
      outputArtifacts: [`dsl/slides/${slide.id}.json`],
      constraints: [
        'Write only the declared slide JSON output path.',
        'Generated slide JSON must satisfy @maliang-deck/schema SlideSchema.',
        'Do not call an undeclared external LLM provider from workflow code.',
        options.mode === 'manual' ? 'Manual lane authors this slide DSL slice.' : 'Active Codex/OMX agent authors this slide DSL slice.',
        ...notesConstraints,
      ],
      sourceRefs: [...slide.sourceBlockRefs, ...slide.candidateAssetRefs],
      writeScope: [`dsl/slides/${slide.id}.json`],
      status: 'open',
    };

    if (styleId && slide.design) {
      return enrichDslWorkOrder(
        baseOrder,
        styleId,
        slide.design,
        lockedTokens,
        slide.speakerNotesIntent,
        { includeDrafts: templateRegistration.includeDraftTemplatePacks },
      );
    }
    return baseOrder;
  });

  const scopes = new Set<string>();
  for (const order of orders) {
    for (const scope of order.writeScope) {
      if (scopes.has(scope)) throw new Error(`Overlapping DSL work-order write scope: ${scope}`);
      scopes.add(scope);
    }
    writeJson(join(root, 'dsl', 'work-orders', `${order.id}.json`), order);
  }
  writeJson(join(root, 'dsl', 'work-orders', 'index.json'), { parallel: options.parallel ?? false, orders: orders.map((order) => order.id) });
  saveProject(root, manifest, 'dsl-work-ordered');
  return orders;
}
