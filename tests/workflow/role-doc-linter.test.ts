import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  lintRoleDocFile,
  lintRoleDocs,
  isValidDslPath,
  listValidDslPaths,
} from '../../packages/workflow/src/guidance/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const ROLE_DOCS_DIR = join(REPO_ROOT, 'docs', 'agent-guidance', 'roles');

// ---------------------------------------------------------------------------
// schema-paths unit tests
// ---------------------------------------------------------------------------

describe('isValidDslPath', () => {
  it('accepts known top-level meta paths', () => {
    expect(isValidDslPath('meta.title')).toBe(true);
    expect(isValidDslPath('meta.theme')).toBe(true);
    expect(isValidDslPath('meta.canvas.width')).toBe(true);
    expect(isValidDslPath('meta.canvas.height')).toBe(true);
  });

  it('accepts known slide paths', () => {
    expect(isValidDslPath('slides[].id')).toBe(true);
    expect(isValidDslPath('slides[].background')).toBe(true);
    expect(isValidDslPath('slides[].layout')).toBe(true);
    expect(isValidDslPath('slides[].notes')).toBe(true);
    expect(isValidDslPath('slides[].fx')).toBe(true);
  });

  it('accepts known element paths', () => {
    expect(isValidDslPath('slides[].elements[].type')).toBe(true);
    expect(isValidDslPath('slides[].elements[].x')).toBe(true);
    expect(isValidDslPath('slides[].elements[].y')).toBe(true);
    expect(isValidDslPath('slides[].elements[].text')).toBe(true);
    expect(isValidDslPath('slides[].elements[].style')).toBe(true);
    expect(isValidDslPath('slides[].elements[].src')).toBe(true);
    expect(isValidDslPath('slides[].elements[].fit')).toBe(true);
  });

  it('rejects unknown paths', () => {
    expect(isValidDslPath('meta.foo')).toBe(false);
    expect(isValidDslPath('slides[].elements[].svgViewBox')).toBe(false);
    expect(isValidDslPath('slides[].elements[].palette')).toBe(false);
    expect(isValidDslPath('deck.meta.title')).toBe(false);
    expect(isValidDslPath('')).toBe(false);
  });

  it('listValidDslPaths returns a sorted non-empty array', () => {
    const paths = listValidDslPaths();
    expect(paths.length).toBeGreaterThan(0);
    // verify sorted
    const sorted = [...paths].sort();
    expect(paths).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// lintRoleDocFile unit tests (using temp files)
// ---------------------------------------------------------------------------

function writeTempDoc(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-linter-'));
  const path = join(dir, 'test-role.md');
  writeFileSync(path, content, 'utf8');
  return path;
}

describe('lintRoleDocFile', () => {
  it('passes a valid role doc with correct frontmatter', () => {
    const path = writeTempDoc(`---
name: test-role
description: A test role doc.
type: role
dslFieldReferences:
  - meta.title
  - slides[].id
  - slides[].elements[].type
stageApplicability:
  - outline
  - slide-dsl
---

# Test Role

Some content here.
`);
    const errors = lintRoleDocFile(path);
    expect(errors).toHaveLength(0);
  });

  it('errors on missing frontmatter', () => {
    const path = writeTempDoc(`# No Frontmatter

Just plain markdown.
`);
    const errors = lintRoleDocFile(path);
    expect(errors.some((e) => e.message.includes('Missing YAML frontmatter'))).toBe(true);
  });

  it('errors on missing dslFieldReferences', () => {
    const path = writeTempDoc(`---
name: test
stageApplicability:
  - outline
---

# Content
`);
    const errors = lintRoleDocFile(path);
    expect(errors.some((e) => e.message.includes('dslFieldReferences'))).toBe(true);
  });

  it('errors on missing stageApplicability', () => {
    const path = writeTempDoc(`---
name: test
dslFieldReferences:
  - meta.title
---

# Content
`);
    const errors = lintRoleDocFile(path);
    expect(errors.some((e) => e.message.includes('stageApplicability'))).toBe(true);
  });

  it('errors on unknown DSL field path', () => {
    const path = writeTempDoc(`---
name: test
dslFieldReferences:
  - meta.title
  - slides[].elements[].svgViewBox
stageApplicability:
  - outline
---

# Content
`);
    const errors = lintRoleDocFile(path);
    expect(errors.some((e) => e.field === 'slides[].elements[].svgViewBox')).toBe(true);
    expect(errors.some((e) => e.message.includes('Unknown DSL field path'))).toBe(true);
  });

  it('errors on unknown stage name', () => {
    const path = writeTempDoc(`---
name: test
dslFieldReferences:
  - meta.title
stageApplicability:
  - outline
  - svg-render
---

# Content
`);
    const errors = lintRoleDocFile(path);
    expect(errors.some((e) => e.field === 'svg-render')).toBe(true);
    expect(errors.some((e) => e.message.includes('Unknown stage'))).toBe(true);
  });

  it('errors on empty stageApplicability list', () => {
    const path = writeTempDoc(`---
name: test
dslFieldReferences:
  - meta.title
stageApplicability: []
---

# Content
`);
    const errors = lintRoleDocFile(path);
    expect(errors.some((e) => e.message.includes('must not be empty'))).toBe(true);
  });

  it('accepts inline list syntax for dslFieldReferences', () => {
    const path = writeTempDoc(`---
name: test
dslFieldReferences: [meta.title, slides[].id]
stageApplicability: [outline]
---

# Content
`);
    const errors = lintRoleDocFile(path);
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// lintRoleDocs — scans a temp directory
// ---------------------------------------------------------------------------

describe('lintRoleDocs (directory scan)', () => {
  it('returns pass: true for a directory of valid docs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-linter-dir-'));
    const rolesDir = join(dir, 'roles');
    mkdirSync(rolesDir);

    writeFileSync(
      join(rolesDir, 'strategist.md'),
      `---
name: strategist
dslFieldReferences:
  - meta.title
  - slides[].id
stageApplicability:
  - outline
  - deck-plan
---
# Strategist
`,
    );

    writeFileSync(
      join(rolesDir, 'executor.md'),
      `---
name: executor
dslFieldReferences:
  - slides[].elements[].type
  - slides[].elements[].x
  - slides[].elements[].y
stageApplicability:
  - slide-dsl
---
# Executor
`,
    );

    const result = lintRoleDocs(rolesDir);
    expect(result.checked).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.pass).toBe(true);
  });

  it('returns pass: false when any doc has an error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-linter-dir-bad-'));
    writeFileSync(
      join(dir, 'bad.md'),
      `---
name: bad-doc
dslFieldReferences:
  - meta.svgViewBox
stageApplicability:
  - outline
---
# Bad
`,
    );
    const result = lintRoleDocs(dir);
    expect(result.pass).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns empty checked list for empty directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-linter-empty-'));
    const result = lintRoleDocs(dir);
    expect(result.checked).toHaveLength(0);
    expect(result.pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration: lint the real role docs in docs/agent-guidance/roles/
// ---------------------------------------------------------------------------

describe('real role docs pass linter (zero errors)', () => {
  it('lintRoleDocs() reports zero errors for docs/agent-guidance/roles/', () => {
    const result = lintRoleDocs(ROLE_DOCS_DIR);

    if (!result.pass) {
      const errorLines = result.errors
        .map((e) => `  [${e.file.split('/').pop()}] ${e.message}${e.field ? ` (field: ${e.field})` : ''}`)
        .join('\n');
      throw new Error(`Role doc linter found ${result.errors.length} error(s):\n${errorLines}`);
    }

    expect(result.checked.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});
