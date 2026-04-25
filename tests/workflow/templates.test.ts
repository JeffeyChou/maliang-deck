import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TemplatePackSchema,
  compileTemplatePackToStyle,
  extractTemplateIr,
  extractTemplatePack,
  generateTemplateSampleDeck,
  loadTemplatePackStyles,
  writeTemplateExtraction,
} from '@maliang-deck/workflow';
import { validateDeck } from '@maliang-deck/schema';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'maliang-deck-template-test-'));
}

function localZip(entries: Record<string, string>): Buffer {
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(entries)) {
    const nameBuffer = Buffer.from(name, 'utf8');
    const data = Buffer.from(value, 'utf8');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt32LE(0, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBuffer.length, 26);
    header.writeUInt16LE(0, 28);
    chunks.push(header, nameBuffer, data);
  }
  return Buffer.concat(chunks);
}

function png(width = 1280, height = 720): Buffer {
  const signature = Buffer.from('89504e470d0a1a0a', 'hex');
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4, 'ascii');
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8;
  ihdr[17] = 2;
  const iend = Buffer.from('0000000049454e44ae426082', 'hex');
  return Buffer.concat([signature, ihdr, iend]);
}

function writeFixtures(root: string): string[] {
  const pptx = join(root, 'fixture.pptx');
  writeFileSync(pptx, localZip({
    'ppt/presentation.xml': '<p:presentation><p:sldSz cx="12192000" cy="6858000"/></p:presentation>',
    'ppt/theme/theme1.xml': '<a:srgbClr val="0A3D7C"/><a:srgbClr val="E8A020"/>',
    'ppt/slides/slide1.xml': '<p:sld><a:t>Title slide</a:t><a:solidFill><a:srgbClr val="0A3D7C"/></a:solidFill></p:sld>',
    'ppt/slides/slide2.xml': '<p:sld><a:t>Body content</a:t><p:pic/><a:tbl/></p:sld>',
  }));
  const html = join(root, 'fixture.html');
  writeFileSync(html, '<html><head><style>.slide{width:1280px;height:720px;color:#0a3d7c;font-family:Inter}</style><script>throw new Error()</script></head><body><h1>HTML Title</h1><p class="body">HTML body</p><img src="https://example.invalid/a.png"><table><tr><td>A</td></tr></table></body></html>');
  const pdf = join(root, 'fixture.pdf');
  writeFileSync(pdf, '%PDF-1.4\n1 0 obj << /MediaBox [0 0 1280 720] >> endobj\nBT (PDF Title) Tj (PDF body) Tj ET\n%%EOF');
  const image = join(root, 'fixture.png');
  writeFileSync(image, png());
  return [pptx, html, pdf, image];
}

describe('template extraction contracts and adapters', () => {
  it('extracts deterministic PPTX/HTML/PDF/PNG fixtures into IR with provenance', () => {
    const root = tempDir();
    const paths = writeFixtures(root);
    const irs = extractTemplateIr(paths);
    expect(irs.map((ir) => ir.source.format)).toEqual(['pptx', 'html', 'pdf', 'png']);
    expect(irs.every((ir) => ir.observations.length > 0)).toBe(true);
    expect(irs.every((ir) => ir.provenance.length > 0)).toBe(true);
    expect(irs.find((ir) => ir.source.format === 'html')?.warnings.join('\n')).toMatch(/scripts|network/i);
  });

  it('rejects unsafe/corrupt untrusted inputs clearly', () => {
    const root = tempDir();
    const unsafe = join(root, 'unsafe.pptx');
    writeFileSync(unsafe, localZip({ '../evil.xml': '<x />' }));
    expect(() => extractTemplateIr([unsafe])).toThrow(/path traversal/i);
    const badPng = join(root, 'bad.png');
    writeFileSync(badPng, 'not-png');
    expect(() => extractTemplateIr([badPng])).toThrow(/Malformed PNG/i);
    const encrypted = join(root, 'secret.pdf');
    writeFileSync(encrypted, '%PDF-1.4 /Encrypt true');
    expect(() => extractTemplateIr([encrypted])).toThrow(/encrypted/i);
  });

  it('infers draft packs, coverage, advisory thresholds, and sample deck output', () => {
    const root = tempDir();
    const paths = writeFixtures(root);
    const out = join(root, 'out');
    const result = writeTemplateExtraction(paths, out, { id: 'fixture-template', name: 'Fixture Template' });
    expect(TemplatePackSchema.parse(result.pack).activation.status).toBe('draft');
    expect(result.coverage.significantObservationCount).toBeGreaterThan(0);
    expect(result.thresholds.reviewStatus).toBe('proposed');
    expect(existsSync(join(out, 'template-pack.json'))).toBe(true);
    expect(existsSync(join(out, 'coverage-report.json'))).toBe(true);
    expect(existsSync(join(out, 'coverage-thresholds.proposed.json'))).toBe(true);
    expect(existsSync(join(out, 'sample', 'dsl', 'deck.json'))).toBe(true);
    expect(existsSync(join(out, 'sample', 'render', 'html', 'index.html'))).toBe(true);
  });
});

describe('template compilation and registry boundaries', () => {
  it('compiles TemplatePack to style/guidance surfaces without renderer awareness', () => {
    const root = tempDir();
    const result = extractTemplatePack(writeFixtures(root), { id: 'compiled-template' });
    const style = compileTemplatePackToStyle(result.pack);
    expect(style.id).toBe('compiled-template');
    expect(style.layoutPatterns.length).toBeGreaterThan(0);
    const deck = generateTemplateSampleDeck(result.pack);
    expect(validateDeck(deck).success).toBe(true);
  });

  it('filters draft template styles by default and rejects built-in shadowing', () => {
    const root = tempDir();
    const draft = extractTemplatePack(writeFixtures(root), { id: 'draft-template' }).pack;
    const draftPath = join(root, 'draft.json');
    writeFileSync(draftPath, JSON.stringify(draft, null, 2));
    expect(loadTemplatePackStyles([draftPath])).toHaveLength(0);
    expect(loadTemplatePackStyles([draftPath], { includeDrafts: true })).toHaveLength(1);

    const shadow = { ...draft, id: 'academic', activation: { status: 'draft' as const } };
    const shadowPath = join(root, 'shadow.json');
    writeFileSync(shadowPath, JSON.stringify(shadow, null, 2));
    expect(() => loadTemplatePackStyles([shadowPath], { includeDrafts: true })).toThrow(/built-in/i);
  });

  it('keeps renderers and exporters template-unaware', () => {
    const renderer = readFileSync(join(process.cwd(), 'packages', 'renderer-html', 'src', 'render.ts'), 'utf8')
      + readFileSync(join(process.cwd(), 'packages', 'renderer-svg', 'src', 'render.ts'), 'utf8')
      + readFileSync(join(process.cwd(), 'packages', 'exporter', 'src', 'export-deck.ts'), 'utf8');
    expect(renderer).not.toMatch(/templates\//);
    expect(renderer).not.toMatch(/TemplatePack/);
  });
});
