import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const RENDER_EXPORT_PACKAGE_DIRS = [
  'packages/renderer-html',
  'packages/renderer-svg',
  'packages/exporter',
];

const FORBIDDEN_RENDER_EXPORT_PATTERNS: Array<[RegExp, string]> = [
  [/@maliang-deck\/authoring/, '@maliang-deck/authoring imports'],
  [/\bComponentInvocation\b/, 'ComponentInvocation type handling'],
  [/\bAuthoring(?:Deck|Slide|Node|Element)/, 'authoring input type handling'],
  [/\bcompileAuthoring[A-Za-z0-9_]*\b/, 'authoring compiler calls'],
  [/\bcreateDefaultAuthoringRegistry\b/, 'authoring registry construction'],
  [/\bkind\s*:\s*['"]component['"]/, "component invocation discriminators"],
];

const FORBIDDEN_AUTHORING_IMPORT_PATTERNS: Array<[RegExp, string]> = [
  [/@maliang-deck\/renderer-html/, '@maliang-deck/renderer-html'],
  [/@maliang-deck\/renderer-svg/, '@maliang-deck/renderer-svg'],
  [/@maliang-deck\/exporter/, '@maliang-deck/exporter packages'],
  [/@maliang-deck\/workflow/, '@maliang-deck/workflow'],
];

function listTypeScriptFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return listTypeScriptFiles(path);
    }

    return path.endsWith('.ts') && !path.endsWith('.d.ts') ? [path] : [];
  });
}

function readPackageFiles(packageDirs: string[]): Array<{ path: string; content: string }> {
  return packageDirs.flatMap((packageDir) =>
    listTypeScriptFiles(join(REPO_ROOT, packageDir, 'src')).map((path) => ({
      path,
      content: readFileSync(path, 'utf8'),
    })),
  );
}

function importLines(content: string): string {
  return content
    .split('\n')
    .filter((line) => /^\s*import\b/.test(line))
    .join('\n');
}

describe('authoring macro boundary', () => {
  it('keeps renderer and exporter packages macro-unaware', () => {
    const files = readPackageFiles(RENDER_EXPORT_PACKAGE_DIRS);
    expect(files.length).toBeGreaterThan(0);

    const violations = files.flatMap(({ path, content }) =>
      FORBIDDEN_RENDER_EXPORT_PATTERNS.flatMap(([pattern, reason]) =>
        pattern.test(content) ? [`${relative(REPO_ROOT, path)} contains ${reason}`] : [],
      ),
    );

    expect(violations).toEqual([]);
  });

  it('keeps the authoring compiler independent from renderers, exporters, and workflow', () => {
    const files = readPackageFiles(['packages/authoring']);

    const violations = files.flatMap(({ path, content }) => {
      const imports = importLines(content);

      return FORBIDDEN_AUTHORING_IMPORT_PATTERNS.flatMap(([pattern, reason]) =>
        pattern.test(imports) ? [`${relative(REPO_ROOT, path)} imports ${reason}`] : [],
      );
    });

    expect(violations).toEqual([]);
  });
});
