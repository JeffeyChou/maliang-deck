import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  createProject,
  approveOutline,
  createDslWorkOrders,
  validateDeckPlan,
} from '../../packages/workflow/src/index.js';
import {
  registerStyle,
  getStyle,
  enrichOutlineWorkOrder,
  enrichDeckPlanWorkOrder,
  enrichDslWorkOrder,
  validateConsistency,
  lintDeck,
  builtInRules,
  academicStyle,
  consultingStyle,
} from '../../packages/workflow/src/guidance/index.js';
import { createOutlineWorkOrder } from '../../packages/workflow/src/outline.js';
import { createDeckPlanWorkOrder } from '../../packages/workflow/src/deck-plan.js';
import { writeJson } from '../../packages/workflow/src/fs-utils.js';
import { assembleDeck } from '../../packages/workflow/src/assemble.js';
import { readJson } from '../../packages/workflow/src/fs-utils.js';

// Ensure built-in styles are registered for every test
registerStyle(academicStyle);
registerStyle(consultingStyle);

function tempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-guidance-test-'));
  process.chdir(dir);
  return dir;
}

function writeNormalizedBlocks(root: string, blocks: object[], assets: object[] = []): void {
  mkdirSync(join(root, 'extraction', 'normalized'), { recursive: true });
  writeJson(join(root, 'extraction', 'normalized', 'blocks.json'), blocks);
  writeJson(join(root, 'extraction', 'normalized', 'assets.json'), assets);
}

function writeOutlineApproved(root: string): void {
  mkdirSync(join(root, 'planning'), { recursive: true });
  writeFileSync(join(root, 'planning', 'outline-draft.md'), '# Outline\n\n## Introduction\n\n## Methods\n');
  approveOutline(root, { reviewedBy: 'Test Reviewer', approvedAt: new Date('2026-01-01T00:00:00.000Z') });
}

const sampleBlocks = [
  { id: 'block-1', materialId: 'm1', kind: 'title', text: 'Introduction', sourceOrder: 0, assetRefs: [] },
  { id: 'block-2', materialId: 'm1', kind: 'text', text: 'Methods and results summary.', sourceOrder: 1, assetRefs: [] },
  { id: 'block-3', materialId: 'm1', kind: 'text', text: 'Conclusion paragraph.', sourceOrder: 2, assetRefs: [] },
];

const sampleAssets: object[] = [];

// Minimal slide DSL for assembly tests
function writeSlice(root: string, slideId: string, y: number = 40): void {
  mkdirSync(join(root, 'dsl', 'slides'), { recursive: true });
  writeJson(join(root, 'dsl', 'slides', `${slideId}.json`), {
    id: slideId,
    elements: [
      { type: 'text', id: `${slideId}-title`, x: 80, y, width: 1120, height: 60, fontSize: 36, content: 'Slide Title' },
      { type: 'text', id: `${slideId}-body`, x: 80, y: y + 80, width: 1120, height: 400, fontSize: 20, content: 'Body content.' },
    ],
  });
}

// ── Style Registry ──────────────────────────────────────────────────────────

describe('style registry', () => {
  it('registers and retrieves academic and consulting styles', () => {
    expect(getStyle('academic')).toBeDefined();
    expect(getStyle('consulting')).toBeDefined();
    expect(getStyle('academic')!.recommendedTheme).toBe('minimal-white');
    expect(getStyle('consulting')!.recommendedTheme).toBe('corporate-blue');
  });

  it('returns undefined for unknown style ids', () => {
    expect(getStyle('nonexistent-style')).toBeUndefined();
  });
});

// ── Work-Order Enrichment ───────────────────────────────────────────────────

