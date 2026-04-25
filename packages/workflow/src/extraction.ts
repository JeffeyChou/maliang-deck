import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, normalize, relative, resolve } from 'node:path';
import { loadProject, projectRoot, saveProject } from './project.js';
import { assertInside, ensureDir, readJson, writeJson } from './fs-utils.js';
import { MinerUClient, MinerUWorkflowError, type FetchLike } from './mineru-client.js';
import { runDoclingOnFile, type DoclingExtractOptions, type ExtractionProvider } from './docling-runner.js';
import { resolveProjectMaliangDeckConfig, type MaliangDeckCliOverrides } from './config.js';
import type { MinerUPollAttempt, MinerUTaskRecord } from './schemas.js';

export type ExtractionResult = {
  records: MinerUTaskRecord[];
  unpackedDirs: string[];
};

export type ExtractLocalSourcesOptions = DoclingExtractOptions & {
  provider?: ExtractionProvider;
};

export type ExtractionWorkOrderOptions = DoclingExtractOptions & {
  provider?: ExtractionProvider;
  miner?: 'precise';
  model?: string;
};

type ResolvedExtractionOptions = ExtractionWorkOrderOptions & {
  provider: ExtractionProvider;
  miner: 'precise';
  model: string;
};

function definedEntries<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as Partial<T>;
}

function extractionCliOverrides(options: ExtractionWorkOrderOptions): MaliangDeckCliOverrides | undefined {
  const docling = definedEntries({
    ocr: options.ocr,
    tables: options.tables,
    tableMode: options.tableMode,
    artifactsPath: options.artifactsPath,
    documentTimeoutSeconds: options.documentTimeoutSeconds,
    allowRemoteInput: options.allowRemoteInput,
  });
  const mineru = definedEntries({
    miner: options.miner,
    model: options.model,
  });
  const override: MaliangDeckCliOverrides = {
    provider: options.provider,
    extraction: {
      provider: options.provider,
      mineru: Object.keys(mineru).length ? mineru : undefined,
      docling: Object.keys(docling).length ? docling : undefined,
    },
  };
  return Object.keys(override.extraction ?? {}).some((key) => (override.extraction as Record<string, unknown>)[key] !== undefined)
    ? override
    : undefined;
}

function resolveExtractionOptions(slugOrPath: string, options: ExtractionWorkOrderOptions = {}): { root: string; options: ResolvedExtractionOptions } {
  const { root, config } = resolveProjectMaliangDeckConfig(slugOrPath, { cliOverrides: extractionCliOverrides(options) });
  return {
    root,
    options: {
      provider: config.extraction.provider,
      miner: config.extraction.mineru.miner,
      model: config.extraction.mineru.model,
      ...config.extraction.docling,
      ...definedEntries(options),
    },
  };
}

export type MinerUZipManifest = {
  materialId: string;
  outputDir: string;
  files: Array<{ archivePath: string; outputPath: string }>;
};

function safeMaterialId(input: string, index: number): string {
  const stem = basename(input).replace(/\.[^.]+$/u, '').replace(/[^a-zA-Z0-9._-]+/gu, '-').replace(/^-|-$/gu, '');
  return stem || `material-${index + 1}`;
}

function listZipEntries(zipPath: string): string[] {
  const output = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf-8' });
  return output.split(/\r?\n/u).filter(Boolean);
}

export function assertSafeArchiveEntry(entry: string, targetDir: string): string {
  const normalizedEntry = normalize(entry.replace(/\\/gu, '/'));
  if (entry.startsWith('/') || normalizedEntry === '..' || normalizedEntry.startsWith('../') || normalizedEntry.includes('/../')) {
    throw new MinerUWorkflowError(`Unsafe ZIP entry escapes target directory: ${entry}`, 'MINERU_ZIP_UNSAFE_PATH');
  }
  return assertInside(targetDir, join(targetDir, normalizedEntry));
}

