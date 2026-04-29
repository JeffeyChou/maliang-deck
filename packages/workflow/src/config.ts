import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { z } from 'zod';
import { OutputFormatSchema, type OutputFormat } from './schemas.js';
import { loadProject, projectRoot } from './project.js';

export const ExtractionProviderSchema = z.enum(['mineru', 'docling']);
export type ExtractionProviderConfig = z.infer<typeof ExtractionProviderSchema>;

export const DoclingTableModeSchema = z.enum(['fast', 'accurate']);
export type DoclingTableModeConfig = z.infer<typeof DoclingTableModeSchema>;

export const StyleValidationSchema = z.enum(['warn', 'fail']);
export type StyleValidationConfig = z.infer<typeof StyleValidationSchema>;

const CanvasConfigSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
}).strict();

const MarginConfigSchema = z.object({
  top: z.number().nonnegative().optional(),
  right: z.number().nonnegative().optional(),
  bottom: z.number().nonnegative().optional(),
  left: z.number().nonnegative().optional(),
}).strict();

const TokenConfigSchema = z.object({
  palette: z.object({
    primary: z.string().min(1).optional(),
    secondary: z.string().min(1).optional(),
    accent: z.string().min(1).optional(),
    neutral: z.string().min(1).optional(),
  }).strict().optional(),
  typography: z.object({
    headingFont: z.string().min(1).optional(),
    bodyFont: z.string().min(1).optional(),
    monoFont: z.string().min(1).optional(),
    scaleRatio: z.number().positive().optional(),
  }).strict().optional(),
  spacing: z.object({
    element: z.number().nonnegative().optional(),
    section: z.number().nonnegative().optional(),
    margin: MarginConfigSchema.optional(),
  }).strict().optional(),
}).strict();

export const MaliangDeckConfigSchema = z.object({
  extraction: z.object({
    provider: ExtractionProviderSchema.optional(),
    mineru: z.object({
      miner: z.enum(['precise']).optional(),
      model: z.string().min(1).optional(),
    }).strict().optional(),
    docling: z.object({
      ocr: z.boolean().optional(),
      tables: z.boolean().optional(),
      tableMode: DoclingTableModeSchema.optional(),
      artifactsPath: z.string().min(1).optional(),
      documentTimeoutSeconds: z.number().positive().optional(),
      allowRemoteInput: z.boolean().optional(),
    }).strict().optional(),
  }).strict().optional(),
  outputs: z.object({
    formats: z.array(OutputFormatSchema).min(1).optional(),
  }).strict().optional(),
  export: z.object({
    overflowPolicy: z.enum(['warn', 'fail']).optional(),
    overflowTolerance: z.number().nonnegative().optional(),
  }).strict().optional(),
  fonts: z.record(z.string().min(1), z.string().min(1)).optional(),
  styleId: z.string().min(1).optional(),
  styleVersion: z.string().min(1).optional(),
  templatePackPaths: z.array(z.string().min(1)).optional(),
  includeDraftTemplatePacks: z.boolean().optional(),
  theme: z.string().min(1).optional(),
  canvas: CanvasConfigSchema.optional(),
  tokens: TokenConfigSchema.optional(),
  styleValidation: StyleValidationSchema.optional(),
}).strict();

export type MaliangDeckConfig = z.infer<typeof MaliangDeckConfigSchema>;
export type MaliangDeckTokensConfig = NonNullable<MaliangDeckConfig['tokens']>;

export type ResolvedMaliangDeckConfig = Omit<MaliangDeckConfig, 'extraction' | 'outputs' | 'export' | 'templatePackPaths' | 'includeDraftTemplatePacks'> & {
  extraction: {
    provider: ExtractionProviderConfig;
    mineru: {
      miner: 'precise';
      model: string;
    };
    docling: {
      ocr: boolean;
      tables: boolean;
      tableMode: DoclingTableModeConfig;
      artifactsPath?: string;
      documentTimeoutSeconds?: number;
      allowRemoteInput: boolean;
    };
  };
  outputs: {
    formats: OutputFormat[];
  };
  export: {
    overflowPolicy: 'warn' | 'fail';
    overflowTolerance: number;
  };
  templatePackPaths: string[];
  includeDraftTemplatePacks: boolean;
};