describe('work-order enrichment', () => {
  it('enriches outline work orders with academic style guidance', () => {
    const base = {
      id: 'wo-outline',
      projectSlug: 'test',
      kind: 'outline' as const,
      inputArtifacts: ['requirements.md'],
      outputArtifacts: ['planning/outline-draft.md'],
      constraints: ['Author outline only.'],
      sourceRefs: [],
      writeScope: ['planning/outline-draft.md'],
      status: 'open' as const,
    };
    const enriched = enrichOutlineWorkOrder(base, 'academic');
    expect(enriched.guidance).toBeDefined();
    expect(enriched.guidance!.styleId).toBe('academic');
    expect(enriched.guidance!.stage).toBe('outline');
    expect(enriched.guidance!.checklist.length).toBeGreaterThan(0);
    expect(enriched.guidance!.checklist.some((item) => item.startsWith('Audience:') || item.startsWith('Story arc:') || item.startsWith('Info hierarchy:'))).toBe(true);
  });

  it('enriches deck-plan work orders with consulting style guidance', () => {
    const base = {
      id: 'wo-deck-plan',
      projectSlug: 'test',
      kind: 'deck-plan' as const,
      inputArtifacts: ['planning/outline-approved.md'],
      outputArtifacts: ['planning/deck-plan.json'],
      constraints: ['Author deck plan only.'],
      sourceRefs: [],
      writeScope: ['planning/deck-plan.json'],
      status: 'open' as const,
    };
    const enriched = enrichDeckPlanWorkOrder(base, 'consulting');
    expect(enriched.guidance).toBeDefined();
    expect(enriched.guidance!.styleId).toBe('consulting');
    expect(enriched.guidance!.stage).toBe('deck-plan');
    expect(enriched.guidance!.checklist.length).toBeGreaterThan(0);
  });

  it('enriches slide-dsl work orders with per-slide design instructions', () => {
    const base = {
      id: 'wo-slide-1',
      projectSlug: 'test',
      kind: 'slide-dsl' as const,
      inputArtifacts: ['planning/deck-plan.json'],
      outputArtifacts: ['dsl/slides/slide-1.json'],
      constraints: ['Write valid DSL only.'],
      sourceRefs: ['block-1'],
      writeScope: ['dsl/slides/slide-1.json'],
      status: 'open' as const,
    };
    const slideDesign = {
      slideType: 'evidence' as const,
      layoutPatternId: 'evidence-chart-text',
      density: 'medium' as const,
    };
    const enriched = enrichDslWorkOrder(base, 'academic', slideDesign);
    expect(enriched.guidance).toBeDefined();
    expect(enriched.guidance!.stage).toBe('slide-dsl');
    expect(enriched.guidance!.checklist.some((c) => c.includes('evidence'))).toBe(true);
    expect(enriched.guidance!.checklist.some((c) => c.includes('medium'))).toBe(true);
  });

  it('returns order unchanged for unknown style id (backward compat)', () => {
    const base = {
      id: 'wo-outline',
      projectSlug: 'test',
      kind: 'outline' as const,
      inputArtifacts: ['requirements.md'],
      outputArtifacts: ['planning/outline-draft.md'],
      constraints: ['Author outline only.'],
      sourceRefs: [],
      writeScope: ['planning/outline-draft.md'],
      status: 'open' as const,
    };
    const result = enrichOutlineWorkOrder(base, 'unknown-style-xyz');
    expect(result.guidance).toBeUndefined();
    expect(result).toStrictEqual(base);
  });
});

// ── Outline Work Orders with styleId in manifest ────────────────────────────

describe('outline work order with project styleId', () => {
  beforeEach(() => { tempWorkspace(); });

  it('injects guidance when manifest has styleId', () => {
    const manifest = createProject('acad-outline', ['paper.pdf'], ['html']);
    // Patch project.json with styleId
    writeJson(join('projects', 'acad-outline', 'project.json'), { ...manifest, styleId: 'academic' });

    writeNormalizedBlocks(join('projects', 'acad-outline'), sampleBlocks);
    writeOutlineApproved(join('projects', 'acad-outline'));

    const order = createOutlineWorkOrder('acad-outline');
    expect(order.guidance).toBeDefined();
    expect(order.guidance!.styleId).toBe('academic');
    expect(order.guidance!.stage).toBe('outline');
  });

  it('produces valid work order without guidance when no styleId (backward compat)', () => {
    createProject('no-style', ['paper.pdf'], ['html']);
    writeNormalizedBlocks(join('projects', 'no-style'), sampleBlocks);
    writeOutlineApproved(join('projects', 'no-style'));

    const order = createOutlineWorkOrder('no-style');
    expect(order.guidance).toBeUndefined();
    expect(order.kind).toBe('outline');
    expect(order.constraints.length).toBeGreaterThan(0);
  });
});

