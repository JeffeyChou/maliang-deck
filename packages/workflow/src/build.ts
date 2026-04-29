import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative } from 'node:path';
import { createExportReport, exportDeck, type ExportDeckResult, type ExportFormat } from '@maliang-deck/exporter';
import { renderDeckToHtml } from '@maliang-deck/renderer-html';
import { validateDeck, type Deck, type Element } from '@maliang-deck/schema';
import { loadProject, projectRoot, saveProject } from './project.js';
import { resolveProjectMaliangDeckConfig, type MaliangDeckCliOverrides } from './config.js';
import { writeJson } from './fs-utils.js';
import type { OutputFormat } from './schemas.js';

function loadValidDeck(deckPath: string) {
  const parsed = JSON.parse(readFileSync(deckPath, 'utf-8')) as unknown;
  const result = validateDeck(parsed);
  if (!result.success) throw new Error(`Invalid deck: ${result.errors.map((e: { path: Array<string | number>; message: string }) => `${e.path.join('.')}: ${e.message}`).join('; ')}`);
  return result.data;
}

function cloneDeck(deck: Deck): Deck {
  return JSON.parse(JSON.stringify(deck)) as Deck;
}

function rewriteElementImages(elements: Element[], rewrite: (src: string) => string): void {
  for (const element of elements) {
    if (element.type === 'image') {
      element.src = rewrite(element.src);
    } else if (element.type === 'group' || element.type === 'layout') {
      rewriteElementImages(element.elements, rewrite);
    }
  }
}

function materializeDeckAssets(root: string, deck: Deck, outputBaseDir: string, srcBaseDir: string): Deck {
  const next = cloneDeck(deck);
  const assetRoot = join(root, 'render', 'assets', 'materials');
  mkdirSync(assetRoot, { recursive: true });
  const copied = new Map<string, string>();
  let index = 0;

  const rewrite = (src: string): string => {
    if (src.startsWith('data:') || /^[a-z][a-z0-9+.-]*:\/\//iu.test(src)) return src;
    const sourcePath = isAbsolute(src)
      ? src
      : existsSync(join(root, src))
        ? join(root, src)
        : join(srcBaseDir, src);
    if (!existsSync(sourcePath)) return src;
    const cached = copied.get(sourcePath);
    if (cached) return relative(outputBaseDir, cached);
    index += 1;
    const ext = extname(sourcePath);
    const safeBase = basename(sourcePath, ext).replace(/[^a-z0-9._-]+/giu, '-').replace(/^-+|-+$/gu, '') || 'asset';
    const target = join(assetRoot, `${index}-${safeBase}${ext}`);
    copyFileSync(sourcePath, target);
    copied.set(sourcePath, target);
    return relative(outputBaseDir, target);
  };

  for (const slide of next.slides) {
    rewriteElementImages(slide.elements, rewrite);
  }
  return next;
}

export type BuildWorkflowOptions = {
  cliOverrides?: MaliangDeckCliOverrides;
};

export function buildWorkflow(slugOrPath: string, formats?: OutputFormat[], options: BuildWorkflowOptions = {}) {
  const cliOverrides: MaliangDeckCliOverrides | undefined = formats
    ? { ...options.cliOverrides, formats, outputs: { ...options.cliOverrides?.outputs, formats } }
    : options.cliOverrides;
  const { root, config } = resolveProjectMaliangDeckConfig(slugOrPath, { cliOverrides });
  const manifest = loadProject(root);
  const resolvedFormats = config.outputs.formats;
  const deckPath = join(root, 'dsl', 'deck.json');
  const deck = loadValidDeck(deckPath);
  const exportResults: ExportDeckResult[] = [];
  const renderDir = join(root, 'render');

  if (resolvedFormats.includes('html')) {
    const htmlPath = join(root, 'render', 'html', 'index.html');
    mkdirSync(dirname(htmlPath), { recursive: true });
    const htmlDeck = materializeDeckAssets(root, deck, dirname(htmlPath), dirname(deckPath));
    writeFileSync(htmlPath, renderDeckToHtml(htmlDeck), 'utf-8');
  }

  for (const format of resolvedFormats.filter((format): format is ExportFormat => format === 'pdf' || format === 'pptx')) {
    mkdirSync(renderDir, { recursive: true });
    const exportDeckPath = join(renderDir, 'deck-export.json');
    const exportReadyDeck = materializeDeckAssets(root, deck, renderDir, dirname(deckPath));
    writeFileSync(exportDeckPath, JSON.stringify(exportReadyDeck, null, 2), 'utf-8');
    const result = exportDeck({
      deckPath: exportDeckPath,
      outputPath: join(root, 'exports', `deck.${format}`),
      format,
      animationPlanPath: format === 'pptx' ? join(root, 'exports', 'pptx-animation-plan.json') : undefined,
      projectFonts: config.fonts,
      projectManifestPath: join(root, 'project.json'),
      overflowPolicy: config.export.overflowPolicy,
      overflowTolerance: config.export.overflowTolerance,
    });
    exportResults.push(result);
  }

  const report = createExportReport(exportResults);
  writeJson(join(root, 'exports', 'export-report.json'), {
    ...report,
    html: resolvedFormats.includes('html') ? { success: true, outputPath: join(root, 'render', 'html', 'index.html') } : undefined,
  });
  saveProject(root, manifest, 'built');
  return report;
}
