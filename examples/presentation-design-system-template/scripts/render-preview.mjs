#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, '..');

function usage() {
  console.log(`Render the extracted Presentation Design System deck to an HTML preview.\n\nUsage:\n  node examples/presentation-design-system-template/scripts/render-preview.mjs [options]\n\nOptions:\n  --deck <path>       Deck JSON to render. Defaults to this project\'s dsl/deck.json.\n  --out <path>        HTML output path. Defaults to this project\'s render/html/index.html.\n  --skip-validate     Render without validating the deck first.\n  --help              Show this help.\n\nExamples:\n  node examples/presentation-design-system-template/scripts/render-preview.mjs\n  node examples/presentation-design-system-template/scripts/render-preview.mjs --deck /tmp/new-deck.json --out /tmp/new-deck.html`);
}

function resolvePath(path, baseDir = process.cwd()) {
  return isAbsolute(path) ? path : resolve(baseDir, path);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read JSON at ${path}: ${error.message}`);
  }
}

function findRepoRoot(startDir) {
  let current = startDir;
  while (true) {
    try {
      const pkg = readJson(join(current, 'package.json'));
      if (pkg.name === 'maliang-deck') return current;
    } catch {
      // Keep walking up.
    }
    const next = dirname(current);
    if (next === current) break;
    current = next;
  }
  throw new Error('Could not locate the maliang-deck repo root. Run this script from inside the repository checkout.');
}

async function importRepoModule(repoRoot, relativePath, exportName) {
  const modulePath = join(repoRoot, relativePath);
  try {
    const mod = await import(pathToFileURL(modulePath).href);
    if (!(exportName in mod)) throw new Error(`module does not export ${exportName}`);
    return mod[exportName];
  } catch (error) {
    throw new Error(`Cannot load ${relativePath}. Run \`pnpm build\` first if dist files are missing. Detail: ${error.message}`);
  }
}

const { values } = parseArgs({
  options: {
    deck: { type: 'string' },
    out: { type: 'string' },
    'skip-validate': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: false,
});

if (values.help) {
  usage();
  process.exit(0);
}

const repoRoot = findRepoRoot(projectDir);
const deckPath = values.deck ? resolvePath(values.deck) : join(projectDir, 'dsl/deck.json');
const outPath = values.out ? resolvePath(values.out) : join(projectDir, 'render/html/index.html');
const deck = readJson(deckPath);

if (!values['skip-validate']) {
  const validateDeck = await importRepoModule(repoRoot, 'packages/schema/dist/index.js', 'validateDeck');
  const validation = validateDeck(deck);
  if (!validation.success) {
    const errors = validation.errors.map((error) => `${error.path.join('.') || '(root)'}: ${error.message}`).join('\n');
    throw new Error(`Deck validation failed before render:\n${errors}`);
  }
}

const renderDeckToHtml = await importRepoModule(repoRoot, 'packages/renderer-html/dist/index.js', 'renderDeckToHtml');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, renderDeckToHtml(deck), 'utf8');
console.log(`Rendered HTML preview: ${outPath}`);
