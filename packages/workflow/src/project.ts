import { randomUUID } from 'node:crypto';
import { basename, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { MaterialSourceSchema, ProjectManifestSchema, type MaterialSource, type OutputFormat, type ProjectManifest, type ProjectManifestConfig, type WorkflowStage, parseJsonWithSchema } from './schemas.js';
import { assertInside, readJson, writeJson, writeText } from './fs-utils.js';

export const PROJECT_DIRS = [
  'sources',
  'extraction',
  'extraction/mineru',
  'extraction/mineru/raw',
  'extraction/docling',
  'extraction/docling/raw',
  'extraction/normalized',
  'planning',
  'dsl',
  'dsl/slides',
  'render',
  'render/html',
  'exports',
  'review',
];

export type ProjectPaths = ReturnType<typeof getProjectPaths>;

export type ProjectSourceInput = string | {
  id: string;
  kind: MaterialSource['kind'];
  path?: string;
  url?: string;
  uri?: string;
  status?: MaterialSource['status'];
  originalName?: string;
};

export type CreateProjectOptions = {
  projectsRoot?: string;
  slug: string;
  id?: string;
  now?: Date;
  sources?: ProjectSourceInput[];
  outputFormats?: OutputFormat[];
  fonts?: Record<string, string>;
  styleId?: string;
  styleVersion?: string;
  config?: ProjectManifestConfig;
  requirementsMarkdown?: string;
};

export function assertSafeProjectSlug(slug: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(slug) || slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    throw new Error(`Invalid project slug "${slug}"; use letters, numbers, dot, underscore, or dash without path traversal.`);
  }
  return slug;
}

export function projectRoot(slugOrPath: string): string {
  if (slugOrPath.includes('/') || slugOrPath.includes('\\')) return resolve(slugOrPath);
  return resolve('projects', assertSafeProjectSlug(slugOrPath));
}

export function getProjectPaths(projectsRoot: string, slug: string): Record<string, string> {
  const root = join(resolve(projectsRoot), assertSafeProjectSlug(slug));
  return {
    root,
    projectFile: join(root, 'project.json'),
    manifest: join(root, 'project.json'),
    requirements: join(root, 'requirements.md'),
    requirementsMarkdown: join(root, 'requirements.md'),
    requirementsJson: join(root, 'requirements.json'),
    sources: join(root, 'sources'),
    mineru: join(root, 'extraction', 'mineru'),
    mineruTasks: join(root, 'extraction', 'mineru', 'tasks.json'),
    mineruRaw: join(root, 'extraction', 'mineru', 'raw'),
    docling: join(root, 'extraction', 'docling'),
    doclingTasks: join(root, 'extraction', 'docling', 'tasks.json'),
    doclingRaw: join(root, 'extraction', 'docling', 'raw'),
    normalized: join(root, 'extraction', 'normalized'),
    materials: join(root, 'extraction', 'normalized', 'materials.json'),
    blocks: join(root, 'extraction', 'normalized', 'blocks.json'),
    assets: join(root, 'extraction', 'normalized', 'assets.json'),
    sourceSummary: join(root, 'extraction', 'normalized', 'source-summary.md'),
    planning: join(root, 'planning'),
    outlineDraft: join(root, 'planning', 'outline-draft.md'),
    outlineApproved: join(root, 'planning', 'outline-approved.md'),
    outlineApproval: join(root, 'planning', 'outline-approved.md'),
    planningTasks: join(root, 'planning', 'tasks.json'),
    deckPlan: join(root, 'planning', 'deck-plan.json'),
    dsl: join(root, 'dsl'),
    dslSlides: join(root, 'dsl', 'slides'),
    slideDir: join(root, 'dsl', 'slides'),
    dslTasks: join(root, 'dsl', 'tasks.json'),
    deck: join(root, 'dsl', 'deck.json'),
    validationReport: join(root, 'dsl', 'validation-report.json'),
    renderHtml: join(root, 'render', 'html'),
    html: join(root, 'render', 'html', 'index.html'),
    exports: join(root, 'exports'),
    exportReport: join(root, 'exports', 'export-report.json'),
    pptxAnimationPlan: join(root, 'exports', 'pptx-animation-plan.json'),
    review: join(root, 'review'),
  };
}

export function projectPaths(root: string): Record<string, string> {
  const slug = basename(resolve(root));
  return getProjectPaths(resolve(root, '..'), slug);
}

function projectArtifacts(): ProjectManifest['artifacts'] {
  return {
    requirements: 'requirements.md',
    mineruTasks: 'extraction/mineru/tasks.json',
    mineruRaw: 'extraction/mineru/raw',
    doclingTasks: 'extraction/docling/tasks.json',
    doclingRaw: 'extraction/docling/raw',
    materials: 'extraction/normalized/materials.json',
    blocks: 'extraction/normalized/blocks.json',
    assets: 'extraction/normalized/assets.json',
    sourceSummary: 'extraction/normalized/source-summary.md',
    outlineDraft: 'planning/outline-draft.md',
    outlineApproval: 'planning/outline-approved.md',
    planningTasks: 'planning/tasks.json',
    deckPlan: 'planning/deck-plan.json',
    dslTasks: 'dsl/tasks.json',
    slideSlices: 'dsl/slides',
    deck: 'dsl/deck.json',
    validationReport: 'dsl/validation-report.json',
    html: 'render/html/index.html',
    exportReport: 'exports/export-report.json',
  };
}


function configObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function configOutputFormats(config: unknown): OutputFormat[] | undefined {
  const outputs = configObject(configObject(config).outputs);
  return Array.isArray(outputs.formats) ? outputs.formats as OutputFormat[] : undefined;
}

function configFonts(config: unknown): Record<string, string> | undefined {
  const fonts = configObject(config).fonts;
  return fonts && typeof fonts === 'object' && !Array.isArray(fonts) ? fonts as Record<string, string> : undefined;
}

function configString(config: unknown, key: string): string | undefined {
  const value = configObject(config)[key];
  return typeof value === 'string' ? value : undefined;
}

function sourceFromString(input: string, index: number): MaterialSource {
  const isRemote = /^https?:\/\//u.test(input);
  const isZip = input.toLowerCase().endsWith('.zip');
  return MaterialSourceSchemaParse({
    id: `source-${index + 1}`,
    kind: isRemote ? 'remote-url' : isZip ? 'local-zip' : 'local-file',
    uri: input,
    originalName: isRemote ? undefined : basename(input),
  });
}

function MaterialSourceSchemaParse(value: unknown): MaterialSource {
  return MaterialSourceSchema.parse(value) as MaterialSource;
}

function sourceFromInput(input: ProjectSourceInput, index: number): MaterialSource {
  if (typeof input === 'string') return sourceFromString(input, index);
  return MaterialSourceSchemaParse({
    ...input,
    uri: input.uri ?? input.path ?? input.url,
    originalName: input.originalName ?? (input.path ? basename(input.path) : undefined),
  });
}

export function createProject(options: CreateProjectOptions): ProjectManifest;
export function createProject(slug: string, sources?: string[], outputFormats?: OutputFormat[]): ProjectManifest;
export function createProject(slugOrOptions: string | CreateProjectOptions, sources: string[] = [], outputFormats?: OutputFormat[]): ProjectManifest {
  const options: CreateProjectOptions = typeof slugOrOptions === 'string'
    ? { slug: slugOrOptions, sources, outputFormats }
    : slugOrOptions;
  const safeSlug = assertSafeProjectSlug(options.slug);
  const root = options.projectsRoot ? join(resolve(options.projectsRoot), safeSlug) : projectRoot(safeSlug);
  ensureProjectLayout(root);

  const now = (options.now ?? new Date()).toISOString();
  const manifest = ProjectManifestSchema.parse({
    id: options.id ?? randomUUID(),
    slug: safeSlug,
    createdAt: now,
    updatedAt: now,
    stage: 'initialized',
    sources: (options.sources ?? []).map(sourceFromInput),
    outputFormats: options.outputFormats ?? configOutputFormats(options.config) ?? ['html', 'pdf', 'pptx'],
    artifacts: projectArtifacts(),
    fonts: options.fonts ?? configFonts(options.config),
    styleId: options.styleId ?? configString(options.config, 'styleId'),
    styleVersion: options.styleVersion ?? configString(options.config, 'styleVersion'),
    config: options.config,
  });
  writeJson(join(root, 'project.json'), manifest);
  if (options.requirementsMarkdown !== undefined) writeText(join(root, 'requirements.md'), options.requirementsMarkdown);
  return manifest as ProjectManifest;
}

export function readProjectManifest(path: string): Promise<ProjectManifest> {
  return Promise.resolve(parseJsonWithSchema(ProjectManifestSchema, readJson(path), 'project manifest') as ProjectManifest);
}

export function loadProject(slugOrPath: string): ProjectManifest {
  const root = projectRoot(slugOrPath);
  return parseJsonWithSchema(ProjectManifestSchema, readJson(join(root, 'project.json')), 'project manifest') as ProjectManifest;
}

export function advanceProjectStage(manifest: ProjectManifest, stage: WorkflowStage, now = new Date()): ProjectManifest {
  return ProjectManifestSchema.parse({ ...manifest, stage, currentStage: undefined, updatedAt: now.toISOString() }) as ProjectManifest;
}

export function saveProject(root: string, manifest: ProjectManifest, stage?: WorkflowStage): ProjectManifest {
  const updated = advanceProjectStage({ ...manifest, artifacts: projectArtifacts() }, stage ?? manifest.stage, new Date());
  writeJson(join(root, 'project.json'), updated);
  return updated;
}

export function resolveProjectArtifact(root: string, artifactPath: string): string {
  try {
    return assertInside(root, artifactPath);
  } catch {
    throw new Error(`Artifact path must stay inside the project: ${artifactPath}`);
  }
}

export function ensureProjectLayout(root: string): void {
  mkdirSync(root, { recursive: true });
  for (const dir of PROJECT_DIRS) mkdirSync(join(root, dir), { recursive: true });
}
