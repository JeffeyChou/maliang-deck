import { existsSync, readdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { SlideSchema, validateDeck, type Deck, type Element, type Slide } from '@maliang-deck/schema';
import { loadProject, projectRoot, saveProject } from './project.js';
import { pathExists, readJson, writeJson } from './fs-utils.js';
import { resolveProjectMaliangDeckConfig } from './config.js';
import { validateDeckPlan } from './deck-plan.js';
import { validateConsistency } from './guidance/consistency-validator.js';
import { lintDeck } from './guidance/lint-rules.js';
import { getStyle } from './guidance/style-registry.js';
import { registerConfiguredTemplatePacksForProject } from './templates/registry.js';
import { resolveProjectStyleContract } from './style-contract.js';
import type { DeckDesign } from './guidance/types.js';
import type { ExtractedAsset } from './schemas.js';

type StyleContractResult = {
  ruleId: string;
  severity: 'warning' | 'error';
  message: string;
  slideId: string;
  elementId?: string;
};

function flattenElements(elements: Element[]): Element[] {
  const result: Element[] = [];
  for (const el of elements) {
    result.push(el);
    if (el.type === 'group') result.push(...flattenElements(el.elements));
    if (el.type === 'layout') result.push(...flattenElements(el.elements));
  }
  return result;
}

function contractColors(contract: DeckDesign): Set<string> {
  const colors = [
    contract.palette.primary,
    contract.palette.secondary,
    contract.palette.accent,
    contract.palette.neutral,
    ...Object.values(contract.palette.semantic ?? {}),
    'white',
    '#fff',
    '#ffffff',
    'black',
    '#000',
    '#000000',
    'transparent',
    'none',
  ];
  return new Set(colors.map((color) => color.toLowerCase()));
}

function elementColors(el: Element): string[] {
  const colors: string[] = [];
  if ('color' in el && typeof el.color === 'string') colors.push(el.color);
  if ('fill' in el && typeof el.fill === 'string') colors.push(el.fill);
  if ('stroke' in el && typeof el.stroke === 'string') colors.push(el.stroke);
  return colors;
}

function approvedAssetPaths(root: string, assets: ExtractedAsset[], refs: string[]): Set<string> {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const allowed = new Set<string>();
  for (const ref of refs) {
    const asset = assetsById.get(ref);
    if (!asset) continue;
    allowed.add(asset.sourcePath);
    allowed.add(join(root, asset.sourcePath));
  }
  return allowed;
}

function localAssetExists(root: string, src: string): boolean {
  if (src.startsWith('data:') || /^[a-z][a-z0-9+.-]*:\/\//iu.test(src)) return true;
  return existsSync(isAbsolute(src) ? src : join(root, src));
}

function validateStyleContract(deck: Deck, contract: DeckDesign, plan: ReturnType<typeof validateDeckPlan>, assets: ExtractedAsset[], root: string): StyleContractResult[] {
  const results: StyleContractResult[] = [];
  const colors = contractColors(contract);
  const fonts = new Set([contract.typography.headingFont, contract.typography.bodyFont, contract.typography.monoFont]);
  const slidesById = new Map(plan.slides.map((slide) => [slide.id, slide]));

  for (const slide of deck.slides) {
    if (slide.background && !colors.has(slide.background.toLowerCase())) {
      results.push({ ruleId: 'style-contract-color', severity: 'warning', message: `Slide background "${slide.background}" is outside the project palette.`, slideId: slide.id });
    }
    const slidePlan = slidesById.get(slide.id);
    const allowedAssets = approvedAssetPaths(root, assets, slidePlan?.candidateAssetRefs ?? []);
    for (const el of flattenElements(slide.elements)) {
      for (const color of elementColors(el)) {
        if (!colors.has(color.toLowerCase())) {
          results.push({ ruleId: 'style-contract-color', severity: 'warning', message: `Element "${el.id}" uses color "${color}" outside the project palette.`, slideId: slide.id, elementId: el.id });
        }
      }
      if (el.type === 'text' && el.fontFamily && !fonts.has(el.fontFamily)) {
        results.push({ ruleId: 'style-contract-font', severity: 'warning', message: `Element "${el.id}" uses font "${el.fontFamily}" outside the project typography contract.`, slideId: slide.id, elementId: el.id });
      }
      if (el.type === 'image') {
        if (!localAssetExists(root, el.src)) {
          results.push({ ruleId: 'style-contract-asset-exists', severity: 'error', message: `Image "${el.src}" does not resolve to an existing asset.`, slideId: slide.id, elementId: el.id });
        }
        if (!el.src.startsWith('data:') && !allowedAssets.has(el.src) && !allowedAssets.has(isAbsolute(el.src) ? el.src : join(root, el.src))) {
          results.push({ ruleId: 'style-contract-approved-asset', severity: 'warning', message: `Image "${el.src}" is not approved for this slide in deck-plan candidateAssetRefs.`, slideId: slide.id, elementId: el.id });
        }
      }
    }
  }
  return results;
}

export function assembleDeck(slugOrPath: string): Deck {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const { config } = resolveProjectMaliangDeckConfig(root);
  const templateRegistration = registerConfiguredTemplatePacksForProject(root);
  const plan = validateDeckPlan(root);
  const slideDir = join(root, 'dsl', 'slides');
  const available = new Set(pathExists(slideDir) ? readdirSync(slideDir).filter((file) => file.endsWith('.json')) : []);
  const slides: Slide[] = [];

  for (const slidePlan of plan.slides) {
    const filename = `${slidePlan.id}.json`;
    if (!available.has(filename)) throw new Error(`Missing slide DSL slice: ${join(slideDir, filename)}`);
    const parsed = SlideSchema.safeParse(readJson(join(slideDir, filename)));
    if (!parsed.success) throw new Error(`Invalid slide DSL ${filename}: ${parsed.error.issues.map((issue: { path: Array<string | number>; message: string }) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
    slides.push(parsed.data as Slide);
  }

  // Resolve canvas and theme from the project style contract, with safe fallbacks.
  const deckDesign = resolveProjectStyleContract(root, plan.deckDesign);
  const styleId = deckDesign?.styleId ?? manifest.styleId ?? templateRegistration.styleId;
  const canvas = deckDesign.canvas;
  const theme = deckDesign.theme;

  // Font resolution: manifest.fonts -> omit
  const fonts: Record<string, string> | undefined =
    manifest.fonts && Object.keys(manifest.fonts).length > 0 ? manifest.fonts : undefined;

  const deck: Deck = {
    meta: {
      title: manifest.slug,
      theme,
      canvas,
      ...(fonts ? { fonts } : {}),
    },
    slides,
  };

  const validation = validateDeck(deck);
  writeJson(join(root, 'dsl', 'validation-report.json'), validation);
  if (!validation.success) throw new Error(`Assembled deck failed validation: ${validation.errors.map((e: { path: Array<string | number>; message: string }) => `${e.path.join('.')}: ${e.message}`).join('; ')}`);

  // Cross-slide consistency validation — warnings only, never blocks assembly
  const consistencyResults = validateConsistency(deck, deckDesign);
  writeJson(join(root, 'dsl', 'consistency-report.json'), consistencyResults);
  const failures = consistencyResults.filter((r) => !r.pass);
  if (failures.length > 0) {
    for (const f of failures) {
      const location = f.slideId ? ` [slide: ${f.slideId}]` : '';
      console.warn(`[consistency] ${f.dimension}${location}: expected ${f.expected}, got ${f.actual}`);
    }
  }

  // DSL lint rules — errors block assembly, warnings are reported only
  const activeStyle = styleId ? getStyle(styleId, { includeDrafts: templateRegistration.includeDraftTemplatePacks }) : undefined;
  if (activeStyle) {
    const lintResults = lintDeck(deck, activeStyle);
    const lintErrors = lintResults.filter((r) => r.severity === 'error');
    const lintWarnings = lintResults.filter((r) => r.severity === 'warning');

    for (const w of lintWarnings) {
      const loc = w.elementId ? ` [element: ${w.elementId}]` : '';
      console.warn(`[lint:${w.ruleId}] slide ${w.slideId}${loc}: ${w.message}`);
    }

    writeJson(join(root, 'dsl', 'lint-report.json'), lintResults);

    if (lintErrors.length > 0) {
      const errorSummary = lintErrors
        .map((e) => `[${e.ruleId}] slide ${e.slideId}: ${e.message}`)
        .join('; ');
      throw new Error(`Assembly blocked by ${lintErrors.length} lint error(s): ${errorSummary}`);
    }
  }

  const assets = pathExists(join(root, 'extraction', 'normalized', 'assets.json'))
    ? readJson(join(root, 'extraction', 'normalized', 'assets.json')) as ExtractedAsset[]
    : [];
  const styleResults = validateStyleContract(deck, deckDesign, plan, assets, root);
  writeJson(join(root, 'dsl', 'style-contract-report.json'), styleResults);
  for (const result of styleResults.filter((item) => item.severity === 'warning')) {
    const loc = result.elementId ? ` [element: ${result.elementId}]` : '';
    console.warn(`[style:${result.ruleId}] slide ${result.slideId}${loc}: ${result.message}`);
  }
  const styleErrors = [
    ...styleResults.filter((result) => result.severity === 'error'),
    ...(config.styleValidation === 'fail'
      ? [
          ...styleResults.filter((result) => result.severity === 'warning').map((result) => ({ ...result, severity: 'error' as const })),
          ...consistencyResults.filter((result) => !result.pass).map((result) => ({
            ruleId: `consistency-${result.dimension}`,
            severity: 'error' as const,
            message: `Expected ${result.expected}, got ${result.actual}.`,
            slideId: result.slideId ?? '<deck>',
          })),
        ]
      : []),
  ];
  if (styleErrors.length > 0) {
    const summary = styleErrors.map((result) => `[${result.ruleId}] slide ${result.slideId}: ${result.message}`).join('; ');
    throw new Error(`Assembly blocked by ${styleErrors.length} style contract error(s): ${summary}`);
  }

  writeJson(join(root, 'dsl', 'deck.json'), deck);
  saveProject(root, manifest, 'assembled');
  return deck;
}
