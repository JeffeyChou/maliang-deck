#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');

function usage() {
  console.log(`Create a new editable Maliang Deck deck from the extracted Corporate Wave Blue pattern library.\n\nThis script reuses slides from dsl/deck.json as concrete pattern-library slides.\nIt does not edit render/html/index.html directly; render that later with render-preview.mjs.\n\nUsage:\n  node scripts/template-tools/create-deck.mjs --out <deck.json> [options]\n\nOptions:\n  --out <path>             Output deck JSON path. Required.\n  --layouts <csv>          Layouts to include. Default: title-cover,two-column-content,chart-table,closing\n  --title <text>           Main title. Default: New Presentation\n  --subtitle <text>        Subtitle/tagline. Default: Created from Corporate Wave Blue\n  --body <text>            Body placeholder text. Default: concise reusable copy.\n  --bullets <csv>          Bullet replacements for content slides.\n  --company <text>         Footer company label. Default: Company Name\n  --author <text>          Presenter replacement. Default: Presenter Name\n  --role <text>            Presenter role replacement. Default: Job Title\n  --source-deck <path>     Pattern-library source deck. Defaults to this project\'s dsl/deck.json.\n  --template-pack <path>   Template pack used for metadata/guidance. Defaults to this project\'s template-pack.json.\n  --skip-validate          Write without validating the generated deck.\n  --help                  Show this help.\n\nAvailable layouts in the shipped pattern library include:\n  title-cover, system-reference, one-column-content, two-column-content, multi-column-content,\n  large-media, gallery, chart-table, data-text-image, section-divider, closing, summary\n\nExample:\n  node scripts/template-tools/create-deck.mjs \\\n    --out /tmp/client-deck.json \\\n    --layouts title-cover,two-column-content,chart-table,closing \\\n    --title "Quarterly Product Review" \\\n    --company "Acme"`);
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

function csv(value, fallback) {
  return String(value ?? fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function walkElements(elements, visit) {
  for (const element of elements ?? []) {
    visit(element);
    if (element.type === 'group') walkElements(element.elements, visit);
  }
}

function normalizeDomPart(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function prefixElementIds(elements, prefix) {
  walkElements(elements, (element) => {
    element.id = `${prefix}-${element.id}`;
  });
}

function isPageNumberElement(element) {
  return element.type === 'text'
    && typeof element.content === 'string'
    && /^\d+$/.test(element.content.trim())
    && (element.x ?? 0) >= 1100
    && (element.width ?? 0) <= 80;
}

function replaceTextContent(element, replacements) {
  if (element.type !== 'text' || typeof element.content !== 'string') return;

  const content = element.content;
  if (content === 'Company Name') {
    element.content = replacements.company;
  } else if (content === 'Presenter Name') {
    element.content = replacements.author;
  } else if (content === 'Job Title') {
    element.content = replacements.role;
  } else if (content === 'Presentation\nDesign System' || content === 'Presentation\nTitle Goes Here' || content === 'Slide Title Goes Here' || content === 'Section Title\nGoes Here') {
    element.content = replacements.title;
  } else if (content === 'Color, Layout, Typography, Components' || content === 'Your Subtitle or Tagline\nGoes Right Here' || content === 'Section Subtitle Goes Here') {
    element.content = replacements.subtitle;
  } else if (/^Lorem ipsum dolor sit amet/.test(content) || content.includes('consectetur adipiscing elit')) {
    element.content = replacements.body;
  } else if (/^(First|Second|Third|Fourth) point goes here$/.test(content)) {
    const index = { First: 0, Second: 1, Third: 2, Fourth: 3 }[content.split(' ')[0]] ?? 0;
    element.content = replacements.bullets[index] ?? content;
  } else if (content === 'Thank You!' && replacements.closingTitle) {
    element.content = replacements.closingTitle;
  } else if (content === 'Any Questions?' && replacements.closingSubtitle) {
    element.content = replacements.closingSubtitle;
  }
}

function slideForLayout(sourceDeck, layout, usedCounts) {
  const matches = sourceDeck.slides.filter((slide) => slide.layout === layout);
  if (!matches.length) throw new Error(`No source slide found for layout "${layout}".`);
  const count = usedCounts.get(layout) ?? 0;
  usedCounts.set(layout, count + 1);
  return deepClone(matches[count % matches.length]);
}

function createDeck(sourceDeck, templatePack, options) {
  const usedCounts = new Map();
  const slides = options.layouts.map((layout, index) => {
    const slide = slideForLayout(sourceDeck, layout, usedCounts);
    const slideNo = index + 1;
    const prefix = `s${String(slideNo).padStart(2, '0')}`;
    slide.id = `slide-${String(slideNo).padStart(2, '0')}-${normalizeDomPart(layout)}`;
    slide.notes = [
      `Generated from extracted pattern-library layout "${layout}".`,
      slide.notes ? `Source note: ${slide.notes}` : '',
    ].filter(Boolean).join('\n');
    prefixElementIds(slide.elements, prefix);
    walkElements(slide.elements, (element) => {
      replaceTextContent(element, options);
      if (isPageNumberElement(element)) element.content = String(slideNo);
    });
    return slide;
  });

  return {
    meta: {
      title: options.title,
      theme: sourceDeck.meta?.theme ?? 'minimal-white',
      canvas: sourceDeck.meta?.canvas ?? templatePack.tokens?.canvas ?? { width: 1280, height: 720 },
      fonts: sourceDeck.meta?.fonts ?? { Inter: 'Inter, sans-serif' },
      htmlRuntime: sourceDeck.meta?.htmlRuntime,
    },
    slides,
  };
}

const { values } = parseArgs({
  options: {
    out: { type: 'string' },
    layouts: { type: 'string' },
    title: { type: 'string', default: 'New Presentation' },
    subtitle: { type: 'string', default: 'Created from Corporate Wave Blue' },
    body: { type: 'string', default: 'Replace this concise placeholder with audience-specific evidence, narrative, or recommendations while preserving the extracted spacing and hierarchy.' },
    bullets: { type: 'string' },
    company: { type: 'string', default: 'Company Name' },
    author: { type: 'string', default: 'Presenter Name' },
    role: { type: 'string', default: 'Job Title' },
    'source-deck': { type: 'string' },
    'template-pack': { type: 'string' },
    'skip-validate': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: false,
});

if (values.help) {
  usage();
  process.exit(0);
}

if (!values.out) {
  usage();
  throw new Error('--out is required so the script does not overwrite a deck accidentally.');
}

const defaultExampleDir = join(repoRoot, 'examples/corporate-wave-blue');
const sourceDeckPath = values['source-deck'] ? resolvePath(values['source-deck']) : join(defaultExampleDir, 'dsl/deck.json');
const templatePackPath = values['template-pack'] ? resolvePath(values['template-pack']) : join(defaultExampleDir, 'template-pack.json');
const outPath = resolvePath(values.out);
const sourceDeck = readJson(sourceDeckPath);
const templatePack = readJson(templatePackPath);

const deck = createDeck(sourceDeck, templatePack, {
  layouts: csv(values.layouts, 'title-cover,two-column-content,chart-table,closing'),
  title: values.title,
  subtitle: values.subtitle,
  body: values.body,
  bullets: csv(values.bullets, 'First key message,Second key message,Third key message,Fourth key message'),
  company: values.company,
  author: values.author,
  role: values.role,
  closingTitle: values.title === 'New Presentation' ? 'Thank You!' : 'Thank You!',
  closingSubtitle: 'Any Questions?',
});

if (!values['skip-validate']) {
  const repoRoot = findRepoRoot(projectDir);
  const validateDeck = await importRepoModule(repoRoot, 'packages/schema/dist/index.js', 'validateDeck');
  const validation = validateDeck(deck);
  if (!validation.success) {
    const errors = validation.errors.map((error) => `${error.path.join('.') || '(root)'}: ${error.message}`).join('\n');
    throw new Error(`Generated deck is invalid:\n${errors}`);
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
console.log(`Created deck: ${outPath}`);
console.log(`Layouts: ${deck.slides.map((slide) => slide.layout).join(', ')}`);
