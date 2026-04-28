import { TemplateCoverageReportSchema, TemplateCoverageThresholdProposalSchema } from './contracts.js';
import type { TemplateCoverageReport, TemplateCoverageThresholdProposal, TemplateExtractionIR, TemplateObservation, TemplatePack } from './contracts.js';

function ratio(covered: number, total: number): number { return total === 0 ? 0 : Math.min(1, Number((covered / total).toFixed(4))); }
function average(values: number[]): number { return values.length === 0 ? 0 : Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)); }

function observationCanvasArea(observation: TemplateObservation, ir: TemplateExtractionIR): number {
    const source = ir.sources.find((candidate) => candidate.id === observation.provenance.sourceId) ?? ir.sources[0];
    return source ? source.dimensions.width * source.dimensions.height : 1280 * 720;
}

export function isSignificantObservation(observation: TemplateObservation, ir: TemplateExtractionIR): boolean {
    const areaRatio = (observation.bbox.width * observation.bbox.height) / observationCanvasArea(observation, ir);
    if (observation.type === 'text' && (observation.text ?? '').trim().length > 0)
        return areaRatio >= 0.0025;
    if (['image', 'shape', 'region', 'background'].includes(observation.type))
        return areaRatio >= 0.01;
    if (observation.type === 'table' || observation.type === 'chart')
        return areaRatio >= 0.02;
    return observation.colors.length > 0 && areaRatio >= 0.005;
}

export function createCoverageReport(pack: TemplatePack, ir: TemplateExtractionIR): TemplateCoverageReport {
    const significant = ir.observations.filter((observation) => isSignificantObservation(observation, ir));
    const assignedSlotCount = pack.archetypes.reduce((sum, archetype) => sum + archetype.slots.length, 0);
    const formats = new Map<string, number[]>();
    for (const observation of ir.observations)
        formats.set(observation.provenance.format, [...(formats.get(observation.provenance.format) ?? []), observation.confidence]);
    const formatConfidence: Record<string, number> = {};
    for (const [format, values] of formats)
        formatConfidence[format] = average(values);
    const colors = new Set(ir.observations.flatMap((observation) => observation.colors));
    const tokenTotal = Math.max(4, colors.size);
    const tokenCovered = Math.min(tokenTotal, colors.size + (pack.tokens.typography.headingFont ? 1 : 0) + (pack.tokens.spacing.element ? 1 : 0));
    const sourcePages = new Set(ir.observations.map((observation) => `${observation.provenance.sourceId}:${observation.provenance.slideIndex ?? observation.provenance.pageIndex ?? 0}`));
    return TemplateCoverageReportSchema.parse({
        templateId: pack.id,
        generatedAt: new Date().toISOString(),
        significantObservationCount: significant.length,
        assignedSlotCount,
        metrics: {
            tokens: { covered: tokenCovered, total: tokenTotal, ratio: ratio(tokenCovered, tokenTotal) },
            archetypes: { covered: pack.archetypes.length, total: Math.max(1, sourcePages.size), ratio: ratio(pack.archetypes.length, Math.max(1, sourcePages.size)) },
            slots: { covered: assignedSlotCount, total: significant.length, ratio: ratio(assignedSlotCount, significant.length) },
            fragments: { covered: pack.fragments.length, total: Math.max(1, pack.archetypes.length), ratio: ratio(pack.fragments.length, Math.max(1, pack.archetypes.length)) },
        },
        formatConfidence,
        warnings: [...pack.warnings, ...ir.warnings],
        slotCoverage: { assignedSignificantObservations: assignedSlotCount },
        sampleDeck: pack.sampleDeck ? { validates: true, formats: { html: true, pdf: false, pptx: false }, degraded: true, warnings: pack.sampleDeck.warnings } : undefined,
    });
}

export function proposeCoverageThresholds(packOrId: TemplatePack | string): TemplateCoverageThresholdProposal {
    const templateId = typeof packOrId === 'string' ? packOrId : packOrId.id;
    return TemplateCoverageThresholdProposalSchema.parse({
        templateId,
        reviewStatus: 'proposed',
        generatedAt: new Date().toISOString(),
        thresholds: { pptxSlotAssignment: 0.8, htmlSlotAssignment: 0.8, pdfSlotAssignment: 0.65, pngSlotAssignment: 0.5, minimumArchetypes: 4 },
        advisory: 'Coverage thresholds are proposed review evidence only and are not enforced until explicitly approved.',
    });
}

export const createThresholdProposal: typeof proposeCoverageThresholds = proposeCoverageThresholds;