export type ConfigSourceKind =
  | 'built-in'
  | 'global'
  | 'workspace'
  | 'manifest'
  | 'compatibility'
  | 'requirements'
  | 'deck-meta'
  | 'cli';

export type ConfigSource = {
  id: string;
  kind: ConfigSourceKind;
  label: string;
  path?: string;
};

export type ConfigProvenanceEntry = {
  path: string;
  source: ConfigSource;
  value: unknown;
};

export type ConfigResolutionReport = {
  sources: ConfigSource[];
  provenance: Record<string, ConfigProvenanceEntry>;
};

export type ConfigResolutionResult = {
  config: ResolvedMaliangDeckConfig;
  report: ConfigResolutionReport;
};

type ManifestConfigInput = {
  config?: unknown;
  outputFormats?: unknown;
  fonts?: unknown;
  styleId?: unknown;
  styleVersion?: unknown;
};

type RequirementsConfigInput = {
  outputFormats?: unknown;
  theme?: unknown;
  styleId?: unknown;
};

type DeckMetaConfigInput = {
  theme?: unknown;
  canvas?: unknown;
};

export type MaliangDeckCliOverrides = MaliangDeckConfig & {
  provider?: ExtractionProviderConfig;
  formats?: OutputFormat[];
  fontMap?: Record<string, string>;
};

export type ResolveMaliangDeckConfigOptions = {
  cwd?: string;
  homeDir?: string;
  projectRoot?: string;
  globalConfigPath?: string;
  workspaceConfigPath?: string;
  manifest?: ManifestConfigInput;
  requirements?: RequirementsConfigInput;
  deckMeta?: DeckMetaConfigInput;
  cliOverrides?: MaliangDeckCliOverrides;
};

export class ConfigResolutionError extends Error {
  override readonly name = 'ConfigResolutionError';

  constructor(message: string, public readonly source?: ConfigSource) {
    super(message);
  }
}

export const BUILT_IN_MALIANG_DECK_CONFIG: ResolvedMaliangDeckConfig = {
  extraction: {
    provider: 'mineru',
    mineru: {
      miner: 'precise',
      model: 'vlm',
    },
    docling: {
      ocr: false,
      tables: true,
      tableMode: 'fast',
      allowRemoteInput: false,
    },
  },
  outputs: {
    formats: ['html', 'pdf', 'pptx'],
  },
  export: {
    overflowPolicy: 'warn',
    overflowTolerance: 0,
  },
  templatePackPaths: [],
  includeDraftTemplatePacks: false,
  styleValidation: 'warn',
};

function sourcePrefix(source: ConfigSource): string {
  return source.path ? `${source.label} (${source.path})` : source.label;
}

