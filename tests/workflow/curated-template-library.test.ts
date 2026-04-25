import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderDeckToHtml } from '@maliang-deck/renderer-html';
import { renderDeckToSvg } from '@maliang-deck/renderer-svg';
import { validateDeck, type Deck, type Element } from '@maliang-deck/schema';
import {
  TemplatePackSchema,
  getTemplatePack,
  getTemplatePackRecord,
  listAvailableTemplateStyles,
  listBuiltInTemplateIds,
  listBuiltInTemplatePacks,
  listBuiltInTemplatePackRecords,
  registerBuiltInTemplatePacks,
  registerTemplatePack,
  resolveTemplateSampleDeckPath,
  writeTemplateSampleProject,
  type TemplatePack,
} from '@maliang-deck/workflow';

const curatedIds = [
  'executive-consulting',
  'product-launch-marketing',
  'academic-ml-report',
  'investor-financial-brief',
  'healthcare-biotech-briefing',
  'education-training-module',
  'data-story-dashboard',
  'startup-pitch',
  'creative-portfolio-case',
  'mobile-portrait-story',
];

const keywords: Record<string, string[]> = {
  'executive-consulting': ['SaaS', 'DACH', 'enterprise', 'channel', 'ARR', 'market', 'wedge', 'board'],
  'product-launch-marketing': ['Auraloop', 'earbuds', 'spatial', 'retail', 'creator', 'launch', 'preorder', 'audio'],
  'academic-ml-report': ['attention', 'routing', 'ablation', 'summarization', 'tokens', 'model', 'gradient', 'benchmark'],
  'investor-financial-brief': ['ARR', 'NRR', 'burn', 'runway', 'funding', 'SaaS', 'cohort', 'margin'],
  'healthcare-biotech-briefing': ['triage', 'diagnostic', 'sensitivity', 'specificity', 'workflow', 'clinical', 'validation', 'patient'],
  'education-training-module': ['literacy', 'cohort', 'dashboard', 'metric', 'facilitator', 'onboarding', 'practice', 'learners'],
  'data-story-dashboard': ['energy', 'outage', 'carbon', 'dispatch', 'resilience', 'grid', 'KPI', 'demand'],
  'startup-pitch': ['OpsPilot', 'AI', 'incident', 'playbook', 'automation', 'platform', 'pipeline', 'investors'],
  'creative-portfolio-case': ['LumaNest', 'brand', 'identity', 'packaging', 'redesign', 'prototype', 'palette', 'creative'],
  'mobile-portrait-story': ['PulseFit', 'mobile', 'habit', 'biometric', 'subscription', 'wellness', 'teaser', 'coach'],
};

const forbidden = [/Extracted Template Sample/i, /placeholder/i, /lorem ipsum/i, /TODO|TBD|REPLACE_ME|CHANGEME/i, /sample title/i, /body content/i];
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf-8')) as T;
const repo = process.cwd();

function textFromElement(element: Element): string[] {
  if (element.type === 'text') return [element.content];
  if (element.type === 'table') return element.rows.flatMap((row) => row.map((cell) => (typeof cell === 'object' && cell !== null ? cell.text : String(cell ?? ''))));
  if (element.type === 'chart') return element.data.flatMap((series) => [series.name ?? '', ...series.labels.map(String)]);
  if (element.type === 'group' || element.type === 'layout') return element.elements.flatMap(textFromElement);
  return [];
}

function deckText(deck: Deck): string {
  return [deck.meta.title, ...deck.slides.flatMap((slide) => [slide.notes ?? '', ...slide.elements.flatMap(textFromElement)])].join('\n');
}