function unpackZipSafely(zipPath: string, targetDir: string): string[] {
  ensureDir(targetDir);
  const entries = listZipEntries(zipPath);
  for (const entry of entries) assertSafeArchiveEntry(entry, targetDir);
  execFileSync('unzip', ['-oq', zipPath, '-d', targetDir], { stdio: 'pipe' });
  return entries.map((entry) => join(targetDir, normalize(entry.replace(/\\/gu, '/'))));
}

function copyDirectory(source: string, target: string): string[] {
  ensureDir(target);
  const copied: string[] = [];
  const visit = (src: string, dst: string): void => {
    const stats = statSync(src);
    if (stats.isDirectory()) {
      mkdirSync(dst, { recursive: true });
      for (const entry of readdirSync(src)) visit(join(src, entry), join(dst, entry));
      return;
    }
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    copied.push(dst);
  };
  visit(source, target);
  return copied;
}

function recordPath(projectDir: string, materialId: string): string {
  return join(projectDir, 'extraction', 'mineru', 'responses', `${materialId}.json`);
}

function persistExtractionRecord(projectDir: string, materialId: string, record: MinerUTaskRecord): void {
  writeJson(recordPath(projectDir, materialId), record);
}

export async function readExtractionRecord(projectDir: string, materialId: string): Promise<MinerUTaskRecord | undefined> {
  const path = recordPath(projectDir, materialId);
  if (!existsSync(path)) return undefined;
  return readJson(path) as MinerUTaskRecord;
}

export async function pollSingleMinerUTask(options: {
  projectDir: string;
  materialId: string;
  taskId: string;
  client: Pick<MinerUClient, 'getTaskResult'>;
  intervalMs?: number;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<MinerUTaskRecord> {
  const intervalMs = options.intervalMs ?? 1_000;
  const maxAttempts = options.maxAttempts ?? 120;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolveSleep) => setTimeout(resolveSleep, ms)));
  const pollAttempts: MinerUPollAttempt[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await options.client.getTaskResult(options.taskId);
    const data = result.data;
    if (!data) throw new MinerUWorkflowError('MinerU task result is missing data', 'MINERU_RESPONSE_SCHEMA_ERROR', result.traceId);
    const pollAttempt: MinerUPollAttempt = {
      state: data.state,
      traceId: result.traceId,
      fullZipUrl: data.full_zip_url,
      error: data.err_msg || undefined,
    };
    pollAttempts.push(pollAttempt);

    const record: MinerUTaskRecord = {
      materialId: options.materialId,
      taskId: options.taskId,
      requestPath: `/extract/task/${encodeURIComponent(options.taskId)}`,
      traceId: result.traceId,
      state: data.state,
      attempts: pollAttempts.length,
      pollAttempts,
      fullZipUrl: data.full_zip_url,
      error: data.err_msg || undefined,
      response: result,
    };
    persistExtractionRecord(options.projectDir, options.materialId, record);

    if (data.state === 'done' || data.state === 'failed') return record;
    if (attempt < maxAttempts) await sleep(intervalMs);
  }

  const record: MinerUTaskRecord = {
    materialId: options.materialId,
    taskId: options.taskId,
    requestPath: `/extract/task/${encodeURIComponent(options.taskId)}`,
    state: 'failed',
    attempts: pollAttempts.length,
    pollAttempts,
    error: `Polling limit reached after ${maxAttempts} attempts`,
  };
  persistExtractionRecord(options.projectDir, options.materialId, record);
  return record;
}

