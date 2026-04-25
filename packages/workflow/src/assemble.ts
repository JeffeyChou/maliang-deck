import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SlideSchema, validateDeck, type Deck, type Slide } from '@maliang-deck/schema';
import { loadProject, projectRoot, saveProject } from './project.js';
import { pathExists, readJson, writeJson } from './fs-utils.js';
import { validateDeckPlan } from './deck-plan.js';
import { validateConsistency } from './guidance/consistency-validator.js';
import { lintDeck } from './guidance/lint-rules.js';
import { getStyle } from './guidance/style-registry.js';
import { registerConfiguredTemplatePacksForProject } from './templates/registry.js';

export function assembleDeck(slugOrPath: string): Deck {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
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

  // Resolve canvas and theme from deckDesign (data-driven), with safe fallbacks
  const deckDesign = plan.deckDesign;
  const styleId = deckDesign?.styleId ?? manifest.styleId ?? templateRegistration.styleId;
  const canvas = deckDesign?.canvas ?? { width: 1280, height: 720 };
  const theme =
    (styleId ? getStyle(styleId, { includeDrafts: templateRegistration.includeDraftTemplatePacks })?.recommendedTheme : undefined) ??
    'minimal-white';

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

  writeJson(join(root, 'dsl', 'deck.json'), deck);
  saveProject(root, manifest, 'assembled');
  return deck;
}
