import { createRequire } from 'module';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { FontRegistryOptions } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-load fontkit synchronously via createRequire
let fontkitModule: any = null;
let fontkitLoadAttempted = false;

function getFontkit(): any {
  if (fontkitLoadAttempted) return fontkitModule;
  fontkitLoadAttempted = true;
  try {
    const require = createRequire(import.meta.url);
    fontkitModule = require('fontkit');
  } catch {
    fontkitModule = null;
  }
  return fontkitModule;
}

export interface ResolvedFont {
  font: any | null;
  source: 'cli' | 'project' | 'deck' | 'bundled' | 'heuristic';
  path: string | null;
}

// Bundled font filename mappings for generic CSS family names
const BUNDLED_DEFAULTS: Record<string, string> = {
  'sans-serif': 'Inter-Regular.ttf',
  'inter': 'Inter-Regular.ttf',
  'serif': 'NotoSerif-Regular.ttf',
  'noto serif': 'NotoSerif-Regular.ttf',
  'monospace': 'JetBrainsMono-Regular.ttf',
  'jetbrains mono': 'JetBrainsMono-Regular.ttf',
};

const BUNDLED_DEFAULTS_BOLD: Record<string, string> = {
  'sans-serif': 'Inter-Bold.ttf',
  'inter': 'Inter-Bold.ttf',
  'serif': 'NotoSerif-Bold.ttf',
  'noto serif': 'NotoSerif-Bold.ttf',
};

export class FontRegistry {
  private options: FontRegistryOptions;
  private cache: Map<string, any> = new Map();

  constructor(options: FontRegistryOptions = {}) {
    this.options = options;
  }

  /**
   * Resolve a font family stack (e.g. "Inter, sans-serif") to a loaded font.
   * Precedence: cliFonts > projectFonts > deckFonts > bundled > heuristic
   */
  resolve(familyStack: string, bold = false): ResolvedFont {
    const families = familyStack
      .split(',')
      .map((f) => f.trim().replace(/['"]/g, ''));

    for (const family of families) {
      const lowerFamily = family.toLowerCase();

      // 1. cliFonts
      const cliPath = this.options.cliFonts?.[family] ?? this.options.cliFonts?.[lowerFamily];
      if (cliPath) {
        const font = this.loadFont(cliPath);
        if (font) return { font, source: 'cli', path: cliPath };
      }

      // 2. projectFonts
      const projectPath = this.options.projectFonts?.[family] ?? this.options.projectFonts?.[lowerFamily];
      if (projectPath) {
        const font = this.loadFont(projectPath);
        if (font) return { font, source: 'project', path: projectPath };
      }

      // 3. deckFonts
      const deckPath = this.options.deckFonts?.[family] ?? this.options.deckFonts?.[lowerFamily];
      if (deckPath) {
        const font = this.loadFont(deckPath);
        if (font) return { font, source: 'deck', path: deckPath };
      }

      // 4. Bundled defaults
      const bundledMap = bold ? { ...BUNDLED_DEFAULTS, ...BUNDLED_DEFAULTS_BOLD } : BUNDLED_DEFAULTS;
      const bundledFile = bundledMap[lowerFamily];
      if (bundledFile) {
        const bundledPath = path.resolve(__dirname, '..', 'assets', bundledFile);
        const font = this.loadFont(bundledPath);
        if (font) return { font, source: 'bundled', path: bundledPath };
      }
    }

    // 5. Heuristic fallback
    return { font: null, source: 'heuristic', path: null };
  }

  private loadFont(fontPath: string): any | null {
    if (this.cache.has(fontPath)) {
      return this.cache.get(fontPath) ?? null;
    }

    if (!existsSync(fontPath)) {
      this.cache.set(fontPath, null);
      return null;
    }

    const fk = getFontkit();
    if (!fk) {
      this.cache.set(fontPath, null);
      return null;
    }

    try {
      const buffer = readFileSync(fontPath);
      const openFn =
        typeof fk.create === 'function' ? fk.create.bind(fk) :
        typeof fk.default?.create === 'function' ? fk.default.create.bind(fk.default) :
        undefined;

      if (!openFn) {
        this.cache.set(fontPath, null);
        return null;
      }

      const font = openFn(buffer);
      this.cache.set(fontPath, font);
      return font;
    } catch {
      this.cache.set(fontPath, null);
      return null;
    }
  }
}

export const defaultRegistry = new FontRegistry();
