import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, normalize, relative } from 'node:path';
import { ensureDir, readJson, writeJson } from './fs-utils.js';

export type ExtractionProvider = 'mineru' | 'docling';

export type DoclingTableMode = 'fast' | 'accurate';
export type DoclingOutputFormat = 'md' | 'json';

export type DoclingExecFile = (
  file: string,
  args: readonly string[],
  options: ExecFileSyncOptionsWithStringEncoding,
) => string | Buffer;

export type DoclingExtractOptions = {
  executable?: string;
  formats?: DoclingOutputFormat[];
  ocr?: boolean;
  tables?: boolean;
  tableMode?: DoclingTableMode;
  artifactsPath?: string;
  documentTimeoutSeconds?: number;
  numThreads?: number;
  allowRemoteInput?: boolean;
  execFile?: DoclingExecFile;
};

export type DoclingCommand = {
  executable: string;
  args: string[];
};

export type DoclingRunRecord = {
  provider: 'docling';
  command: DoclingCommand;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  exitCode: number;
  stderr?: string;
  stdout?: string;
  version?: string;
  generatedFiles: string[];
};

export type DoclingMaterialResult = {
  materialId: string;
  rawDir: string;
  artifactsDir: string;
  markdownPath?: string;
  jsonPath?: string;
  contentListPath?: string;
  generatedFiles: string[];
};

type ContentItem = Record<string, unknown>;

const DOCLING_INSTALL_HINT = 'Install Docling with `pip install docling` in a Python >=3.10 environment. Optional OCR engines may require extras or system packages.';

export class DoclingWorkflowError extends Error {
  override readonly name = 'DoclingWorkflowError';

  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

function uniqueFormats(formats: DoclingOutputFormat[] | undefined): DoclingOutputFormat[] {
  const result: DoclingOutputFormat[] = formats?.length ? formats : ['md', 'json'];
  return [...new Set(result)];
}

export function buildDoclingCommand(options: {
  sourcePath: string;
  outputDir: string;
} & DoclingExtractOptions): DoclingCommand {
  const executable = options.executable ?? 'docling';
  const args: string[] = [];
  for (const format of uniqueFormats(options.formats)) args.push('--to', format);
  args.push('--image-export-mode', 'referenced');
  args.push(options.ocr ? '--ocr' : '--no-ocr');
  args.push(options.tables ?? true ? '--tables' : '--no-tables');
  args.push('--table-mode', options.tableMode ?? 'fast');
  args.push('--no-enable-remote-services');
  args.push('--no-allow-external-plugins');
  args.push('--abort-on-error');
  if (options.artifactsPath) args.push('--artifacts-path', options.artifactsPath);
  if (options.documentTimeoutSeconds !== undefined) args.push('--document-timeout', String(options.documentTimeoutSeconds));
  if (options.numThreads !== undefined) args.push('--num-threads', String(options.numThreads));
  args.push('--output', options.outputDir);
  args.push(options.sourcePath);
  return { executable, args };
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      const stats = statSync(path);
      if (stats.isDirectory()) visit(path);
      else files.push(path);
    }
  };
  visit(root);
  return files.sort();
}

function normalizeExecError(error: unknown): DoclingWorkflowError {
  const record = error as NodeJS.ErrnoException & { status?: number; stderr?: string | Buffer; stdout?: string | Buffer; signal?: string };
  if (record.code === 'ENOENT') {
    return new DoclingWorkflowError(`Docling CLI executable was not found. ${DOCLING_INSTALL_HINT}`, 'DOCLING_NOT_FOUND');
  }
  if (record.code === 'ETIMEDOUT' || record.signal === 'SIGTERM') {
    return new DoclingWorkflowError(`Docling extraction timed out. Try a smaller document, disable OCR, or increase --document-timeout.`, 'DOCLING_TIMEOUT');
  }
  const stderr = record.stderr ? String(record.stderr).trim() : '';
  const detail = stderr ? `: ${stderr.slice(0, 800)}` : '';
  return new DoclingWorkflowError(`Docling extraction failed${detail}`, 'DOCLING_EXEC_FAILED');
}

