import { z } from 'zod';
import type { DeckDesign, DesignTokens, SlideType, StyleDefinition, WorkOrderGuidance } from '../guidance/types.js';

export const TemplateSourceFormatSchema = z.enum(['pptx', 'html', 'pdf', 'png']);
export type TemplateSourceFormat = z.infer<typeof TemplateSourceFormatSchema>;

export const TemplateConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type TemplateConfidence = z.infer<typeof TemplateConfidenceSchema>;

export const TemplateActivationStatusSchema = z.enum(['draft', 'approved', 'deprecated']);
export type TemplateActivationStatus = z.infer<typeof TemplateActivationStatusSchema>;

export const TemplateBboxSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type TemplateBbox = z.infer<typeof TemplateBboxSchema>;

export const TemplateDimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});
export type TemplateDimensions = z.infer<typeof TemplateDimensionsSchema>;

export const TemplateProvenanceSchema = z.object({
  sourceId: z.string().min(1),
  format: TemplateSourceFormatSchema,
  path: z.string().min(1),
  slideIndex: z.number().int().nonnegative().optional(),
  pageIndex: z.number().int().nonnegative().optional(),
  selector: z.string().optional(),
  adapter: z.string().min(1),
});
export type TemplateProvenance = z.infer<typeof TemplateProvenanceSchema>;

export const TemplateObservationTypeSchema = z.enum(['text', 'image', 'shape', 'region', 'background', 'table', 'chart']);
export type TemplateObservationType = z.infer<typeof TemplateObservationTypeSchema>;

export const TemplateObservationSchema = z.object({
  id: z.string().min(1),
  type: TemplateObservationTypeSchema,
  role: z.string().optional(),
  text: z.string().optional(),
  bbox: TemplateBboxSchema,
  colors: z.array(z.string()).default([]),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  confidence: z.number().min(0).max(1),
  provenance: TemplateProvenanceSchema,
  warnings: z.array(z.string()).default([]),
});
export type TemplateObservation = z.infer<typeof TemplateObservationSchema>;

export const TemplateSourceRecordSchema = z.object({
  id: z.string().min(1),
  format: TemplateSourceFormatSchema,
  path: z.string().min(1),
  dimensions: TemplateDimensionsSchema,
  pageCount: z.number().int().positive().optional(),
  slideCount: z.number().int().positive().optional(),
  warnings: z.array(z.string()).default([]),
});
export type TemplateSourceRecord = z.infer<typeof TemplateSourceRecordSchema>;

export const TemplateExtractionIRSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  sources: z.array(TemplateSourceRecordSchema).min(1),
  observations: z.array(TemplateObservationSchema),
  warnings: z.array(z.string()).default([]),
});
export type TemplateExtractionIR = z.infer<typeof TemplateExtractionIRSchema>;

export const TemplateSlotSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  bbox: TemplateBboxSchema,
  required: z.boolean().default(false),
  accepts: z.array(TemplateObservationTypeSchema).min(1),
  confidence: z.number().min(0).max(1),
  provenance: z.array(TemplateProvenanceSchema).default([]),
});
export type TemplateSlot = z.infer<typeof TemplateSlotSchema>;

export const TemplateArchetypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slideType: z.enum(['title', 'section', 'evidence', 'chart', 'summary', 'closing']),
  purpose: z.string().min(1),
  slots: z.array(TemplateSlotSchema).min(1),
  confidence: z.number().min(0).max(1),
  provenance: z.array(TemplateProvenanceSchema).default([]),
});
export type TemplateArchetype = z.infer<typeof TemplateArchetypeSchema>;

export const TemplateFragmentSchema = z.object({
  id: z.string().min(1),
  archetypeId: z.string().min(1),
  description: z.string().min(1),
  variables: z.record(z.string(), z.string()),
  slideDsl: z.record(z.string(), z.unknown()),
  confidence: z.number().min(0).max(1),
  provenance: z.array(TemplateProvenanceSchema).default([]),
});
export type TemplateFragment = z.infer<typeof TemplateFragmentSchema>;

export const TemplateTokensSchema = z.object({
  palette: z.object({
    primary: z.string().min(1),
    secondary: z.string().min(1),
    accent: z.string().min(1),
    neutral: z.string().min(1),
    semantic: z.record(z.string(), z.string()).optional(),
  }),
  typography: z.object({
    headingFont: z.string().min(1),
    bodyFont: z.string().min(1),
    monoFont: z.string().min(1),
    scaleRatio: z.number().positive(),
  }),
  spacing: z.object({
    element: z.number().positive(),
    section: z.number().positive(),
    margin: z.object({ top: z.number().nonnegative(), right: z.number().nonnegative(), bottom: z.number().nonnegative(), left: z.number().nonnegative() }),
  }),
  canvas: TemplateDimensionsSchema,
  backgrounds: z.array(z.string()).default([]),
});
export type TemplateTokens = z.infer<typeof TemplateTokensSchema>;

