import type { Deck, Slide, Element } from '@maliang-deck/schema';
import { renderElement } from './elements/index.js';
import { escapeHtml } from './utils.js';

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
function renderSlide(slide: Slide, width: number, height: number, autoAnimate: boolean): string {
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
    .map((element) => renderElement(element, { slideId: slide.id, autoAnimate }))
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

/**
 * Render a complete DSL Deck to a standalone HTML document string.
 */
export function renderDeckToHtml(deck: Deck): string {
  const { meta, slides } = deck;
  const { width, height } = meta.canvas;
  const theme = meta.theme ?? 'minimal-white';
  const title = escapeHtml(meta.title);
  const autoAnimate = meta.htmlRuntime?.transition?.autoAnimate === true;

  const slidesHtml = slides
    .map((slide) => renderSlide(slide, width, height, autoAnimate))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en" data-themes="${ALL_THEMES}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link id="theme-link" rel="stylesheet" href="/assets/themes/${theme}.css">
  <link rel="stylesheet" href="/runtime/animations.css">
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
    .progress-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 6px; background: var(--ui-bar-bg, rgba(255,255,255,.15)); z-index: 1000; }
    .progress-bar span { display: block; height: 100%; background: var(--ui-bar-fill, #58a6ff); transition: width .3s ease; box-shadow: 0 0 8px var(--ui-bar-fill, #58a6ff); }
    .slide-number { position: fixed; bottom: 14px; right: 20px; font-size: clamp(14px, 2vw, 24px); font-family: 'SF Mono','JetBrains Mono',monospace; color: var(--ui-text, rgba(255,255,255,.65)); z-index: 1000; pointer-events: none; letter-spacing: .05em; text-shadow: var(--ui-shadow, 0 1px 4px rgba(0,0,0,.5)); }
    .slide-number::after { content: attr(data-current) ' / ' attr(data-total); }
  </style>
</head>
<body data-theme-base="/assets/themes/">
${runtimeConfigScript(meta.htmlRuntime)}  <noscript><style>.slide:first-child { visibility: visible; opacity: 1; }</style></noscript>
  <div class="deck" style="--slide-w:${width}px; --slide-h:${height}px;">
${slidesHtml}
  </div>
  <div class="slide-number" data-current="1" data-total="${slides.length}"></div>
  <script src="/runtime/runtime.js"></script>
  <script src="/runtime/fx-runtime.js"></script>
  <script src="/runtime/timeline.js"></script>
</body>
</html>`;
}
