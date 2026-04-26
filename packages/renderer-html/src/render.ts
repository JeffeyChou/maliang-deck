import type { Deck, Slide, Element } from '@maliang-deck/schema';
import { renderElement } from './elements/index.js';
import { escapeHtml } from './utils.js';

export type HtmlExportMode = 'editable' | 'readonly';

export type RenderHtmlOptions = {
  /** Base path for assets. Default '/' (absolute, for serve mode). Use './' for static export. */
  assetBase?: string;
  /** Export mode. When set, adds data-mode to <html> and adjusts behavior. */
  mode?: HtmlExportMode;
};

// All available themes for the T-key cycling feature in runtime.js
const ALL_THEMES = [
  'minimal-white',
  'arctic-cool',
  'aurora',
  'bauhaus',
  'blueprint',
  'catppuccin-latte',
  'catppuccin-mocha',
  'corporate-clean',
  'cyberpunk-neon',
  'dracula',
  'editorial-serif',
  'engineering-whiteprint',
  'glassmorphism',
  'gruvbox-dark',
  'japanese-minimal',
  'magazine-bold',
  'memphis-pop',
  'midcentury',
  'neo-brutalism',
  'news-broadcast',
  'nord',
  'pitch-deck-vc',
  'rainbow-gradient',
  'retro-tv',
  'rose-pine',
  'sharp-mono',
  'soft-pastel',
  'solarized-light',
  'sunset-warm',
  'swiss-grid',
  'terminal-green',
  'tokyo-night',
  'vaporwave',
  'xiaohongshu-white',
  'y2k-chrome',
].join(',');

/**
 * Extract the data-title for a slide: first text element content, or slide id.
 */
function slideTitle(slide: Slide): string {
  const firstText = slide.elements.find(
    (el: Element) => el.type === 'text',
  );
  if (firstText && firstText.type === 'text') {
    // Take up to the first newline for the title
    return escapeHtml(firstText.content.split('\n')[0]);
  }
  return escapeHtml(slide.id);
}

/**
 * Render a single slide to a <section> string.
 */
function renderSlide(slide: Slide, width: number, height: number, autoAnimate: boolean, defaultFont?: string): string {
  const title = slideTitle(slide);
  const slideId = escapeHtml(slide.id);
  const background = slide.background
    ? ` style="background: ${escapeHtml(slide.background)}"`
    : '';

  // Render FX layer divs (canvas background effects)
  const fxLayers = (slide.fx ?? [])
    .map((name) => `    <div class="fx-layer" data-fx="${escapeHtml(name)}" style="position:absolute;inset:0;z-index:0;pointer-events:none"></div>`)
    .join('\n');

  const elements = slide.elements
    .map((element) => renderElement(element, { slideId: slide.id, autoAnimate, defaultFont }))
    .join('\n    ');
  const notes = slide.notes
    ? `\n    <aside class="notes">${escapeHtml(slide.notes)}</aside>`
    : '';

  return [
    `  <section class="slide" data-slide-id="${slideId}" data-title="${title}"${background}>`,
    fxLayers ? `${fxLayers}\n    ${elements}${notes}` : `    ${elements}${notes}`,
    `  </section>`,
  ].join('\n');
}

function runtimeConfigScript(config: Deck['meta']['htmlRuntime']): string {
  if (!config) return '';
  const json = JSON.stringify(config)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `  <script id="maliang-deck-runtime-config" type="application/json">${json}</script>\n`;
}

