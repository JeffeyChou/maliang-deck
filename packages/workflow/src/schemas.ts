import { z } from 'zod';
import type { DeckDesign, SlideDesign, WorkOrderGuidance } from './guidance/types.js';

export const OutputFormatSchema = z.enum(['html', 'pdf', 'pptx']);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

export const WorkflowStageSchema = z.enum([
  'initialized',
  'intake',
  'extracted',
  'normalized',
  'outline-drafted',
  'outline-approved',
  'deck-planned',
  'dsl-work-ordered',
  'assembled',
  'built',
  'review',
]);
export type WorkflowStage = z.infer<typeof WorkflowStageSchema>;

export const MaterialSourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['local-file', 'remote-url', 'local-zip']),
  uri: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  originalName: z.string().min(1).optional(),
  status: z.enum(['pending', 'submitted', 'done', 'failed']).default('pending'),
}).superRefine((source, ctx) => {
  const location = source.uri ?? source.path ?? source.url;
  if (!location) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'source requires uri, path, or url' });
  if (source.kind === 'remote-url' && !(source.url ?? source.uri)?.startsWith('http')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'remote-url source requires url' });
  }
}).transform((source) => ({
  ...source,
  uri: source.uri ?? source.path ?? source.url ?? '',
}));
export type MaterialSource = {
  id: string;
  kind: 'local-file' | 'remote-url' | 'local-zip';
  uri: string;
  path?: string;
  url?: string;
  originalName?: string;
  status: 'pending' | 'submitted' | 'done' | 'failed';
};

export const ProjectArtifactsSchema = z.object({
  requirements: z.string(),
  mineruTasks: z.string().optional(),
  mineruRaw: z.string().optional(),
  doclingTasks: z.string().optional(),
  doclingRaw: z.string().optional(),
  materials: z.string(),
  blocks: z.string(),
  assets: z.string(),
  sourceSummary: z.string(),
  outlineDraft: z.string(),
  outlineApproval: z.string(),
  planningTasks: z.string().optional(),
  deckPlan: z.string(),
  dslTasks: z.string().optional(),
  slideSlices: z.string(),
  deck: z.string(),
  validationReport: z.string(),
  html: z.string(),
  exportReport: z.string(),
}).catchall(z.string());

export const ProjectManifestConfigSchema = z.object({
  styleId: z.string().optional(),
  styleVersion: z.string().optional(),
  templatePackPaths: z.array(z.string()).optional(),
  includeDraftTemplatePacks: z.boolean().optional(),
}).passthrough();
export type ProjectManifestConfig = z.infer<typeof ProjectManifestConfigSchema>;

export const ProjectManifestSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  stage: WorkflowStageSchema.optional(),
  currentStage: WorkflowStageSchema.optional(),
  sources: z.array(MaterialSourceSchema),
  outputFormats: z.array(OutputFormatSchema),
  artifacts: ProjectArtifactsSchema,
  fonts: z.record(z.string(), z.string()).optional(),
  styleId: z.string().optional(),
  styleVersion: z.string().optional(),
  config: ProjectManifestConfigSchema.optional(),
}).transform((manifest) => {
  const stage = manifest.stage ?? manifest.currentStage ?? 'initialized';
  return { ...manifest, stage };
});
export type ProjectManifest = {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  stage: WorkflowStage;
  currentStage?: WorkflowStage;
  sources: MaterialSource[];
  outputFormats: OutputFormat[];
  artifacts: z.infer<typeof ProjectArtifactsSchema>;
  fonts?: Record<string, string>;
  styleId?: string;
  styleVersion?: string;
  config?: ProjectManifestConfig;
};

export const RequirementsSchema = z.object({
  topic: z.string().min(1),
  goal: z.string().optional(),
  audience: z.string().optional(),
  theme: z.string().optional(),
  themeDirection: z.string().optional(),
  language: z.string().default('en'),
  slideCount: z.number().int().positive().optional(),
  durationMinutes: z.number().positive().optional(),
  outputFormats: z.array(OutputFormatSchema).default(['html', 'pdf', 'pptx']),
  speakerNotes: z.boolean().default(true),
  mandatoryContent: z.array(z.string()).default([]),
  forbiddenContent: z.array(z.string()).default([]),
  brandConstraints: z.array(z.string()).default([]),
  styleId: z.string().optional(),
}).refine((value) => value.slideCount !== undefined || value.durationMinutes !== undefined, {
  message: 'requirements must include slideCount or durationMinutes',
  path: ['slideCount'],
});
export const RequirementSetSchema = RequirementsSchema;
export type RequirementSet = z.infer<typeof RequirementSetSchema>;

export const MinerUTaskStateSchema = z.enum(['pending', 'running', 'converting', 'done', 'failed', 'waiting-file', 'uploading']);
export type MinerUTaskState = z.infer<typeof MinerUTaskStateSchema>;

export const MinerUProgressSchema = z.object({
  extracted_pages: z.number().optional(),
  total_pages: z.number().optional(),
  start_time: z.string().optional(),
});

