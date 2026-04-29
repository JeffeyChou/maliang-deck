import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { exportDeckToHtml } from '../../packages/exporter/src/index.js';

const dirs: string[] = [];

function makeDir(prefix: string): string {
  const dir = join(tmpdir(), `${prefix}-${process.pid}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  dirs.push(dir);
  return dir;
}

function writeCoreAssets(repoRoot: string): void {
  mkdirSync(join(repoRoot, 'runtime'), { recursive: true });
  mkdirSync(join(repoRoot, 'assets', 'animations'), { recursive: true });
  mkdirSync(join(repoRoot, 'assets', 'themes'), { recursive: true });
  mkdirSync(join(repoRoot, 'assets', 'fx'), { recursive: true });
  writeFileSync(join(repoRoot, 'runtime', 'runtime.js'), '/* runtime */\n', 'utf-8');
  writeFileSync(join(repoRoot, 'assets', 'themes', '_chart-table-base.css'), '/* chart-table */\n', 'utf-8');
  writeFileSync(join(repoRoot, 'assets', 'fx', 'fx-runtime.js'), "const FX_LIST = ['_util'];\n", 'utf-8');
  writeFileSync(join(repoRoot, 'assets', 'fx', '_util.js'), 'window.HPX = window.HPX || {};\n', 'utf-8');
}

describe('HTML local deck assets', () => {
  afterEach(() => {
    while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  });

  it('copies deck-local themes and FX modules without missing-asset warnings', () => {
    const repoRoot = makeDir('maliang-html-core');
    const deckRoot = makeDir('maliang-html-deck');
    const out = join(deckRoot, 'out');
    writeCoreAssets(repoRoot);

    mkdirSync(join(deckRoot, 'assets', 'themes'), { recursive: true });
    mkdirSync(join(deckRoot, 'assets', 'fx'), { recursive: true });
    writeFileSync(join(deckRoot, 'assets', 'themes', 'dreamy-blur.css'), '.slide { background: #0f172a; }\n', 'utf-8');
    writeFileSync(join(deckRoot, 'assets', 'fx', 'aurora-wave.js'), "window.HPX = window.HPX || {}; window.HPX['aurora-wave'] = function(){};\n", 'utf-8');

    const deckPath = join(deckRoot, 'deck.json');
    writeFileSync(deckPath, JSON.stringify({
      meta: {
        title: 'Local assets',
        theme: 'dreamy-blur',
        canvas: { width: 1280, height: 720 },
        htmlRuntime: {
          customScripts: ['./assets/fx/aurora-wave.js'],
        },
      },
      slides: [{ id: 'slide-1', fx: ['aurora-wave'], elements: [] }],
    }), 'utf-8');

    const result = exportDeckToHtml({ deckPath, outputDir: out, mode: 'readonly', repoRoot });

    expect(result.success).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(existsSync(join(out, 'assets', 'themes', 'dreamy-blur.css'))).toBe(true);
    expect(existsSync(join(out, 'assets', 'fx', 'aurora-wave.js'))).toBe(true);
    expect(readFileSync(join(out, 'assets', 'fx', 'fx-runtime.js'), 'utf-8')).toContain("'aurora-wave'");
  });
});
