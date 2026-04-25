import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateDeck } from '@maliang-deck/schema';
import {
  TemplateCoverageThresholdProposalSchema,
  TemplatePackSchema,
  compileTemplatePack,
  compileTemplatePackToDeckDesign,
  compileTemplatePackToGuidance,
  compileTemplatePackToStyle,
  extractTemplateIR,
  extractTemplatePack,
  inferTemplatePack,
  listGenerationStyles,
  listStyles,
  loadTemplateStyleFile,
  normalizeBbox,
  pptxTemplateAdapter,
  registerTemplatePack,
  registerTemplatePackStyle,
  extractTemplateIRFromSources,
  createSampleDeckFromTemplate,
  listTemplatePacks,
  listAvailableTemplateStyles,
  writeTemplateSampleProject,
} from '../../packages/workflow/src/index.js';

const fixtures = resolve('tests/fixtures/templates');
function tmp(): string { return mkdtempSync(join(tmpdir(), 'maliang-deck-template-')); }

async function fixturePack() {
  const irs = [
    extractTemplateIR(join(fixtures, 'pptx/reference-deck.pptx'), { id: 'fixture-pptx' }),
    extractTemplateIR(join(fixtures, 'html/static-deck.html'), { id: 'fixture-html' }),
    extractTemplateIR(join(fixtures, 'pdf/simple-deck.pdf'), { id: 'fixture-pdf' }),
    extractTemplateIR(join(fixtures, 'png/title-like.png'), { id: 'fixture-png' }),
  ];
  return inferTemplatePack(irs, { id: 'fixture-template' });
}

describe('template extraction contracts and adapters', () => {
  it('extracts IR from PPTX, HTML, PDF, and PNG fixtures with provenance and confidence', () => {
    const pptx = extractTemplateIR(join(fixtures, 'pptx/reference-deck.pptx'), { id: 'fixture-pptx' });
    const html = extractTemplateIR(join(fixtures, 'html/static-deck.html'), { id: 'fixture-html' });
    const pdf = extractTemplateIR(join(fixtures, 'pdf/simple-deck.pdf'), { id: 'fixture-pdf' });
    const png = extractTemplateIR(join(fixtures, 'png/title-like.png'), { id: 'fixture-png' });

    expect(pptx.source.format).toBe('pptx');
    expect(pptx.provenance.some((item) => item.includes('ppt/slides/slide1.xml'))).toBe(true);
    expect(html.warnings.join('\n')).toMatch(/scripts|network/i);
    expect(pdf.warnings.join('\n')).toMatch(/lower confidence/i);
    expect(png.warnings.join('\n')).toMatch(/visual-only/i);
    expect([pptx, html, pdf, png].every((ir) => ir.observations.length > 0 && ['high', 'medium', 'low'].includes(ir.confidence))).toBe(true);
  });

  it('rejects unsafe and malformed untrusted inputs', async () => {
    expect(() => pptxTemplateAdapter.extract(join(fixtures, 'pptx/zip-slip-path-attempt.pptx'), { id: 'bad-pptx' })).toThrow(/Unsafe archive entry/);
    await expect(Promise.resolve().then(() => extractTemplateIR(join(fixtures, 'png/malformed.png'), { id: 'bad-png' }))).rejects.toThrow(/Malformed PNG/);
  });

  it('validates positive and negative template-pack fixtures', async () => {
    const pack = await fixturePack();
    expect(TemplatePackSchema.parse(pack).id).toBe('fixture-template');
    expect(() => TemplatePackSchema.parse({ ...pack, activation: { status: 'active' } })).toThrow();
    expect(() => TemplatePackSchema.parse({ ...pack, fragments: [] })).toThrow();
  });

  it('normalizes coordinates and rejects invalid boxes', () => {
    expect(normalizeBbox({ x: 128, y: 72, w: 640, h: 360 }, { width: 1280, height: 720 })).toEqual({ x: 0.1, y: 0.1, w: 0.5, h: 0.5 });
    expect(() => normalizeBbox({ x: 0, y: 0, w: -1, h: 10 }, { width: 1280, height: 720 })).toThrow(/Invalid bbox/);
  });
});

