import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const siteDir = join(repoRoot, 'examples', '_showcase', 'site');
export const decksDir = join(siteDir, 'decks');
export const manifestPath = join(siteDir, 'showcase-manifest.json');

export const examples = [
  {
    slug: 'animation-showcase',
    source: 'examples/animation-showcase/deck.json',
    description: 'Motion-system tour covering transitions, FX, text animation, formula steps, morphing, and graphs.',
    features: ['Animations', 'Morph', 'Canvas FX', 'Graphs']
  },
  {
    slug: 'ascii-terminal-portfolio',
    source: 'examples/ascii-terminal-portfolio/deck.json',
    description: 'Terminal-native portfolio deck with CRT styling, command-line pacing, and GIF-to-ASCII runtime media.',
    features: ['Custom HTML', 'GIF ASCII', 'Text animation', 'Theme CSS']
  },
  {
    slug: 'constructivism-defense',
    source: 'examples/constructivism-defense/deck.json',
    description: 'Academic defense deck with constructivist visual language, argument structure, formulas, and speaker notes.',
    features: ['Academic', 'Formula', 'Custom FX', 'Notes']
  },
  {
    slug: 'dreamy-blur-physics',
    source: 'examples/dreamy-blur-physics/deck.json',
    description: 'Graduate physics lecture using formulas, 2D/3D graph elements, morphing, and atmospheric runtime effects.',
    features: ['Formula', '3D graph', 'Morph steps', 'FX']
  },
  {
    slug: 'neon-glass-dark',
    source: 'examples/neon-glass-dark/deck.json',
    description: 'Product-style design-system showcase for Maliang Deck with charts, KPI cards, tables, and timeline patterns.',
    features: ['Charts', 'Tables', 'Dashboard', 'Glass theme']
  },
  {
    slug: 'type-collage-marketing',
    source: 'examples/type-collage-marketing/deck.json',
    description: 'Editorial brand-launch deck with kinetic type, collage pacing, metrics, social proof, and campaign CTA.',
    features: ['Marketing', 'Text FX', 'Morph transition', 'Custom theme']
  },
  {
    slug: 'corporate-wave-blue',
    source: 'examples/corporate-wave-blue/dsl/deck.json',
    description: 'Executive communication pattern library for clean corporate layouts, evidence slides, tables, and components.',
    features: ['Template pack', 'Tables', 'Charts', 'Corporate']
  }
];

export function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function loadDeck(source) {
  return JSON.parse(readFileSync(join(repoRoot, source), 'utf8'));
}

export function readManifest() {
  if (!existsSync(manifestPath)) return [];
  const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

export function themeFor(deck) {
  return deck.meta?.theme || 'minimal-white';
}

export function coverTitle(deck) {
  const slide = deck.slides?.[0];
  const text = slide?.elements?.find((el) => typeof el.content === 'string' && /title|headline|questions/i.test(el.id || ''));
  return text?.content || deck.meta?.title || slide?.id || 'Maliang Deck';
}

export function galleryHtml(items) {
  const cards = items.map((item, index) => {
    const hue = (index * 47 + 208) % 360;
    const tags = (item.features || []).map((feature) => `<span>${htmlEscape(feature)}</span>`).join('');
    return `
      <article class="deck-card" style="--h:${hue}">
        <a class="cover" href="${htmlEscape(item.href)}" aria-label="Open ${htmlEscape(item.title)}">
          <div class="cover-kicker">${htmlEscape(item.theme)}</div>
          <div class="cover-title">${htmlEscape(item.cover)}</div>
          <div class="cover-meta">${item.slideCount} slides</div>
        </a>
        <div class="card-body">
          <h2>${htmlEscape(item.title)}</h2>
          <p>${htmlEscape(item.description)}</p>
          <div class="tags">${tags}</div>
          <a class="open-link" href="${htmlEscape(item.href)}">Open deck</a>
        </div>
      </article>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Maliang Deck Examples</title>
  <style>
    :root { color-scheme: light; --ink:#111827; --muted:#5b6472; --line:#d9e1ec; --bg:#f6f8fb; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--ink); }
    header { padding: 56px clamp(24px, 6vw, 86px) 30px; border-bottom: 1px solid var(--line); background: linear-gradient(180deg,#fff,#f8fafc); }
    .eyebrow { font-size: 13px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #2563eb; }
    h1 { margin: 12px 0 14px; max-width: 900px; font-size: clamp(38px, 5vw, 74px); line-height: .96; letter-spacing: 0; }
    header p { max-width: 820px; margin: 0; color: var(--muted); font-size: 18px; line-height: 1.6; }
    main { padding: 34px clamp(20px, 5vw, 72px) 72px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 22px; }
    .deck-card { display: grid; grid-template-rows: 230px 1fr; min-height: 510px; border: 1px solid var(--line); background: #fff; box-shadow: 0 20px 50px rgba(15,23,42,.08); }
    .cover { position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 22px; overflow: hidden; color: white; text-decoration: none; background:
      radial-gradient(circle at 80% 18%, hsla(var(--h),92%,72%,.78), transparent 24%),
      radial-gradient(circle at 10% 85%, hsla(calc(var(--h) + 70),92%,62%,.62), transparent 28%),
      linear-gradient(135deg, hsl(var(--h),68%,22%), hsl(calc(var(--h) + 28),72%,11%)); }
    .cover::before { content:""; position:absolute; inset:0; background-image: linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(180deg, black, transparent 82%); }
    .cover-kicker, .cover-title, .cover-meta { position: relative; }
    .cover-kicker { font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; opacity: .78; }
    .cover-title { margin-top: 10px; font-size: 31px; line-height: 1.02; font-weight: 850; white-space: pre-line; }
    .cover-meta { margin-top: 16px; font: 700 13px/1 ui-monospace, SFMono-Regular, Menlo, monospace; opacity: .72; }
    .card-body { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
    h2 { margin: 0; font-size: 22px; line-height: 1.15; letter-spacing: 0; }
    p { margin: 0; color: var(--muted); line-height: 1.52; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
    .tags span { padding: 6px 9px; border: 1px solid #dbe4f0; background: #f8fafc; color: #334155; font-size: 12px; font-weight: 700; }
    .open-link { width: max-content; margin-top: 4px; color: #1d4ed8; font-weight: 800; text-decoration: none; }
    .open-link:hover { text-decoration: underline; }
    footer { padding: 26px clamp(24px, 6vw, 86px); border-top: 1px solid var(--line); color: var(--muted); background: #fff; }
  </style>
</head>
<body>
  <header>
    <div class="eyebrow">Maliang Deck Showcase</div>
    <h1>Production-ready example decks generated from JSON DSL.</h1>
    <p>Each deck opens as a standalone static HTML presentation. The source JSON remains canonical; this gallery is regenerated by <code>pnpm showcase:export</code> or <code>pnpm showcase:update</code>.</p>
  </header>
  <main><section class="grid">${cards}</section></main>
  <footer>Hosted as static files. Interactive formula and 3D features may load KaTeX or Three.js from CDN.</footer>
</body>
</html>
`;
}
