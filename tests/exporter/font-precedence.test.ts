import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { exportDeck, type ExportDeckRequest } from '../../packages/exporter/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

function fontAsset(fileName: string): string {
  return resolve(repoRoot, 'packages', 'text-measure', 'assets', fileName);
}

const cliFontPath = fontAsset('Inter-Bold.ttf');
const projectFontPath = fontAsset('NotoSerif-Regular.ttf');
const manifestFontPath = fontAsset('NotoSerif-Bold.ttf');
const deckFontPath = fontAsset('JetBrainsMono-Regular.ttf');
const bundledSansPath = fontAsset('Inter-Regular.ttf');

function deckWithFonts(fonts?: Record<string, string>): Deck {
  return {
    meta: {
      title: 'Font precedence',
      canvas: { width: 1280, height: 720 },
      ...(fonts ? { fonts } : {}),
    },
    slides: [
      {
        id: 'slide-1',
        elements: [
          {
            type: 'text',
            id: 'body',
            x: 80,
            y: 80,
            width: 700,
            height: 120,
            fontSize: 32,
            fontFamily: 'sans-serif',
            content: 'Font precedence should be visible to SVG export.',
          },
        ],
      },
    ],
  };
}

function renderSvgWithExporter(options: {
  fontMap?: Record<string, string>;
  projectFonts?: Record<string, string>;
  projectManifestFonts?: Record<string, string>;
  deckFonts?: Record<string, string>;
} = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-font-precedence-'));
  try {
    const deckPath = join(dir, 'deck.json');
    const outputPath = join(dir, 'deck.pdf');
    writeFileSync(deckPath, JSON.stringify(deckWithFonts(options.deckFonts)), 'utf-8');

    let projectManifestPath: string | undefined;
    if (options.projectManifestFonts) {
      projectManifestPath = join(dir, 'project.json');
      writeFileSync(projectManifestPath, JSON.stringify({ fonts: options.projectManifestFonts }), 'utf-8');
    }

    let renderedSvg = '';
    const request: ExportDeckRequest = {
      deckPath,
      outputPath,
      format: 'pdf',
      ...(options.fontMap ? { fontMap: options.fontMap } : {}),
      ...(options.projectFonts ? { projectFonts: options.projectFonts } : {}),
      ...(projectManifestPath ? { projectManifestPath } : {}),
    };

    const result = exportDeck(request, {
      runPythonBridge: (_bridgeScript, exportArgs) => {
        const parsed = JSON.parse(exportArgs) as { svg_files: string[] };
        renderedSvg = readFileSync(parsed.svg_files[0], 'utf-8');
      },
    });

    expect(result.success, result.error).toBe(true);
    expect(renderedSvg).toContain('@font-face');
    return renderedSvg;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function fontFaceRule(cssFamily: string, weight: 'normal' | 'bold', fontPath: string): string {
  return `@font-face { font-family: '${cssFamily}'; font-weight: ${weight}; src: url('file://${fontPath}'); }`;
}

function expectSansSerifNormalFontFacePath(svg: string, expectedPath: string): void {
  expect(svg).toContain(fontFaceRule('Inter', 'normal', expectedPath));
}

function expectNoSansSerifNormalFontFacePath(svg: string, unexpectedPath: string): void {
  expect(svg).not.toContain(fontFaceRule('Inter', 'normal', unexpectedPath));
}

describe('exporter font precedence', () => {
  it('accepts projectFonts and uses them as project-level fonts ahead of deck metadata', () => {
    const svg = renderSvgWithExporter({
      projectFonts: { 'sans-serif': projectFontPath },
      deckFonts: { 'sans-serif': deckFontPath },
    });

    expectSansSerifNormalFontFacePath(svg, projectFontPath);
    expectNoSansSerifNormalFontFacePath(svg, deckFontPath);
  });

  it('keeps explicit fontMap ahead of projectFonts', () => {
    const svg = renderSvgWithExporter({
      fontMap: { 'sans-serif': cliFontPath },
      projectFonts: { 'sans-serif': projectFontPath },
      deckFonts: { 'sans-serif': deckFontPath },
    });

    expectSansSerifNormalFontFacePath(svg, cliFontPath);
    expectNoSansSerifNormalFontFacePath(svg, projectFontPath);
    expectNoSansSerifNormalFontFacePath(svg, deckFontPath);
  });

  it('keeps deck metadata ahead of bundled fallback and preserves the no-config fallback', () => {
    const deckSvg = renderSvgWithExporter({
      deckFonts: { 'sans-serif': deckFontPath },
    });
    expectSansSerifNormalFontFacePath(deckSvg, deckFontPath);
    expectNoSansSerifNormalFontFacePath(deckSvg, bundledSansPath);

    const fallbackSvg = renderSvgWithExporter();
    expectSansSerifNormalFontFacePath(fallbackSvg, bundledSansPath);
  });

  it('falls back to projectManifestPath fonts when projectFonts are absent', () => {
    const svg = renderSvgWithExporter({
      projectManifestFonts: { 'sans-serif': manifestFontPath },
      deckFonts: { 'sans-serif': deckFontPath },
    });

    expectSansSerifNormalFontFacePath(svg, manifestFontPath);
    expectNoSansSerifNormalFontFacePath(svg, deckFontPath);
  });
});
