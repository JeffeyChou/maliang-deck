import type { GenerationWorkOrder } from '../schemas.js';
import type { ApprovedAsset, DeckDesign, SlideDesign, WorkOrderGuidance } from './types.js';
import { getStyle } from './style-registry.js';

type StyleLookupOptions = { includeDrafts?: boolean };

/**
 * Positioning rules that apply to ALL styles. These prevent common spatial
 * bugs that the assembly-time lint rules (formula-overlap, circle-text-centering,
 * canvas-bounds) would otherwise catch only after the DSL is written.
 */
const SHARED_POSITIONING_RULES: string[] = [
  'Circle x/y is the CENTER of the circle. To center a text label inside a circle, set text.x = circle.x - text.width / 2 and text.y = circle.y - fontSize / 2.',
  'Formula elements render taller than their declared height. Estimate rendered height as 2.8 * fontSize for fractions/sums/integrals/matrices, 2.0 * fontSize for superscripts/subscripts, 1.6 * fontSize for inline formulas. Place subsequent elements below this estimated height, not the declared height.',
  'When placing an element below another, compute the gap from the previous element y + estimated rendered height, not from its declared bounding box alone.',
  'Circle elements have no width/height property. Their bounding box is [x - radius, y - radius] to [x + radius, y + radius]. Ensure this box stays within canvas bounds.',
];

/**
 * Build a base WorkOrderGuidance shell for a given style and stage.
 * Returns undefined if the style is not registered.
 */
function buildBaseGuidance(
  styleId: string,
  stage: WorkOrderGuidance['stage'],
  options: StyleLookupOptions = {},
): WorkOrderGuidance | undefined {
  const style = getStyle(styleId, options);
  if (!style) return undefined;

  return {
    styleId,
    stage,
    structured: JSON.parse(JSON.stringify(style.stageGuidance)) as WorkOrderGuidance['structured'],
    roleDocs: style.roleDocRefs.map((ref) => ({
      path: ref.path,
      sections: [],
      digest: '',
    })),
    checklist: [],
  };
}

/**
 * Enrich an outline work order with style-specific guidance.
 * Adds guidance.checklist items from the style's outline stage guidance.
 * Does NOT modify constraints (per Codex Finding #1 — avoid prompt soup).
 * Returns the original order unchanged if the style is not registered.
 */
export function enrichOutlineWorkOrder(
  order: GenerationWorkOrder,
  styleId: string,
  options: StyleLookupOptions = {},
): GenerationWorkOrder {
  const guidance = buildBaseGuidance(styleId, 'outline', options);
  if (!guidance) return order;

  const outlineGuidance = guidance.structured.outline;
  guidance.checklist = [
    ...outlineGuidance.audienceAnalysis.map((q) => `Audience: ${q}`),
    ...outlineGuidance.storyArc.map((arc) => `Story arc: ${arc}`),
    ...outlineGuidance.infoHierarchy.map((rule) => `Info hierarchy: ${rule}`),
  ];

  return { ...order, guidance };
}

/**
 * Enrich a deck-plan work order with style-specific layout and visualization guidance.
 * Returns the original order unchanged if the style is not registered.
 */
export function enrichDeckPlanWorkOrder(
  order: GenerationWorkOrder,
  styleId: string,
  options: StyleLookupOptions = {},
): GenerationWorkOrder {
  const guidance = buildBaseGuidance(styleId, 'deck-plan', options);
  if (!guidance) return order;

  const deckPlanGuidance = guidance.structured.deckPlan;
  guidance.checklist = [
    ...Object.entries(deckPlanGuidance.layoutRecommendations).map(
      ([slideType, layout]) => `Layout for ${slideType}: ${layout}`,
    ),
    ...Object.entries(deckPlanGuidance.vizDefaults).map(
      ([category, vizType]) => `Default visualization for ${category}: ${vizType}`,
    ),
  ];

  return { ...order, guidance };
}

/**
 * Enrich a slide-dsl work order with per-slide design instructions.
 * Passes locked tokens from deckDesign into guidance.structured.slideDsl.lockedTokens.
 * Returns the original order unchanged if the style is not registered or no design provided.
 */
