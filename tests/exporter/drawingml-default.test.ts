import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportDeck } from '../../packages/exporter/src/index.js';

const mocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFileSync: mocks.execFileSync,
}));


function writeLegacyDeck(dir: string): string {
  const deckPath = join(dir, 'legacy-deck.json');
  writeFileSync(
    deckPath,
    JSON.stringify({
      meta: { title: 'Legacy PPTX', canvas: { width: 1280, height: 720 } },
      slides: [
        {
          id: 'slide-1',
          elements: [
            {
              type: 'rect',
              id: 'box',
              x: 96,
              y: 80,
              width: 320,
              height: 180,
              fill: '#3366ff',
            },
          ],
        },
      ],
    }),
    'utf-8',
  );
  return deckPath;
}

describe('PPTX default engine', () => {
  afterEach(() => {
    mocks.execFileSync.mockReset();
  });

  it('keeps the Python/DrawingML bridge as the default PPTX export path', () => {
    mocks.execFileSync.mockReturnValue('');
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-drawingml-default-'));

    try {
      const deckPath = writeLegacyDeck(dir);
      const outputPath = join(dir, 'legacy-deck.pptx');

      const result = exportDeck({ deckPath, outputPath, format: 'pptx' });

      expect(result.success).toBe(true);
      expect(mocks.execFileSync).toHaveBeenCalledTimes(1);
      const [command, args] = mocks.execFileSync.mock.calls[0];
      expect(command).toBe('python3');
      expect(args[0]).toMatch(/python\/maliang_deck_export\.py$/);
      expect(args[0]).not.toContain('maliang_deck_export_pdf.py');

      const bridgePayload = JSON.parse(args[1]);
      expect(bridgePayload.output).toBe(outputPath);
      expect(bridgePayload.format).toBe('widescreen');
      expect(bridgePayload.svg_files).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
