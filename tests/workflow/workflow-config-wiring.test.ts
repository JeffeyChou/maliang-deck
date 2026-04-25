import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from '../../packages/cli/node_modules/commander/esm.mjs';
import { describe, expect, it, vi } from 'vitest';
import { registerWorkflowCommand } from '../../packages/cli/src/commands/workflow.js';
import {
  buildWorkflow,
  createProject,
  extractLocalSources,
  normalizeExtraction,
  saveProject,
  type DoclingExecFile,
} from '../../packages/workflow/src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function tempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-workflow-config-wiring-'));
  process.chdir(dir);
  return dir;
}

function readProject(slug: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join('projects', slug, 'project.json'), 'utf-8')) as Record<string, unknown>;
}

function minimalDeck(): unknown {
  return {
    meta: { title: 'Config Build', canvas: { width: 1280, height: 720 } },
    slides: [{ id: 'slide-1', elements: [{ type: 'text', id: 'title', x: 64, y: 64, width: 800, fontSize: 42, content: 'Configured' }] }],
  };
}

const fakeDoclingExec: DoclingExecFile = (file, args) => {
  expect(file).toBe('docling');
  if (args[0] === '--version') return 'docling 2.90.0';
  const outputIndex = args.indexOf('--output');
  const outputDir = args[outputIndex + 1];
  if (!outputDir) throw new Error('missing --output');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'sample.md'), '# Configured Docling\n\nBody.\n');
  writeFileSync(join(outputDir, 'sample.json'), JSON.stringify({ texts: [{ label: 'title', text: 'Configured Docling', prov: [{ page_no: 1 }] }] }));
  return 'converted';
};

