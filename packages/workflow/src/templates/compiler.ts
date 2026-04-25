import type { Deck } from '@maliang-deck/schema';
import type { DeckDesign, LayoutPattern, StageGuidance, StyleDefinition, WorkOrderGuidance } from '../guidance/types.js';
import type { TemplatePack } from './contracts.js';

type TemplateCompilationResult = { style: StyleDefinition; deckDesign: DeckDesign; guidance: WorkOrderGuidance; sampleDeck: Deck };

function layoutPatternsFromPack(pack: TemplatePack): LayoutPattern[] {
  return pack.archetypes.map((archetype) => ({ id: archetype.id, name: archetype.name, purpose: archetype.purpose, slideTypes: [archetype.slideType], elementPositions: Object.fromEntries(archetype.slots.map((slot) => [slot.role, { x: slot.bbox.x, y: slot.bbox.y, w: slot.bbox.width, h: slot.bbox.height }])), density: archetype.slots.length <= 2 ? 'low' : archetype.slots.length <= 5 ? 'medium' : 'high' }));
}
function stageGuidanceFromPack(pack: TemplatePack): StageGuidance {
  return {
    outline: { audienceAnalysis: pack.guidance.outline.length ? pack.guidance.outline : ['Confirm audience before applying extracted visual conventions.'], storyArc: ['Draft story first; templates guide layout only.'], infoHierarchy: ['Keep content roles aligned with extracted slots.'] },
    deckPlan: { layoutRecommendations: Object.fromEntries(pack.archetypes.map((a) => [a.slideType, a.purpose])), vizDefaults: { evidence: 'figure-with-caption', chart: 'chart-or-table-region', title: 'title-card' } },
    slideDsl: { elementRules: pack.guidance.slideDsl.length ? pack.guidance.slideDsl : ['Emit standard Maliang Deck JSON DSL elements only.'], colorRules: [`Use palette primary ${pack.tokens.palette.primary}, accent ${pack.tokens.palette.accent}, neutral ${pack.tokens.palette.neutral}.`], positioningRules: [`Use extracted margins ${JSON.stringify(pack.tokens.spacing.margin)} and slot boxes from selected layout pattern.`] },
  };
}
export function compileTemplatePackToStyle(pack: TemplatePack): StyleDefinition {
  return { id: pack.id, version: pack.version, name: pack.name, description: `${pack.description} (compiled from template pack; activation=${pack.activation.status})`, recommendedTheme: 'minimal-white', tokens: { palette: pack.tokens.palette, typography: pack.tokens.typography, spacing: pack.tokens.spacing }, layoutPatterns: layoutPatternsFromPack(pack), stageGuidance: stageGuidanceFromPack(pack), qualityRules: [{ id: `${pack.id}-template-slot-alignment`, name: 'Template slot alignment', severity: 'warning', applicableStyles: [pack.id], description: 'Slides should use selected template slots unless intentionally deviating.' }], rendererCapabilities: { animations: 'none', charts: 'partial', tables: 'partial', gradients: 'partial', clipPaths: 'partial', groupElements: 'full', textWrapping: 'full' }, roleDocRefs: [{ path: 'docs/TEMPLATE-EXTRACTION.md', role: 'shared' }] };
}
export function compileTemplatePackToDeckDesign(pack: TemplatePack): DeckDesign {
  return { styleId: pack.id, canvas: pack.tokens.canvas, typographyScaleId: `${pack.id}-typography`, paletteId: `${pack.id}-palette`, lockedTokens: { titleBandHeight: Math.round(pack.tokens.canvas.height * 0.18), margins: pack.tokens.spacing.margin, spacing: { element: pack.tokens.spacing.element, section: pack.tokens.spacing.section } } };
}
export function compileTemplatePackToWorkOrderGuidance(pack: TemplatePack, stage: WorkOrderGuidance['stage'] = 'slide-dsl'): WorkOrderGuidance {
  return { styleId: pack.id, stage, structured: stageGuidanceFromPack(pack), roleDocs: [{ path: 'docs/TEMPLATE-EXTRACTION.md', sections: ['Usage', 'Confidence limits'], digest: pack.guidance.summary }], checklist: ['Use ordinary JSON DSL as the source of truth.', 'Do not import template modules from renderers/exporters.', 'Review coverage and activation status before treating extracted packs as production styles.', ...(pack.coverage?.warnings ?? []).map((warning) => `Extraction warning: ${warning}`)] };
}
export const compileTemplatePackToGuidance = compileTemplatePackToWorkOrderGuidance;
export const createTemplateWorkOrderGuidance = compileTemplatePackToWorkOrderGuidance;
export function createSampleDeck(pack: TemplatePack): Deck {
  const archetype = pack.archetypes[0];
  const elements = (archetype?.slots ?? []).map((slot) => ({ type: 'text' as const, id: slot.id, x: slot.bbox.x, y: slot.bbox.y, width: slot.bbox.width, height: slot.bbox.height, fontSize: slot.role === 'title' ? 42 : 24, fontFamily: pack.tokens.typography.bodyFont, color: pack.tokens.palette.primary, content: slot.role === 'title' ? 'Extracted Template Sample' : `${slot.role} placeholder` }));
  return { meta: { title: `${pack.name} sample`, canvas: pack.tokens.canvas, theme: 'minimal-white' }, slides: [{ id: 'sample-slide-1', layout: archetype?.id, background: pack.tokens.backgrounds[0] ?? pack.tokens.palette.secondary, elements: elements.length ? elements : [{ type: 'text', id: 'title', x: 64, y: 64, width: 800, fontSize: 42, content: 'Extracted Template Sample' }] }] };
}
export function compileTemplatePack(pack: TemplatePack): TemplateCompilationResult { return { style: compileTemplatePackToStyle(pack), deckDesign: compileTemplatePackToDeckDesign(pack), guidance: compileTemplatePackToWorkOrderGuidance(pack), sampleDeck: createSampleDeck(pack) }; }

export const createSampleDeckFromTemplate = createSampleDeck;
