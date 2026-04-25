import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { exportDeck } from '../../packages/exporter/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '..', 'fixtures', 'exporter', 'chart-table-deck.json');

function readFixtureDeck(): Deck {
  return JSON.parse(readFileSync(fixturePath, 'utf-8')) as Deck;
}

function writeDeck(dir: string, deck: Deck = readFixtureDeck()): string {
  const deckPath = join(dir, 'deck.json');
  writeFileSync(deckPath, JSON.stringify(deck), 'utf-8');
  return deckPath;
}

describe('chart/table PDF export through SVG rendering', () => {
  it('allows chart/table decks on the PDF path after SVG support and maps warnings to svg codes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-chart-table-pdf-'));
    const deckPath = writeDeck(dir);
    const outputPath = join(dir, 'deck.pdf');
    let bridgeCalls = 0;

    try {
      const result = exportDeck(
        { deckPath, outputPath, format: 'pdf' },
        {
          runPythonBridge: (_bridgeScript, exportArgs) => {
            bridgeCalls += 1;
            const args = JSON.parse(exportArgs) as { svg_files: string[]; output: string; width: number; height: number };
            expect(args.output).toBe(outputPath);
            expect(args.width).toBe(1280);
            expect(args.height).toBe(720);
            expect(args.svg_files).toHaveLength(1);

            const svg = readFileSync(args.svg_files[0], 'utf-8');
            expect(svg).toContain('data-maliang-deck-id="revenue-chart"');
            expect(svg).toContain('data-maliang-deck-id="summary-table"');
            expect(svg).toContain('data-maliang-deck-kind="chart"');
            expect(svg).toContain('data-maliang-deck-kind="table"');
          },
        },
      );

      expect(result.success, result.error).toBe(true);
      expect(bridgeCalls).toBe(1);
      expect(result.warnings.map((warning) => warning.code)).toContain('svg-unsupported-feature');
      expect(result.warnings.every((warning) => !warning.code.startsWith('text-unsupported-feature'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