// ── DSL Work Orders with design field ──────────────────────────────────────

describe('DSL work orders with deckDesign and slide.design', () => {
  beforeEach(() => { tempWorkspace(); });

  it('enriches slide work orders when manifest has styleId and slide has design', () => {
    const manifest = createProject('acad-dsl', ['paper.pdf'], ['html']);
    writeJson(join('projects', 'acad-dsl', 'project.json'), { ...manifest, styleId: 'academic' });

    writeNormalizedBlocks(join('projects', 'acad-dsl'), sampleBlocks, [
      { id: 'asset-1', materialId: 'm1', kind: 'image', sourcePath: 'extraction/mineru/raw/m1/images/figure.png', sourceOrder: 0 },
    ]);
    writeOutlineApproved(join('projects', 'acad-dsl'));

    const deckPlan = {
      projectSlug: 'acad-dsl',
      deckDesign: {
        styleId: 'academic',
        canvas: { width: 1920, height: 1080 },
        typographyScaleId: 'major-third',
        paletteId: 'navy-white',
        lockedTokens: {
          titleBandHeight: 80,
          margins: { top: 60, right: 80, bottom: 60, left: 80 },
          spacing: { element: 12, section: 32 },
        },
      },
      slides: [
        {
          id: 'slide-1',
          title: 'Introduction',
          sourceBlockRefs: ['block-1', 'block-2'],
          candidateAssetRefs: ['asset-1'],
          layoutIntent: 'Title slide with author info',
          outputConstraints: ['html'],
          design: {
            slideType: 'title',
            layoutPatternId: 'title-centered',
            density: 'low',
          },
        },
      ],
    };
    writeJson(join('projects', 'acad-dsl', 'planning', 'deck-plan.json'), deckPlan);

    const orders = createDslWorkOrders('acad-dsl');
    expect(orders).toHaveLength(1);
    const order = orders[0]!;
    // sourceRefs populated from sourceBlockRefs
    expect(order.sourceRefs).toContain('block-1');
    expect(order.sourceRefs).toContain('block-2');
    // guidance injected because styleId + design present
    expect(order.guidance).toBeDefined();
    expect(order.guidance!.styleId).toBe('academic');
    expect(order.guidance!.stage).toBe('slide-dsl');
    // locked tokens passed through
    expect(order.guidance!.structured.slideDsl.lockedTokens).toBeDefined();
    expect(order.guidance!.structured.slideDsl.lockedTokens!.titleBandHeight).toBe(80);
    expect(order.guidance!.structured.slideDsl.styleContract?.palette.primary).toBe('#1a2c4e');
    expect(order.guidance!.structured.slideDsl.approvedAssets).toMatchObject([
      { id: 'asset-1', kind: 'image', sourcePath: 'extraction/mineru/raw/m1/images/figure.png' },
    ]);
  });

  it('omits guidance when slide has no design field (backward compat)', () => {
    createProject('no-design', ['paper.pdf'], ['html']);
    writeNormalizedBlocks(join('projects', 'no-design'), sampleBlocks);
    writeOutlineApproved(join('projects', 'no-design'));

    const deckPlan = {
      projectSlug: 'no-design',
      slides: [
        {
          id: 'slide-1',
          title: 'Slide',
          sourceBlockRefs: ['block-1'],
          candidateAssetRefs: [],
          layoutIntent: 'plain layout',
          outputConstraints: ['html'],
          // no design field
        },
      ],
    };
    writeJson(join('projects', 'no-design', 'planning', 'deck-plan.json'), deckPlan);

    const orders = createDslWorkOrders('no-design');
    expect(orders[0]!.guidance).toBeUndefined();
  });
});

// ── Assembly: data-driven theme and canvas ──────────────────────────────────

