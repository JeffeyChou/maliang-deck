import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import type { StyleDefinition } from '../guidance/types.js';
import { getStyle, listStyles, registerStyle } from '../guidance/style-registry.js';
import type { TemplatePack } from './contracts.js';
import { TemplatePackSchema } from './contracts.js';
import { compileTemplatePackToStyle } from './compiler.js';
import {
  getBuiltInTemplatePackRecord,
  isBuiltInTemplateId,
  listBuiltInTemplatePackRecords,
} from './builtins.js';

export type TemplatePackRegistryRecord = { pack: TemplatePack; filePath?: string; ownerDir?: string; style: StyleDefinition; source: 'file' | 'built-in' | 'memory' };
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

const templateRegistry = new Map<string, TemplatePackRegistryRecord>();
const loadedFiles = new Map<string, string>();
let builtInsRegistered = false;
let builtInsRegisteredWithDrafts = false;

export function validateTemplatePack(input: unknown): TemplatePack { return TemplatePackSchema.parse(input); }
export function loadTemplatePackFile(inputPath: string): TemplatePack { return validateTemplatePack(JSON.parse(readFileSync(inputPath, 'utf-8'))); }
export const loadTemplatePack = loadTemplatePackFile;

export function registerTemplatePack(pack: TemplatePack, options: { filePath?: string; sourcePath?: string; includeDrafts?: boolean; ownerDir?: string; source?: 'file' | 'built-in' | 'memory' } = {}): StyleDefinition {
  const filePath = options.filePath ?? options.sourcePath;
  const source = options.source ?? (filePath ? 'file' : 'memory');
  if (source !== 'built-in' && isBuiltInTemplateId(pack.id)) throw new Error(`Template pack ${pack.id} cannot shadow reserved built-in template id`);
  const existingBuiltIn = getStyle(pack.id);
  const existingFile = loadedFiles.get(pack.id);
  const existingTemplate = templateRegistry.get(pack.id);
  if (existingTemplate && existingTemplate.source !== source) throw new Error(`Template pack id collision: ${pack.id} is already loaded from ${existingTemplate.source}`);
  if (existingBuiltIn && !existingFile) throw new Error(`Template pack ${pack.id} cannot shadow built-in style`);
  if (pack.activation.status !== 'approved' && !options.includeDrafts) {
    const style = compileTemplatePackToStyle(pack);
    templateRegistry.set(pack.id, { pack, filePath, ownerDir: options.ownerDir ?? (filePath ? dirname(filePath) : undefined), style, source });
    if (filePath) loadedFiles.set(pack.id, filePath);
    return style;
  }
  if (existingFile && filePath && existingFile !== filePath) throw new Error(`Template pack id/version collision: ${pack.id} is already loaded from ${existingFile}`);
  const style = compileTemplatePackToStyle(pack);
  templateRegistry.set(pack.id, { pack, filePath, ownerDir: options.ownerDir ?? (filePath ? dirname(filePath) : undefined), style, source });
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
    registerTemplatePack(pack, { sourcePath: inputPath, includeDrafts: false, source: 'file' });
    return undefined;
  }
  return registerTemplatePack(pack, { sourcePath: inputPath, includeDrafts: options.includeDrafts, source: 'file' });
}
export function loadTemplatePackStyles(inputPaths: string[], options: { includeDrafts?: boolean } = {}): StyleDefinition[] { return inputPaths.map((path) => loadTemplateStyleFile(path, options)).filter((style): style is StyleDefinition => Boolean(style)); }
export function registerBuiltInTemplatePacks(options: { includeDrafts?: boolean } = {}): StyleDefinition[] {
  const styles: StyleDefinition[] = [];
  for (const record of listBuiltInTemplatePackRecords()) {
    if (record.pack.activation.status !== 'approved' && !options.includeDrafts) continue;
    styles.push(registerTemplatePack(record.pack, {
      filePath: record.packPath,
      ownerDir: record.ownerDir,
      includeDrafts: options.includeDrafts,
      source: 'built-in',
    }));
  }
  builtInsRegistered = true;
  if (options.includeDrafts) builtInsRegisteredWithDrafts = true;
  return styles;
}

