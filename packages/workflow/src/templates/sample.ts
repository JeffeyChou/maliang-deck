import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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

export function generateTemplateSampleDeck(pack: TemplatePack): Deck {
  return createSampleDeck(pack);
}

export function writeTemplateSampleProject(pack: TemplatePack, outDir: string): TemplateSampleProjectResult {
  const deck = createSampleDeck(pack);
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
