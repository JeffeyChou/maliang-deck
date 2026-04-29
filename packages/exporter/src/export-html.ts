import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { renderDeckToHtml, type HtmlExportMode } from '@maliang-deck/renderer-html';
import { validateDeck, type Deck } from '@maliang-deck/schema';
import type { ExportDeckResult, ExportWarning } from './export-report.js';
import { generateServeScript } from './html-serve-template.js';

export type ExportHtmlRequest = {
  deckPath: string;
  outputDir: string;
  mode: HtmlExportMode;
  /** Repo root for locating runtime/ and assets/ dirs. */
  repoRoot: string;
};

/**
 * Collect all FX names referenced across slides.
 */
function collectUsedFx(deck: Deck): Set<string> {
  const used = new Set<string>();
  for (const slide of deck.slides) {
    for (const name of slide.fx ?? []) {
      used.add(name);
    }
  }
  return used;
}

/**
 * Collect local image paths referenced in image elements (recursively into groups).
 */
function collectLocalImages(elements: Deck['slides'][number]['elements']): Set<string> {
  const paths = new Set<string>();
  for (const el of elements) {
    if (el.type === 'image' && el.src && !el.src.startsWith('http://') && !el.src.startsWith('https://') && !el.src.startsWith('data:')) {
      paths.add(el.src);
    }
    if (el.type === 'group' && 'children' in el) {
      for (const p of collectLocalImages((el as { children: typeof elements }).children)) {
        paths.add(p);
      }
    }
  }
  return paths;
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function copyDir(src: string, dest: string): void {
  ensureDir(dest);
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function copyFile(src: string, dest: string): void {
  ensureDir(dirname(dest));
  copyFileSync(src, dest);
}

function firstExisting(paths: string[]): string | undefined {
  return paths.find((path) => existsSync(path));
}

function copyDeckRelativeAsset(
  assetPath: string,
  deckDir: string,
  outDir: string,
  warnings: ExportWarning[],
): void {
  if (
    !assetPath
    || isAbsolute(assetPath)
    || assetPath.startsWith('http://')
    || assetPath.startsWith('https://')
    || assetPath.startsWith('data:')
  ) {
    return;
  }

  const src = resolve(deckDir, assetPath);
  if (!existsSync(src)) {
    warnings.push({ code: 'asset-not-found', message: `Custom asset "${assetPath}" not found` });
    return;
  }

  const dest = resolve(outDir, assetPath);
  const rel = relative(outDir, dest);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    warnings.push({ code: 'asset-unsafe-path', message: `Custom asset "${assetPath}" resolves outside the export directory` });
    return;
  }

  copyFile(src, dest);
}

export function exportDeckToHtml(request: ExportHtmlRequest): ExportDeckResult {
  const { deckPath, outputDir, mode, repoRoot } = request;
  const warnings: ExportWarning[] = [];

  // --- Load and validate deck ---
  const resolvedDeckPath = resolve(deckPath);
  let raw: string;
  try {
    raw = readFileSync(resolvedDeckPath, 'utf-8');
  } catch {
    return { format: 'html', outputPath: outputDir, success: false, warnings, error: `Cannot read deck file: ${resolvedDeckPath}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { format: 'html', outputPath: outputDir, success: false, warnings, error: `Invalid JSON: ${(err as Error).message}` };
  }

  const result = validateDeck(parsed);
  if (!result.success) {
    return { format: 'html', outputPath: outputDir, success: false, warnings, error: 'Deck validation failed' };
  }
  const deck = result.data;
  const deckDir = dirname(resolvedDeckPath);

  // --- Render HTML with relative asset paths ---
  const html = renderDeckToHtml(deck, { assetBase: './', mode });

  // --- Create output directory structure ---
  const out = resolve(outputDir);
  ensureDir(out);

  // Write index.html
  writeFileSync(join(out, 'index.html'), html, 'utf-8');

  // --- Copy runtime ---
  const runtimeSrc = join(repoRoot, 'runtime');
  ensureDir(join(out, 'runtime'));
  copyFile(join(runtimeSrc, 'runtime.js'), join(out, 'runtime', 'runtime.js'));

  // --- Copy animations ---
  const animSrc = join(repoRoot, 'assets', 'animations');
  const animDest = join(out, 'assets', 'animations');
  ensureDir(animDest);
  for (const file of ['animations.css', 'transitions.css', 'timeline.js']) {
    const src = join(animSrc, file);
    if (existsSync(src)) copyFile(src, join(animDest, file));
  }

  // --- Copy only the deck's theme ---
  const theme = deck.meta.theme ?? 'minimal-white';
  const themesSrc = join(repoRoot, 'assets', 'themes');
  const deckThemesSrc = join(deckDir, 'assets', 'themes');
  const themesDest = join(out, 'assets', 'themes');
  ensureDir(themesDest);
  // Always copy the chart-table base
  const chartTableBase = join(themesSrc, '_chart-table-base.css');
  if (existsSync(chartTableBase)) copyFile(chartTableBase, join(themesDest, '_chart-table-base.css'));
  // Copy the selected theme
  const themeCss = firstExisting([join(themesSrc, `${theme}.css`), join(deckThemesSrc, `${theme}.css`)]);
  if (themeCss) {
    copyFile(themeCss, join(themesDest, `${theme}.css`));
  } else {
    warnings.push({ code: 'theme-not-found', message: `Theme "${theme}" CSS not found, presentation may lack styling` });
  }

  for (const stylesheet of deck.meta.htmlRuntime?.customStylesheets ?? []) {
    copyDeckRelativeAsset(stylesheet, deckDir, out, warnings);
  }

  // --- Copy only referenced FX modules ---
  const usedFx = collectUsedFx(deck);
  const fxSrc = join(repoRoot, 'assets', 'fx');
  const deckFxSrc = join(deckDir, 'assets', 'fx');
  const fxDest = join(out, 'assets', 'fx');
  if (usedFx.size > 0) {
    ensureDir(fxDest);
    // Always need fx-runtime.js and _util.js when any FX is used
    copyFile(join(fxSrc, 'fx-runtime.js'), join(fxDest, 'fx-runtime.js'));
    const utilSrc = join(fxSrc, '_util.js');
    if (existsSync(utilSrc)) copyFile(utilSrc, join(fxDest, '_util.js'));
    // Copy each referenced FX module
    for (const fxName of usedFx) {
      const fxFile = firstExisting([join(fxSrc, `${fxName}.js`), join(deckFxSrc, `${fxName}.js`)]);
      if (fxFile) {
        copyFile(fxFile, join(fxDest, `${fxName}.js`));
      } else {
        warnings.push({ code: 'fx-not-found', message: `FX module "${fxName}" not found, effect will not render` });
      }
    }
    // Generate a trimmed fx-runtime.js that only lists the used FX
    patchFxRuntime(join(fxDest, 'fx-runtime.js'), usedFx);
  } else {
    // No FX used — still include an empty fx directory with a stub fx-runtime.js
    // so the <script src> doesn't 404
    ensureDir(fxDest);
    writeFileSync(join(fxDest, 'fx-runtime.js'), '/* no FX used */\n', 'utf-8');
  }

  for (const script of deck.meta.htmlRuntime?.customScripts ?? []) {
    copyDeckRelativeAsset(script, deckDir, out, warnings);
  }

  // --- Copy lib/ and extensions/ (referenced by <script src> in rendered HTML) ---
  const libSrc = join(repoRoot, 'assets', 'lib');
  const libDest = join(out, 'assets', 'lib');
  if (existsSync(libSrc)) copyDir(libSrc, libDest);

  const extSrc = join(repoRoot, 'assets', 'extensions');
  const extDest = join(out, 'assets', 'extensions');
  if (existsSync(extSrc)) copyDir(extSrc, extDest);

  // --- Copy local images ---
  const allLocalImages = new Set<string>();
  for (const slide of deck.slides) {
    for (const p of collectLocalImages(slide.elements)) {
      allLocalImages.add(p);
    }
  }
  if (allLocalImages.size > 0) {
    const imagesDest = join(out, 'images');
    ensureDir(imagesDest);
    for (const imgPath of allLocalImages) {
      const absImg = isAbsolute(imgPath) ? imgPath : resolve(deckDir, imgPath);
      if (existsSync(absImg)) {
        copyFile(absImg, join(imagesDest, basename(imgPath)));
      } else {
        warnings.push({ code: 'image-not-found', message: `Image "${imgPath}" not found` });
      }
    }
  }

  // --- Editable mode extras ---
  if (mode === 'editable') {
    // Copy deck.json source
    copyFile(resolvedDeckPath, join(out, 'deck.json'));
    // Generate serve.js
    writeFileSync(join(out, 'serve.js'), generateServeScript(), 'utf-8');
  }

  return { format: 'html', outputPath: out, success: true, warnings };
}

/**
 * Rewrite the FX_LIST in a copied fx-runtime.js to only include used modules.
 */
function patchFxRuntime(fxRuntimePath: string, usedFx: Set<string>): void {
  let content = readFileSync(fxRuntimePath, 'utf-8');
  // Replace the FX_LIST array with one containing only _util + used modules
  const fxEntries = ["'_util'", ...Array.from(usedFx).map((n) => `'${n}'`)].join(',');
  content = content.replace(
    /const FX_LIST\s*=\s*\[[\s\S]*?\];/,
    `const FX_LIST = [${fxEntries}];`,
  );
  writeFileSync(fxRuntimePath, content, 'utf-8');
}
