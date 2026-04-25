import { join } from 'node:path';
import { buildWorkflow } from './build.js';
import { createDslWorkOrders } from './dsl-generation.js';
import { extractLocalSources, writeExtractionWorkOrder } from './extraction.js';
import { normalizeExtraction } from './normalize.js';
import { createOutlineWorkOrder } from './outline.js';
import { loadProject, projectRoot } from './project.js';
import { pathExists } from './fs-utils.js';
import { resolveMaliangDeckConfig } from './config.js';
import type { OutputFormat } from './schemas.js';
import type { ExtractLocalSourcesOptions, ExtractionWorkOrderOptions } from './extraction.js';

export type RunWorkflowOptions = ExtractLocalSourcesOptions & ExtractionWorkOrderOptions;

export function runWorkflow(slugOrPath: string, formats?: OutputFormat[], options: RunWorkflowOptions = {}): { status: 'blocked' | 'built'; message: string } {
  const root = projectRoot(slugOrPath);
  const manifest = loadProject(root);
  const resolvedConfig = resolveMaliangDeckConfig({
    cwd: root,
    projectRoot: root,
    manifest,
    cliOverrides: {
      ...(options.provider ? { extraction: { provider: options.provider } } : {}),
      ...(formats ? { outputs: { formats } } : {}),
    },
  }).config;
  const extractionOptions: RunWorkflowOptions = {
    ...options,
    provider: options.provider ?? resolvedConfig.extraction.provider,
    miner: options.miner ?? resolvedConfig.extraction.mineru.miner,
    model: options.model ?? resolvedConfig.extraction.mineru.model,
    ocr: options.ocr ?? resolvedConfig.extraction.docling.ocr,
    tables: options.tables ?? resolvedConfig.extraction.docling.tables,
    tableMode: options.tableMode ?? resolvedConfig.extraction.docling.tableMode,
    artifactsPath: options.artifactsPath ?? resolvedConfig.extraction.docling.artifactsPath,
    documentTimeoutSeconds: options.documentTimeoutSeconds ?? resolvedConfig.extraction.docling.documentTimeoutSeconds,
    allowRemoteInput: options.allowRemoteInput ?? resolvedConfig.extraction.docling.allowRemoteInput,
  };
  writeExtractionWorkOrder(root, extractionOptions);
  extractLocalSources(root, extractionOptions);
  normalizeExtraction(root, { provider: extractionOptions.provider });
  createOutlineWorkOrder(root, 'agent');
  if (!pathExists(join(root, 'planning', 'outline-approved.md'))) {
    return { status: 'blocked', message: `Outline approval required before DSL generation: ${join(root, 'planning', 'outline-approved.md')}` };
  }
  createDslWorkOrders(root, { mode: 'agent', parallel: true });
  if (!pathExists(join(root, 'dsl', 'deck.json'))) {
    return { status: 'blocked', message: `DSL assembly required before build: ${join(root, 'dsl', 'deck.json')}` };
  }
  buildWorkflow(root, formats ?? resolvedConfig.outputs.formats);
  return { status: 'built', message: `Built workflow outputs for ${root}` };
}
