import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildDoclingCommand,
  createProject,
  extractLocalSources,
  normalizeExtraction,
  runDoclingOnFile,
  type DoclingExecFile,
} from '../../packages/workflow/src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function tempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-docling-provider-'));
  process.chdir(dir);
  return dir;
}

const fakeDoclingExec: DoclingExecFile = (file, args) => {
  expect(file).toBe('docling');
  if (args[0] === '--version') return 'docling 2.90.0';
  expect(args).toContain('--no-enable-remote-services');
  expect(args).toContain('--no-allow-external-plugins');
  const outputIndex = args.indexOf('--output');
  const outputDir = args[outputIndex + 1];
  if (!outputDir) throw new Error('missing --output');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'sample.md'), '# Docling Fixture\n\nBody paragraph from markdown.\n');
  writeFileSync(join(outputDir, 'sample.json'), JSON.stringify({
    texts: [
      { label: 'title', text: 'Docling Fixture', prov: [{ page_no: 1, bbox: { l: 10, t: 20, r: 110, b: 40 } }] },
      { label: 'text', text: 'Body paragraph from JSON.', prov: [{ page_no: 1 }] },
    ],
    pictures: [
      { label: 'picture', image: { uri: join(outputDir, 'sample_artifacts', 'figure.png') }, prov: [{ page_no: 1, bbox: { l: 30, t: 40, r: 90, b: 100 } }] },
    ],
    tables: [
      { label: 'table', data: { table_cells: [{ text: 'A' }, { text: 'B' }] }, prov: [{ page_no: 2 }] },
    ],
  }));
  mkdirSync(join(outputDir, 'sample_artifacts'), { recursive: true });
  writeFileSync(join(outputDir, 'sample_artifacts', 'figure.png'), 'png-fixture');
  return 'converted';
};

describe('Docling optional extraction provider', () => {
  it('builds a safe local Docling command without shell-only behavior', () => {
    const command = buildDoclingCommand({
      sourcePath: '/tmp/source.pdf',
      outputDir: '/tmp/out',
      ocr: false,
      tables: true,
      tableMode: 'fast',
      documentTimeoutSeconds: 30,
      artifactsPath: '/models/docling',
    });
    expect(command.executable).toBe('docling');
    expect(command.args).toEqual(expect.arrayContaining([
      '--to', 'md',
      '--to', 'json',
      '--no-ocr',
      '--tables',
      '--table-mode', 'fast',
      '--no-enable-remote-services',
      '--no-allow-external-plugins',
      '--artifacts-path', '/models/docling',
      '--document-timeout', '30',
      '--output', '/tmp/out',
      '/tmp/source.pdf',
    ]));
  });

  it('stages Docling output separately and normalizes it through provider-aware normalization', () => {
    const workspace = tempWorkspace();
    const sourcePath = join(workspace, 'source.pdf');
    writeFileSync(sourcePath, '%PDF-1.7 fixture');
    createProject('docling-demo', [sourcePath]);

    const extraction = extractLocalSources('docling-demo', { provider: 'docling', execFile: fakeDoclingExec });
    expect(extraction.records).toHaveLength(1);
    expect(extraction.rawDirs[0]).toMatch(/extraction\/docling\/raw\/m1$/);
    expect(extraction.records[0]).toMatchObject({
      id: 'm1',
      sourceId: 'source-1',
      stage: 'done',
      markdown: 'extraction/docling/raw/m1/source.md',
      artifacts: 'extraction/docling/raw/m1/artifacts',
    });
    expect(readFileSync(join('projects', 'docling-demo', 'extraction', 'docling', 'raw', 'm1', 'source.md'), 'utf-8')).toContain('Docling Fixture');

    const normalized = normalizeExtraction('docling-demo', { provider: 'docling' });
    expect(normalized.materials[0]).toMatchObject({ id: 'm1', sourceId: 'source-1', contentListPath: 'extraction/docling/raw/m1/content_list.json' });
    expect(normalized.blocks.map((block) => block.kind)).toEqual(['title', 'text', 'table', 'image']);
    expect(normalized.blocks[3].assetRefs).toEqual(['m1-asset-1']);
    expect(normalized.assets[0]).toMatchObject({
      kind: 'image',
      sourcePath: 'extraction/docling/raw/m1/artifacts/sample_artifacts/figure.png',
    });
    expect(normalized.assets[0].normalizedPath).toBeUndefined();
    expect(normalized.blocks[2].text).toContain('A | B');
  });

  it('keeps MinerU as the default provider', () => {
    const workspace = tempWorkspace();
    const preparedDir = join(workspace, 'prepared-mineru');
    mkdirSync(preparedDir, { recursive: true });
    writeFileSync(join(preparedDir, 'full.md'), '# Prepared MinerU artifact\n');
    createProject('mineru-default', [{ id: 'source-1', kind: 'local-file', path: preparedDir }]);
    const result = extractLocalSources('mineru-default');
    expect(result.records[0]).toMatchObject({ id: 'm1', sourceId: 'source-1', stage: 'done', markdown: 'extraction/mineru/raw/m1/source.md' });
  });

  it('rejects remote URL sources for Docling by default', () => {
    tempWorkspace();
    createProject('remote-doc', ['https://example.test/source.pdf']);
    expect(() => extractLocalSources('remote-doc', { provider: 'docling', execFile: fakeDoclingExec })).toThrow(/rejects remote-url/);
  });

  it('reports missing Docling executable with install guidance', () => {
    const workspace = tempWorkspace();
    const sourcePath = join(workspace, 'source.pdf');
    writeFileSync(sourcePath, '%PDF-1.7 fixture');
    const missingExec: DoclingExecFile = () => {
      throw Object.assign(new Error('spawn docling ENOENT'), { code: 'ENOENT' });
    };
    expect(() => runDoclingOnFile({
      projectDir: workspace,
      sourcePath,
      materialId: 'source',
      execFile: missingExec,
    })).toThrow(/pip install docling/);
  });

  it('does not add Docling as a required npm dependency', () => {
    const repoRoot = join(__dirname, '..', '..');
    const rootPackage = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf-8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const workflowPackage = JSON.parse(readFileSync(join(repoRoot, 'packages', 'workflow', 'package.json'), 'utf-8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    expect(rootPackage.dependencies?.docling ?? rootPackage.devDependencies?.docling).toBeUndefined();
    expect(workflowPackage.dependencies?.docling ?? workflowPackage.devDependencies?.docling).toBeUndefined();
  });
});
