import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateDeck } from '@maliang-deck/schema';
import { generatePptxAnimationPlan, classifyPptxAnimationSupport } from '../../packages/exporter/src/pptx-animation.js';
import {
  createProject,
  approveOutline,
  createDslWorkOrders,
  normalizeExtraction,
  validateDeckPlan,
  parseMinerUTaskResult,
  defaultMinerUOptions,
  recordRetry,
} from '../../packages/workflow/src/index.js';
import { writeJson } from '../../packages/workflow/src/fs-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function tempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-workflow-test-'));
  process.chdir(dir);
  return dir;
}

describe('MinerU workflow contracts', () => {
  it('creates canonical project manifests and rejects unsafe slugs', () => {
    tempWorkspace();
    const manifest = createProject('demo', ['sample.pdf'], ['html', 'pdf', 'pptx']);
    expect(manifest.currentStage).toBe('initialized');
    expect(manifest.sources[0].kind).toBe('local-file');
    expect(() => createProject('../bad', [])).toThrow(/Invalid project slug/);
  });

  it('validates MinerU response invariants and default precise options', () => {
    expect(defaultMinerUOptions()).toMatchObject({ model: 'vlm', enable_table: true, enable_formula: true, is_ocr: false });
    expect(parseMinerUTaskResult({ code: 0, msg: 'ok', data: { task_id: 't1', state: 'done', full_zip_url: 'https://example.test/r.zip' } }).data?.state).toBe('done');
    expect(() => parseMinerUTaskResult({ code: 0, msg: 'ok', trace_id: 'trace', data: { task_id: 't1', state: 'done' } })).toThrow(/missing full_zip_url/);
  });

  it('normalizes content-list blocks and asset references', () => {
    tempWorkspace();
    createProject('fixture', ['fixture.zip']);
    const materialDir = join('projects', 'fixture', 'extraction', 'mineru', 'unpacked', 'material');
    mkdirSync(join(materialDir, 'images'), { recursive: true });
    copyFileSync(join(__dirname, '..', 'fixtures', 'mineru', 'content-list-basic.json'), join(materialDir, 'content_list.json'));
    writeFileSync(join(materialDir, 'images', 'figure-1.png'), 'png-fixture');
    const result = normalizeExtraction('fixture');
    expect(result.blocks).toHaveLength(3);
    expect(result.assets[0]).toMatchObject({ kind: 'image', caption: 'Tiny image' });
  });

  it('enforces outline gate and deck-plan reference validation before DSL work orders', () => {
    tempWorkspace();
    createProject('gate', ['sample.pdf']);
    writeJson(join('projects', 'gate', 'extraction', 'normalized', 'blocks.json'), [{ id: 'block-1', materialId: 'm1', kind: 'text', text: 'body', sourceOrder: 0, assetRefs: [] }]);
    writeJson(join('projects', 'gate', 'extraction', 'normalized', 'assets.json'), []);
    writeFileSync(join('projects', 'gate', 'planning', 'outline-draft.md'), '# outline');
    writeJson(join('projects', 'gate', 'planning', 'deck-plan.json'), {
      projectSlug: 'gate',
      slides: [{ id: 'slide-1', title: 'Slide', sourceBlockRefs: ['block-1'], candidateAssetRefs: [], layoutIntent: 'body', outputConstraints: ['html'] }],
    });
    expect(() => createDslWorkOrders('gate')).toThrow(/approval gate/);
    approveOutline('gate');
    expect(validateDeckPlan('gate').slides).toHaveLength(1);
    expect(createDslWorkOrders('gate', { parallel: true })).toHaveLength(1);
  });

  it('preserves per-element PPTX animation timing and reports fallbacks', () => {
    const deck = {
      meta: { title: 'Anim', canvas: { width: 1280, height: 720 } },
      slides: [{
        id: 's1',
        elements: [
          { type: 'text', id: 'a', x: 0, y: 0, width: 100, fontSize: 20, content: 'A', animation: { enter: 'fade-up', step: 1, duration: 100, delay: 0 } },
          { type: 'text', id: 'b', x: 0, y: 50, width: 100, fontSize: 20, content: 'B', animation: { enter: 'slide-from-left', step: 1, duration: 800, delay: 50 } },
          { type: 'text', id: 'c', x: 0, y: 100, width: 100, fontSize: 20, content: 'C', animation: { enter: 'future-effect', step: 2 } },
        ],
      }],
    };
    expect(validateDeck(deck).success).toBe(true);
    const plan = generatePptxAnimationPlan(deck as never);
    expect(plan[0].steps[0].items.map((item) => [item.elementId, item.durationMs])).toEqual([['a', 100], ['b', 800]]);
    const report = classifyPptxAnimationSupport(plan);
    expect(report.downgraded).toHaveLength(1);
    expect(report.supported).toHaveLength(1);
    expect(report.unsupported).toHaveLength(1);
  });

  it('records retry limit escalation after three attempts', () => {
    let result = recordRetry([], 'network');
    expect(result.shouldRetry).toBe(true);
    result = recordRetry(result.attempts, 'network again');
    expect(result.shouldRetry).toBe(true);
    result = recordRetry(result.attempts, 'network final');
    expect(result.shouldRetry).toBe(false);
    expect(result.escalation).toMatch(/Retry limit/);
  });
});