export async function downloadResultZip(options: {
  projectDir: string;
  materialId: string;
  zipUrl: string;
  fetch?: FetchLike;
}): Promise<string> {
  const fetcher = options.fetch ?? (fetch as unknown as FetchLike);
  const response = await fetcher(options.zipUrl);
  if (!response.ok || !response.arrayBuffer) {
    throw new MinerUWorkflowError(`Failed to download MinerU ZIP (${response.status})`, 'MINERU_ZIP_DOWNLOAD_ERROR');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const zipPath = join(options.projectDir, 'extraction', 'mineru', 'zips', `${options.materialId}.zip`);
  ensureDir(dirname(zipPath));
  await writeFile(zipPath, bytes);
  return zipPath;
}

export async function unpackMinerUZip(projectDir: string, materialId: string, zipPath: string): Promise<MinerUZipManifest> {
  const outputDir = join(projectDir, 'extraction', 'mineru', 'unpacked', materialId);
  ensureDir(outputDir);
  const entries = listZipEntries(zipPath);
  for (const entry of entries) assertSafeArchiveEntry(entry, outputDir);
  execFileSync('unzip', ['-oq', zipPath, '-d', outputDir], { stdio: 'pipe' });
  const manifest: MinerUZipManifest = {
    materialId,
    outputDir,
    files: entries.map((entry) => ({ archivePath: entry, outputPath: join(outputDir, normalize(entry.replace(/\\/gu, '/'))) })),
  };
  writeJson(join(outputDir, 'manifest.json'), manifest);
  return manifest;
}

export async function submitLocalFilesToMinerU(options: {
  projectDir: string;
  files: Array<{ path: string; materialId: string; name?: string; isOcr?: boolean }>;
  client: MinerUClient;
}): Promise<{ batchId: string; uploadUrls: string[] }> {
  const upload = await options.client.createFileUploadUrls({
    files: options.files.map((file) => ({ name: file.name ?? basename(file.path), dataId: file.materialId, isOcr: file.isOcr })),
  });
  const batchId = upload.data?.batch_id;
  const uploadUrls = upload.data?.file_urls ?? [];
  if (!batchId || uploadUrls.length !== options.files.length) {
    throw new MinerUWorkflowError('MinerU upload URL response did not match requested file count', 'MINERU_UPLOAD_URL_MISMATCH', upload.traceId);
  }
  for (const [index, file] of options.files.entries()) {
    await options.client.uploadFileToUrl(uploadUrls[index]!, await readFile(file.path));
    const record: MinerUTaskRecord = {
      materialId: file.materialId,
      requestPath: '/file-urls/batch',
      response: { batchId, uploadUrl: '<redacted-upload-url>' },
      state: 'uploading',
      attempts: 1,
    };
    persistExtractionRecord(options.projectDir, file.materialId, record);
  }
  return { batchId, uploadUrls };
}

export function extractLocalSources(slugOrPath: string, options: ExtractLocalSourcesOptions = {}): ExtractionResult {
  const resolved = resolveExtractionOptions(slugOrPath, options);
  if (resolved.options.provider === 'docling') return extractDoclingSources(resolved.root, resolved.options);
  return extractMinerULocalSources(resolved.root);
}

function extractMinerULocalSources(slugOrPath: string): ExtractionResult {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const records: MinerUTaskRecord[] = [];
  const unpackedDirs: string[] = [];

  manifest.sources.forEach((source, index) => {
    const materialId = safeMaterialId(source.originalName ?? source.uri, index);
    const sourcePath = resolve(source.uri);
    const unpackedDir = join(root, 'extraction', 'mineru', 'unpacked', materialId);
    const zipPath = join(root, 'extraction', 'mineru', 'zips', `${materialId}.zip`);

    if (source.kind === 'remote-url') {
      records.push({
        sourceId: source.id,
        materialId,
        requestPath: '/extract/task',
        response: { url: source.uri },
        state: 'pending',
        attempts: 0,
      });
      return;
    }

    if (!existsSync(sourcePath)) throw new Error(`Source does not exist: ${sourcePath}`);
    let unpackedFiles: string[];
    if (source.kind === 'local-zip') {
      ensureDir(dirname(zipPath));
      copyFileSync(sourcePath, zipPath);
      unpackedFiles = unpackZipSafely(zipPath, unpackedDir);
    } else {
      unpackedFiles = copyDirectory(sourcePath, unpackedDir);
    }
    unpackedDirs.push(unpackedDir);
    records.push({
      sourceId: source.id,
      materialId,
      requestPath: source.kind === 'local-zip' ? 'fixture/local-zip' : 'fixture/local-file',
      response: { materialId, unpackedFiles: unpackedFiles.map((file) => relative(root, file)) },
      state: 'done',
      attempts: 1,
      zipPath: source.kind === 'local-zip' ? relative(root, zipPath) : undefined,
    });
  });

  writeJson(join(root, 'extraction', 'mineru', 'tasks.json'), records);
  saveProject(root, manifest, 'extracted');
  return { records, unpackedDirs };
}

function extractDoclingSources(slugOrPath: string, options: ExtractLocalSourcesOptions): ExtractionResult {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const records: MinerUTaskRecord[] = [];
  const unpackedDirs: string[] = [];

  manifest.sources.forEach((source, index) => {
    const materialId = safeMaterialId(source.originalName ?? source.uri, index);
    if (source.kind === 'remote-url' && !options.allowRemoteInput) {
      throw new Error(`Docling provider rejects remote-url sources by default for local/offline safety: ${source.uri}`);
    }
    if (source.kind === 'local-zip') {
      throw new Error(`Docling provider expects local document files, not prepared ZIP artifacts: ${source.uri}`);
    }
    const sourcePath = source.kind === 'remote-url' ? source.uri : resolve(source.uri);
    if (source.kind !== 'remote-url' && !existsSync(sourcePath)) throw new Error(`Source does not exist: ${sourcePath}`);

    const result = runDoclingOnFile({
      ...options,
      projectDir: root,
      sourcePath,
      materialId,
    });
    unpackedDirs.push(result.unpackedDir);
    records.push({
      sourceId: source.id,
      materialId,
      requestPath: 'docling/local-cli',
      response: {
        record: result.record,
        markdownPath: result.markdownPath ? relative(root, result.markdownPath) : undefined,
        jsonPath: result.jsonPath ? relative(root, result.jsonPath) : undefined,
        contentListPath: result.contentListPath ? relative(root, result.contentListPath) : undefined,
      },
      state: 'done',
      attempts: 1,
    });
  });

  writeJson(join(root, 'extraction', 'docling', 'tasks.json'), records);
  saveProject(root, manifest, 'extracted');
  return { records, unpackedDirs };
}

export function writeExtractionWorkOrder(slugOrPath: string, minerOrOptions?: 'precise' | ExtractionWorkOrderOptions, model?: string): string {
  const explicitOptions: ExtractionWorkOrderOptions = typeof minerOrOptions === 'object'
    ? minerOrOptions
    : minerOrOptions
      ? { provider: 'mineru', miner: minerOrOptions, model }
      : {};
  const { root, options } = resolveExtractionOptions(slugOrPath, explicitOptions);
  const manifest = loadProject(root);
  const provider = options.provider;
  const path = join(root, 'extraction', provider, 'extract-work-order.json');
  writeJson(path, {
    provider,
    miner: provider === 'mineru' ? options.miner ?? 'precise' : undefined,
    model: provider === 'mineru' ? options.model : undefined,
    sources: manifest.sources,
    requiredArtifacts: provider === 'mineru'
      ? ['full.md', 'content_list.json', 'structured JSON files', 'visual assets']
      : ['Docling Markdown', 'Docling JSON', 'provider-adapted content_list.json when structure is available'],
    uploadFlow: provider === 'mineru' ? ['/api/v4/file-urls/batch', 'PUT upload URLs', '/api/v4/extract-results/batch/{batch_id}'] : undefined,
    tokenPolicy: provider === 'mineru'
      ? 'Read MINERU_API_TOKEN from process environment or local .env at execution time; never persist token values.'
      : undefined,
    localExecutionPolicy: provider === 'docling'
      ? 'Run installed Docling CLI locally with remote services and external plugins disabled by default. True air-gapped use requires --artifacts-path with pre-downloaded model artifacts.'
      : undefined,
    doclingOptions: provider === 'docling'
      ? {
          formats: options.formats ?? ['md', 'json'],
          ocr: options.ocr,
          tables: options.tables,
          tableMode: options.tableMode,
          artifactsPath: options.artifactsPath,
          documentTimeoutSeconds: options.documentTimeoutSeconds,
        }
      : undefined,
    status: 'open',
  });
  return path;
}