describe('template inference, coverage, compiler, and registry', () => {
  it('infers draft packs with advisory coverage and compiles to renderer-unaware style guidance', async () => {
    const pack = await fixturePack();
    expect(pack.activation.status).toBe('draft');
    expect(pack.archetypes.length).toBeGreaterThan(0);
    expect(pack.fragments.length).toBeGreaterThan(0);
    expect(pack.coverage.slotCoverage.assignedSignificantObservations).toBeGreaterThan(0);
    expect(pack.coverage.formatConfidence.pptx).toBeDefined();

    const proposal = TemplateCoverageThresholdProposalSchema.parse({
      templateId: pack.id,
      reviewStatus: 'proposed',
      rationale: ['advisory only'],
      thresholds: { tokenCoverage: 0.8, archetypeCoverage: 0.8, slotCoverage: 0.8, fragmentCoverage: 1 },
    });
    expect(proposal.reviewStatus).toBe('proposed');

    const style = compileTemplatePackToStyle(pack);
    const deckDesign = compileTemplatePackToDeckDesign(pack);
    const guidance = compileTemplatePackToGuidance(pack, 'slide-dsl');
    expect(style.layoutPatterns[0]?.elementPositions).toHaveProperty(pack.archetypes[0]!.slots[0]!.role);
    expect(deckDesign.styleId).toBe(pack.id);
    expect(guidance.checklist.join('\n')).toMatch(/ordinary JSON DSL/);
    expect(validateDeck(compileTemplatePack(pack).sampleDeck).success).toBe(true);
  });

  it('keeps draft packs out of generation-safe style lists and prevents built-in shadowing', async () => {
    const pack = await fixturePack();
    expect(listStyles().some((style) => style.id === 'academic')).toBe(true);
    expect(() => registerTemplatePackStyle({ ...pack, id: 'academic' }, { includeDrafts: true })).toThrow(/shadow/i);

    const approved = TemplatePackSchema.parse({ ...pack, id: 'approved-fixture-template', activation: { status: 'approved', approvedAt: new Date().toISOString(), approvedBy: 'test' } });
    registerTemplatePackStyle(approved, { sourcePath: '/tmp/approved-fixture-template.json' });
    expect(listGenerationStyles().some((style) => style.id === 'approved-fixture-template')).toBe(true);
  });
});

describe('template sample and extraction outputs', () => {
  it('writes pack, coverage, advisory thresholds, and sample deck outputs', () => {
    const out = mkdtempSync(join(tmpdir(), 'maliang-deck-template-'));
    const result = extractTemplatePack([
      join(fixtures, 'html/static-deck.html'),
      join(fixtures, 'png/two-column-like.png'),
    ], { id: 'html-png-fixture', outDir: out });

    const pack = TemplatePackSchema.parse(JSON.parse(readFileSync(result.files.pack, 'utf8')) as unknown);
    expect(pack.activation.status).toBe('draft');
    expect(JSON.parse(readFileSync(result.files.coverage, 'utf8'))).toHaveProperty('slotCoverage');
    expect(JSON.parse(readFileSync(result.files.thresholds, 'utf8')).reviewStatus).toBe('proposed');
    expect(result.files.sampleDeck).toBeTruthy();

    const deck = JSON.parse(readFileSync(result.files.sampleDeck!, 'utf8')) as unknown;
    expect(validateDeck(deck).success).toBe(true);
  });
});

