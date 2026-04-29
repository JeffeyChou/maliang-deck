import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDeckToSvg } from '@maliang-deck/renderer-svg';
import { validateDeck } from '@maliang-deck/schema';
import type { Deck } from '@maliang-deck/schema';
import { FontRegistry } from '@maliang-deck/text-measure';
import type { ExportDeckResult, ExportFormat, ExportWarning } from './export-report.js';
import { classifyPptxAnimationSupport, generatePptxAnimationPlan } from './pptx-animation.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PYTHON_BRIDGE_PPTX = resolve(__dirname, '..', '..', '..', 'python', 'maliang_deck_export.py');
const PYTHON_BRIDGE_PDF = resolve(__dirname, '..', '..', '..', 'python', 'maliang_deck_export_pdf.py');

export type ExportDeckRequest = {
  deckPath: string;
  outputPath: string;
  format: ExportFormat;
  basePath?: string;
  animationPlanPath?: string;
  fontMap?: Record<string, string>;
  projectFonts?: Record<string, string>;
  projectManifestPath?: string;
  overflowTolerance?: number;
  overflowPolicy?: 'warn' | 'fail';
};

export type ExportDeckDependencies = {
  runPythonBridge?: (bridgeScript: string, exportArgs: string) => void;
};

export type ExportDeckAsyncDependencies = ExportDeckDependencies;

function canvasFormat(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.05) return 'widescreen';
  if (Math.abs(ratio - 4 / 3) < 0.05) return 'standard';
  return 'widescreen';
}

function loadDeck(deckPath: string): { deck?: Deck; error?: string } {
  let raw: string;
  try {
    raw = readFileSync(deckPath, 'utf-8');
  } catch (err) {
    return { error: `cannot read "${deckPath}": ${(err as NodeJS.ErrnoException).message}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { error: `invalid JSON: ${(err as Error).message}` };
  }

  const result = validateDeck(parsed);
  if (!result.success) {
    return { error: `validation failed: ${result.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}` };
  }

  return { deck: result.data };
}

function readProjectFonts(manifestPath: string): Record<string, string> | undefined {
  try {
    const raw = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);
    return manifest.fonts ?? undefined;
  } catch {
    return undefined;
  }
}

function requestProjectFonts(request: ExportDeckRequest): Record<string, string> | undefined {
  if (request.projectFonts !== undefined) return request.projectFonts;
  return request.projectManifestPath
    ? readProjectFonts(resolve(request.projectManifestPath))
    : undefined;
}

export function exportDeck(request: ExportDeckRequest, dependencies: ExportDeckDependencies = {}): ExportDeckResult {
  const deckPath = resolve(request.deckPath);
  const outputPath = resolve(request.outputPath);
  const warnings: ExportWarning[] = [];
  const { deck, error } = loadDeck(deckPath);
  if (!deck) {
    return { format: request.format, outputPath, success: false, warnings, error };
  }

  // Construct font registry with precedence: CLI > project.json > DeckMeta > bundled > heuristic
  const fontRegistry = new FontRegistry({
    cliFonts: request.fontMap,
    projectFonts: requestProjectFonts(request),
    deckFonts: deck.meta.fonts,
  });

  const basePath = request.basePath ? resolve(request.basePath) : dirname(deckPath);

  const tmpDir = join(tmpdir(), `maliang-deck-export-${process.pid}-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(dirname(outputPath), { recursive: true });

  try {
    const renderResult = renderDeckToSvg(deck, { basePath, fontRegistry });
    const svgSlides = renderResult.slides;

    // Collect SVG renderer warnings and map to ExportWarning format
    const overflowTolerance = request.overflowTolerance ?? 0;
    for (const w of renderResult.warnings) {
      if (w.type === 'overflow') {
        const detail = { slideIndex: w.slideIndex, elementId: w.elementId, overflowAmount: 0 };
        // Only report warnings exceeding tolerance
        if (detail.overflowAmount > overflowTolerance) {
          warnings.push({ code: `text-${w.type}`, message: w.message, detail });
        }
      } else {
        warnings.push({ code: svgWarningCode(w.type), message: w.message, detail: { slideIndex: w.slideIndex, elementId: w.elementId, path: w.path, phase: w.phase, policy: w.policy, ...(typeof w.detail === 'object' && w.detail !== null ? { diagnosticDetail: w.detail } : {}) } });
      }
    }

    // Fail on overflow if policy requires it
    if (request.overflowPolicy === 'fail') {
      const overflowWarnings = warnings.filter((w) => w.code === 'text-overflow');
      if (overflowWarnings.length > 0) {
        return {
          format: request.format,
          outputPath,
          success: false,
          warnings,
          error: `text overflow detected in ${overflowWarnings.length} element(s) (overflowPolicy: fail)`,
        };
      }
    }

    const svgFiles: string[] = [];
    const notes: Record<string, string> = {};
    for (const slide of svgSlides) {
      const svgPath = join(tmpDir, `${slide.id}.svg`);
      writeFileSync(svgPath, slide.svg, 'utf-8');
      svgFiles.push(svgPath);
      if (slide.notes) notes[slide.id] = slide.notes;
    }

    let animationReportPath: string | undefined;
    if (request.format === 'pptx') {
      const plan = generatePptxAnimationPlan(deck);
      const capabilityReport = classifyPptxAnimationSupport(plan);
      warnings.push(...capabilityReport.warnings);
      if (request.animationPlanPath) {
        const planPath = resolve(request.animationPlanPath);
        mkdirSync(dirname(planPath), { recursive: true });
        writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf-8');
        animationReportPath = planPath.replace(/\.json$/u, '.capability-report.json');
        writeFileSync(animationReportPath, JSON.stringify(capabilityReport, null, 2), 'utf-8');
      }
    }

    const bridgeScript = request.format === 'pdf' ? PYTHON_BRIDGE_PDF : PYTHON_BRIDGE_PPTX;
    if (!existsSync(bridgeScript)) {
      return { format: request.format, outputPath, success: false, warnings, error: `missing Python export bridge: ${bridgeScript}` };
    }

    const exportArgs = request.format === 'pdf'
      ? JSON.stringify({
          svg_files: svgFiles,
          output: outputPath,
          width: deck.meta.canvas.width,
          height: deck.meta.canvas.height,
        })
      : JSON.stringify({
          svg_files: svgFiles,
          output: outputPath,
          format: canvasFormat(deck.meta.canvas.width, deck.meta.canvas.height),
          notes,
          animation_plan: request.animationPlanPath ? resolve(request.animationPlanPath) : undefined,
          animation_report: animationReportPath,
        });

    const runPythonBridge = dependencies.runPythonBridge
      ?? ((script: string, args: string) => {
        execFileSync('python3', [script, args], { stdio: 'pipe', encoding: 'utf-8' });
      });
    runPythonBridge(bridgeScript, exportArgs);
    return { format: request.format, outputPath, success: true, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { format: request.format, outputPath, success: false, warnings, error: message };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function svgWarningCode(type: string): string {
  switch (type) {
    case 'chart-degraded':
      return 'svg-chart-degraded';
    case 'unsupported-feature':
      return 'svg-unsupported-feature';
    case 'layout-flattened':
    case 'layout-overflow':
    case 'layout-unsupported-child':
    case 'renderer-unsupported-element':
      return `svg-${type}`;
    default:
      return `text-${type}`;
  }
}

export async function exportDeckAsync(
  request: ExportDeckRequest,
  dependencies: ExportDeckAsyncDependencies = {},
): Promise<ExportDeckResult> {
  return exportDeck(request, dependencies);
}