const CoverageMetricSchema = z.object({
  covered: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  ratio: z.number().min(0).max(1),
});

export const TemplateCoverageReportSchema = z.object({
  templateId: z.string().min(1),
  generatedAt: z.string().datetime(),
  significantObservationCount: z.number().int().nonnegative(),
  assignedSlotCount: z.number().int().nonnegative(),
  metrics: z.object({
    tokens: CoverageMetricSchema,
    archetypes: CoverageMetricSchema,
    slots: CoverageMetricSchema,
    fragments: CoverageMetricSchema,
  }),
  formatConfidence: z.record(TemplateSourceFormatSchema, z.number().min(0).max(1)),
  warnings: z.array(z.string()).default([]),
  sampleDeck: z.object({ validates: z.boolean(), formats: z.record(z.string(), z.boolean()), degraded: z.boolean(), warnings: z.array(z.string()).default([]) }).optional(),
  slotCoverage: z.object({ assignedSignificantObservations: z.number().int().nonnegative() }).optional(),
});
export type TemplateCoverageReport = z.infer<typeof TemplateCoverageReportSchema>;

export const TemplateCoverageThresholdProposalSchema = z.object({
  templateId: z.string().min(1),
  reviewStatus: z.literal('proposed'),
  generatedAt: z.string().datetime().default(() => new Date().toISOString()),
  thresholds: z.object({
    pptxSlotAssignment: z.number().min(0).max(1).optional(),
    htmlSlotAssignment: z.number().min(0).max(1).optional(),
    pdfSlotAssignment: z.number().min(0).max(1).optional(),
    pngSlotAssignment: z.number().min(0).max(1).optional(),
    minimumArchetypes: z.number().int().nonnegative().optional(),
    tokenCoverage: z.number().min(0).max(1).optional(),
    archetypeCoverage: z.number().min(0).max(1).optional(),
    slotCoverage: z.number().min(0).max(1).optional(),
    fragmentCoverage: z.number().min(0).max(1).optional(),
  }),
  rationale: z.array(z.string()).default([]),
  advisory: z.string().min(1).default('Coverage thresholds are proposed review evidence only and are not enforced until explicitly approved.'),
});
export type TemplateCoverageThresholdProposal = z.infer<typeof TemplateCoverageThresholdProposalSchema>;

export const TemplateSampleDeckMetadataSchema = z.object({
  path: z.string().min(1).optional(),
  case: z.object({
    title: z.string().min(1),
    domain: z.string().min(1),
    audience: z.string().min(1),
    narrative: z.string().min(1),
    slideCount: z.number().int().positive(),
    canvas: TemplateDimensionsSchema,
  }).optional(),
  staticFallback: z.object({
    htmlOnlyFeatures: z.array(z.string().min(1)).min(1),
    staticBehavior: z.enum(['ignored', 'flattened', 'documented-only']),
    notes: z.array(z.string().min(1)).min(1),
  }).optional(),
  warnings: z.array(z.string()).default([]),
});
export type TemplateSampleDeckMetadata = z.infer<typeof TemplateSampleDeckMetadataSchema>;

export const TemplatePackSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  createdAt: z.string().datetime(),
  sources: z.array(TemplateSourceRecordSchema).min(1),
  tokens: TemplateTokensSchema,
  archetypes: z.array(TemplateArchetypeSchema).min(1),
  fragments: z.array(TemplateFragmentSchema).min(1),
  guidance: z.object({
    summary: z.string().min(1),
    outline: z.array(z.string()).default([]),
    deckPlan: z.array(z.string()).default([]),
    slideDsl: z.array(z.string()).default([]),
  }),
  provenance: z.array(TemplateProvenanceSchema).default([]),
  coverage: TemplateCoverageReportSchema.optional(),
  activation: z.object({ status: TemplateActivationStatusSchema, approvedAt: z.string().datetime().optional(), approvedBy: z.string().optional() }),
  sampleDeck: TemplateSampleDeckMetadataSchema.optional(),
  warnings: z.array(z.string()).default([]),
});
export type TemplatePack = z.infer<typeof TemplatePackSchema>;

export type TemplateSourceAdapter = {
  readonly format: TemplateSourceFormat;
  extract(path: string, options?: TemplateAdapterOptions): Promise<TemplateExtractionIR> | TemplateExtractionIR;
};

export type TemplateAdapterOptions = {
  id?: string;
  maxBytes?: number;
  maxPages?: number;
};

export type TemplateCompilationResult = {
  style: StyleDefinition;
  deckDesign: DeckDesign;
  guidance: WorkOrderGuidance;
};

export type TemplatePackRuntime = TemplatePack & { tokens: TemplateTokens & DesignTokens; archetypes: Array<TemplateArchetype & { slideType: SlideType }> };