export function enrichDslWorkOrder(
  order: GenerationWorkOrder,
  styleId: string,
  slideDesign: SlideDesign,
  styleContract?: DeckDesign,
  approvedAssets: ApprovedAsset[] = [],
  speakerNotesIntent?: string,
  options: StyleLookupOptions = {},
): GenerationWorkOrder {
  const guidance = buildBaseGuidance(styleId, 'slide-dsl', options);
  if (!guidance) return order;

  const style = getStyle(styleId, options)!;
  const pattern = style.layoutPatterns.find((p) => p.id === slideDesign.layoutPatternId);

  const slideDslGuidance = guidance.structured.slideDsl;

  // Inject locked tokens to prevent visual drift across parallel agents
  if (styleContract) {
    slideDslGuidance.lockedTokens = styleContract.lockedTokens;
    slideDslGuidance.styleContract = styleContract;
  }
  if (pattern) {
    slideDslGuidance.layoutPattern = pattern;
  }
  if (approvedAssets.length > 0) {
    slideDslGuidance.approvedAssets = approvedAssets;
  }

  // Speaker notes guidance based on style
  const notesGuidance: string[] = [
    'Speaker notes: write sentence-by-sentence presenter notes, not a one-line slide summary.',
    'Speaker notes: use one numbered sentence per spoken beat and include enough detail for delivery without improvising the core explanation.',
  ];
  if (style.id === 'academic') {
    notesGuidance.push('Speaker notes: use formal tone, reference evidence and citations, explain methodology, derivations, assumptions, and caveats where relevant.');
  } else if (style.id === 'consulting') {
    notesGuidance.push('Speaker notes: lead with the conclusion, then supporting evidence. Use executive language. Note key data points to emphasize.');
  }
  if (speakerNotesIntent && speakerNotesIntent !== 'TBD') {
    notesGuidance.push(`Notes intent: ${speakerNotesIntent}`);
  }

  guidance.checklist = [
    `Slide type: ${slideDesign.slideType}`,
    `Layout pattern: ${slideDesign.layoutPatternId}${pattern ? ` — ${pattern.purpose}` : ''}`,
    `Density target: ${slideDesign.density}`,
    ...(styleContract
      ? [
          `Use only the locked palette colors: ${Object.entries(styleContract.palette).filter(([, value]) => typeof value === 'string').map(([key, value]) => `${key}=${value}`).join(', ')}`,
          `Use typography from the contract: heading=${styleContract.typography.headingFont}; body=${styleContract.typography.bodyFont}; mono=${styleContract.typography.monoFont}`,
          `Respect margins top/right/bottom/left: ${styleContract.spacing.margin.top}/${styleContract.spacing.margin.right}/${styleContract.spacing.margin.bottom}/${styleContract.spacing.margin.left}`,
        ]
      : []),
    ...(approvedAssets.length > 0
      ? [`Use only approved image assets for this slide: ${approvedAssets.map((asset) => `${asset.id}=${asset.sourcePath}`).join(', ')}`]
      : []),
    ...(slideDesign.visualizationIntent
      ? [`Visualization: ${slideDesign.visualizationIntent.type} — ${slideDesign.visualizationIntent.rationale}`]
      : []),
    ...slideDslGuidance.elementRules.map((r) => `Element rule: ${r}`),
    ...slideDslGuidance.colorRules.map((r) => `Color rule: ${r}`),
    ...(slideDslGuidance.animationRules ?? []).map((r) => `Animation: ${r}`),
    ...slideDslGuidance.positioningRules.map((r) => `Positioning: ${r}`),
    ...SHARED_POSITIONING_RULES.map((r) => `Positioning: ${r}`),
    ...notesGuidance,
  ];

  // Chart/table theming guidance
  const chartTableGuidance = style.stageGuidance.deckPlan?.chartTableGuidance;
  if (chartTableGuidance) {
    guidance.checklist.push(...chartTableGuidance.map((g: string) => `Chart/table: ${g}`));
  }
  if (style.tokens.palette.chartPalette) {
    guidance.checklist.push(
      `Chart palette: use style.palette with colors [${style.tokens.palette.chartPalette.join(', ')}] or omit to inherit from theme.`,
    );
  }

  return { ...order, guidance };
}
