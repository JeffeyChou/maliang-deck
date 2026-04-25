/**
 * Role-doc linter: validates YAML frontmatter in agent guidance role documents.
 *
 * Each role doc must have:
 *   - dslFieldReferences: string[]  — paths validated against schema-paths.ts
 *   - stageApplicability: string[]  — must be valid workflow stage names
 *
 * This linter is run in CI to catch stale or mistyped DSL field references
 * before they mislead downstream agents.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { isValidDslPath } from './schema-paths.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoleDocLintError = {
  /** Absolute path to the role doc file. */
  file: string;
  /** Human-readable error message. */
  message: string;
  /** The field or path that caused the error, if applicable. */
  field?: string;
};

export type RoleDocLintResult = {
  /** Files that were checked. */
  checked: string[];
  /** All errors found across all files. */
  errors: RoleDocLintError[];
  /** True iff errors.length === 0. */
  pass: boolean;
};

// ---------------------------------------------------------------------------
// Valid stage names
// ---------------------------------------------------------------------------

const VALID_STAGES: ReadonlySet<string> = new Set([
  'outline',
  'deck-plan',
  'slide-dsl',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Split a comma-separated inline YAML list, respecting nested brackets.
 * E.g. `meta.title, slides[].id` → ['meta.title', 'slides[].id']
 */
function splitInlineList(inner: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of inner) {
    if (ch === '[') {
      depth++;
      current += ch;
    } else if (ch === ']') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      const trimmed = current.trim().replace(/^['"]|['"]$/g, '');
      if (trimmed) items.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }
  const last = current.trim().replace(/^['"]|['"]$/g, '');
  if (last) items.push(last);
  return items;
}

// ---------------------------------------------------------------------------
// Frontmatter parser (reused logic from role-doc-loader.ts, kept independent)
// ---------------------------------------------------------------------------

type ParsedFrontmatter = {
  dslFieldReferences?: unknown;
  stageApplicability?: unknown;
  name?: unknown;
  [key: string]: unknown;
};

function parseFrontmatter(raw: string): ParsedFrontmatter | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/m.exec(raw);
  if (!match) return null;

  const yamlBlock = match[1] ?? '';
  const result: ParsedFrontmatter = {};

  // Parse block-style lists (YAML block sequences):
  //   key:
  //     - item1
  //     - item2
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  const lines = yamlBlock.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // List item under current key
    if (currentKey && /^\s+-\s+/.test(line)) {
      const item = line.replace(/^\s+-\s+/, '').trim().replace(/^['"]|['"]$/g, '');
      currentList!.push(item);
      continue;
    }

    // New key — flush previous list if any
    if (currentKey && currentList) {
      result[currentKey] = currentList;
      currentKey = null;
      currentList = null;
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Inline list: key: [a, b, c]
    // Use indexOf to find matching bracket rather than regex, because values
    // like `slides[].id` contain inner `[]` that would break a simple regex.
    const colonBracketIdx = trimmed.indexOf(': [');
    if (colonBracketIdx !== -1) {
      const keyPart = trimmed.slice(0, colonBracketIdx).trim();
      const rest = trimmed.slice(colonBracketIdx + 3); // after ': ['
      const closingIdx = rest.lastIndexOf(']');
      if (closingIdx !== -1 && /^[\w][\w-]*$/.test(keyPart)) {
        const inner = rest.slice(0, closingIdx);
        // Split on commas NOT inside brackets (simple approach: split then re-join balanced)
        const items = splitInlineList(inner);
        result[keyPart] = items;
        continue;
      }
    }

    // Block list key (value is empty — items follow on next lines)
    const blockListKeyMatch = /^([\w][\w-]*):\s*$/.exec(trimmed);
    if (blockListKeyMatch) {
      currentKey = blockListKeyMatch[1]!;
      currentList = [];
      continue;
    }

    // Scalar: key: value
    const scalarMatch = /^([\w][\w-]*):\s*(.+)$/.exec(trimmed);
    if (scalarMatch) {
      result[scalarMatch[1]!] = scalarMatch[2]!.trim().replace(/^['"]|['"]$/g, '');
      continue;
    }
  }

  // Flush trailing list
  if (currentKey && currentList) {
    result[currentKey] = currentList;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Single-file linting
// ---------------------------------------------------------------------------

/**
 * Lint a single role doc file. Returns any errors found.
 */
export function lintRoleDocFile(absolutePath: string): RoleDocLintError[] {
  const errors: RoleDocLintError[] = [];

  let raw: string;
  try {
    raw = readFileSync(absolutePath, 'utf8');
  } catch (err) {
    errors.push({ file: absolutePath, message: `Cannot read file: ${String(err)}` });
    return errors;
  }

  const frontmatter = parseFrontmatter(raw);
  if (frontmatter === null) {
    errors.push({
      file: absolutePath,
      message: 'Missing YAML frontmatter block (expected --- ... --- at top of file)',
    });
    return errors;
  }

  // ── Validate dslFieldReferences ──────────────────────────────────────────
  const refs = frontmatter['dslFieldReferences'];
  if (refs === undefined) {
    errors.push({
      file: absolutePath,
      message: 'Frontmatter missing required field: dslFieldReferences',
    });
  } else if (!Array.isArray(refs)) {
    errors.push({
      file: absolutePath,
      message: 'dslFieldReferences must be a YAML list of strings',
    });
  } else {
    for (const ref of refs) {
      if (typeof ref !== 'string') {
        errors.push({
          file: absolutePath,
          message: `dslFieldReferences entry is not a string: ${JSON.stringify(ref)}`,
        });
        continue;
      }
      if (!isValidDslPath(ref)) {
        errors.push({
          file: absolutePath,
          field: ref,
          message: `Unknown DSL field path: "${ref}" — not found in @maliang-deck/schema field inventory`,
        });
      }
    }
  }

  // ── Validate stageApplicability ──────────────────────────────────────────
  const stages = frontmatter['stageApplicability'];
  if (stages === undefined) {
    errors.push({
      file: absolutePath,
      message: 'Frontmatter missing required field: stageApplicability',
    });
  } else if (!Array.isArray(stages)) {
    errors.push({
      file: absolutePath,
      message: 'stageApplicability must be a YAML list of strings',
    });
  } else {
    if (stages.length === 0) {
      errors.push({
        file: absolutePath,
        message: 'stageApplicability must not be empty — declare at least one stage',
      });
    }
    for (const stage of stages) {
      if (typeof stage !== 'string') {
        errors.push({
          file: absolutePath,
          message: `stageApplicability entry is not a string: ${JSON.stringify(stage)}`,
        });
        continue;
      }
      if (!VALID_STAGES.has(stage)) {
        errors.push({
          file: absolutePath,
          field: stage,
          message: `Unknown stage: "${stage}" — valid stages are: ${[...VALID_STAGES].join(', ')}`,
        });
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Directory-level linting
// ---------------------------------------------------------------------------

/**
 * Lint all markdown files in a directory (recursively).
 *
 * @param dir Absolute path to the directory containing role docs.
 * @returns A RoleDocLintResult with all errors found.
 */
export function lintRoleDocs(dir: string): RoleDocLintResult {
  const checked: string[] = [];
  const errors: RoleDocLintError[] = [];

  function walk(current: string): void {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries.sort()) {
      const fullPath = join(current, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && extname(entry) === '.md') {
        checked.push(fullPath);
        const fileErrors = lintRoleDocFile(fullPath);
        errors.push(...fileErrors);
      }
    }
  }

  walk(dir);

  return {
    checked,
    errors,
    pass: errors.length === 0,
  };
}
