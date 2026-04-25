import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportDeck } from '../../packages/exporter/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

const deck: Deck = {
  meta: { title: 'No JS fallback', canvas: { width: 1280, height: 720 } },
  slides: [
    {
      id: 'slide-1',
      elements: [
        {
          type: 'text',
          id: 'title',
          x: 80,
          y: 80,
          width: 600,
          fontSize: 44,
          content: 'Explicit JS export failures must stay explicit',
        },
      ],
    },
  ],
};

describe('pptxgenjs export failure routing', () => {
  it('does not auto-fallback to the Python/DrawingML bridge after an explicit JS exporter throws', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-no-js-fallback-'));
    const deckPath = join(dir, 'deck.json');
    const outputPath = join(dir, 'deck.pptx');
    writeFileSync(deckPath, JSON.stringify(deck), 'utf-8');

    let pythonBridgeCalls = 0;

    const result = exportDeck(
      { deckPath, outputPath, format: 'pptx', pptxEngine: 'pptxgenjs' },
      {
        exportPptxgenjs: () => {
          throw new Error('synthetic pptxgenjs failure');
        },
        runPythonBridge: () => {
          pythonBridgeCalls += 1;
          throw new Error('Python fallback should not run');
        },
      },
    );

    expect(result).toMatchObject({
      format: 'pptx',
      outputPath,
      success: false,
      error: 'pptxgenjs export failed: synthetic pptxgenjs failure',
    });
    expect(pythonBridgeCalls).toBe(0);
    expect(existsSync(outputPath)).toBe(false);
  });

  it('does not auto-fallback to the Python/DrawingML bridge after an explicit JS exporter returns failure', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-no-js-fallback-'));
    const deckPath = join(dir, 'deck.json');
    const outputPath = join(dir, 'deck.pptx');
    writeFileSync(deckPath, JSON.stringify(deck), 'utf-8');

    let pythonBridgeCalls = 0;

    const result = exportDeck(
      { deckPath, outputPath, format: 'pptx', pptxEngine: 'pptxgenjs' },
      {
        exportPptxgenjs: () => ({
          format: 'pptx',
          outputPath,
          success: false,
          warnings: [],
          error: 'synthetic returned JS failure',
        }),
        runPythonBridge: () => {
          pythonBridgeCalls += 1;
          throw new Error('Python fallback should not run');
        },
      },
    );

    expect(result).toMatchObject({
      format: 'pptx',
      outputPath,
      success: false,
      error: 'synthetic returned JS failure',
    });
    expect(pythonBridgeCalls).toBe(0);
    expect(existsSync(outputPath)).toBe(false);
  });
});
