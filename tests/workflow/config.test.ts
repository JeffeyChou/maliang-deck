import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ConfigResolutionError,
  MaliangDeckConfigSchema,
  getConfigValueSource,
  resolveMaliangDeckConfig,
} from '../../packages/workflow/src/index.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'maliang-deck-config-test-'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
}

describe('hierarchical workflow configuration resolver', () => {
  it('returns current defaults with built-in provenance when no config exists', () => {
    const root = tempDir();
    const result = resolveMaliangDeckConfig({ cwd: root, homeDir: join(root, 'home'), projectRoot: root });

    expect(result.config.extraction.provider).toBe('mineru');
    expect(result.config.outputs.formats).toEqual(['html', 'pdf', 'pptx']);
    expect(getConfigValueSource(result.report, 'extraction.provider')?.kind).toBe('built-in');
    expect(getConfigValueSource(result.report, 'outputs.formats')?.label).toBe('built-in defaults');
  });

  it('applies global, workspace, manifest, aliases, requirements, deck metadata, and CLI precedence with source reporting', () => {
    const root = tempDir();
    const home = join(root, 'home');
    const projectRoot = join(root, 'project');
    const globalPath = join(home, '.maliang-deck', 'config.json');
    const workspacePath = join(projectRoot, 'maliang-deck.config.json');
    writeJson(globalPath, {
      fonts: { Inter: './fonts/Inter-Regular.ttf' },
      styleVersion: 'global-version',
    });
    writeJson(workspacePath, {
      theme: 'workspace-theme',
      export: { overflowTolerance: 4 },
    });

    const result = resolveMaliangDeckConfig({
      homeDir: home,
      cwd: projectRoot,
      projectRoot,
      manifest: {
        config: { styleVersion: 'manifest-version', export: { overflowPolicy: 'fail' } },
        outputFormats: ['pdf'],
        styleId: 'alias-style',
      },
      requirements: { outputFormats: ['pptx'], theme: 'requirements-theme' },
      deckMeta: { canvas: { width: 1024, height: 768 } },
      cliOverrides: { provider: 'docling' },
    });

    expect(result.config).toMatchObject({
      extraction: { provider: 'docling' },
      outputs: { formats: ['pptx'] },
      export: { overflowPolicy: 'fail', overflowTolerance: 4 },
      styleId: 'alias-style',
      styleVersion: 'manifest-version',
      theme: 'requirements-theme',
      canvas: { width: 1024, height: 768 },
    });
    expect(result.config.fonts?.Inter).toBe(join(home, '.maliang-deck', 'fonts', 'Inter-Regular.ttf'));
    expect(getConfigValueSource(result.report, 'fonts.Inter')?.kind).toBe('global');
    expect(getConfigValueSource(result.report, 'export.overflowTolerance')?.kind).toBe('workspace');
    expect(getConfigValueSource(result.report, 'export.overflowPolicy')?.kind).toBe('manifest');
    expect(getConfigValueSource(result.report, 'styleId')?.kind).toBe('compatibility');
    expect(getConfigValueSource(result.report, 'outputs.formats')?.kind).toBe('requirements');
    expect(getConfigValueSource(result.report, 'canvas.width')?.kind).toBe('deck-meta');
    expect(getConfigValueSource(result.report, 'extraction.provider')?.kind).toBe('cli');
  });

  it('deep-merges objects but replaces arrays from later sources', () => {
    const root = tempDir();
    const home = join(root, 'home');
    const projectRoot = join(root, 'project');
    writeJson(join(home, '.maliang-deck', 'config.json'), {
      outputs: { formats: ['html', 'pdf'] },
      tokens: { palette: { primary: '#0066FF', neutral: '#111111' } },
    });
    writeJson(join(projectRoot, 'maliang-deck.config.json'), {
      outputs: { formats: ['pptx'] },
      tokens: { palette: { secondary: '#EEEEEE' } },
    });

    const result = resolveMaliangDeckConfig({ homeDir: home, cwd: projectRoot, projectRoot });

    expect(result.config.outputs.formats).toEqual(['pptx']);
    expect(result.config.tokens?.palette).toEqual({ primary: '#0066FF', neutral: '#111111', secondary: '#EEEEEE' });
    expect(getConfigValueSource(result.report, 'outputs.formats')?.kind).toBe('workspace');
    expect(getConfigValueSource(result.report, 'tokens.palette.primary')?.kind).toBe('global');
    expect(getConfigValueSource(result.report, 'tokens.palette.secondary')?.kind).toBe('workspace');
  });

  it('treats flat explicit CLI provider and formats as final overrides', () => {
    const root = tempDir();
    const result = resolveMaliangDeckConfig({
      projectRoot: root,
      homeDir: join(root, 'home'),
      manifest: {
        config: {
          extraction: { provider: 'docling' },
          outputs: { formats: ['html'] },
        },
      },
      cliOverrides: { provider: 'mineru', formats: ['pdf', 'pptx'] },
    });

    expect(result.config.extraction.provider).toBe('mineru');
    expect(result.config.outputs.formats).toEqual(['pdf', 'pptx']);
    expect(getConfigValueSource(result.report, 'outputs.formats')?.kind).toBe('cli');
  });

  it('reports invalid schema values with source file and field path', () => {
    const root = tempDir();
    const home = join(root, 'home');
    const globalPath = join(home, '.maliang-deck', 'config.json');
    writeJson(globalPath, { extraction: { provider: 'bad-provider' } });

    expect(() => resolveMaliangDeckConfig({ homeDir: home, projectRoot: root })).toThrow(ConfigResolutionError);
    expect(() => resolveMaliangDeckConfig({ homeDir: home, projectRoot: root })).toThrow(/global config .*config\.json.*extraction\.provider/);

    const workspacePath = join(root, 'maliang-deck.config.json');
    writeJson(globalPath, {});
    writeJson(workspacePath, { outputs: { formats: ['keynote'] } });
    expect(() => resolveMaliangDeckConfig({ homeDir: home, projectRoot: root })).toThrow(/workspace config .*outputs\.formats\.0/);

    const removedPptxEngineKey = 'pptx' + 'Engine';
    writeJson(workspacePath, { export: { [removedPptxEngineKey]: 'drawingml' } });
    expect(() => resolveMaliangDeckConfig({ homeDir: home, projectRoot: root })).toThrow(/Unrecognized key/);

    writeJson(workspacePath, { tokens: { palette: { primary: 123 } } });
    expect(() => resolveMaliangDeckConfig({ homeDir: home, projectRoot: root })).toThrow(/tokens\.palette\.primary/);
  });

  it('resolves local template paths by source base and rejects remote or executable template packs', () => {
    const root = tempDir();
    const home = join(root, 'home');
    const projectRoot = join(root, 'project');
    writeJson(join(home, '.maliang-deck', 'config.json'), { templatePackPaths: ['./templates/global-pack.json'] });

    const result = resolveMaliangDeckConfig({
      homeDir: home,
      projectRoot,
      manifest: { config: { templatePackPaths: ['./templates/project-pack.json'] } },
    });
    expect(result.config.templatePackPaths).toEqual([join(projectRoot, 'templates', 'project-pack.json')]);

    writeJson(join(projectRoot, 'maliang-deck.config.json'), { templatePackPaths: ['https://example.test/template-pack.json'] });
    expect(() => resolveMaliangDeckConfig({ homeDir: home, projectRoot })).toThrow(/remote template pack paths/);
    writeJson(join(projectRoot, 'maliang-deck.config.json'), { templatePackPaths: ['./template-pack.mjs'] });
    expect(() => resolveMaliangDeckConfig({ homeDir: home, projectRoot })).toThrow(/executable template pack paths/);
  });

  it('normalizes manifest compatibility aliases into config inputs', () => {
    const root = tempDir();
    const result = resolveMaliangDeckConfig({
      homeDir: join(root, 'home'),
      projectRoot: root,
      manifest: {
        outputFormats: ['html'],
        fonts: { Inter: './fonts/inter.ttf' },
        styleId: 'consulting',
        styleVersion: '0.1.0',
      },
    });

    expect(result.config.outputs.formats).toEqual(['html']);
    expect(result.config.fonts?.Inter).toBe(join(root, 'fonts', 'inter.ttf'));
    expect(result.config.styleId).toBe('consulting');
    expect(result.config.styleVersion).toBe('0.1.0');
    expect(getConfigValueSource(result.report, 'styleVersion')?.kind).toBe('compatibility');
  });

  it('rejects unsupported keys by default', () => {
    expect(() => MaliangDeckConfigSchema.parse({ visualSystem: { id: 'new-model' } })).toThrow(/Unrecognized key/);
  });
});
