import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  TemplatePackSchema,
  approveOutline,
  assembleDeck,
  createDeckPlanWorkOrder,
  createDslWorkOrders,
  createOutlineWorkOrder,
  createProject,
  extractTemplatePack,
} from '@maliang-deck/workflow';

function tempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-template-config-'));
  process.chdir(dir);
  return dir;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function writeNormalizedBlocks(root: string): void {
  mkdirSync(join(root, 'extraction', 'normalized'), { recursive: true });
  writeJson(join(root, 'extraction', 'normalized', 'blocks.json'), [
    { id: 'block-1', materialId: 'm1', kind: 'title', text: 'Template title', sourceOrder: 0, assetRefs: [] },
  ]);
  writeJson(join(root, 'extraction', 'normalized', 'assets.json'), []);
}

function writeApprovedOutline(root: string): void {
  mkdirSync(join(root, 'planning'), { recursive: true });
  writeFileSync(join(root, 'planning', 'outline-approved.md'), '# Outline\n\n## Template title\n');
}

function writeSlide(root: string, slideId: string): void {
  mkdirSync(join(root, 'dsl', 'slides'), { recursive: true });
  writeJson(join(root, 'dsl', 'slides', `${slideId}.json`), {
    id: slideId,
    elements: [
      { type: 'text', id: `${slideId}-title`, x: 96, y: 64, width: 800, height: 80, fontSize: 36, content: 'Template title' },
    ],
  });
}

function makeTemplatePack(root: string, id: string, approved = true) {
  mkdirSync(root, { recursive: true });
  const fixture = join(root, `${id}.html`);
  writeFileSync(fixture, '<html><head><style>body{color:#174ea6;font-family:Inter}</style></head><body><h1>Template title</h1><p>Template body</p></body></html>');
  const draft = extractTemplatePack([fixture], { id, name: id }).pack;
  return TemplatePackSchema.parse({
    ...draft,
    activation: approved
      ? { status: 'approved' as const, approvedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(), approvedBy: 'test' }
      : { status: 'draft' as const },
  });
}

function writeTemplatePack(path: string, id: string, approved = true) {
  const pack = makeTemplatePack(join(path, '..'), id, approved);
  writeJson(path, pack);
  return pack;
}

describe('config-referenced template pack registration', () => {
  beforeEach(() => {
    tempWorkspace();
  });

  it('registers approved project config template packs before work-order and assembly style lookups', () => {
    const manifest = createProject('template-project', ['paper.pdf'], ['html']);
    const root = join('projects', 'template-project');
    const pack = writeTemplatePack(join(root, 'templates', 'project-template.json'), 'project-template-style');
    writeJson(join(root, 'project.json'), {
      ...manifest,
      config: {
        styleId: pack.id,
        templatePackPaths: ['templates/project-template.json'],
      },
    });

    writeNormalizedBlocks(root);
    const outline = createOutlineWorkOrder('template-project');
    expect(outline.guidance?.styleId).toBe(pack.id);

    approveOutline('template-project');
    const deckPlanOrder = createDeckPlanWorkOrder('template-project');
    expect(deckPlanOrder.guidance?.styleId).toBe(pack.id);

    const archetype = pack.archetypes[0]!;
    writeJson(join(root, 'planning', 'deck-plan.json'), {
      projectSlug: 'template-project',
      deckDesign: {
        styleId: pack.id,
        canvas: pack.tokens.canvas,
        typographyScaleId: `${pack.id}-typography`,
        paletteId: `${pack.id}-palette`,
        lockedTokens: {
          titleBandHeight: 80,
          margins: pack.tokens.spacing.margin,
          spacing: { element: pack.tokens.spacing.element, section: pack.tokens.spacing.section },
        },
      },
      slides: [
        {
          id: 'slide-1',
          title: 'Template title',
          sourceBlockRefs: ['block-1'],
          candidateAssetRefs: [],
          layoutIntent: archetype.purpose,
          outputConstraints: ['html'],
          design: {
            slideType: archetype.slideType,
            layoutPatternId: archetype.id,
            density: 'low',
          },
        },
      ],
    });

    const dslOrders = createDslWorkOrders('template-project');
    expect(dslOrders[0]?.guidance?.styleId).toBe(pack.id);

    writeSlide(root, 'slide-1');
    assembleDeck('template-project');
    expect(Array.isArray(JSON.parse(readFileSync(join(root, 'dsl', 'lint-report.json'), 'utf-8')))).toBe(true);
  });

  it('uses workspace config path bases and preserves draft filtering unless includeDraftTemplatePacks is enabled', () => {
    const workspacePack = writeTemplatePack(join('templates', 'workspace-template.json'), 'workspace-template-style');
    writeJson('maliang-deck.config.json', {
      styleId: workspacePack.id,
      templatePackPaths: ['templates/workspace-template.json'],
    });

    const workspaceManifest = createProject('workspace-config', ['paper.pdf'], ['html']);
    writeJson(join('projects', 'workspace-config', 'project.json'), workspaceManifest);
    writeNormalizedBlocks(join('projects', 'workspace-config'));
    expect(createOutlineWorkOrder('workspace-config').guidance?.styleId).toBe(workspacePack.id);

    const draftPackPath = join(process.cwd(), 'templates', 'draft-template.json');
    const draftPack = writeTemplatePack(draftPackPath, 'draft-template-style', false);
    const filtered = createProject('draft-filtered', ['paper.pdf'], ['html']);
    writeJson(join('projects', 'draft-filtered', 'project.json'), {
      ...filtered,
      config: { styleId: draftPack.id, templatePackPaths: [draftPackPath] },
    });
    writeNormalizedBlocks(join('projects', 'draft-filtered'));
    expect(createOutlineWorkOrder('draft-filtered').guidance).toBeUndefined();

    const included = createProject('draft-included', ['paper.pdf'], ['html']);
    writeJson(join('projects', 'draft-included', 'project.json'), {
      ...included,
      config: {
        styleId: draftPack.id,
        templatePackPaths: [draftPackPath],
        includeDraftTemplatePacks: true,
      },
    });
    writeNormalizedBlocks(join('projects', 'draft-included'));
    expect(createOutlineWorkOrder('draft-included').guidance?.styleId).toBe(draftPack.id);
  });

  it('rejects remote and executable template pack paths from project config', () => {
    const manifest = createProject('bad-template-paths', ['paper.pdf'], ['html']);
    writeNormalizedBlocks(join('projects', 'bad-template-paths'));
    writeJson(join('projects', 'bad-template-paths', 'project.json'), {
      ...manifest,
      config: { styleId: 'bad', templatePackPaths: ['https://example.invalid/template-pack.json'] },
    });
    expect(() => createOutlineWorkOrder('bad-template-paths')).toThrow(/Unsupported remote template pack path/);

    writeJson(join('projects', 'bad-template-paths', 'project.json'), {
      ...manifest,
      config: { styleId: 'bad', templatePackPaths: ['template-pack.mjs'] },
    });
    expect(() => createOutlineWorkOrder('bad-template-paths')).toThrow(/Unsupported executable template pack path/);
  });
});
