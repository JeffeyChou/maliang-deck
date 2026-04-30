import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import {
  approveOutline,
  assembleDeck,
  buildWorkflow,
  createDeckPlanWorkOrder,
  createDslWorkOrders,
  createOutlineWorkOrder,
  createProject,
  extractLocalSources,
  normalizeExtraction,
  resolveMaliangDeckConfig,
  runWorkflow,
  validateDeckPlan,
  writeExtractionWorkOrder,
  writeRequirementsTemplate,
  type DoclingTableMode,
  type ExtractionProvider,
  type OutputFormat,
} from '@maliang-deck/workflow';

function findWorkspaceRoot(start = process.cwd()): string {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(start);
    current = parent;
  }
}

function resolveProjectsRoot(input?: string): string {
  return input ? resolve(input) : join(findWorkspaceRoot(), 'projects');
}

function hasPathSeparator(input: string): boolean {
  return input.includes('/') || input.includes('\\');
}

export function resolveWorkflowSourceInput(source: string): string {
  if (/^https?:\/\//u.test(source) || isAbsolute(source)) return source;
  return resolve(findWorkspaceRoot(), source);
}

export function resolveWorkflowProjectInput(project: string, projectsRootInput?: string): string {
  if (isAbsolute(project)) return project;
  const workspaceRoot = projectsRootInput ? dirname(resolveProjectsRoot(projectsRootInput)) : findWorkspaceRoot();
  if (!hasPathSeparator(project)) return join(resolveProjectsRoot(projectsRootInput), project);
  const normalized = project.replace(/\\/g, '/');
  if (normalized === 'projects' || normalized.startsWith('projects/')) return resolve(workspaceRoot, project);
  return resolve(workspaceRoot, project);
}

function parseFormats(input?: string): OutputFormat[] | undefined {
  if (!input) return undefined;
  const formats = input.split(',').map((value) => value.trim()).filter(Boolean);
  for (const format of formats) {
    if (!['html', 'pdf', 'pptx'].includes(format)) throw new Error(`Unsupported workflow output format: ${format}`);
  }
  return formats as OutputFormat[];
}

function parseMode(input?: string): 'agent' | 'manual' {
  if (!input || input === 'agent') return 'agent';
  if (input === 'manual') return 'manual';
  throw new Error(`Unsupported workflow mode: ${input}`);
}

function parseProvider(input?: string): ExtractionProvider | undefined {
  if (!input || input === 'mineru' || input === 'docling') return input as ExtractionProvider;
  throw new Error(`Unsupported extraction provider: ${input}. Use "mineru" or "docling".`);
}

function parseTableMode(input?: string): DoclingTableMode | undefined {
  if (!input || input === 'fast' || input === 'accurate') return input as DoclingTableMode;
  throw new Error(`Unsupported Docling table mode: ${input}. Use "fast" or "accurate".`);
}

function parseOptionalNumber(input?: string): number | undefined {
  if (input === undefined) return undefined;
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Expected a positive number, got: ${input}`);
  return value;
}

function cliOption<T>(command: Command, name: string, value: T): T | undefined {
  return command.getOptionValueSource(name) === 'cli' ? value : undefined;
}

function formatsCliOverride(command: Command, formats?: string): OutputFormat[] | undefined {
  const explicit = cliOption(command, 'formats', formats);
  return explicit === undefined ? undefined : parseFormats(explicit);
}

function extractionCliOverrides(command: Command, opts: {
  provider?: string;
  mineru?: 'precise';
  model?: string;
  ocr?: boolean;
  tables?: boolean;
  tableMode?: string;
  artifactsPath?: string;
  documentTimeout?: string;
  allowRemoteInput?: boolean;
}): {
  provider?: ExtractionProvider;
  miner?: 'precise';
  model?: string;
  ocr?: boolean;
  tables?: boolean;
  tableMode?: DoclingTableMode;
  artifactsPath?: string;
  documentTimeoutSeconds?: number;
  allowRemoteInput?: boolean;
} {
  const providerInput = cliOption(command, 'provider', opts.provider);
  const tableModeInput = cliOption(command, 'tableMode', opts.tableMode);
  const documentTimeoutInput = cliOption(command, 'documentTimeout', opts.documentTimeout);
  return {
    provider: providerInput === undefined ? undefined : parseProvider(providerInput),
    miner: cliOption(command, 'mineru', opts.mineru),
    model: cliOption(command, 'model', opts.model),
    ocr: cliOption(command, 'ocr', opts.ocr),
    tables: cliOption(command, 'tables', opts.tables),
    tableMode: tableModeInput === undefined ? undefined : parseTableMode(tableModeInput),
    artifactsPath: cliOption(command, 'artifactsPath', opts.artifactsPath),
    documentTimeoutSeconds: parseOptionalNumber(documentTimeoutInput),
    allowRemoteInput: cliOption(command, 'allowRemoteInput', opts.allowRemoteInput),
  };
}

export function registerWorkflowCommand(program: Command): void {
  const workflow = program.command('workflow').description('Project-based MinerU document-to-slides workflow');

  workflow
    .command('init <projectSlug>')
    .description('Create a workflow project folder and manifest')
    .requiredOption('--sources <pathsOrUrls...>', 'Source paths or URLs')
    .option('--formats <formats>', 'Comma-separated output formats', 'html,pdf,pptx')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((projectSlug: string, opts: { sources: string[]; formats?: string; projectsRoot?: string }, command: Command) => {
      const explicitFormats = formatsCliOverride(command, opts.formats);
      const resolved = resolveMaliangDeckConfig({ cliOverrides: explicitFormats ? { formats: explicitFormats, outputs: { formats: explicitFormats } } : undefined });
      const projectsRoot = resolveProjectsRoot(opts.projectsRoot);
      const manifest = createProject({ projectsRoot, slug: projectSlug, sources: opts.sources.map(resolveWorkflowSourceInput), outputFormats: resolved.config.outputs.formats });
      console.log(`Created workflow project: ${join(projectsRoot, manifest.slug)}`);
    });

  workflow
    .command('intake <project>')
    .description('Create or refresh requirements intake template')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((project: string, opts: { projectsRoot?: string }) => {
      console.log(`Requirements template: ${writeRequirementsTemplate(resolveWorkflowProjectInput(project, opts.projectsRoot))}`);
    });

  workflow
    .command('extract <project>')
    .description('Create an extraction work order and process sources with MinerU-compatible local artifacts or optional Docling')
    .option('--provider <provider>', 'Extraction provider: mineru or docling')
    .option('--mineru <miner>', 'MinerU mode')
    .option('--model <model>', 'MinerU model')
    .option('--ocr', 'Enable OCR when using Docling')
    .option('--no-tables', 'Disable table extraction when using Docling')
    .option('--table-mode <mode>', 'Docling table mode: fast or accurate')
    .option('--artifacts-path <path>', 'Docling local model artifacts path for air-gapped runs')
    .option('--document-timeout <seconds>', 'Docling per-document timeout in seconds')
    .option('--allow-remote-input', 'Allow Docling to fetch remote URL sources instead of rejecting them')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((project: string, opts: { provider?: string; mineru?: 'precise'; model?: string; ocr?: boolean; tables?: boolean; tableMode?: string; artifactsPath?: string; documentTimeout?: string; allowRemoteInput?: boolean; projectsRoot?: string }, command: Command) => {
      const extractionOptions = extractionCliOverrides(command, opts);
      const resolvedProject = resolveWorkflowProjectInput(project, opts.projectsRoot);
      const workOrder = writeExtractionWorkOrder(resolvedProject, extractionOptions);
      const result = extractLocalSources(resolvedProject, extractionOptions);
      console.log(`Extraction task manifest: ${workOrder}`);
      console.log(`Extraction records: ${result.records.length}`);
    });

  workflow
    .command('normalize <project>')
    .description('Normalize provider Markdown/content-list/assets into workflow artifacts')
    .option('--provider <provider>', 'Extraction provider to normalize: mineru or docling')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((project: string, opts: { provider?: string; projectsRoot?: string }, command: Command) => {
      const providerInput = cliOption(command, 'provider', opts.provider);
      const result = normalizeExtraction(resolveWorkflowProjectInput(project, opts.projectsRoot), { provider: providerInput === undefined ? undefined : parseProvider(providerInput) });
      console.log(`Normalized materials=${result.materials.length} blocks=${result.blocks.length} assets=${result.assets.length}`);
      if (result.warnings.length) console.warn(`Warnings: ${result.warnings.join('; ')}`);
    });

  workflow
    .command('outline <project>')
    .description('Create an outline work order and draft artifact; does not generate DSL')
    .option('--mode <mode>', 'agent or manual', 'agent')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((project: string, opts: { mode: string; projectsRoot?: string }) => {
      const order = createOutlineWorkOrder(resolveWorkflowProjectInput(project, opts.projectsRoot), parseMode(opts.mode));
      console.log(`Planning task manifest: planning/tasks.json (${order.status})`);
    });

  workflow
    .command('approve-outline <project>')
    .description('Approve the current outline draft after human review and open the deck-plan/DSL gates')
    .requiredOption('--reviewed-by <name>', 'Human reviewer who approved planning/outline-draft.md')
    .option('--approval-note <text>', 'Short note summarizing requested revisions or approval context')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((project: string, opts: { reviewedBy: string; approvalNote?: string; projectsRoot?: string }) => {
      console.log(`Approved outline: ${approveOutline(resolveWorkflowProjectInput(project, opts.projectsRoot), {
        reviewedBy: opts.reviewedBy,
        approvalNote: opts.approvalNote,
      })}`);
    });

  workflow
    .command('plan-deck <project>')
    .description('Create deck-plan work order or validate an agent-authored deck plan')
    .option('--mode <mode>', 'agent or manual', 'agent')
    .option('--validate-only', 'Only validate planning/deck-plan.json')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((project: string, opts: { mode: string; validateOnly?: boolean; projectsRoot?: string }) => {
      const resolvedProject = resolveWorkflowProjectInput(project, opts.projectsRoot);
      if (opts.validateOnly) {
        const plan = validateDeckPlan(resolvedProject);
        console.log(`Deck plan valid: ${plan.slides.length} slide(s)`);
      } else {
        const order = createDeckPlanWorkOrder(resolvedProject, parseMode(opts.mode));
        console.log(`Planning task manifest: planning/tasks.json (${order.id})`);
      }
    });

  workflow
    .command('generate-dsl <project>')
    .description('Create slide DSL tasks after outline and deck-plan approval')
    .option('--mode <mode>', 'agent or manual', 'agent')
    .option('--parallel', 'Create disjoint slide tasks for parallel authoring')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((project: string, opts: { mode: string; parallel?: boolean; projectsRoot?: string }) => {
      const orders = createDslWorkOrders(resolveWorkflowProjectInput(project, opts.projectsRoot), { mode: parseMode(opts.mode), parallel: Boolean(opts.parallel) });
      console.log(`Created ${orders.length} slide DSL task(s): dsl/tasks.json`);
    });

  workflow
    .command('assemble <project>')
    .description('Merge agent-authored slide DSL slices into dsl/deck.json and validate')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((project: string, opts: { projectsRoot?: string }) => {
      const deck = assembleDeck(resolveWorkflowProjectInput(project, opts.projectsRoot));
      console.log(`Assembled deck: ${deck.slides.length} slide(s)`);
    });

  workflow
    .command('build <project>')
    .description('Build reviewable HTML and export PDF/PPTX from dsl/deck.json')
    .option('--formats <formats>', 'Comma-separated output formats', 'html,pdf,pptx')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((project: string, opts: { formats?: string; projectsRoot?: string }, command: Command) => {
      const report = buildWorkflow(resolveWorkflowProjectInput(project, opts.projectsRoot), formatsCliOverride(command, opts.formats));
      const failed = report.results.filter((result) => !result.success);
      if (failed.length) {
        for (const result of failed) console.error(`${result.format} failed: ${result.error}`);
        process.exitCode = 1;
        return;
      }
      console.log(`Build complete: ${Object.values(report.producedArtifacts).join(', ') || 'html only'}`);
    });

  workflow
    .command('run <project>')
    .description('Run resumable workflow until the next approval/build gate')
    .option('--formats <formats>', 'Comma-separated output formats', 'html,pdf,pptx')
    .option('--provider <provider>', 'Extraction provider: mineru or docling')
    .option('--ocr', 'Enable OCR when using Docling')
    .option('--no-tables', 'Disable table extraction when using Docling')
    .option('--table-mode <mode>', 'Docling table mode: fast or accurate')
    .option('--artifacts-path <path>', 'Docling local model artifacts path for air-gapped runs')
    .option('--document-timeout <seconds>', 'Docling per-document timeout in seconds')
    .option('--allow-remote-input', 'Allow Docling to fetch remote URL sources instead of rejecting them')
    .option('--projects-root <path>', 'Root directory for workflow projects; defaults to the workspace projects/ directory')
    .action((project: string, opts: { formats?: string; provider?: string; ocr?: boolean; tables?: boolean; tableMode?: string; artifactsPath?: string; documentTimeout?: string; allowRemoteInput?: boolean; projectsRoot?: string }, command: Command) => {
      const result = runWorkflow(resolveWorkflowProjectInput(project, opts.projectsRoot), formatsCliOverride(command, opts.formats), extractionCliOverrides(command, opts));
      console.log(result.message);
      if (result.status === 'blocked') process.exitCode = 2;
    });
}