describe('assembleDeck with deckDesign', () => {
  beforeEach(() => { tempWorkspace(); });

  it('uses deckDesign canvas and style theme instead of hardcoded defaults', () => {
    const manifest = createProject('assemble-custom', ['paper.pdf'], ['html']);
    writeJson(join('projects', 'assemble-custom', 'project.json'), { ...manifest, styleId: 'consulting' });

    writeNormalizedBlocks(join('projects', 'assemble-custom'), sampleBlocks);
    writeOutlineApproved(join('projects', 'assemble-custom'));

    const deckPlan = {
      projectSlug: 'assemble-custom',
      deckDesign: {
        styleId: 'consulting',
        canvas: { width: 1920, height: 1080 },
        typographyScaleId: 'major-third',
        paletteId: 'corporate-blue',
        lockedTokens: {
          titleBandHeight: 80,
          margins: { top: 60, right: 80, bottom: 60, left: 80 },
          spacing: { element: 12, section: 32 },
        },
      },
      slides: [
        {
          id: 'slide-1',
          title: 'Overview',
          sourceBlockRefs: ['block-1'],
          candidateAssetRefs: [],
          layoutIntent: 'title layout',
          outputConstraints: ['html'],
        },
      ],
    };
    writeJson(join('projects', 'assemble-custom', 'planning', 'deck-plan.json'), deckPlan);
    writeSlice(join('projects', 'assemble-custom'), 'slide-1', 60);

    const deck = assembleDeck('assemble-custom');
    expect(deck.meta.canvas).toEqual({ width: 1920, height: 1080 });
    expect(deck.meta.theme).toBe('corporate-blue');
  });

  it('uses config theme over the style recommended theme', () => {
    createProject({
      slug: 'assemble-config-theme',
      sources: ['paper.pdf'],
      outputFormats: ['html'],
      config: { styleId: 'consulting', theme: 'minimal-white' },
    });

    writeNormalizedBlocks(join('projects', 'assemble-config-theme'), sampleBlocks);
    writeOutlineApproved(join('projects', 'assemble-config-theme'));
    writeJson(join('projects', 'assemble-config-theme', 'planning', 'deck-plan.json'), {
      projectSlug: 'assemble-config-theme',
      deckDesign: {
        styleId: 'consulting',
        canvas: { width: 1280, height: 720 },
        typographyScaleId: 'consulting-typography',
        paletteId: 'consulting-palette',
        lockedTokens: {
          titleBandHeight: 80,
          margins: { top: 40, right: 56, bottom: 40, left: 56 },
          spacing: { element: 16, section: 32 },
        },
      },
      slides: [{ id: 'slide-1', title: 'Overview', sourceBlockRefs: ['block-1'], candidateAssetRefs: [], layoutIntent: 'title layout', outputConstraints: ['html'] }],
    });
    writeSlice(join('projects', 'assemble-config-theme'), 'slide-1', 60);

    const deck = assembleDeck('assemble-config-theme');
    expect(deck.meta.theme).toBe('minimal-white');
  });

  it('warns by default but blocks style drift when styleValidation is fail', () => {
    createProject({
      slug: 'style-warn',
      sources: ['paper.pdf'],
      outputFormats: ['html'],
      config: { styleId: 'consulting' },
    });
    writeNormalizedBlocks(join('projects', 'style-warn'), sampleBlocks);
    writeOutlineApproved(join('projects', 'style-warn'));
    writeJson(join('projects', 'style-warn', 'planning', 'deck-plan.json'), {
      projectSlug: 'style-warn',
      slides: [{ id: 'slide-1', title: 'Slide', sourceBlockRefs: ['block-1'], candidateAssetRefs: [], layoutIntent: 'plain', outputConstraints: ['html'] }],
    });
    mkdirSync(join('projects', 'style-warn', 'dsl', 'slides'), { recursive: true });
    writeJson(join('projects', 'style-warn', 'dsl', 'slides', 'slide-1.json'), {
      id: 'slide-1',
      elements: [{ type: 'text', id: 'title', x: 80, y: 60, width: 800, height: 60, fontSize: 32, content: 'Off palette', color: '#ff00ff' }],
    });
    expect(() => assembleDeck('style-warn')).not.toThrow();

    createProject({
      slug: 'style-fail',
      sources: ['paper.pdf'],
      outputFormats: ['html'],
      config: { styleId: 'consulting', styleValidation: 'fail' },
    });
    writeNormalizedBlocks(join('projects', 'style-fail'), sampleBlocks);
    writeOutlineApproved(join('projects', 'style-fail'));
    writeJson(join('projects', 'style-fail', 'planning', 'deck-plan.json'), {
      projectSlug: 'style-fail',
      slides: [{ id: 'slide-1', title: 'Slide', sourceBlockRefs: ['block-1'], candidateAssetRefs: [], layoutIntent: 'plain', outputConstraints: ['html'] }],
    });
    mkdirSync(join('projects', 'style-fail', 'dsl', 'slides'), { recursive: true });
    writeJson(join('projects', 'style-fail', 'dsl', 'slides', 'slide-1.json'), {
      id: 'slide-1',
      elements: [{ type: 'text', id: 'title', x: 80, y: 60, width: 800, height: 60, fontSize: 32, content: 'Off palette', color: '#ff00ff' }],
    });
    expect(() => assembleDeck('style-fail')).toThrow(/style contract error/);
  });

  it('falls back to 1280x720 and minimal-white when no deckDesign present', () => {
    createProject('assemble-fallback', ['paper.pdf'], ['html']);
    writeNormalizedBlocks(join('projects', 'assemble-fallback'), sampleBlocks);
    writeOutlineApproved(join('projects', 'assemble-fallback'));

    const deckPlan = {
      projectSlug: 'assemble-fallback',
      slides: [
        {
          id: 'slide-1',
          title: 'Slide',
          sourceBlockRefs: ['block-1'],
          candidateAssetRefs: [],
          layoutIntent: 'plain',
          outputConstraints: ['html'],
        },
      ],
    };
    writeJson(join('projects', 'assemble-fallback', 'planning', 'deck-plan.json'), deckPlan);
    writeSlice(join('projects', 'assemble-fallback'), 'slide-1');

    const deck = assembleDeck('assemble-fallback');
    expect(deck.meta.canvas).toEqual({ width: 1280, height: 720 });
    expect(deck.meta.theme).toBe('minimal-white');
  });

  it('writes consistency-report.json after assembly', () => {
    createProject('assemble-report', ['paper.pdf'], ['html']);
    writeNormalizedBlocks(join('projects', 'assemble-report'), sampleBlocks);
    writeOutlineApproved(join('projects', 'assemble-report'));

    const deckPlan = {
      projectSlug: 'assemble-report',
      slides: [
        {
          id: 'slide-1',
          title: 'Slide',
          sourceBlockRefs: ['block-1'],
          candidateAssetRefs: [],
          layoutIntent: 'plain',
          outputConstraints: ['html'],
        },
      ],
    };
    writeJson(join('projects', 'assemble-report', 'planning', 'deck-plan.json'), deckPlan);
    writeSlice(join('projects', 'assemble-report'), 'slide-1');

    assembleDeck('assemble-report');

    const report = readJson(join('projects', 'assemble-report', 'dsl', 'consistency-report.json'));
    expect(Array.isArray(report)).toBe(true);
  });
});