function escapeJsonForScript(json: string): string {
  return json
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Render a complete DSL Deck to a standalone HTML document string.
 *
 * @param options.assetBase  Path prefix for runtime/assets references. Default '/'.
 * @param options.mode       'editable' | 'readonly' — sets data-mode on <html> for export.
 */
export function renderDeckToHtml(deck: Deck, options?: RenderHtmlOptions): string {
  const { meta, slides } = deck;
  const { width, height } = meta.canvas;
  const theme = meta.theme ?? 'minimal-white';
  const title = escapeHtml(meta.title);
  const autoAnimate = meta.htmlRuntime?.transition?.autoAnimate === true;

  const transitionType = meta.htmlRuntime?.transition?.type ?? 'fade';
  const transitionDuration = meta.htmlRuntime?.transition?.durationMs ?? 500;
  const transitionEasing = meta.htmlRuntime?.transition?.easing ?? 'ease';

  const defaultFont = meta.defaultFont;

  const base = options?.assetBase ?? '/';
  const mode = options?.mode;
  const isExport = mode !== undefined;

  // In export mode, only list the deck's own theme (no T-key cycling).
  const themesAttr = isExport ? theme : ALL_THEMES;
  const modeAttr = mode ? ` data-mode="${mode}"` : '';

  const slidesHtml = slides
    .map((slide) => renderSlide(slide, width, height, autoAnimate, defaultFont))
    .join('\n');

  // Embed deck JSON source for editable export (client-side save fallback).
  const deckSourceScript = mode === 'editable'
    ? `  <script id="maliang-deck-source" type="application/json">${escapeJsonForScript(JSON.stringify(deck))}</script>\n`
    : '';

  return `<!DOCTYPE html>
<html lang="en" data-themes="${themesAttr}"${modeAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link id="chart-table-base" rel="stylesheet" href="${base}assets/themes/_chart-table-base.css">
  <link id="theme-link" rel="stylesheet" href="${base}assets/themes/${theme}.css">
  <link rel="stylesheet" href="${base}assets/animations/animations.css">
  <link rel="stylesheet" href="${base}assets/animations/transitions.css">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { overflow: hidden; background: #000; }
    .deck { position: relative; width: 100vw; height: 100vh; height: 100dvh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .slide { position: absolute; width: ${width}px; height: ${height}px; overflow: hidden; background: #fff; transform-origin: center center; visibility: hidden; opacity: 0; pointer-events: none; z-index: 0; }
    .slide.is-active { visibility: visible; opacity: 1; pointer-events: auto; z-index: 2; }
    .slide.is-prev { visibility: hidden; opacity: 0; z-index: 0; }
    .slide.is-transition-prev, .slide.is-transition-next { visibility: visible; pointer-events: none; }
    .slide.is-transition-prev { opacity: 1; z-index: 3; }
    .slide.is-transition-next { opacity: 1; z-index: 4; }
    .slide [data-maliang-deck-auto-animate-id] { transform-origin: center center; }
    .slide > * { position: absolute; }
    aside.notes { display: none; }
    .progress-bar { position: fixed; top: 0; right: 0; bottom: 0; width: 6px; background: var(--ui-bar-bg, rgba(255,255,255,.15)); z-index: 1000; }
    .progress-bar span { display: block; width: 100%; background: var(--ui-bar-fill, #58a6ff); transition: height .3s ease; box-shadow: 0 0 8px var(--ui-bar-fill, #58a6ff); }
    .slide-number { position: fixed; bottom: 14px; right: 28px; font-size: clamp(14px, 2vw, 24px); font-family: 'SF Mono','JetBrains Mono',monospace; color: var(--ui-text, rgba(255,255,255,.65)); z-index: 1000; pointer-events: none; letter-spacing: .05em; text-shadow: var(--ui-shadow, 0 1px 4px rgba(0,0,0,.5)); }
    .slide-number::after { content: attr(data-current) ' / ' attr(data-total); }
    .step-indicator { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); z-index: 1000; pointer-events: none; opacity: 0; transition: opacity .3s ease; }
    .step-indicator.is-visible { opacity: 1; }
    .step-indicator svg { width: 28px; height: 28px; filter: drop-shadow(0 1px 3px rgba(0,0,0,.4)); }
  </style>
</head>
<body data-theme-base="${base}assets/themes/">
${runtimeConfigScript(meta.htmlRuntime)}${deckSourceScript}  <noscript><style>.slide:first-child { visibility: visible; opacity: 1; }</style></noscript>
  <div class="deck" data-transition="${transitionType}" style="--slide-w:${width}px; --slide-h:${height}px; --transition-duration:${transitionDuration}ms; --transition-easing:${transitionEasing};">
${slidesHtml}
  </div>
  <div class="slide-number" data-current="1" data-total="${slides.length}"></div>
  <div class="step-indicator" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 7l5 5-5 5" fill="none" stroke="var(--ui-text, rgba(255,255,255,.65))" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
  <script src="${base}runtime/runtime.js"></script>
  <script src="${base}assets/fx/fx-runtime.js"></script>
  <script src="${base}assets/animations/timeline.js"></script>
</body>
</html>`;
}