function ensureBuiltInsRegistered(options: { includeBuiltIns?: boolean; includeDrafts?: boolean } = {}): void {
  if (options.includeBuiltIns === false) return;
  if (builtInsRegistered && (!options.includeDrafts || builtInsRegisteredWithDrafts)) return;
  registerBuiltInTemplatePacks({ includeDrafts: options.includeDrafts });
}

export function listTemplatePacks(options: { includeDrafts?: boolean; includeBuiltIns?: boolean } = {}): TemplatePack[] {
  ensureBuiltInsRegistered(options);
  return Array.from(templateRegistry.values())
    .filter((entry) => options.includeBuiltIns !== false || entry.source !== 'built-in')
    .filter((entry) => options.includeDrafts || entry.pack.activation.status === 'approved')
    .map((entry) => entry.pack);
}
export function listAvailableTemplateStyles(options: { includeDrafts?: boolean; includeBuiltIns?: boolean } = {}): StyleDefinition[] {
  ensureBuiltInsRegistered(options);
  const byId = new Map<string, StyleDefinition>();
  for (const style of listStyles(options)) {
    if (options.includeBuiltIns === false && isBuiltInTemplateId(style.id)) continue;
    byId.set(style.id, style);
  }
  for (const entry of templateRegistry.values()) {
    if (options.includeBuiltIns === false && entry.source === 'built-in') continue;
    if (options.includeDrafts || entry.pack.activation.status === 'approved') byId.set(entry.style.id, entry.style);
  }
  return Array.from(byId.values());
}
export const listTemplateAwareStyles = listAvailableTemplateStyles;
export function listGenerationStyles(): StyleDefinition[] { return listAvailableTemplateStyles(); }

export function registerTemplatePackFile(inputPath: string, options: { includeDrafts?: boolean } = {}): StyleDefinition | undefined {
  return loadTemplateStyleFile(inputPath, options);
}

export function getTemplatePackRecord(input: string, options: { includeDrafts?: boolean; includeBuiltIns?: boolean } = {}): TemplatePackRegistryRecord {
  if (existsSync(input)) {
    const filePath = resolve(input);
    const builtInByPath = options.includeBuiltIns === false
      ? undefined
      : listBuiltInTemplatePackRecords().find((record) => resolve(record.packPath) === filePath);
    if (builtInByPath) {
      registerTemplatePack(builtInByPath.pack, {
        filePath: builtInByPath.packPath,
        ownerDir: builtInByPath.ownerDir,
        includeDrafts: options.includeDrafts,
        source: 'built-in',
      });
      return templateRegistry.get(builtInByPath.id)!;
    }

    const pack = loadTemplatePackFile(filePath);
    registerTemplatePack(pack, { filePath, includeDrafts: options.includeDrafts, source: 'file' });
    return templateRegistry.get(pack.id)!;
  }

  if (options.includeBuiltIns !== false) {
    const builtIn = getBuiltInTemplatePackRecord(input);
    if (builtIn) {
      registerTemplatePack(builtIn.pack, {
        filePath: builtIn.packPath,
        ownerDir: builtIn.ownerDir,
        includeDrafts: options.includeDrafts,
        source: 'built-in',
      });
      return templateRegistry.get(input)!;
    }
  }

  const existing = templateRegistry.get(input);
  if (existing && (options.includeDrafts || existing.pack.activation.status === 'approved')) return existing;
  throw new Error(`Template pack not found: ${input}`);
}

export function getTemplatePack(input: string, options: { includeDrafts?: boolean; includeBuiltIns?: boolean } = {}): TemplatePack {
  return getTemplatePackRecord(input, options).pack;
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