// ── Consistency Validator ───────────────────────────────────────────────────

describe('consistency validator', () => {
  it('passes when all slides have title elements at the same Y position', () => {
    const deck = {
      meta: { title: 'test', canvas: { width: 1280, height: 720 } },
      slides: [
        { id: 's1', elements: [{ type: 'text', id: 's1-title', x: 80, y: 40, width: 1120, height: 60 }] },
        { id: 's2', elements: [{ type: 'text', id: 's2-title', x: 80, y: 42, width: 1120, height: 60 }] },
      ],
    };
    const results = validateConsistency(deck as never);
    const titleChecks = results.filter((r) => r.dimension === 'title-band-y');
    expect(titleChecks.every((r) => r.pass)).toBe(true);
  });

  it('flags title Y drift beyond tolerance', () => {
    const deck = {
      meta: { title: 'test', canvas: { width: 1280, height: 720 } },
      slides: [
        { id: 's1', elements: [{ type: 'text', id: 's1-title', x: 80, y: 40, width: 1120, height: 60 }] },
        { id: 's2', elements: [{ type: 'text', id: 's2-title', x: 80, y: 100, width: 1120, height: 60 }] },
      ],
    };
    const results = validateConsistency(deck as never);
    const failures = results.filter((r) => r.dimension === 'title-band-y' && !r.pass);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0]!.slideId).toBe('s2');
  });

  it('flags margin violations when lockedTokens provided', () => {
    const deckDesign = {
      styleId: 'academic',
      canvas: { width: 1280, height: 720 },
      typographyScaleId: 'major-third',
      paletteId: 'navy-white',
      lockedTokens: {
        titleBandHeight: 80,
        margins: { top: 60, right: 80, bottom: 60, left: 80 },
        spacing: { element: 12, section: 32 },
      },
    };
    const deck = {
      meta: { title: 'test', canvas: { width: 1280, height: 720 } },
      slides: [
        {
          id: 's1',
          elements: [
            // x=10 violates left margin of 80
            { type: 'text', id: 's1-el', x: 10, y: 60, width: 100, height: 40 },
          ],
        },
      ],
    };
    const results = validateConsistency(deck as never, deckDesign);
    const marginFailures = results.filter((r) => r.dimension === 'margin-left' && !r.pass);
    expect(marginFailures.length).toBeGreaterThan(0);
  });

  it('checks canvas dimensions match deckDesign', () => {
    const deckDesign = {
      styleId: 'academic',
      canvas: { width: 1920, height: 1080 },
      typographyScaleId: 'major-third',
      paletteId: 'navy-white',
      lockedTokens: {
        titleBandHeight: 80,
        margins: { top: 60, right: 80, bottom: 60, left: 80 },
        spacing: { element: 12, section: 32 },
      },
    };
    const deck = {
      meta: { title: 'test', canvas: { width: 1280, height: 720 } },
      slides: [],
    };
    const results = validateConsistency(deck as never, deckDesign);
    const canvasW = results.find((r) => r.dimension === 'canvas.width');
    const canvasH = results.find((r) => r.dimension === 'canvas.height');
    expect(canvasW?.pass).toBe(false);
    expect(canvasH?.pass).toBe(false);
  });
});