export const MinerUCreateTaskResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  trace_id: z.string().optional(),
  data: z.object({ task_id: z.string() }).optional(),
});
export const MinerUFileUrlsBatchResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  trace_id: z.string().optional(),
  data: z.object({ batch_id: z.string(), file_urls: z.array(z.string()) }).optional(),
});
export const MinerUBatchTaskCreateResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  trace_id: z.string().optional(),
  data: z.object({ batch_id: z.string() }).optional(),
});
export const MinerUBatchResultItemSchema = z.object({
  file_name: z.string().optional(),
  data_id: z.string().optional(),
  state: MinerUTaskStateSchema,
  full_zip_url: z.string().optional(),
  err_msg: z.string().optional(),
  extract_progress: MinerUProgressSchema.optional(),
});
export const MinerUBatchResultResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  trace_id: z.string().optional(),
  data: z.object({ batch_id: z.string(), extract_result: z.array(MinerUBatchResultItemSchema) }).optional(),
});
export const MinerUTaskResultResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  trace_id: z.string().optional(),
  data: z.object({
    task_id: z.string(),
    data_id: z.string().optional(),
    state: MinerUTaskStateSchema,
    full_zip_url: z.string().optional(),
    err_msg: z.string().optional(),
    extract_progress: MinerUProgressSchema.optional(),
  }).optional(),
});

export type MinerUCreateTaskResponse = z.infer<typeof MinerUCreateTaskResponseSchema>;
export type MinerUTaskResultResponse = z.infer<typeof MinerUTaskResultResponseSchema>;
export type MinerUBatchResultResponse = z.infer<typeof MinerUBatchResultResponseSchema>;

export const MinerUPollAttemptSchema = z.object({
  state: MinerUTaskStateSchema,
  traceId: z.string().optional(),
  fullZipUrl: z.string().optional(),
  error: z.string().optional(),
});
export type MinerUPollAttempt = z.infer<typeof MinerUPollAttemptSchema>;

export const MinerUTaskRecordSchema = z.object({
  sourceId: z.string().optional(),
  materialId: z.string().optional(),
  taskId: z.string().optional(),
  requestPath: z.string().optional(),
  response: z.unknown().optional(),
  traceId: z.string().optional(),
  state: MinerUTaskStateSchema,
  attempts: z.number().int().nonnegative(),
  pollAttempts: z.array(MinerUPollAttemptSchema).default([]),
  zipPath: z.string().optional(),
  fullZipUrl: z.string().optional(),
  error: z.string().optional(),
});
export type MinerUTaskRecord = {
  sourceId?: string;
  materialId?: string;
  taskId?: string;
  requestPath?: string;
  response?: unknown;
  traceId?: string;
  state: MinerUTaskState;
  attempts: number;
  pollAttempts?: MinerUPollAttempt[];
  zipPath?: string;
  fullZipUrl?: string;
  error?: string;
};

export const TaskStatusSchema = z.enum(['pending', 'running', 'blocked', 'done', 'failed']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const ExtractionTaskSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  stage: TaskStatusSchema,
  input: z.string().min(1),
  markdown: z.string(),
  artifacts: z.string(),
  remoteTaskId: z.string().optional(),
  batchId: z.string().optional(),
  error: z.string().optional(),
}).strict();
export type ExtractionTask = z.infer<typeof ExtractionTaskSchema>;

export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
}).partial();

export const ExtractedMaterialSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  markdownPath: z.string().optional(),
  contentListPath: z.string().optional(),
  title: z.string().optional(),
  pageCount: z.number().int().nonnegative().optional(),
});
export type ExtractedMaterial = z.infer<typeof ExtractedMaterialSchema>;

export const ExtractedBlockSchema = z.object({
  id: z.string(),
  materialId: z.string(),
  kind: z.enum(['title', 'text', 'list', 'table', 'equation', 'image', 'chart', 'unknown']),
  text: z.string().default(''),
  pageIndex: z.number().int().nonnegative().optional(),
  sourceOrder: z.number().int().nonnegative(),
  assetRefs: z.array(z.string()).default([]),
});
export type ExtractedBlock = z.infer<typeof ExtractedBlockSchema>;

export const ExtractedAssetSchema = z.object({
  id: z.string(),
  materialId: z.string(),
  kind: z.enum(['image', 'table', 'chart', 'equation', 'unknown']),
  sourcePath: z.string(),
  normalizedPath: z.string().optional(),
  pageIndex: z.number().int().nonnegative().optional(),
  bbox: BoundingBoxSchema.optional(),
  caption: z.string().optional(),
  sourceOrder: z.number().int().nonnegative(),
});
export type ExtractedAsset = z.infer<typeof ExtractedAssetSchema>;

// ---------------------------------------------------------------------------
// Guidance system schemas (added for agent guidance system)
// ---------------------------------------------------------------------------

export const LockedTokensSchema = z.object({
  titleBandHeight: z.number(),
  margins: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }),
  spacing: z.object({ element: z.number(), section: z.number() }),
});

export const DeckDesignSchema = z.object({
  styleId: z.string().min(1),
  canvas: z.object({ width: z.number().positive(), height: z.number().positive() }),
  typographyScaleId: z.string().min(1),
  paletteId: z.string().min(1),
  lockedTokens: LockedTokensSchema,
});

