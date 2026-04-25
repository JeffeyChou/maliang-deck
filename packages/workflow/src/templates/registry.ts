import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import type { StyleDefinition } from '../guidance/types.js';
import { getStyle, listStyles, registerStyle } from '../guidance/style-registry.js';
import type { TemplatePack } from './contracts.js';
import { TemplatePackSchema } from './contracts.js';
import { compileTemplatePackToStyle } from './compiler.js';

type RegistryRecord = { pack: TemplatePack; filePath?: string; style: StyleDefinition };
type TemplateConfigLike = {
  styleId?: string;
  templatePackPaths?: string[];
  includeDraftTemplatePacks?: boolean;
};
type TemplateConfigSource = {
  config: TemplateConfigLike;
  baseDir: string;
  label: string;
};

const templateRegistry = new Map<string, RegistryRecord>();
const loadedFiles = new Map<string, string>();

export function validateTemplatePack(input: unknown): TemplatePack { return TemplatePackSchema.parse(input); }
export function loadTemplatePackFile(inputPath: string): TemplatePack { return validateTemplatePack(JSON.parse(readFileSync(inputPath, 'utf-8'))); }
export const loadTemplatePack = loadTemplatePackFile;

export function registerTemplatePack(pack: TemplatePack, options: { filePath?: string; sourcePath?: string; includeDrafts?: boolean } = {}): StyleDefinition {
  const filePath = options.filePath ?? options.sourcePath;
  const existingBuiltIn = getStyle(pack.id);
  const existingFile = loadedFiles.get(pack.id);
  if (existingBuiltIn && !existingFile) throw new Error(`Template pack ${pack.id} cannot shadow built-in style`);
  if (pack.activation.status !== 'approved' && !options.includeDrafts) {
    const style = compileTemplatePackToStyle(pack);
    templateRegistry.set(pack.id, { pack, filePath, style });
    if (filePath) loadedFiles.set(pack.id, filePath);
    return style;
  }
  if (existingFile && filePath && existingFile !== filePath) throw new Error(`Template pack id/version collision: ${pack.id} is already loaded from ${existingFile}`);
  const style = compileTemplatePackToStyle(pack);
  templateRegistry.set(pack.id, { pack, filePath, style });
  if (filePath) loadedFiles.set(pack.id, filePath);
  if (pack.activation.status === 'approved' || options.includeDrafts) {
    registerStyle(style, { source: 'template', activationStatus: pack.activation.status });
  }
  return style;
}
export const registerTemplatePackStyle = registerTemplatePack;

export function loadTemplateStyleFile(inputPath: string, options: { includeDrafts?: boolean } = {}): StyleDefinition | undefined {
  const pack = loadTemplatePackFile(inputPath);
  if (pack.activation.status !== 'approved' && !options.includeDrafts) {
    registerTemplatePack(pack, { sourcePath: inputPath, includeDrafts: false });
    return undefined;
  }
  return registerTemplatePack(pack, { sourcePath: inputPath, includeDrafts: options.includeDrafts });
}
export function loadTemplatePackStyles(inputPaths: string[], options: { includeDrafts?: boolean } = {}): StyleDefinition[] { return inputPaths.map((path) => loadTemplateStyleFile(path, options)).filter((style): style is StyleDefinition => Boolean(style)); }
export function listTemplatePacks(options: { includeDrafts?: boolean } = {}): TemplatePack[] { return Array.from(templateRegistry.values()).filter((entry) => options.includeDrafts || entry.pack.activation.status === 'approved').map((entry) => entry.pack); }
export function listAvailableTemplateStyles(options: { includeDrafts?: boolean } = {}): StyleDefinition[] {
  const byId = new Map<string, StyleDefinition>();
  for (const style of listStyles(options)) byId.set(style.id, style);
  for (const entry of templateRegistry.values()) {
    if (options.includeDrafts || entry.pack.activation.status === 'approved') byId.set(entry.style.id, entry.style);
  }
  return Array.from(byId.values());
}
export const listTemplateAwareStyles = listAvailableTemplateStyles;
export function listGenerationStyles(): StyleDefinition[] { return listAvailableTemplateStyles(); }

export function registerTemplatePackFile(inputPath: string, options: { includeDrafts?: boolean } = {}): StyleDefinition | undefined {
  return loadTemplateStyleFile(inputPath, options);
}