// ── DSL Lint Rules ──────────────────────────────────────────────────────────

describe('DSL lint rules', () => {
  it('flags vague or unstructured speaker notes', () => {
    const deck = {
      meta: { title: 'test', canvas: { width: 1280, height: 720 } },
      slides: [
        {
          id: 's1',
          notes: 'Briefly summarize the slide.',
          elements: [
            { type: 'text', id: 's1-title', x: 80, y: 80, width: 800, fontSize: 32, content: 'Sorting' },
          ],
        },
      ],
    };

    const results = lintDeck(deck as never, academicStyle);
    const speakerNoteResults = results.filter((result) => result.ruleId === 'speaker-notes-detail');
    expect(speakerNoteResults.length).toBeGreaterThan(0);
    expect(speakerNoteResults.some((result) => result.message.includes('presenter beats'))).toBe(true);
  });

  it('accepts numbered sentence-by-sentence speaker notes', () => {
    const deck = {
      meta: { title: 'test', canvas: { width: 1280, height: 720 } },
      slides: [
        {
          id: 's1',
          notes: [
            '1. Introduce the sorting model before discussing any running time.',
            '2. Explain that comparison sorting learns through yes-or-no element comparisons.',
            '3. Ask students why n distinct keys create n factorial possible outputs.',
            '4. Transition from the decision tree height to the omega n log n lower bound.',
          ].join('\n'),
          elements: [
            { type: 'text', id: 's1-title', x: 80, y: 80, width: 800, fontSize: 32, content: 'Sorting' },
          ],
        },
      ],
    };

    const results = lintDeck(deck as never, academicStyle);
    expect(results.filter((result) => result.ruleId === 'speaker-notes-detail')).toEqual([]);
  });

  it('uses rendered formula bounds when provided for overlap checks', () => {
    const deck = {
      meta: { title: 'test', canvas: { width: 1280, height: 720 } },
      slides: [
        {
          id: 's1',
          elements: [
            { type: 'formula', id: 'eq', x: 100, y: 100, width: 120, height: 40, fontSize: 28, latex: '\\int_a^b f(x) dx' },
            { type: 'text', id: 'caption', x: 350, y: 120, width: 120, height: 24, fontSize: 18, content: 'Caption' },
          ],
        },
      ],
    };

    const fallbackResults = lintDeck(deck as never, academicStyle);
    expect(fallbackResults.filter((result) => result.ruleId === 'formula-overlap')).toEqual([]);

    const renderedResults = lintDeck(deck as never, academicStyle, builtInRules, {
      elementBounds: (_slide, element) => element.id === 'eq'
        ? { x: 100, y: 96, width: 280, height: 72, source: 'rendered' }
        : undefined,
    });

    const formulaResults = renderedResults.filter((result) => result.ruleId === 'formula-overlap');
    expect(formulaResults).toHaveLength(1);
    expect(formulaResults[0]?.message).toContain('rendered KaTeX bounds');
    expect(formulaResults[0]?.message).toContain('caption');
  });
});

