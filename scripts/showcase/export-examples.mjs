#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { coverTitle, decksDir, examples, galleryHtml, loadDeck, repoRoot, siteDir, themeFor } from './showcase-lib.mjs';

function run(args, label) {
  const result = spawnSync('node', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.status !== 0) {
    process.stderr.write(output);
    throw new Error(`${label} failed`);
  }
  if (/Warning \[(theme-not-found|fx-not-found|asset-not-found|image-not-found|asset-unsafe-path)\]/.test(output)) {
    process.stderr.write(output);
    throw new Error(`${label} emitted blocking export warnings`);
  }
  process.stdout.write(output);
}

function main() {
  if (!existsSync(join(repoRoot, 'packages', 'cli', 'dist', 'index.js'))) {
    throw new Error('packages/cli/dist/index.js not found. Run pnpm build first.');
  }

  rmSync(siteDir, { recursive: true, force: true });
  mkdirSync(decksDir, { recursive: true });
  writeFileSync(join(siteDir, '.nojekyll'), '', 'utf8');

  const items = [];
  for (const example of examples) {
    const deck = loadDeck(example.source);
    const title = deck.meta?.title || example.slug;
    const slideCount = deck.slides?.length || 0;
    const out = join(decksDir, example.slug);
    run(['packages/cli/dist/index.js', 'validate', example.source], `validate ${example.slug}`);
    run(['packages/cli/dist/index.js', 'export', example.source, relative(repoRoot, out), '--format', 'html'], `export ${example.slug}`);
    items.push({
      ...example,
      title,
      slideCount,
      theme: themeFor(deck),
      cover: coverTitle(deck),
      href: `./decks/${example.slug}/index.html`
    });
  }

  writeFileSync(join(siteDir, 'index.html'), galleryHtml(items), 'utf8');
  writeFileSync(join(siteDir, 'showcase-manifest.json'), `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  console.log(`Showcase written to ${relative(repoRoot, siteDir)}`);
}

main();
