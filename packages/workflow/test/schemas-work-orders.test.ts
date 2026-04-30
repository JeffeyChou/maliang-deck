import { mkdir, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DeckPlanSchema,
  GenerationWorkOrderSchema,
  ProjectManifestSchema,
  RequirementsSchema,
} from '../src/schemas.js';
import {
  assertDisjointSlideDslWriteScopes,
  assertWorkOrderOutputsExist,
  createGenerationWorkOrder,
  markWorkOrderStatus,
} from '../src/work-orders.js';

describe('workflow schemas', () => {
  it('accepts complete requirements and rejects empty topics or unsupported output formats', () => {
    const valid = RequirementsSchema.parse({
      topic: 'Synthetic report',
      goal: 'Create a concise deck',
      audience: 'Leadership',
      themeDirection: 'Executive calm',
      language: 'en',
      durationMinutes: 8,
      outputFormats: ['html', 'pdf', 'pptx'],
      speakerNotes: true,
      mandatoryContent: ['retention'],
      forbiddenContent: ['private names'],
    });
    expect(valid.speakerNotes).toBe(true);

    expect(RequirementsSchema.safeParse({ ...valid, topic: '' }).success).toBe(false);
    expect(RequirementsSchema.safeParse({ ...valid, outputFormats: ['docx'] }).success).toBe(false);
    expect(RequirementsSchema.safeParse({ ...valid, slideCount: undefined, durationMinutes: undefined }).success).toBe(false);
  });

  it('validates manifest source contracts and canonical artifact fields', () => {
    const manifest = ProjectManifestSchema.parse({
      id: 'manifest-1',
      slug: 'manifest-demo',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stage: 'initialized',
      sources: [{ id: 'source-url', kind: 'remote-url', url: 'https://example.test/report.pdf' }],
      outputFormats: ['html'],
      artifacts: {
        requirements: 'requirements.md',
        mineruTasks: 'extraction/mineru/tasks.json',
        mineruRaw: 'extraction/mineru/raw',
        doclingTasks: 'extraction/docling/tasks.json',
        doclingRaw: 'extraction/docling/raw',
        materials: 'extraction/normalized/materials.json',
        blocks: 'extraction/normalized/blocks.json',
        assets: 'extraction/normalized/assets.json',
        sourceSummary: 'extraction/normalized/source-summary.md',
        outlineDraft: 'planning/outline-draft.md',
        outlineApproval: 'planning/outline-approved.md',
        outlineApprovalMetadata: 'planning/outline-approval.json',
        planningTasks: 'planning/tasks.json',
        deckPlan: 'planning/deck-plan.json',
        dslTasks: 'dsl/tasks.json',
        slideSlices: 'dsl/slides',
        deck: 'dsl/deck.json',
        validationReport: 'dsl/validation-report.json',
        html: 'render/html/index.html',
        exportReport: 'exports/export-report.json',
      },
    });
    expect(manifest.sources[0]?.status).toBe('pending');
    expect(ProjectManifestSchema.safeParse({ ...manifest, sources: [{ id: 'bad', kind: 'remote-url' }] }).success).toBe(false);
  });

  it('rejects duplicate deck-plan slide ids while preserving animation and notes intent', () => {
    const deckPlan = DeckPlanSchema.parse({
      slides: [
        {
          id: 'slide-1',
          title: 'Executive summary',
          contentClaims: [{ claim: 'Retention improved.', sourceBlockIds: ['block-1'] }],
          candidateAssetIds: ['asset-1'],
          layoutIntent: 'headline plus chart',
          animationIntent: { steps: ['headline', 'chart'] },
          speakerNotesIntent: 'Explain synthetic fixture data.',
          outputConstraints: ['html', 'pptx'],
        },
      ],
    });
    expect(deckPlan.slides[0]?.animationIntent).toEqual({ steps: ['headline', 'chart'] });
    expect(DeckPlanSchema.safeParse({ slides: [deckPlan.slides[0], deckPlan.slides[0]] }).success).toBe(false);
  });
});

describe('generation work orders', () => {
  it('requires explicit artifact inputs, outputs, constraints, source refs, and write scope without provider credentials', () => {
    const order = createGenerationWorkOrder({
      id: 'wo-slide-1',
      type: 'slide-dsl',
      inputArtifacts: ['planning/deck-plan.json', 'extraction/normalized/blocks.json'],
      outputArtifacts: ['dsl/slides/slide-1.json'],
      constraints: ['Preserve DSL as single source of truth', 'Do not call hidden provider APIs'],
      sourceRefs: ['block-1', 'asset-1'],
      writeScope: ['dsl/slides/slide-1.json'],
      assignedTo: 'agent',
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(order.status).toBe('pending');
    expect(order.writeScope).toEqual(['dsl/slides/slide-1.json']);
    expect(GenerationWorkOrderSchema.safeParse({ ...order, providerApiKey: 'secret' }).success).toBe(false);
    expect(() => createGenerationWorkOrder({ ...order, id: 'escape', writeScope: ['../outside.json'] })).toThrow(/inside project/);
  });

  it('rejects overlapping slide DSL write scopes but allows outline and deck-plan scopes to coexist', () => {
    const slideOne = createGenerationWorkOrder({
      id: 'slide-1',
      type: 'slide-dsl',
      inputArtifacts: ['planning/deck-plan.json'],
      outputArtifacts: ['dsl/slides/slide-1.json'],
      constraints: ['valid DSL'],
      writeScope: ['dsl/slides/slide-1.json'],
    });
    const slideOneOverlap = createGenerationWorkOrder({
      id: 'slide-1-overlap',
      type: 'slide-dsl',
      inputArtifacts: ['planning/deck-plan.json'],
      outputArtifacts: ['dsl/slides/slide-1.json'],
      constraints: ['valid DSL'],
      writeScope: ['dsl/slides'],
    });
    const outline = createGenerationWorkOrder({
      id: 'outline',
      type: 'outline',
      inputArtifacts: ['requirements.md'],
      outputArtifacts: ['planning/outline-draft.md'],
      constraints: ['agent-authored outline only'],
      writeScope: ['planning/outline-draft.md'],
    });

    expect(() => assertDisjointSlideDslWriteScopes([slideOne, outline])).not.toThrow();
    expect(() => assertDisjointSlideDslWriteScopes([slideOne, slideOneOverlap])).toThrow(/Overlapping slide-dsl write scopes/);
  });

  it('requires done work-order outputs to exist', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'maliang-deck-workflow-work-order-'));
    try {
      await mkdir(join(projectRoot, 'dsl/slides'), { recursive: true });
      const pending = createGenerationWorkOrder({
        id: 'slide-1',
        type: 'slide-dsl',
        inputArtifacts: ['planning/deck-plan.json'],
        outputArtifacts: ['dsl/slides/slide-1.json'],
        constraints: ['valid DSL'],
        writeScope: ['dsl/slides/slide-1.json'],
      });
      const completed = markWorkOrderStatus(pending, 'done', { now: new Date('2026-01-01T00:00:00.000Z') });
      expect(() => assertWorkOrderOutputsExist(projectRoot, completed)).toThrow(/missing output artifact/);
      await writeFile(join(projectRoot, 'dsl/slides/slide-1.json'), '{}');
      expect(() => assertWorkOrderOutputsExist(projectRoot, completed)).not.toThrow();
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