// ── DeckPlanSchema with deckDesign ──────────────────────────────────────────

describe('DeckPlanSchema accepts deckDesign section', () => {
  it('validates deck plan with deckDesign and slide design fields', () => {
    tempWorkspace();
    createProject('schema-test', ['paper.pdf'], ['html']);
    writeNormalizedBlocks(join('projects', 'schema-test'), sampleBlocks);
    writeOutlineApproved(join('projects', 'schema-test'));

    const deckPlan = {
      projectSlug: 'schema-test',
      deckDesign: {
        styleId: 'academic',
        canvas: { width: 1280, height: 720 },
        typographyScaleId: 'major-third',
        paletteId: 'navy-white',
        lockedTokens: {
          titleBandHeight: 80,
          margins: { top: 60, right: 80, bottom: 60, left: 80 },
          spacing: { element: 12, section: 32 },
        },
      },
      slides: [
        {
          id: 'slide-1',
          title: 'Introduction',
          sourceBlockRefs: ['block-1'],
          candidateAssetRefs: [],
          layoutIntent: 'title layout',
          outputConstraints: ['html'],
          design: {
            slideType: 'title',
            layoutPatternId: 'title-centered',
            density: 'low',
          },
        },
      ],
    };
    writeJson(join('projects', 'schema-test', 'planning', 'deck-plan.json'), deckPlan);

    const plan = validateDeckPlan('schema-test');
    expect(plan.deckDesign).toBeDefined();
    expect(plan.deckDesign!.canvas).toEqual({ width: 1280, height: 720 });
    expect(plan.deckDesign!.theme).toBe('minimal-white');
    expect(plan.deckDesign!.palette.primary).toBe('#1a2c4e');
    expect(plan.slides[0]!.design?.slideType).toBe('title');
  });

  it('validates deck plan without deckDesign (backward compat)', () => {
    tempWorkspace();
    createProject('schema-compat', ['paper.pdf'], ['html']);
    writeNormalizedBlocks(join('projects', 'schema-compat'), sampleBlocks);
    writeOutlineApproved(join('projects', 'schema-compat'));

    const deckPlan = {
      projectSlug: 'schema-compat',
      slides: [
        {
          id: 'slide-1',
          title: 'Slide',
          sourceBlockRefs: ['block-1'],
          candidateAssetRefs: [],
          layoutIntent: 'plain',
          outputConstraints: ['html'],
        },
      ],
    };
    writeJson(join('projects', 'schema-compat', 'planning', 'deck-plan.json'), deckPlan);

    const plan = validateDeckPlan('schema-compat');
    expect(plan.deckDesign).toBeUndefined();
    expect(plan.slides).toHaveLength(1);
  });
});
