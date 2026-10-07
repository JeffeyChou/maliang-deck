// Copies the texmorph browser build into assets/lib.
// Usage: node scripts/vendor-texmorph.mjs <path to texmorph repo>
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = process.argv[2];
if (!repo) {
  console.error('usage: vendor-texmorph.mjs <path to texmorph repo>');
  process.exit(2);
}
const pkg = JSON.parse(readFileSync(join(repo, 'packages/katex/package.json'), 'utf8'));
const code = readFileSync(join(repo, 'packages/katex/dist/texmorph.iife.js'), 'utf8').replace(/\n\/\/# sourceMappingURL=.*$/, '');
const header = `/*! texmorph ${pkg.version} (@texmorph/katex browser build) | MIT License | Copyright (c) 2026 Jiefeng Zhou */\n`;
const out = resolve(import.meta.dirname, '../assets/lib/texmorph.iife.js');
writeFileSync(out, header + code + '\n');
console.log(`vendored texmorph ${pkg.version} -> ${out}`);
