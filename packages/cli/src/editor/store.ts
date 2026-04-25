import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { renderDeckToHtml } from '@maliang-deck/renderer-html';
import {
  applyEditorPatch,
  EDITOR_SUPPORTED_ELEMENT_TYPES,
  EDITOR_SUPPORTED_OPS,
  EditorPatchError,
  normalizeEditorSaveRequest,
  validateDeck,
  type Deck,
  type EditorSaveRequest,
  type ValidationError,
} from '@maliang-deck/schema';

export type EditorCapability = {
  canPersist: true;
  revision: string;
  sourceKind: 'json';
  sourcePath: string;
  mjsDivergenceWarning: boolean;
  warnings: string[];
  supportedOps: string[];
  supportedElementTypes: string[];
};

export type EditorSaveSuccess = {
  ok: true;
  reload: true;
  revision: string;
  warnings: string[];
};

export type EditorStoreSnapshot = {
  deck: Deck;
  html: string;
  revision: string;
};

export class EditorStoreError extends Error {
  readonly status: number;
  readonly code: string;
  readonly path?: Array<string | number>;
  readonly validationErrors?: ValidationError[];
  readonly warnings?: string[];

  constructor(
    status: number,
    code: string,
    message: string,
    options: {
      path?: Array<string | number>;
      validationErrors?: ValidationError[];
      warnings?: string[];
    } = {},
  ) {
    super(message);
    this.name = 'EditorStoreError';
    this.status = status;
    this.code = code;
    this.path = options.path;
    this.validationErrors = options.validationErrors;
    this.warnings = options.warnings;
  }
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n');
}

export async function loadDeckSnapshot(deckPath: string): Promise<EditorStoreSnapshot> {
  const raw = await readFile(deckPath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new EditorStoreError(500, 'invalid-json', `Deck JSON parse failed: ${(error as Error).message}`);
  }
  const result = validateDeck(parsed);
  if (!result.success) {
    throw new EditorStoreError(500, 'validation-failed', `Deck validation failed:\n${formatValidationErrors(result.errors)}`, {
      validationErrors: result.errors,
    });
  }
  return {
    deck: result.data,
    html: renderDeckToHtml(result.data),
    revision: await computeRevision(deckPath, raw),
  };
}

async function computeRevision(deckPath: string, raw?: string): Promise<string> {
  const [stats, content] = await Promise.all([
    stat(deckPath),
    raw === undefined ? readFile(deckPath, 'utf-8') : Promise.resolve(raw),
  ]);
  return createHash('sha256')
    .update(deckPath)
    .update('\0')
    .update(String(stats.mtimeMs))
    .update('\0')
    .update(String(stats.size))
    .update('\0')
    .update(content)
    .digest('hex');
}

async function writeJsonAtomically(deckPath: string, deck: Deck): Promise<void> {
  const dir = dirname(deckPath);
  const tempPath = join(dir, `.${randomUUID()}.maliang-deck.tmp`);
  const json = `${JSON.stringify(deck, null, 2)}\n`;
  try {
    await writeFile(tempPath, json, 'utf-8');
    await rename(tempPath, deckPath);
  } catch (error) {
    try {
      await rm(tempPath, { force: true });
    } catch {
      // Best-effort cleanup only.
    }
    throw error;
  }
}

function directoryHasMjsScripts(dir: string): boolean {
  const scriptsDir = join(dir, 'scripts');
  if (!existsSync(scriptsDir)) return false;
  try {
    return readdirSync(scriptsDir).some((entry) => entry.endsWith('.mjs'));
  } catch {
    return false;
  }
}

function detectMjsDivergenceWarning(deckPath: string): string[] {
  const warnings: string[] = [];
  const normalized = resolve(deckPath);
  const deckDir = dirname(normalized);
  const candidateRoots = [deckDir, dirname(deckDir), dirname(dirname(deckDir))];
  const appearsGenerated = /[/\\]dsl[/\\]deck\.json$/.test(normalized)
    || candidateRoots.some((dir) => existsSync(join(dir, 'project.json')) || directoryHasMjsScripts(dir));

  if (appearsGenerated) {
    warnings.push('This deck appears to be generated or assembled; save writes DSL JSON only and does not update generator scripts.');
  }
  return warnings;
}

export class FileBackedEditorStore {
  readonly deckPath: string;
  private snapshot: EditorStoreSnapshot;
  private saveQueue: Promise<unknown> = Promise.resolve();

  private constructor(deckPath: string, snapshot: EditorStoreSnapshot) {
    this.deckPath = deckPath;
    this.snapshot = snapshot;
  }

  static async create(deckPath: string): Promise<FileBackedEditorStore> {
    const resolved = resolve(deckPath);
    return new FileBackedEditorStore(resolved, await loadDeckSnapshot(resolved));
  }

  get html(): string {
    return this.snapshot.html;
  }

  async reload(): Promise<void> {
    this.snapshot = await loadDeckSnapshot(this.deckPath);
  }

  getCapability(): EditorCapability {
    const warnings = detectMjsDivergenceWarning(this.deckPath);
    return {
      canPersist: true,
      revision: this.snapshot.revision,
      sourceKind: 'json',
      sourcePath: this.deckPath,
      mjsDivergenceWarning: warnings.length > 0,
      warnings,
      supportedOps: [...EDITOR_SUPPORTED_OPS],
      supportedElementTypes: [...EDITOR_SUPPORTED_ELEMENT_TYPES],
    };
  }

  async save(rawRequest: unknown): Promise<EditorSaveSuccess> {
    const run = async () => this.saveUnsafe(rawRequest);
    const next = this.saveQueue.then(run, run);
    this.saveQueue = next.catch(() => undefined);
    return next;
  }

  private async saveUnsafe(rawRequest: unknown): Promise<EditorSaveSuccess> {
    let request: EditorSaveRequest;
    try {
      request = normalizeEditorSaveRequest(rawRequest);
    } catch (error) {
      if (error instanceof EditorPatchError) {
        throw new EditorStoreError(400, error.code, error.message, { path: error.path });
      }
      throw error;
    }

    const latest = await loadDeckSnapshot(this.deckPath);
    this.snapshot = latest;
    if (request.baseRevision !== latest.revision) {
      throw new EditorStoreError(409, 'stale-revision', 'Deck changed since the editor session started; reload before saving.');
    }

    let patched: Deck;
    try {
      patched = applyEditorPatch(latest.deck, request).deck;
    } catch (error) {
      if (error instanceof EditorPatchError) {
        throw new EditorStoreError(400, error.code, error.message, {
          path: error.path,
          validationErrors: error.validationErrors,
        });
      }
      throw error;
    }

    const result = validateDeck(patched);
    if (!result.success) {
      throw new EditorStoreError(400, 'validation-failed', 'Patched deck failed schema validation', {
        validationErrors: result.errors,
      });
    }

    await writeJsonAtomically(this.deckPath, result.data);
    this.snapshot = await loadDeckSnapshot(this.deckPath);
    return {
      ok: true,
      reload: true,
      revision: this.snapshot.revision,
      warnings: detectMjsDivergenceWarning(this.deckPath),
    };
  }
}