function expectContentQuality(id: string, deck: Deck): void {
  const text = deckText(deck);
  for (const pattern of forbidden) expect(text).not.toMatch(pattern);
  const hits = keywords[id].filter((keyword) => new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
  expect(hits.length, `${id} domain keyword count`).toBeGreaterThanOrEqual(5);
}

function hasHtmlOnlyBehavior(deck: Deck): boolean {
  if (deck.meta.htmlRuntime?.transition) return true;
  return deck.slides.some((slide) => (slide.fx?.length ?? 0) > 0 || slide.elements.some((element) => element.animation));
}

function clonePack(pack: TemplatePack, id: string): TemplatePack {
  return TemplatePackSchema.parse({
    ...pack,
    id,
    name: id,
    coverage: pack.coverage ? { ...pack.coverage, templateId: id } : undefined,
    activation: { status: 'approved', approvedAt: '2026-04-25T00:00:00.000Z', approvedBy: 'test' },
  });
}

describe('curated built-in template library', () => {
  it('loads exactly ten manifest-backed built-in TemplatePacks with sample-case metadata', () => {
    expect(listBuiltInTemplateIds()).toEqual(curatedIds);
    const packs = listBuiltInTemplatePacks();
    expect(packs).toHaveLength(10);
    for (const pack of packs) {
      expect(TemplatePackSchema.parse(pack).id).toBe(pack.id);
      expect(pack.activation.status).toBe('approved');
      expect(pack.sampleDeck?.path).toBe('sample.deck.json');
      expect(pack.sampleDeck?.case?.slideCount).toBeGreaterThan(0);
      expect(pack.sampleDeck?.case?.canvas.width).toBeGreaterThan(0);
      expect(pack.sampleDeck?.case?.canvas.height).toBeGreaterThan(0);
      expect((pack as Record<string, unknown>).materials).toBeUndefined();
      expect((pack as Record<string, unknown>).animation).toBeUndefined();
    }
  });

  it('registers built-ins by default and supports no-built-ins listing semantics', () => {
    registerBuiltInTemplatePacks();
    const withBuiltIns = listAvailableTemplateStyles().map((style) => style.id);
    expect(withBuiltIns).toEqual(expect.arrayContaining(curatedIds));
    const withoutBuiltIns = listAvailableTemplateStyles({ includeBuiltIns: false }).map((style) => style.id);
    for (const id of curatedIds) expect(withoutBuiltIns).not.toContain(id);
    expect(withoutBuiltIns).toEqual(expect.arrayContaining(['academic', 'consulting']));
    expect(getTemplatePack('executive-consulting').id).toBe('executive-consulting');
  });

  it('rejects built-in and built-in-style id shadowing while allowing distinct local packs', () => {
    const base = listBuiltInTemplatePacks()[0]!;
    expect(() => registerTemplatePack(clonePack(base, 'executive-consulting'))).toThrow(/built-in template id/i);
    expect(() => registerTemplatePack(clonePack(base, 'academic'))).toThrow(/built-in style/i);
    expect(registerTemplatePack(clonePack(base, 'local-distinct-template')).id).toBe('local-distinct-template');
  });

  it('resolves curated and file-backed sample decks safely', () => {
    const record = getTemplatePackRecord('executive-consulting');
    const samplePath = resolveTemplateSampleDeckPath(record.pack, { ownerDir: record.ownerDir, requireSamplePath: true });
    expect(samplePath?.endsWith('assets/templates/executive-consulting/sample.deck.json')).toBe(true);

    const temp = mkdtempSync(join(tmpdir(), 'maliang-curated-sample-'));
    writeFileSync(join(temp, 'deck.json'), JSON.stringify(readJson<Deck>(samplePath!), null, 2));
    const local = { ...record.pack, id: 'safe-local-template', sampleDeck: { ...record.pack.sampleDeck, path: 'deck.json' } };
    expect(resolveTemplateSampleDeckPath(TemplatePackSchema.parse(local), { ownerDir: temp })).toBe(join(temp, 'deck.json'));
    expect(() => resolveTemplateSampleDeckPath(TemplatePackSchema.parse({ ...local, sampleDeck: { path: '../deck.json' } }), { ownerDir: temp })).toThrow(/escapes/);
    expect(() => resolveTemplateSampleDeckPath(TemplatePackSchema.parse({ ...local, sampleDeck: { path: 'https://example.invalid/deck.json' } }), { ownerDir: temp })).toThrow(/remote/);
    expect(() => resolveTemplateSampleDeckPath(TemplatePackSchema.parse({ ...local, sampleDeck: { path: 'deck.js' } }), { ownerDir: temp })).toThrow(/executable/);
    expect(() => resolveTemplateSampleDeckPath(TemplatePackSchema.parse({ ...local, sampleDeck: { path: 'missing.deck.json' } }), { ownerDir: temp })).toThrow(/not found/);
  });

  it('writes realistic built-in sample projects from built-in ids and local template-pack paths', () => {
    const temp = mkdtempSync(join(tmpdir(), 'maliang-curated-built-in-sample-'));
    const record = getTemplatePackRecord('executive-consulting');
    const result = writeTemplateSampleProject(record.pack, temp, { ownerDir: record.ownerDir, requireSamplePath: true });
    expect(existsSync(join(temp, 'dsl', 'deck.json'))).toBe(true);
    expect(existsSync(join(temp, 'render', 'html', 'index.html'))).toBe(true);
    expect(existsSync(join(temp, 'coverage', 'sample-report.json'))).toBe(true);
    expect(result.validation.success).toBe(true);
    expectContentQuality('executive-consulting', result.deck);

    const byPath = getTemplatePackRecord(join(repo, 'assets/templates/executive-consulting/template-pack.json'));
    expect(byPath.source).toBe('built-in');
    expect(byPath.ownerDir?.endsWith('assets/templates/executive-consulting')).toBe(true);
    const pathResult = writeTemplateSampleProject(byPath.pack, mkdtempSync(join(tmpdir(), 'maliang-curated-built-in-path-sample-')), { ownerDir: byPath.ownerDir, requireSamplePath: true });
    expect(pathResult.validation.success).toBe(true);
    expectContentQuality('executive-consulting', pathResult.deck);
  });

  it('validates all curated samples and showcases with content, canvas, and metadata gates', () => {
    const sampleDecks = curatedIds.map((id) => readJson<Deck>(join(repo, 'assets', 'templates', id, 'sample.deck.json')));
    const showcaseDecks = curatedIds.map((id) => readJson<Deck>(join(repo, 'examples', 'template-showcase', id, 'dsl', 'deck.json')));
    for (const [index, id] of curatedIds.entries()) {
      for (const deck of [sampleDecks[index], showcaseDecks[index]]) {
        expect(validateDeck(deck).success, id).toBe(true);
        expectContentQuality(id, deck);
      }
      const project = readJson<{ config?: { styleId?: string; theme?: string } }>(join(repo, 'examples', 'template-showcase', id, 'project.json'));
      expect(project.config?.styleId).toBe(id);
    }
    const canvases = showcaseDecks.map((deck) => `${deck.meta.canvas.width}x${deck.meta.canvas.height}`);
    expect(canvases.filter((canvas) => canvas === '1280x720')).toHaveLength(9);
    expect(canvases.filter((canvas) => canvas === '720x1280')).toHaveLength(1);
    expect(readJson<Deck>(join(repo, 'examples/template-showcase/mobile-portrait-story/dsl/deck.json')).meta.canvas).toEqual({ width: 720, height: 1280 });
  });

  it('documents README design specs and animation/static fallback boundaries', () => {
    const requiredHeadings = [/use cases/i, /typography/i, /palette|color system/i, /component|material/i, /table.*chart|chart.*table/i, /icon|shape/i, /spacing|alignment/i, /animation|static fallback/i, /design guidelines/i, /dos and don/i, /provenance|reference inspiration/i];
    let animatedCount = 0;
    for (const record of listBuiltInTemplatePackRecords()) {
      const readme = readFileSync(join(record.ownerDir, 'README.md'), 'utf-8');
      for (const heading of requiredHeadings) expect(readme).toMatch(heading);
      const deck = readJson<Deck>(join(record.ownerDir, 'sample.deck.json'));
      if (hasHtmlOnlyBehavior(deck)) {
        animatedCount += 1;
        expect(record.pack.sampleDeck?.staticFallback?.htmlOnlyFeatures.length).toBeGreaterThan(0);
        expect(readme).toMatch(/Static fallback/i);
      }
    }
    expect(animatedCount).toBeGreaterThanOrEqual(3);
  });

  it('smoke-renders HTML for all showcases and SVG static output for animated showcases', () => {
    for (const id of curatedIds) {
      const deck = readJson<Deck>(join(repo, 'examples', 'template-showcase', id, 'dsl', 'deck.json'));
      expect(renderDeckToHtml(deck)).toContain('<!DOCTYPE html>');
      if (hasHtmlOnlyBehavior(deck)) {
        const svg = renderDeckToSvg(deck);
        expect(svg.slides.length).toBe(deck.slides.length);
        expect(svg.slides[0]?.svg).toContain('<svg');
      }
    }
  });
});
