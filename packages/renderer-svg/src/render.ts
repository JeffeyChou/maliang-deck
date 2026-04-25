import type { Deck, Slide } from '@maliang-deck/schema';
import type { LayoutWarning } from '@maliang-deck/text-measure';
import { FontRegistry } from '@maliang-deck/text-measure';
import { renderElement } from './elements/index.js';

export interface SvgSlide {
  id: string;
  svg: string;
  notes?: string;
}

export interface RenderOptions {
  /** Base directory for resolving relative image paths */
  basePath?: string;
  /** Font registry for text measurement (optional, falls back to heuristic) */
  fontRegistry?: FontRegistry;
}

export interface RenderDeckResult {
  slides: SvgSlide[];
  warnings: LayoutWarning[];
}

export function renderDeckToSvg(deck: Deck, options?: RenderOptions): RenderDeckResult {
  const { width, height } = deck.meta.canvas;
  const basePath = options?.basePath;
  const registry = options?.fontRegistry;

  const allWarnings: LayoutWarning[] = [];

  const slides = deck.slides.map((slide: import('../../schema/src/types.js').Slide, slideIndex: number) => {
    const { svg, warnings } = renderSlide(slide, width, height, basePath, registry);
    // Annotate warnings with slide index
    for (const w of warnings) {
      w.slideIndex = slideIndex;
    }
    allWarnings.push(...warnings);
    return {
      id: slide.id,
      svg,
      notes: slide.notes,
    };
  });

  return { slides, warnings: allWarnings };
}

function renderSlide(
  slide: Slide,
  width: number,
  height: number,
  basePath?: string,
  registry?: FontRegistry,
): { svg: string; warnings: LayoutWarning[] } {
  const parts: string[] = [];
  const warnings: LayoutWarning[] = [];

  // Background rect
  if (slide.background) {
    parts.push(
      `<rect x="0" y="0" width="${width}" height="${height}" fill="${slide.background}"/>`,
    );
  }

  // Elements
  for (const el of slide.elements) {
    const result = renderElement(el, basePath, registry);
    parts.push(result.svg);
    warnings.push(...result.warnings);
  }

  const body = parts.join('\n');

  // Collect font-face declarations for PDF consistency (CairoSVG font resolution)
  const fontFaces = buildFontFaceDefs(registry);
  const defsBlock = fontFaces ? `<defs><style>${fontFaces}</style></defs>` : '';

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` viewBox="0 0 ${width} ${height}"`,
    ` width="${width}"`,
    ` height="${height}">`,
    defsBlock,
    body,
    `</svg>`,
  ].join('');

  return { svg, warnings };
}

/**
 * Build @font-face CSS rules referencing font files used by the registry.
 * Uses file:// URLs so CairoSVG can locate the same fonts used for measurement.
 */
function buildFontFaceDefs(registry?: FontRegistry): string {
  if (!registry) return '';

  // Resolve the common generic families to get their font file paths
  const families = ['sans-serif', 'serif', 'monospace'];
  const rules: string[] = [];
  const seen = new Set<string>();

  for (const family of families) {
    for (const bold of [false, true]) {
      const resolved = registry.resolve(family, bold);
      if (resolved.path && !seen.has(resolved.path)) {
        seen.add(resolved.path);
        const weight = bold ? 'bold' : 'normal';
        // Use the font's actual family name from the generic mapping
        const cssFamily = family === 'sans-serif' ? 'Inter' :
                          family === 'serif' ? 'Noto Serif' :
                          family === 'monospace' ? 'JetBrains Mono' : family;
        rules.push(
          `@font-face { font-family: '${cssFamily}'; font-weight: ${weight}; src: url('file://${resolved.path}'); }`,
        );
      }
    }
  }

  return rules.join('\n');
}
