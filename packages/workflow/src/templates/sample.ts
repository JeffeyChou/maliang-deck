import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, join } from 'node:path';
import { renderDeckToHtml } from '@maliang-deck/renderer-html';
import { validateDeck, type Deck } from '@maliang-deck/schema';
import { writeJson } from '../fs-utils.js';
import type { TemplateCoverageReport, TemplatePack } from './contracts.js';
import { createSampleDeck } from './compiler.js';


export type TemplateSampleProjectResult = {
  deck: Deck;
  deckPath: string;
  htmlPath: string;
  validation: ReturnType<typeof validateDeck>;
  exportResults: Array<{ format: 'pdf' | 'pptx'; success: boolean; error?: string }>;
  degraded: boolean;
  warnings: string[];
  coverageSample: TemplateCoverageReport['sampleDeck'];
};

export type TemplateSampleResolutionOptions = {
  ownerDir?: string;
  requireSamplePath?: boolean;
};

const executableSampleExtensions = new Set(['.js', '.mjs', '.cjs', '.ts']);

function isRemotePath(path: string): boolean {
  return /^(?:https?:)?\/\//iu.test(path) || /^[a-z][a-z0-9+.-]*:\/\//iu.test(path);
}

function assertInsideOwner(ownerDir: string, resolvedPath: string): void {
  const owner = resolve(ownerDir);
  const relativePath = relative(owner, resolvedPath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) throw new Error(`Template sample path escapes its owner directory: ${resolvedPath}`);
}

export function resolveTemplateSampleDeckPath(pack: TemplatePack, options: TemplateSampleResolutionOptions = {}): string | undefined {
  const samplePath = pack.sampleDeck?.path;
  if (!samplePath) {
    if (options.requireSamplePath) throw new Error(`Template pack ${pack.id} does not declare sampleDeck.path`);
    return undefined;
  }
  if (!options.ownerDir) return undefined;
  if (isRemotePath(samplePath)) throw new Error(`Unsupported remote template sample path for ${pack.id}: ${samplePath}`);
  const extension = extname(samplePath).toLowerCase();
  if (executableSampleExtensions.has(extension)) throw new Error(`Unsupported executable template sample path for ${pack.id}: ${samplePath}`);
  const resolvedPath = resolve(options.ownerDir, samplePath);
  assertInsideOwner(options.ownerDir, resolvedPath);
  if (!existsSync(resolvedPath)) throw new Error(`Template sample deck not found for ${pack.id}: ${resolvedPath}`);
  return resolvedPath;
}

export function generateTemplateSampleDeck(pack: TemplatePack, options: TemplateSampleResolutionOptions = {}): Deck {
  const samplePath = resolveTemplateSampleDeckPath(pack, options);
  if (!samplePath) {
    if (options.requireSamplePath) throw new Error(`Template sample deck not found for ${pack.id}`);
    return createSampleDeck(pack);
  }
  return JSON.parse(readFileSync(samplePath, 'utf-8')) as Deck;
}

export function writeTemplateSampleProject(pack: TemplatePack, outDir: string, options: TemplateSampleResolutionOptions = {}): TemplateSampleProjectResult {
  const deck = generateTemplateSampleDeck(pack, options);
  const validation = validateDeck(deck);
  if (!validation.success) throw new Error(`Generated sample deck is invalid: ${validation.errors.map((error: { path: Array<string | number>; message: string }) => `${error.path.join('.')}: ${error.message}`).join('; ')}`);
  const dslDir = join(outDir, 'dsl');
  const htmlDir = join(outDir, 'render', 'html');
  mkdirSync(dslDir, { recursive: true });
  mkdirSync(htmlDir, { recursive: true });
  const deckPath = join(dslDir, 'deck.json');
  const htmlPath = join(htmlDir, 'index.html');
  writeFileSync(deckPath, `${JSON.stringify(deck, null, 2)}\n`, 'utf-8');
  writeFileSync(htmlPath, renderDeckToHtml(deck), 'utf-8');
  const exportResults: TemplateSampleProjectResult['exportResults'] = [
    { format: 'pdf', success: false, error: 'smoke export not run by template sample command' },
    { format: 'pptx', success: false, error: 'smoke export not run by template sample command' },
  ];
  const warnings = ['PDF/PPTX smoke export not run by template sample command; run workflow build for full export evidence.'];
  const coverageSample: TemplateCoverageReport['sampleDeck'] = {
    validates: validation.success,
    formats: { html: true, pdf: false, pptx: false },
    degraded: true,
    warnings,
  };
  writeJson(join(outDir, 'coverage', 'sample-report.json'), coverageSample);
  return { deck, deckPath, htmlPath, validation, exportResults, degraded: true, warnings, coverageSample };
}
