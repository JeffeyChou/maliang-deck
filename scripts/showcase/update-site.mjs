#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import {
  decksDir,
  examples,
  galleryHtml,
  loadDeck,
  manifestPath,
  readManifest,
  repoRoot,
  siteDir
} from './showcase-lib.mjs';

function usage() {
  return `Usage:
  pnpm showcase:update -- --slug <slug> --from <export-dir> [metadata flags]
  pnpm showcase:update -- --rebuild-index

Copies an existing exported HTML deck folder into examples/_showcase/site/decks/<slug>
and regenerates examples/_showcase/site/index.html plus showcase-manifest.json.

Required when copying a deck:
  --slug <slug>          Destination slug under site/decks/
  --from <export-dir>    Exported HTML folder containing index.html

Optional metadata:
  --title <text>
  --description <text>
  --feature <text>       Repeat for multiple tags
  --source <deck.json>   Used to infer title/theme/slide count when available
  --theme <text>
  --cover <text>
  --slide-count <n>

Examples:
  pnpm showcase:update -- --slug animation-showcase --from /tmp/animation-showcase
  pnpm showcase:update -- --slug custom-demo --from ./out/custom-demo --title "Custom Demo" --feature Demo --feature HTML
  pnpm showcase:update -- --rebuild-index
`;
}

function parseArgs(argv) {
  const out = { features: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') continue;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--rebuild-index') out.rebuildIndex = true;
    else if (arg === '--slug') out.slug = argv[++i];
    else if (arg === '--from') out.from = argv[++i];
    else if (arg === '--title') out.title = argv[++i];
    else if (arg === '--description') out.description = argv[++i];
    else if (arg === '--feature') out.features.push(argv[++i]);
    else if (arg === '--source') out.source = argv[++i];
    else if (arg === '--theme') out.theme = argv[++i];
    else if (arg === '--cover') out.cover = argv[++i];
    else if (arg === '--slide-count') out.slideCount = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function safeSlug(slug) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(slug || '')) {
    throw new Error(`Invalid slug "${slug}". Use letters, numbers, dots, underscores, or hyphens.`);
  }
  return slug;
}

function resolvePath(path) {
  return isAbsolute(path) ? path : resolve(repoRoot, path);
}

function inferHtmlTitle(dir) {
  const htmlPath = join(dir, 'index.html');
  if (!existsSync(htmlPath)) return undefined;
  const html = readFileSync(htmlPath, 'utf8');
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : undefined;
}

function inferFromDeck(source) {
  if (!source || !existsSync(resolvePath(source))) return {};
  const deck = loadDeck(relative(repoRoot, resolvePath(source)));
  const firstSlide = deck.slides?.[0];
  const coverEl = firstSlide?.elements?.find((el) => typeof el.content === 'string' && /title|headline|questions/i.test(el.id || ''));
  return {
    title: deck.meta?.title,
    theme: deck.meta?.theme || 'minimal-white',
    cover: coverEl?.content || deck.meta?.title || firstSlide?.id,
    slideCount: deck.slides?.length
  };
}

function itemDefaults(slug, fromDir, existing, args) {
  const configured = examples.find((item) => item.slug === slug) || {};
  const source = args.source || existing?.source || configured.source;
  const deckInfo = inferFromDeck(source);
  const htmlTitle = inferHtmlTitle(fromDir);
  return {
    slug,
    source,
    description: args.description || existing?.description || configured.description || 'Static Maliang Deck showcase.',
    features: args.features.length ? args.features : existing?.features || configured.features || ['HTML'],
    title: args.title || deckInfo.title || existing?.title || configured.title || htmlTitle || slug,
    slideCount: Number.isFinite(args.slideCount) ? args.slideCount : deckInfo.slideCount || existing?.slideCount || 1,
    theme: args.theme || deckInfo.theme || existing?.theme || 'minimal-white',
    cover: args.cover || deckInfo.cover || existing?.cover || htmlTitle || slug,
    href: `./decks/${slug}/index.html`
  };
}

function assertExportDir(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`Export folder does not exist or is not a directory: ${dir}`);
  }
  if (!existsSync(join(dir, 'index.html'))) {
    throw new Error(`Export folder must contain index.html: ${dir}`);
  }
}

function copyDeck(fromDir, slug) {
  const dest = join(decksDir, slug);
  const resolvedDest = resolve(dest);
  if (!resolvedDest.startsWith(resolve(decksDir) + '/')) {
    throw new Error(`Resolved destination is outside showcase decks directory: ${dest}`);
  }

  if (resolve(fromDir) === resolvedDest) {
    return dest;
  }

  rmSync(dest, { recursive: true, force: true });
  mkdirSync(decksDir, { recursive: true });
  cpSync(fromDir, dest, { recursive: true });
  return dest;
}

function writeGallery(items) {
  mkdirSync(siteDir, { recursive: true });
  writeFileSync(join(siteDir, '.nojekyll'), '', 'utf8');
  writeFileSync(join(siteDir, 'index.html'), galleryHtml(items), 'utf8');
  writeFileSync(manifestPath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const manifest = readManifest();
  if (args.rebuildIndex) {
    writeGallery(manifest);
    console.log(`Rebuilt ${relative(repoRoot, join(siteDir, 'index.html'))}`);
    return;
  }

  const slug = safeSlug(args.slug);
  if (!slug || !args.from) {
    throw new Error(`--slug and --from are required.\n\n${usage()}`);
  }

  const fromDir = resolvePath(args.from);
  assertExportDir(fromDir);

  const existing = manifest.find((item) => item.slug === slug);
  const item = itemDefaults(slug, fromDir, existing, args);
  const dest = copyDeck(fromDir, slug);
  const existingIndex = manifest.findIndex((entry) => entry.slug === slug);
  const nextManifest = existingIndex >= 0
    ? manifest.map((entry, index) => (index === existingIndex ? item : entry))
    : [...manifest, item];
  writeGallery(nextManifest);

  console.log(`Copied ${relative(repoRoot, fromDir)} -> ${relative(repoRoot, dest)}`);
  console.log(`Updated ${relative(repoRoot, manifestPath)} and ${relative(repoRoot, join(siteDir, 'index.html'))}`);
}

main();