describe('workflow hierarchical config wiring', () => {
  it('preserves manifest config and aliases through saveProject stage changes', () => {
    tempWorkspace();
    const manifest = createProject({
      slug: 'preserve-config',
      sources: ['sample.pdf'],
      outputFormats: ['html'],
      fonts: { Inter: './fonts/inter.ttf' },
      styleId: 'consulting',
      styleVersion: '0.1.0',
      config: {
        extraction: { provider: 'docling' },
        outputs: { formats: ['pdf'] },
        export: { pptxEngine: 'pptxgenjs' },
      },
    });

    const saved = saveProject(join('projects', 'preserve-config'), manifest, 'extracted');

    expect(saved.config).toMatchObject({ extraction: { provider: 'docling' }, outputs: { formats: ['pdf'] } });
    expect(saved.fonts).toEqual({ Inter: './fonts/inter.ttf' });
    expect(saved.styleId).toBe('consulting');
    expect(readProject('preserve-config').config).toMatchObject({ export: { pptxEngine: 'pptxgenjs' } });
  });

  it('uses resolved provider config for extract and normalize unless explicitly overridden', () => {
    const workspace = tempWorkspace();
    const sourcePath = join(workspace, 'source.pdf');
    writeFileSync(sourcePath, '%PDF-1.7 fixture');
    createProject({ slug: 'docling-config', sources: [sourcePath], config: { extraction: { provider: 'docling' } } });

    const extraction = extractLocalSources('docling-config', { execFile: fakeDoclingExec });
    expect(extraction.records[0]).toMatchObject({ id: 'm1', stage: 'done', markdown: 'extraction/docling/raw/m1/source.md' });
    const normalized = normalizeExtraction('docling-config');
    expect(normalized.materials[0].contentListPath).toBe('extraction/docling/raw/m1/content_list.json');

    const preparedDir = join(workspace, 'prepared-mineru');
    mkdirSync(preparedDir, { recursive: true });
    writeFileSync(join(preparedDir, 'full.md'), '# MinerU fixture\n');
    createProject({ slug: 'provider-override', sources: [{ id: 'source-1', kind: 'local-file', path: preparedDir }], config: { extraction: { provider: 'docling' } } });
    const mineru = extractLocalSources('provider-override', { provider: 'mineru' });
    expect(mineru.records[0]).toMatchObject({ id: 'm1', stage: 'done', markdown: 'extraction/mineru/raw/m1/source.md' });
  });

  it('uses resolved build formats and PPTX engine from project config', () => {
    tempWorkspace();
    createProject({ slug: 'html-build', sources: [], config: { outputs: { formats: ['html'] } } });
    mkdirSync(join('projects', 'html-build', 'dsl'), { recursive: true });
    writeFileSync(join('projects', 'html-build', 'dsl', 'deck.json'), JSON.stringify(minimalDeck()));

    buildWorkflow('html-build');
    expect(existsSync(join('projects', 'html-build', 'render', 'html', 'index.html'))).toBe(true);
    expect(existsSync(join('projects', 'html-build', 'exports', 'deck.pdf'))).toBe(false);
    expect(existsSync(join('projects', 'html-build', 'exports', 'deck.pptx'))).toBe(false);

    const chartTableDeck = JSON.parse(readFileSync(join(__dirname, '..', 'fixtures', 'exporter', 'chart-table-deck.json'), 'utf-8')) as unknown;
    createProject({ slug: 'pptxgen-build', sources: [], config: { outputs: { formats: ['pptx'] }, export: { pptxEngine: 'pptxgenjs' } } });
    mkdirSync(join('projects', 'pptxgen-build', 'dsl'), { recursive: true });
    writeFileSync(join('projects', 'pptxgen-build', 'dsl', 'deck.json'), JSON.stringify(chartTableDeck));
    const report = buildWorkflow('pptxgen-build');
    expect(report.results[0]).toMatchObject({ format: 'pptx', success: false });
    expect(report.results[0].error).toMatch(/pptxgenjs PPTX engine requested/);
    expect(report.results[0].error).not.toMatch(/DrawingML|chart\/table|unsupported/i);
  });

  it('copies deck image assets into the generated render asset bundle for HTML', () => {
    tempWorkspace();
    createProject({ slug: 'asset-build', sources: [], config: { outputs: { formats: ['html'] } } });
    mkdirSync(join('projects', 'asset-build', 'extraction', 'mineru', 'raw', 'm1', 'images'), { recursive: true });
    writeFileSync(join('projects', 'asset-build', 'extraction', 'mineru', 'raw', 'm1', 'images', 'figure.png'), 'png-fixture');
    mkdirSync(join('projects', 'asset-build', 'dsl'), { recursive: true });
    writeFileSync(join('projects', 'asset-build', 'dsl', 'deck.json'), JSON.stringify({
      meta: { title: 'Asset Build', canvas: { width: 1280, height: 720 } },
      slides: [{
        id: 'slide-1',
        elements: [
          { type: 'image', id: 'figure', x: 64, y: 64, width: 320, height: 180, src: 'extraction/mineru/raw/m1/images/figure.png' },
        ],
      }],
    }));

    buildWorkflow('asset-build');
    const html = readFileSync(join('projects', 'asset-build', 'render', 'html', 'index.html'), 'utf-8');
    expect(html).toContain('../assets/materials/1-figure.png');
    expect(existsSync(join('projects', 'asset-build', 'render', 'assets', 'materials', '1-figure.png'))).toBe(true);
  });

  it('lets workflow init use config defaults while explicit --formats remains an override', async () => {
    tempWorkspace();
    writeFileSync('maliang-deck.config.json', JSON.stringify({ outputs: { formats: ['html'] } }));

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const program = new Command();
      program.exitOverride();
      program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
      registerWorkflowCommand(program);
      await program.parseAsync(['node', 'test', 'workflow', 'init', 'cli-config-default', '--sources', 'source.pdf']);
      expect(readProject('cli-config-default').outputFormats).toEqual(['html']);

      const programWithOverride = new Command();
      programWithOverride.exitOverride();
      programWithOverride.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
      registerWorkflowCommand(programWithOverride);
      await programWithOverride.parseAsync(['node', 'test', 'workflow', 'init', 'cli-explicit', '--sources', 'source.pdf', '--formats', 'pdf,pptx']);
      expect(readProject('cli-explicit').outputFormats).toEqual(['pdf', 'pptx']);
    } finally {
      log.mockRestore();
    }
  });
});