describe('template source adapters', () => {
  it('extracts PPTX OpenXML directory fixtures with provenance and colors', () => {
    const ir = pptxTemplateAdapter.extract(join(fixtures, 'pptx', 'simple-deck'), { id: 'pptx-fixture' });
    expect(ir.sources[0]).toMatchObject({ format: 'pptx', slideCount: 2 });
    expect(ir.observations.some((observation) => observation.text === 'Quarterly Results')).toBe(true);
    expect(ir.observations[0].provenance.path).toMatch(/ppt\/slides\/slide1\.xml/);
  });

  it('extracts HTML, PDF, and PNG fixtures with warnings and confidence', () => {
    const ir = extractTemplateIRFromSources([
      join(fixtures, 'html', 'static-deck.html'),
      join(fixtures, 'pdf', 'simple.pdf'),
      join(fixtures, 'png', 'simple.png'),
    ], { id: 'mixed-fixture' });
    expect(ir.sources.map((source) => source.format).sort()).toEqual(['html', 'pdf', 'png']);
    expect(ir.warnings.join(' ')).toMatch(/scripts were ignored|PNG is extraction input only/);
    expect(ir.observations.some((observation) => observation.provenance.format === 'pdf' && observation.confidence < 0.6)).toBe(true);
  });

  it('rejects corrupt and unsafe inputs clearly', () => {
    const dir = tmp();
    const corruptPng = join(dir, 'bad.png');
    writeFileSync(corruptPng, 'not-png');
    expect(() => extractTemplateIRFromSources([corruptPng])).toThrow(/Malformed PNG/);
    const unsafePptx = join(dir, 'bad.pptx');
    writeFileSync(unsafePptx, 'PK\x03\x04bad');
    expect(() => extractTemplateIRFromSources([unsafePptx])).toThrow(/central directory|PPTX/);
  });
});

describe('template inference, compile, registry, and samples', () => {
  it('writes pack, coverage report, advisory thresholds, and valid sample deck', () => {
    const out = tmp();
    const pack = extractTemplatePack([join(fixtures, 'html', 'static-deck.html')], out, { id: 'cli-fixture' });
    expect(JSON.parse(readFileSync(join(out, 'template-pack.json'), 'utf-8')).id).toBe('cli-fixture');
    expect(JSON.parse(readFileSync(join(out, 'coverage-thresholds.proposed.json'), 'utf-8')).reviewStatus).toBe('proposed');
    expect(pack.coverage?.metrics.slots.total).toBeGreaterThan(0);
    const sample = createSampleDeckFromTemplate(pack);
    expect(validateDeck(sample).success).toBe(true);
    const sampleOut = join(out, 'sample');
    const written = writeTemplateSampleProject(pack, sampleOut);
    expect(readFileSync(written.htmlPath, 'utf-8')).toMatch(/<!doctype html>/i);
  });

  it('compiles packs into guidance/style surfaces without renderer involvement', () => {
    const ir = extractTemplateIRFromSources([join(fixtures, 'pptx', 'simple-deck')], { id: 'compile-fixture' });
    const pack = inferTemplatePack(ir, { id: 'compile-fixture' });
    const compiled = compileTemplatePack(pack);
    expect(compiled.style.layoutPatterns[0].elementPositions.title).toBeDefined();
    expect(compiled.deckDesign.styleId).toBe(pack.id);
    expect(compiled.guidance.checklist.join(' ')).toMatch(/JSON DSL/);
  });

  it('keeps draft file-backed packs out of generation-safe lists unless explicitly included', () => {
    const ir = extractTemplateIRFromSources([join(fixtures, 'html', 'static-deck.html')], { id: 'registry-fixture' });
    const draft = inferTemplatePack(ir, { id: 'registry-fixture' });
    registerTemplatePack(draft);
    expect(listTemplatePacks().some((pack) => pack.id === 'registry-fixture')).toBe(false);
    expect(listTemplatePacks({ includeDrafts: true }).some((pack) => pack.id === 'registry-fixture')).toBe(true);
    expect(listAvailableTemplateStyles().some((style) => style.id === 'registry-fixture')).toBe(false);
    expect(listAvailableTemplateStyles({ includeDrafts: true }).some((style) => style.id === 'registry-fixture')).toBe(true);
    expect(() => registerTemplatePack({ ...draft, id: 'academic' })).toThrow(/built-in style/);
  });

  it('proves renderers and exporters do not import workflow template modules', () => {
    const repo = join(__dirname, '..', '..');
    for (const rel of ['packages/renderer-html/src', 'packages/renderer-svg/src', 'packages/exporter/src']) {
      const files: string[] = [];
      const stack = [join(repo, rel)];
      while (stack.length) {
        const current = stack.pop() as string;
        for (const name of readdirSync(current)) {
          const full = join(current, name);
          if (statSync(full).isDirectory()) stack.push(full);
          else if (full.endsWith('.ts')) files.push(full);
        }
      }
      for (const file of files) expect(readFileSync(file, 'utf-8')).not.toMatch(/templates\//);
    }
  });
});
