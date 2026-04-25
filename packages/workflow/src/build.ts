import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createExportReport, exportDeck, type ExportDeckResult, type ExportFormat } from '@maliang-deck/exporter';
import { renderDeckToHtml } from '@maliang-deck/renderer-html';
import { validateDeck } from '@maliang-deck/schema';
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

  if (resolvedFormats.includes('html')) {
    const htmlPath = join(root, 'render', 'html', 'index.html');
    mkdirSync(dirname(htmlPath), { recursive: true });
    writeFileSync(htmlPath, renderDeckToHtml(deck), 'utf-8');
  }

  for (const format of resolvedFormats.filter((format): format is ExportFormat => format === 'pdf' || format === 'pptx')) {
    const result = exportDeck({
      deckPath,
      outputPath: join(root, 'exports', `deck.${format}`),
      format,
      animationPlanPath: format === 'pptx' ? join(root, 'exports', 'pptx-animation-plan.json') : undefined,
      pptxEngine: config.export.pptxEngine,
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