function copyIfExists(source: string | undefined, target: string): string | undefined {
  if (!source || !existsSync(source)) return undefined;
  ensureDir(dirname(target));
  copyFileSync(source, target);
  return target;
}

function firstByExt(files: string[], extension: string): string | undefined {
  return files.find((file) => extname(file).toLowerCase() === extension);
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function pageIndexFromProv(value: unknown): number | undefined {
  const prov = Array.isArray(value) ? value[0] : value;
  if (!prov || typeof prov !== 'object') return undefined;
  const record = prov as Record<string, unknown>;
  const raw = record.page_no ?? record.page ?? record.pageIndex ?? record.page_index;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.trunc(raw) - (raw > 0 ? 1 : 0));
  if (typeof raw === 'string' && /^\d+$/u.test(raw)) {
    const numeric = Number(raw);
    return Math.max(0, numeric - (numeric > 0 ? 1 : 0));
  }
  return undefined;
}

function bboxFromProv(value: unknown): unknown {
  const prov = Array.isArray(value) ? value[0] : value;
  if (!prov || typeof prov !== 'object') return undefined;
  const record = prov as Record<string, unknown>;
  return record.bbox ?? record.bounding_box ?? record.box;
}

function doclingKind(value: unknown): string {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('title') || raw.includes('header') || raw.includes('heading')) return 'title';
  if (raw.includes('list')) return 'list';
  if (raw.includes('table')) return 'table';
  if (raw.includes('formula') || raw.includes('equation')) return 'equation';
  if (raw.includes('picture') || raw.includes('image') || raw.includes('figure')) return 'image';
  if (raw.includes('chart')) return 'chart';
  return 'text';
}

function textFromTable(value: Record<string, unknown>): string | undefined {
  const candidates = [
    value.text,
    value.content,
    value.markdown,
    value.caption,
  ];
  for (const candidate of candidates) {
    const text = asString(candidate);
    if (text) return text;
  }
  const data = value.data;
  if (data && typeof data === 'object') {
    const cells = (data as Record<string, unknown>).table_cells ?? (data as Record<string, unknown>).cells;
    if (Array.isArray(cells)) {
      const cellText = cells.map((cell) => (cell && typeof cell === 'object' ? asString((cell as Record<string, unknown>).text ?? (cell as Record<string, unknown>).content) : asString(cell))).filter(Boolean).join(' | ');
      if (cellText) return cellText;
    }
  }
  return undefined;
}

function contentItemFromDoclingObject(value: Record<string, unknown>, fallbackKind?: string): ContentItem | undefined {
  const kind = doclingKind(value.label ?? value.type ?? value.kind ?? value.name ?? fallbackKind);
  const imageRecord = value.image && typeof value.image === 'object' ? value.image as Record<string, unknown> : undefined;
  const imagePath = asString(value.image_path ?? value.img_path ?? value.uri ?? value.path ?? imageRecord?.uri ?? imageRecord?.path);
  const text = kind === 'table' ? textFromTable(value) : asString(value.text ?? value.content ?? value.markdown ?? value.value ?? value.caption);
  if (!text && !imagePath) return undefined;
  if (text && text.trim().length < 3 && !/[\p{L}\p{N}]/u.test(text)) return undefined;
  const prov = value.prov ?? value.provenance ?? value.location;
  const item: ContentItem = {
    type: kind,
    text: text ?? '',
    page_idx: pageIndexFromProv(prov),
    bbox: bboxFromProv(prov),
  };
  if (imagePath) item.img_path = imagePath;
  const caption = Array.isArray(value.captions) ? value.captions.map(asString).filter(Boolean).join(' ') : asString(value.caption);
  if (caption) item.caption = caption;
  return item;
}