function issuePath(path: Array<string | number>): string {
  return path.length ? path.join('.') : '<root>';
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issuePath(issue.path)}: ${issue.message}`).join('; ');
}

function readJsonFile(path: string, source: ConfigSource): unknown {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (error) {
    throw new ConfigResolutionError(`${sourcePrefix(source)} could not be read: ${(error as NodeJS.ErrnoException).message}`, source);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new ConfigResolutionError(`${sourcePrefix(source)} contains malformed JSON: ${(error as Error).message}`, source);
  }
}

function parseConfig(value: unknown, source: ConfigSource): MaliangDeckConfig {
  const result = MaliangDeckConfigSchema.safeParse(value);
  if (result.success) return result.data;
  throw new ConfigResolutionError(`${sourcePrefix(source)} validation failed: ${formatZodIssues(result.error)}`, source);
}

function parseOutputFormats(value: unknown, source: ConfigSource, path: string): OutputFormat[] | undefined {
  if (value === undefined) return undefined;
  const result = z.array(OutputFormatSchema).min(1).safeParse(value);
  if (result.success) return result.data;
  throw new ConfigResolutionError(`${sourcePrefix(source)} validation failed: ${path}: ${formatZodIssues(result.error)}`, source);
}

function parseStringRecord(value: unknown, source: ConfigSource, path: string): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  const result = z.record(z.string().min(1), z.string().min(1)).safeParse(value);
  if (result.success) return result.data;
  throw new ConfigResolutionError(`${sourcePrefix(source)} validation failed: ${path}: ${formatZodIssues(result.error)}`, source);
}

function parseOptionalString(value: unknown, source: ConfigSource, path: string): string | undefined {
  if (value === undefined) return undefined;
  const result = z.string().min(1).safeParse(value);
  if (result.success) return result.data;
  throw new ConfigResolutionError(`${sourcePrefix(source)} validation failed: ${path}: ${formatZodIssues(result.error)}`, source);
}

function parseCanvas(value: unknown, source: ConfigSource, path: string): ResolvedMaliangDeckConfig['canvas'] | undefined {
  if (value === undefined) return undefined;
  const result = CanvasConfigSchema.safeParse(value);
  if (result.success) return result.data;
  throw new ConfigResolutionError(`${sourcePrefix(source)} validation failed: ${path}: ${formatZodIssues(result.error)}`, source);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hasDefinedLeaf(value: unknown): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return true;
  if (!isPlainObject(value)) return true;
  return Object.values(value).some(hasDefinedLeaf);
}

function rememberSource(report: ConfigResolutionReport, source: ConfigSource): void {
  if (!report.sources.some((candidate) => candidate.id === source.id)) report.sources.push(source);
}

function provenancePath(path: string[]): string {
  return path.join('.');
}

function mergeConfigLayer(target: Record<string, unknown>, patch: Record<string, unknown>, source: ConfigSource, report: ConfigResolutionReport, path: string[] = []): void {
  if (!hasDefinedLeaf(patch)) return;
  rememberSource(report, source);

  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === undefined) continue;
    const nextPath = [...path, key];
    if (Array.isArray(patchValue)) {
      const value = cloneConfig(patchValue);
      target[key] = value;
      report.provenance[provenancePath(nextPath)] = { path: provenancePath(nextPath), source, value };
      continue;
    }
    if (isPlainObject(patchValue)) {
      const currentValue = target[key];
      const nextTarget = isPlainObject(currentValue) ? currentValue : {};
      target[key] = nextTarget;
      mergeConfigLayer(nextTarget, patchValue, source, report, nextPath);
      continue;
    }
    target[key] = patchValue;
    report.provenance[provenancePath(nextPath)] = { path: provenancePath(nextPath), source, value: patchValue };
  }
}

function makeSource(id: string, kind: ConfigSourceKind, label: string, path?: string): ConfigSource {
  return path ? { id, kind, label, path } : { id, kind, label };
}

function hasUrlScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//iu.test(value);
}

function resolveLocalPath(value: string, baseDir: string): string {
  if (hasUrlScheme(value)) return value;
  return isAbsolute(value) ? resolve(value) : resolve(baseDir, value);
}

function assertTemplatePackPath(value: string, source: ConfigSource, path: string): void {
  if (hasUrlScheme(value)) {
    throw new ConfigResolutionError(`${sourcePrefix(source)} validation failed: ${path}: remote template pack paths are not supported in JSON config v1`, source);
  }
  if (/\.(?:mjs|cjs|js)$/iu.test(value)) {
    throw new ConfigResolutionError(`${sourcePrefix(source)} validation failed: ${path}: executable template pack paths are not supported in JSON config v1`, source);
  }
  if (!/\.json$/iu.test(value)) {
    throw new ConfigResolutionError(`${sourcePrefix(source)} validation failed: ${path}: template pack paths must reference JSON files`, source);
  }
}

function normalizePathValues(config: MaliangDeckConfig, source: ConfigSource, baseDir: string): MaliangDeckConfig {
  const normalized = cloneConfig(config);
  if (normalized.templatePackPaths) {
    normalized.templatePackPaths = normalized.templatePackPaths.map((value, index) => {
      assertTemplatePackPath(value, source, `templatePackPaths.${index}`);
      return resolveLocalPath(value, baseDir);
    });
  }
  if (normalized.fonts) {
    normalized.fonts = Object.fromEntries(Object.entries(normalized.fonts).map(([name, pathValue]) => [name, resolveLocalPath(pathValue, baseDir)]));
  }
  if (normalized.extraction?.docling?.artifactsPath) {
    normalized.extraction.docling.artifactsPath = resolveLocalPath(normalized.extraction.docling.artifactsPath, baseDir);
  }
  return normalized;
}

function readConfigLayer(path: string, source: ConfigSource, baseDir = dirname(path)): MaliangDeckConfig | undefined {
  if (!existsSync(path)) return undefined;
  return normalizePathValues(parseConfig(readJsonFile(path, source), source), source, baseDir);
}

function manifestConfigLayer(manifest: ManifestConfigInput | undefined, source: ConfigSource, baseDir: string): MaliangDeckConfig | undefined {
  if (!manifest || manifest.config === undefined) return undefined;
  return normalizePathValues(parseConfig(manifest.config, source), source, baseDir);
}

function manifestCompatibilityLayer(manifest: ManifestConfigInput | undefined, source: ConfigSource, baseDir: string): MaliangDeckConfig | undefined {
  if (!manifest) return undefined;
  const formats = parseOutputFormats(manifest.outputFormats, source, 'outputFormats');
  const fonts = parseStringRecord(manifest.fonts, source, 'fonts');
  const styleId = parseOptionalString(manifest.styleId, source, 'styleId');
  const styleVersion = parseOptionalString(manifest.styleVersion, source, 'styleVersion');
  const layer: MaliangDeckConfig = {
    outputs: formats ? { formats } : undefined,
    fonts,
    styleId,
    styleVersion,
  };
  return hasDefinedLeaf(layer) ? normalizePathValues(layer, source, baseDir) : undefined;
}

function requirementsLayer(requirements: RequirementsConfigInput | undefined, source: ConfigSource): MaliangDeckConfig | undefined {
  if (!requirements) return undefined;
  const formats = parseOutputFormats(requirements.outputFormats, source, 'outputFormats');
  const theme = parseOptionalString(requirements.theme, source, 'theme');
  const styleId = parseOptionalString(requirements.styleId, source, 'styleId');
  const layer: MaliangDeckConfig = {
    outputs: formats ? { formats } : undefined,
    theme,
    styleId,
  };
  return hasDefinedLeaf(layer) ? layer : undefined;
}

function deckMetaLayer(deckMeta: DeckMetaConfigInput | undefined, source: ConfigSource): MaliangDeckConfig | undefined {
  if (!deckMeta) return undefined;
  const theme = parseOptionalString(deckMeta.theme, source, 'theme');
  const canvas = parseCanvas(deckMeta.canvas, source, 'canvas');
  const layer: MaliangDeckConfig = { theme, canvas };
  return hasDefinedLeaf(layer) ? layer : undefined;
}

function cliOverridesLayer(cliOverrides: MaliangDeckCliOverrides | undefined, source: ConfigSource): MaliangDeckConfig | undefined {
  if (!cliOverrides) return undefined;
  const { provider, formats, fontMap, ...nestedOverrides } = cliOverrides;
  const parsedNested = parseConfig(nestedOverrides, source);
  const layer: MaliangDeckConfig = {
    ...parsedNested,
    extraction: {
      ...parsedNested.extraction,
      provider: provider ?? parsedNested.extraction?.provider,
    },
    outputs: {
      ...parsedNested.outputs,
      formats: formats ?? parsedNested.outputs?.formats,
    },
    fonts: parsedNested.fonts ?? fontMap,
  };
  return hasDefinedLeaf(layer) ? layer : undefined;
}

function finalizedConfig(value: Record<string, unknown>): ResolvedMaliangDeckConfig {
  return value as ResolvedMaliangDeckConfig;
}

export type ProjectMaliangDeckConfigResolution = ConfigResolutionResult & {
  root: string;
  manifest: ManifestConfigInput;
};

export type ResolveProjectMaliangDeckConfigOptions = Omit<ResolveMaliangDeckConfigOptions, 'projectRoot' | 'manifest'>;

export function resolveProjectMaliangDeckConfig(slugOrPath: string, options: ResolveProjectMaliangDeckConfigOptions = {}): ProjectMaliangDeckConfigResolution {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const result = resolveMaliangDeckConfig({
    ...options,
    cwd: options.cwd ?? process.cwd(),
    projectRoot: root,
    manifest,
  });
  return { root, manifest, ...result };
}

export function getConfigValueSource(report: ConfigResolutionReport, path: string | string[]): ConfigSource | undefined {
  return report.provenance[Array.isArray(path) ? path.join('.') : path]?.source;
}

export function resolveMaliangDeckConfig(options: ResolveMaliangDeckConfigOptions = {}): ConfigResolutionResult {
  const cwd = resolve(options.cwd ?? process.cwd());
  const homeDir = resolve(options.homeDir ?? homedir());
  const projectRoot = resolve(options.projectRoot ?? cwd);
  const globalConfigPath = resolve(options.globalConfigPath ?? join(homeDir, '.maliang-deck', 'config.json'));
  const workspaceConfigPath = resolve(options.workspaceConfigPath ?? join(projectRoot, 'maliang-deck.config.json'));
  const report: ConfigResolutionReport = { sources: [], provenance: {} };
  const config = {} as Record<string, unknown>;

  mergeConfigLayer(config, BUILT_IN_MALIANG_DECK_CONFIG as unknown as Record<string, unknown>, makeSource('built-in', 'built-in', 'built-in defaults'), report);

  const globalSource = makeSource('global', 'global', 'global config', globalConfigPath);
  const globalConfig = readConfigLayer(globalConfigPath, globalSource);
  if (globalConfig) mergeConfigLayer(config, globalConfig as Record<string, unknown>, globalSource, report);

  const workspaceSource = makeSource('workspace', 'workspace', 'workspace config', workspaceConfigPath);
  const workspaceConfig = readConfigLayer(workspaceConfigPath, workspaceSource);
  if (workspaceConfig) mergeConfigLayer(config, workspaceConfig as Record<string, unknown>, workspaceSource, report);

  const manifestConfigSource = makeSource('manifest', 'manifest', 'project manifest config', join(projectRoot, 'project.json'));
  const manifestConfig = manifestConfigLayer(options.manifest, manifestConfigSource, projectRoot);
  if (manifestConfig) mergeConfigLayer(config, manifestConfig as Record<string, unknown>, manifestConfigSource, report);

  const compatibilitySource = makeSource('compatibility', 'compatibility', 'project manifest compatibility aliases', join(projectRoot, 'project.json'));
  const compatibilityConfig = manifestCompatibilityLayer(options.manifest, compatibilitySource, projectRoot);
  if (compatibilityConfig) mergeConfigLayer(config, compatibilityConfig as Record<string, unknown>, compatibilitySource, report);

  const requirementsSource = makeSource('requirements', 'requirements', 'requirements settings');
  const requirementsConfig = requirementsLayer(options.requirements, requirementsSource);
  if (requirementsConfig) mergeConfigLayer(config, requirementsConfig as Record<string, unknown>, requirementsSource, report);

  const deckMetaSource = makeSource('deck-meta', 'deck-meta', 'deck metadata');
  const deckConfig = deckMetaLayer(options.deckMeta, deckMetaSource);
  if (deckConfig) mergeConfigLayer(config, deckConfig as Record<string, unknown>, deckMetaSource, report);

  const cliSource = makeSource('cli', 'cli', 'CLI overrides');
  const cliConfig = cliOverridesLayer(options.cliOverrides, cliSource);
  if (cliConfig) mergeConfigLayer(config, cliConfig as Record<string, unknown>, cliSource, report);

  return { config: finalizedConfig(config), report };
}
