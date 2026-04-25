import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { renderDeckToSvg } from '../../packages/renderer-svg/src/index.js';
import { FontRegistry } from '../../packages/text-measure/src/index.js';
import { validateDeck } from '../../packages/schema/src/index.js';
import { comprehensiveTextMeasureDeck } from './fixtures/comprehensive-deck.js';

describe('visual export with fontkit', () => {
  it('exports the comprehensive in-repo fixture to PDF with fontkit measurement', () => {
    const validation = validateDeck(comprehensiveTextMeasureDeck);
    expect(validation.success).toBe(true);

    const registry = new FontRegistry();
    const result = renderDeckToSvg(comprehensiveTextMeasureDeck, { fontRegistry: registry });
    expect(new Set(result.warnings.map((warning) => warning.type))).toEqual(new Set(['layout-flattened']));

    // Write SVGs to temp dir
    const tmpDir = join(tmpdir(), `maliang-deck-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const svgFiles: string[] = [];
    for (const slide of result.slides) {
      const svgPath = join(tmpDir, `${slide.id}.svg`);
      writeFileSync(svgPath, slide.svg, 'utf-8');
      svgFiles.push(svgPath);
    }

    // Export to PDF via Python bridge
    const bridgeScript = resolve('python/maliang_deck_export_pdf.py');
    const outputPath = join(tmpDir, 'comprehensive-fixture.pdf');

    const exportArgs = JSON.stringify({
      svg_files: svgFiles,
      output: outputPath,
      width: comprehensiveTextMeasureDeck.meta.canvas.width,
      height: comprehensiveTextMeasureDeck.meta.canvas.height,
    });

    execFileSync('python3', [bridgeScript, exportArgs], { stdio: 'pipe', encoding: 'utf-8' });

    // Check data attrs are present on all slides
    for (const slide of result.slides) {
      expect(slide.svg).toContain('data-maliang-deck-id');
      expect(slide.svg).not.toContain('data-anim-enter');
    }

    expect(existsSync(outputPath)).toBe(true);
    expect(statSync(outputPath).size).toBeGreaterThan(0);
  });
});