export function doclingJsonToContentItems(value: unknown, options: { rawDir?: string } = {}): ContentItem[] {
  const root = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const items: ContentItem[] = [];
  const collectArray = (key: string, fallbackKind?: string): void => {
    const candidate = root[key];
    if (!Array.isArray(candidate)) return;
    for (const entry of candidate) {
      if (entry && typeof entry === 'object') {
        const item = contentItemFromDoclingObject(entry as Record<string, unknown>, fallbackKind);
        if (item) items.push(item);
      }
    }
  };
  collectArray('texts', 'text');
  collectArray('tables', 'table');
  collectArray('pictures', 'image');
  collectArray('images', 'image');
  collectArray('figures', 'image');
  if (items.length) return rewriteContentItemPaths(items, options);

  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const entry of node) visit(entry);
      return;
    }
    const record = node as Record<string, unknown>;
    const item = contentItemFromDoclingObject(record);
    if (item) items.push(item);
    for (const child of Object.values(record)) {
      if (child && typeof child === 'object') visit(child);
    }
  };
  visit(value);
  return rewriteContentItemPaths(items, options);
}

function rewriteContentItemPaths(items: ContentItem[], options: { rawDir?: string }): ContentItem[] {
  if (!options.rawDir) return items;
  return items.map((item) => {
    const path = imagePathFromContentItem(item);
    if (!path) return item;
    const rel = normalize(relative(options.rawDir!, path));
    if (rel.startsWith('..')) return item;
    return { ...item, img_path: rel };
  });
}

function imagePathFromContentItem(item: ContentItem): string | undefined {
  return asString(item.img_path ?? item.image_path ?? item.asset_path ?? item.path ?? item.url);
}

function stageDoclingOutputs(options: {
  rawDir: string;
  artifactsDir: string;
  generatedFiles: string[];
}): Pick<DoclingMaterialResult, 'markdownPath' | 'jsonPath' | 'contentListPath'> {
  ensureDir(options.rawDir);
  const markdownSource = firstByExt(options.generatedFiles, '.md');
  const jsonSource = firstByExt(options.generatedFiles, '.json');
  const markdownPath = copyIfExists(markdownSource, join(options.rawDir, 'source.md'));
  const jsonPath = copyIfExists(jsonSource, join(options.rawDir, 'docling.json'));

  let contentListPath: string | undefined;
  if (jsonSource) {
    const items = doclingJsonToContentItems(readJson(jsonSource), { rawDir: options.rawDir });
    if (items.length) {
      contentListPath = join(options.rawDir, 'content_list.json');
      writeJson(contentListPath, items);
    }
  }

  const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
  for (const file of options.generatedFiles) {
    if (!imageExts.has(extname(file).toLowerCase())) continue;
    const rel = normalize(relative(options.artifactsDir, file));
    copyIfExists(file, join(options.rawDir, 'artifacts', rel.startsWith('..') ? basename(file) : rel));
  }
  return { markdownPath, jsonPath, contentListPath };
}

export function runDoclingOnFile(options: {
  projectDir: string;
  sourcePath: string;
  materialId: string;
} & DoclingExtractOptions): DoclingMaterialResult {
  const rawDir = join(options.projectDir, 'extraction', 'docling', 'raw', options.materialId);
  const artifactsDir = join(rawDir, 'artifacts');
  ensureDir(rawDir);
  ensureDir(artifactsDir);
  const execFile = options.execFile ?? execFileSync;
  const command = buildDoclingCommand({ ...options, outputDir: artifactsDir });
  try {
    execFile(command.executable, command.args, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: (options.documentTimeoutSeconds ?? 300) * 1000,
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    throw normalizeExecError(error);
  }
  const generatedFiles = listFiles(artifactsDir);
  const staged = stageDoclingOutputs({ rawDir, artifactsDir, generatedFiles });
  return {
    materialId: options.materialId,
    rawDir,
    artifactsDir,
    markdownPath: staged.markdownPath,
    jsonPath: staged.jsonPath,
    contentListPath: staged.contentListPath,
    generatedFiles,
  };
}
