import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, normalize, relative, resolve } from 'node:path';
import { loadProject, projectRoot, saveProject } from './project.js';
import { assertInside, ensureDir, readJson, writeJson } from './fs-utils.js';
import { MinerUClient, MinerUWorkflowError, type FetchLike } from './mineru-client.js';
import { runDoclingOnFile, type DoclingExtractOptions, type ExtractionProvider } from './docling-runner.js';
import { resolveProjectMaliangDeckConfig, type MaliangDeckCliOverrides } from './config.js';
import type { ExtractionTask, MinerUPollAttempt, MinerUTaskRecord, TaskStatus } from './schemas.js';

export type ExtractionResult = {
  records: ExtractionTask[];
  rawDirs: string[];
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

function safeMaterialId(_input: string, index: number): string {
  return `m${index + 1}`;
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
  void materialId;
  return join(projectDir, 'extraction', 'mineru', 'tasks.json');
}

function persistExtractionRecord(projectDir: string, materialId: string, record: MinerUTaskRecord): void {
  const task = compactTaskFromRecord(materialId, record);
  upsertExtractionTask(projectDir, 'mineru', task);
}

export async function readExtractionRecord(projectDir: string, materialId: string): Promise<MinerUTaskRecord | undefined> {
  const path = recordPath(projectDir, materialId);
  if (!existsSync(path)) return undefined;
  const records = readJson(path) as ExtractionTask[];
  const task = records.find((entry) => entry.id === materialId);
  if (!task) return undefined;
  return {
    sourceId: task.sourceId,
    materialId: task.id,
    taskId: task.remoteTaskId,
    state: task.stage === 'running' ? 'running' : task.stage === 'failed' ? 'failed' : task.stage === 'done' ? 'done' : 'pending',
    attempts: 0,
    error: task.error,
  };
}

function taskStatusFromMinerUState(state: MinerUTaskRecord['state']): TaskStatus {
  if (state === 'done') return 'done';
  if (state === 'failed') return 'failed';
  if (state === 'pending' || state === 'waiting-file') return 'pending';
  return 'running';
}

function compactTaskFromRecord(materialId: string, record: MinerUTaskRecord): ExtractionTask {
  const response = record.response && typeof record.response === 'object' ? record.response as Record<string, unknown> : {};
  const batchId = typeof response.batchId === 'string' ? response.batchId : undefined;
  return {
    id: materialId,
    sourceId: record.sourceId ?? materialId,
    stage: taskStatusFromMinerUState(record.state),
    input: record.requestPath ?? '',
    markdown: `extraction/mineru/raw/${materialId}/source.md`,
    artifacts: `extraction/mineru/raw/${materialId}/artifacts`,
    remoteTaskId: record.taskId,
    batchId,
    error: record.error,
  };
}

function upsertExtractionTask(projectDir: string, provider: ExtractionProvider, task: ExtractionTask): void {
  const path = join(projectDir, 'extraction', provider, 'tasks.json');
  const current = existsSync(path) ? readJson(path) as ExtractionTask[] : [];
  const next = current.filter((entry) => entry.id !== task.id);
  next.push(task);
  writeJson(path, next.sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true })));
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
  const zipPath = join(options.projectDir, 'extraction', 'mineru', 'raw', options.materialId, 'artifacts', 'source.zip');
  ensureDir(dirname(zipPath));
  await writeFile(zipPath, bytes);
  return zipPath;
}

export async function unpackMinerUZip(projectDir: string, materialId: string, zipPath: string): Promise<MinerUZipManifest> {
  const outputDir = join(projectDir, 'extraction', 'mineru', 'raw', materialId);
  ensureDir(outputDir);
  const entries = listZipEntries(zipPath);
  for (const entry of entries) assertSafeArchiveEntry(entry, outputDir);
  execFileSync('unzip', ['-oq', zipPath, '-d', outputDir], { stdio: 'pipe' });
  const manifest: MinerUZipManifest = {
    materialId,
    outputDir,
    files: entries.map((entry) => ({ archivePath: entry, outputPath: join(outputDir, normalize(entry.replace(/\\/gu, '/'))) })),
  };
  if (existsSync(join(outputDir, 'full.md')) && !existsSync(join(outputDir, 'source.md'))) {
    copyFileSync(join(outputDir, 'full.md'), join(outputDir, 'source.md'));
  }
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
  const records: ExtractionTask[] = [];
  const rawDirs: string[] = [];

  manifest.sources.forEach((source, index) => {
    const materialId = safeMaterialId(source.originalName ?? source.uri, index);
    const sourcePath = resolve(source.uri);
    const rawDir = join(root, 'extraction', 'mineru', 'raw', materialId);
    const artifactsDir = join(rawDir, 'artifacts');
    const zipPath = join(artifactsDir, 'source.zip');

    if (source.kind === 'remote-url') {
      records.push({
        id: materialId,
        sourceId: source.id,
        stage: 'pending',
        input: source.uri,
        markdown: relative(root, join(rawDir, 'source.md')),
        artifacts: relative(root, artifactsDir),
      });
      return;
    }

    if (!existsSync(sourcePath)) throw new Error(`Source does not exist: ${sourcePath}`);
    ensureDir(artifactsDir);
    if (source.kind === 'local-zip') {
      copyFileSync(sourcePath, zipPath);
      unpackZipSafely(zipPath, rawDir);
    } else {
      copyDirectory(sourcePath, rawDir);
    }
    if (existsSync(join(rawDir, 'full.md')) && !existsSync(join(rawDir, 'source.md'))) {
      copyFileSync(join(rawDir, 'full.md'), join(rawDir, 'source.md'));
    }
    rawDirs.push(rawDir);
    records.push({
      id: materialId,
      sourceId: source.id,
      stage: 'done',
      input: source.uri,
      markdown: relative(root, join(rawDir, 'source.md')),
      artifacts: relative(root, artifactsDir),
    });
  });

  writeJson(join(root, 'extraction', 'mineru', 'tasks.json'), records);
  saveProject(root, manifest, 'extracted');
  return { records, rawDirs, unpackedDirs: rawDirs };
}

function extractDoclingSources(slugOrPath: string, options: ExtractLocalSourcesOptions): ExtractionResult {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const records: ExtractionTask[] = [];
  const rawDirs: string[] = [];

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
    rawDirs.push(result.rawDir);
    records.push({
      id: materialId,
      sourceId: source.id,
      stage: 'done',
      input: source.uri,
      markdown: result.markdownPath ? relative(root, result.markdownPath) : '',
      artifacts: relative(root, result.artifactsDir),
    });
  });

  writeJson(join(root, 'extraction', 'docling', 'tasks.json'), records);
  saveProject(root, manifest, 'extracted');
  return { records, rawDirs, unpackedDirs: rawDirs };
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
  const path = join(root, 'extraction', provider, 'tasks.json');
  const tasks: ExtractionTask[] = manifest.sources.map((source, index) => {
    const id = safeMaterialId(source.originalName ?? source.uri, index);
    return {
      id,
      sourceId: source.id,
      stage: 'pending',
      input: source.uri,
      markdown: `extraction/${provider}/raw/${id}/source.md`,
      artifacts: `extraction/${provider}/raw/${id}/artifacts`,
    };
  });
  writeJson(path, tasks);
  return path;
}