export type ProjectTemplateRegistrationResult = {
  registeredStyles: StyleDefinition[];
  templatePackPaths: string[];
  includeDraftTemplatePacks: boolean;
  styleId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTemplateConfig(value: unknown, label: string): TemplateConfigLike {
  if (!isRecord(value)) return {};
  const config: TemplateConfigLike = {};
  if (value.styleId !== undefined) {
    if (typeof value.styleId !== 'string' || value.styleId.length === 0) throw new Error(`Invalid styleId in ${label}: expected non-empty string`);
    config.styleId = value.styleId;
  }
  if (value.templatePackPaths !== undefined) {
    if (!Array.isArray(value.templatePackPaths) || value.templatePackPaths.some((item) => typeof item !== 'string' || item.length === 0)) {
      throw new Error(`Invalid templatePackPaths in ${label}: expected an array of local JSON paths`);
    }
    config.templatePackPaths = value.templatePackPaths;
  }
  if (value.includeDraftTemplatePacks !== undefined) {
    if (typeof value.includeDraftTemplatePacks !== 'boolean') throw new Error(`Invalid includeDraftTemplatePacks in ${label}: expected boolean`);
    config.includeDraftTemplatePacks = value.includeDraftTemplatePacks;
  }
  return config;
}

function readConfigFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid config JSON at ${path}: ${detail}`);
  }
}

function discoverWorkspaceConfigPath(projectRoot: string): string | undefined {
  let current = resolve(projectRoot);
  while (true) {
    const candidate = join(current, 'maliang-deck.config.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function configSourcesForProject(projectRoot: string, manifest: unknown): TemplateConfigSource[] {
  const root = resolve(projectRoot);
  const sources: TemplateConfigSource[] = [];
  const workspaceConfigPath = discoverWorkspaceConfigPath(root);
  if (workspaceConfigPath) {
    sources.push({
      config: parseTemplateConfig(readConfigFile(workspaceConfigPath), workspaceConfigPath),
      baseDir: dirname(workspaceConfigPath),
      label: workspaceConfigPath,
    });
  }

  const manifestValue = manifest ?? (existsSync(join(root, 'project.json')) ? readConfigFile(join(root, 'project.json')) : undefined);
  if (isRecord(manifestValue)) {
    if (isRecord(manifestValue.config)) {
      sources.push({
        config: parseTemplateConfig(manifestValue.config, `${join(root, 'project.json')}.config`),
        baseDir: root,
        label: `${join(root, 'project.json')}.config`,
      });
    }
    sources.push({
      config: parseTemplateConfig(manifestValue, join(root, 'project.json')),
      baseDir: root,
      label: join(root, 'project.json'),
    });
  }
  return sources;
}

function resolveTemplatePackPath(inputPath: string, baseDir: string, label: string): string {
  if (/^(?:https?:)?\/\//iu.test(inputPath) || /^[a-z][a-z0-9+.-]*:\/\//iu.test(inputPath)) {
    throw new Error(`Unsupported remote template pack path in ${label}: ${inputPath}`);
  }
  const extension = extname(inputPath).toLowerCase();
  if (['.mjs', '.cjs', '.js', '.ts'].includes(extension)) throw new Error(`Unsupported executable template pack path in ${label}: ${inputPath}`);
  if (extension !== '.json') throw new Error(`Template pack paths must reference JSON files in ${label}: ${inputPath}`);
  return resolve(baseDir, inputPath);
}

export function registerConfiguredTemplatePacksForProject(projectRoot: string, manifest?: unknown): ProjectTemplateRegistrationResult {
  const sources = configSourcesForProject(projectRoot, manifest);
  let pathSource: TemplateConfigSource | undefined;
  let includeDraftTemplatePacks = false;
  let styleId: string | undefined;

  for (const source of sources) {
    if (source.config.templatePackPaths !== undefined) pathSource = source;
    if (source.config.includeDraftTemplatePacks !== undefined) includeDraftTemplatePacks = source.config.includeDraftTemplatePacks;
    if (source.config.styleId !== undefined) styleId = source.config.styleId;
  }

  const templatePackPaths = pathSource?.config.templatePackPaths?.map((path) => resolveTemplatePackPath(path, pathSource.baseDir, pathSource.label)) ?? [];
  const registeredStyles = loadTemplatePackStyles(templatePackPaths, { includeDrafts: includeDraftTemplatePacks });
  return { registeredStyles, templatePackPaths, includeDraftTemplatePacks, styleId };
}