export const SlideTypeSchema = z.enum(['title', 'section', 'evidence', 'chart', 'summary', 'closing']);

export const SlideDesignSchema = z.object({
  slideType: SlideTypeSchema,
  layoutPatternId: z.string().min(1),
  visualizationIntent: z.object({ type: z.string(), rationale: z.string() }).optional(),
  density: z.enum(['low', 'medium', 'high']),
});

const OutlineGuidanceSchema = z.object({
  audienceAnalysis: z.array(z.string()),
  storyArc: z.array(z.string()),
  infoHierarchy: z.array(z.string()),
});

const DeckPlanGuidanceSchema = z.object({
  layoutRecommendations: z.record(z.string(), z.string()),
  vizDefaults: z.record(z.string(), z.string()),
});

const SlideDslGuidanceSchema = z.object({
  elementRules: z.array(z.string()),
  colorRules: z.array(z.string()),
  positioningRules: z.array(z.string()),
  lockedTokens: LockedTokensSchema.optional(),
});

const StageGuidanceSchema = z.object({
  outline: OutlineGuidanceSchema,
  deckPlan: DeckPlanGuidanceSchema,
  slideDsl: SlideDslGuidanceSchema,
});

export const WorkOrderGuidanceSchema = z.object({
  styleId: z.string().min(1),
  stage: z.enum(['outline', 'deck-plan', 'slide-dsl']),
  structured: StageGuidanceSchema,
  roleDocs: z.array(z.object({
    path: z.string(),
    sections: z.array(z.string()),
    digest: z.string(),
  })),
  checklist: z.array(z.string()),
});

// Re-export types for consumers who import from schemas (the canonical source)
export type { DeckDesign, SlideDesign, WorkOrderGuidance } from './guidance/types.js';

// ---------------------------------------------------------------------------
// End guidance system schemas
// ---------------------------------------------------------------------------

export const SlidePlanSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceBlockRefs: z.array(z.string()).default([]),
  candidateAssetRefs: z.array(z.string()).default([]),
  contentClaims: z.array(z.object({ claim: z.string(), sourceBlockIds: z.array(z.string()).default([]) })).default([]),
  candidateAssetIds: z.array(z.string()).default([]),
  layoutIntent: z.string().min(1),
  animationIntent: z.unknown().optional(),
  speakerNotesIntent: z.string().optional(),
  outputConstraints: z.array(z.string()).min(1),
  design: SlideDesignSchema.optional(),
}).transform((slide) => ({
  ...slide,
  sourceBlockRefs: slide.sourceBlockRefs.length > 0 ? slide.sourceBlockRefs : slide.contentClaims.flatMap((claim) => claim.sourceBlockIds),
  candidateAssetRefs: slide.candidateAssetRefs.length > 0 ? slide.candidateAssetRefs : slide.candidateAssetIds,
}));
export type SlidePlan = {
  id: string;
  title: string;
  sourceBlockRefs: string[];
  candidateAssetRefs: string[];
  contentClaims: Array<{ claim: string; sourceBlockIds: string[] }>;
  candidateAssetIds: string[];
  layoutIntent: string;
  animationIntent?: unknown;
  speakerNotesIntent?: string;
  outputConstraints: string[];
  design?: SlideDesign;
};

export const DeckPlanSchema = z.object({
  projectSlug: z.string().min(1).default('project'),
  slides: z.array(SlidePlanSchema).min(1),
  deckDesign: DeckDesignSchema.optional(),
}).superRefine((plan, ctx) => {
  const seen = new Set<string>();
  for (const [index, slide] of plan.slides.entries()) {
    if (seen.has(slide.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate slide id: ${slide.id}`, path: ['slides', index, 'id'] });
    seen.add(slide.id);
  }
});
export type DeckPlan = { projectSlug: string; slides: SlidePlan[]; deckDesign?: DeckDesign };

export const GenerationWorkOrderSchema = z.object({
  id: z.string().min(1),
  projectSlug: z.string().min(1),
  kind: z.enum(['outline', 'deck-plan', 'slide-dsl']),
  inputArtifacts: z.array(z.string()).min(1),
  outputArtifacts: z.array(z.string()).min(1),
  constraints: z.array(z.string()).min(1),
  sourceRefs: z.array(z.string()).default([]),
  writeScope: z.array(z.string()).min(1),
  status: TaskStatusSchema,
  assignedTo: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  failureReason: z.string().optional(),
  guidance: WorkOrderGuidanceSchema.optional(),
}).strict();
export type GenerationWorkOrder = z.infer<typeof GenerationWorkOrderSchema>;
export type GenerationWorkOrderType = GenerationWorkOrder['kind'];

export const WorkflowStageReportSchema = z.object({
  stage: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  status: z.enum(['success', 'failed', 'blocked']),
  warnings: z.array(z.string()).default([]),
  retryAttempts: z.number().int().nonnegative().default(0),
  failureReason: z.string().optional(),
});
export type WorkflowStageReport = z.infer<typeof WorkflowStageReportSchema>;

export function parseJsonWithSchema<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new Error(`${label} validation failed: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
}
