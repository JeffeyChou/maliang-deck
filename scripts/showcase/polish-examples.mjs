#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const decks = [
  'examples/animation-showcase/deck.json',
  'examples/ascii-terminal-portfolio/deck.json',
  'examples/constructivism-defense/deck.json',
  'examples/dreamy-blur-physics/deck.json',
  'examples/neon-glass-dark/deck.json',
  'examples/type-collage-marketing/deck.json',
  'examples/corporate-wave-blue/dsl/deck.json'
];

function readDeck(rel) {
  const path = join(repoRoot, rel);
  let raw = readFileSync(path, 'utf8');
  if (rel.endsWith('neon-glass-dark/deck.json')) {
    raw = raw.replace(/,\s*(\n\s*}\s*,\s*\n\s*{\s*"id":\s*"ub-table")/, '$1');
  }
  return JSON.parse(raw);
}

function writeDeck(rel, deck) {
  writeFileSync(join(repoRoot, rel), `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
}

function visitElements(deck, fn) {
  const visit = (el, slide) => {
    fn(el, slide);
    if (Array.isArray(el.children)) el.children.forEach((child) => visit(child, slide));
    if (Array.isArray(el.elements)) el.elements.forEach((child) => visit(child, slide));
  };
  deck.slides.forEach((slide) => (slide.elements || []).forEach((el) => visit(el, slide)));
}

function setText(deck, id, content) {
  visitElements(deck, (el) => {
    if (el.id === id && typeof el.content === 'string') el.content = content;
  });
}

function replaceContent(deck, replacements) {
  visitElements(deck, (el) => {
    if (typeof el.content === 'string' && replacements.has(el.content)) {
      el.content = replacements.get(el.content);
    }
  });
}

function addDeckNote(slide, note) {
  const existing = slide.notes ? `${slide.notes}\n\n` : '';
  slide.notes = `${existing}${note}`;
}

function ensureRuntime(deck, transition) {
  deck.meta.htmlRuntime = deck.meta.htmlRuntime || {};
  deck.meta.htmlRuntime.transition = {
    ...(deck.meta.htmlRuntime.transition || {}),
    ...transition
  };
}

function polishAnimationShowcase(deck) {
  deck.meta.title = 'Maliang Deck — Interactive Motion System';
  ensureRuntime(deck, { type: 'morph', durationMs: 520, easing: 'cubic-bezier(.2,.8,.2,1)', autoAnimate: true });
  setText(deck, 'cover-kicker', 'MALIANG RUNTIME');
  setText(deck, 'neon-title', 'Interactive\nMotion System');
  setText(deck, 'cover-subtitle', 'A guided tour of runtime animation, text effects, formula steps, graph rendering, canvas FX, morphing, and presenter controls.');
  setText(deck, 'gallery-core-note', 'Entry families are grouped by motion intent so authors can choose effects that clarify sequence instead of decorating every element.');
  setText(deck, 'fx-note', 'FX run behind typed DSL elements and are pre-warmed during transitions; use them for title, divider, and atmosphere slides.');
  deck.slides.forEach((slide, i) => {
    if (!slide.notes) addDeckNote(slide, `Showcase slide ${i + 1}: emphasize the Maliang feature demonstrated here and keep navigation interactions purposeful.`);
  });
}

function polishAsciiPortfolio(deck) {
  deck.meta.title = 'kai@terminal ~ engineering-portfolio';
  ensureRuntime(deck, { type: 'fade', durationMs: 320, easing: 'ease-out' });
  replaceContent(deck, new Map([
    ['demo@demo:~$ whoami', 'kai@showcase:~$ whoami'],
    ['demo@demo:~$ cat skills.json', 'kai@showcase:~$ cat systems.json'],
    ['demo@demo:~$ ls projects/flux-cli', 'kai@showcase:~$ open projects/runtime-lab'],
    ['demo@demo:~$ ls projects/neuraldb', 'kai@showcase:~$ open projects/vector-index'],
    ['demo@demo:~$ ls projects/pixelflow', 'kai@showcase:~$ open projects/render-pipeline'],
    ['demo@demo:~$ git log --stat --since=2016-01-01', 'kai@showcase:~$ git log --stat --since=2021-01-01'],
    ['demo@demo:~$ cat contact.txt', 'kai@showcase:~$ cat contact.txt'],
    ['demo@demo:~$ three-ascii --input horse.gif --mode gallop', 'kai@showcase:~$ three-ascii --input horse.gif --mode gallop'],
    ['demo@demo ~ portfolio', 'kai@terminal ~ engineering-portfolio'],
    ['v3.2.1 — type \'help\' for commands', 'v4.0.0 — portfolio kernel loaded']
  ]));
  visitElements(deck, (el) => {
    if (typeof el.content !== 'string') return;
    el.content = el.content
      .replaceAll('demo@demo', 'kai@showcase')
      .replaceAll('portfolio.service', 'showcase.service')
      .replaceAll('CDN three.js loader', 'browser runtime loader');
  });
}

function polishConstructivism(deck) {
  deck.meta.title = 'PhD Defense — Collective Intelligence in Decentralized Multi-Agent Systems';
  ensureRuntime(deck, { type: 'push', durationMs: 460, easing: 'cubic-bezier(.25,.1,.25,1)' });
  setText(deck, 'cover-title', 'Emergent Collective Intelligence');
  setText(deck, 'research-q-title', 'Local rules can produce system-level intelligence');
  setText(deck, 'conclusion-title', 'Simple interactions can scale into adaptive collective behavior');
  deck.slides.forEach((slide) => {
    if (slide.id === 'methodology') slide.fx = ['geometric-grid'];
    if (slide.id === 'conclusion') slide.fx = ['diagonal-wipe'];
  });
}

function polishDreamyPhysics(deck) {
  deck.meta.title = 'Quantum Mechanics — Wave Functions and Measurement';
  ensureRuntime(deck, { type: 'dissolve', durationMs: 600, easing: 'ease-in-out' });
  replaceContent(deck, new Map([
    ['Lecture 12 — Course Instructor', 'Lecture 12 — Measurement, probability, and barriers'],
    ['Department of Physics · Spring 2026', 'Graduate Physics Studio · Spring 2026'],
    ['PHYS 7210 — Office hours: Tue/Thu 2–4 pm, Room 412', 'PHYS 7210 — Bring questions to studio discussion'],
    ['Instructor · Department of Physics · Spring 2026', 'Instructor · Graduate Physics Studio · Spring 2026']
  ]));
  setText(deck, 'cover-kicker', 'GRADUATE QUANTUM MECHANICS');
  setText(deck, 'closing-next-lecture', 'Next lecture: Entanglement, Bell inequalities, and nonlocal correlations');
}

function polishNeon(deck) {
  deck.meta.title = 'Neon Glass Dark — Maliang Product Showcase';
  ensureRuntime(deck, { type: 'morph', durationMs: 540, easing: 'cubic-bezier(.2,.8,.2,1)', autoAnimate: true, unmatched: 'fade' });
  replaceContent(deck, new Map([
    ['CATEGORY / TOPIC', 'MALIANG DECK'],
    ['Presentation Title Goes Here', 'DSL-First\nSlide Systems'],
    ['A concise subtitle that frames the topic and sets audience expectations for this presentation.', 'Build once in typed JSON, preview interactively in HTML, and export from the same canonical deck source.'],
    ['Label A', 'DSL'],
    ['Label B', 'HTML'],
    ['Label C', 'EXPORT'],
    ['Section Title', 'From Structure to Showcase'],
    ['Brief context or framing for this section of the presentation.', 'The deck DSL keeps layout, motion, charts, tables, formulas, and presenter notes in one auditable source.'],
    ['KEY FEATURES', 'CORE PROMISE'],
    ['Three pillars of the approach', 'Three layers keep production reliable'],
    ['First Pillar', 'Typed DSL'],
    ['Second Pillar', 'Runtime polish'],
    ['Third Pillar', 'Export discipline'],
    ['Description of the first key feature or pillar. Explain what it does and why it matters to the audience.', 'Slides are authored as validated elements, charts, tables, formulas, layouts, and notes rather than hand-edited output files.'],
    ['Description of the second key feature or pillar. Explain what it does and why it matters to the audience.', 'HTML previews support transitions, FX, progressive reveals, presenter tools, morphing, and interactive visualization.'],
    ['Description of the third key feature or pillar. Explain what it does and why it matters to the audience.', 'PDF, PPTX, and static HTML exports are regenerated from the same JSON source so review and delivery stay aligned.'],
    ['DEEP DIVE', 'AUTHORING MODEL'],
    ['Key narrative point with supporting evidence', 'A professional deck should behave like a designed system'],
    ['Supporting paragraph that provides context and evidence for the main point. This area can contain up to 3–4 sentences of explanatory text.', 'Maliang separates semantic slide content from runtime rendering. That gives authors room to add motion and visual richness without losing exportable structure.'],
    ['• First supporting detail or finding\n• Second data point or observation\n• Third actionable insight', '• Stable IDs support animation, export, and review\n• Structured elements keep charts and tables editable\n• Speaker notes preserve presenter intent'],
    ['Diagram, image,\nor code sample', 'JSON DSL\n→ HTML Preview\n→ PDF / PPTX'],
    ['DATA EVIDENCE', 'PIPELINE SIGNALS'],
    ['Trend reveals a clear upward trajectory', 'Feature coverage grows without abandoning the DSL'],
    ['Year-over-year growth driven by improved methodology and expanded coverage.', 'Representative coverage across rendering, animation, export, and workflow surfaces.'],
    ['KEY PERFORMANCE INDICATORS', 'SHOWCASE METRICS'],
    ['Performance dashboard at a glance', 'What this example demonstrates at a glance'],
    ['Revenue Growth', 'Typed surfaces'],
    ['147%', '9+'],
    ['Year-over-year quarterly growth', 'element families represented'],
    ['User Retention', 'Motion patterns'],
    ['92.4%', '20+'],
    ['30-day retention rate across cohorts', 'animations and FX modules'],
    ['System Uptime', 'Export target'],
    ['99.97%', 'HTML'],
    ['Last 90 days across all regions', 'self-contained static folder'],
    ['Weighing the strengths against the constraints', 'Choosing runtime polish with export discipline'],
    ['Advantages', 'Strengths'],
    ['Limitations', 'Tradeoffs'],
    ['• First advantage or strength\n• Second positive outcome\n• Third benefit area\n• Fourth supporting evidence', '• Interactive HTML feels alive\n• Typed DSL remains inspectable\n• Theme and FX assets are portable\n• Notes travel with the deck'],
    ['• First constraint or risk\n• Second boundary condition\n• Third area for improvement\n• Fourth known limitation', '• WebGL/CDN features need connectivity\n• Dense effects require restraint\n• Static exports need fallbacks\n• Complex decks need validation'],
    ['Synthesis: the advantages significantly outweigh the limitations for most practical scenarios.', 'The practical rule: add motion where it explains structure, and keep the canonical deck exportable.'],
    ['DETAILED BREAKDOWN', 'EXPORT READINESS'],
    ['Comparative analysis across dimensions', 'What each showcase deck proves'],
    ['Source: Internal analytics dashboard, Q4 reporting period.', 'Source: Maliang Deck example suite, regenerated from source DSL.'],
    ['Implementation roadmap', 'Showcase publishing roadmap'],
    ['Phased rollout with gates between each stage.', 'A lightweight path from curated examples to a GitHub Pages gallery.'],
    ['Phase One', 'Curate'],
    ['Phase Two', 'Export'],
    ['Phase Three', 'Publish'],
    ['Foundation work and validation of core assumptions.', 'Revise source DSL, theme assets, and deck metadata.'],
    ['Scale and iterate based on feedback from phase one.', 'Validate every deck and export static HTML folders.'],
    ['Full deployment with monitoring and optimization.', 'Publish the generated gallery through GitHub Pages Actions.'],
    ['Thank You so much', 'Build decks like systems'],
    ['Questions, feedback, or next steps — let’s discuss.', 'Explore the source DSL, exported HTML, and hosting workflow.'],
    ['name@example.com  ·  @handle', 'maliang-deck/examples  ·  GitHub Pages ready']
  ]));
}

function polishTypeCollage(deck) {
  deck.meta.title = 'VORTEX — Creative Operations Launch';
  ensureRuntime(deck, { type: 'morph', durationMs: 520, easing: 'cubic-bezier(.2,.8,.2,1)', autoAnimate: true });
  replaceContent(deck, new Map([
    ['MEET THE PRODUCT', 'MEET THE PLATFORM'],
    ['WHAT MAKES US DIFFERENT', 'WHY TEAMS SWITCH'],
    ['The Numbers Don’t Lie', 'Launch Momentum'],
    ['Before vs After Vortex', 'Before vs After VORTEX'],
    ['TRUSTED BY THE WORLD’S BEST CREATIVE TEAMS', 'BUILT FOR HIGH-VOLUME CREATIVE TEAMS'],
    ['THE FUTURE IS NOW', 'LAUNCH THE NEXT CREATIVE SYSTEM']
  ]));
  visitElements(deck, (el) => {
    if (typeof el.content !== 'string') return;
    el.content = el.content
      .replaceAll('Vortex', 'VORTEX')
      .replaceAll('creative teams', 'creative operations teams')
      .replaceAll('three days', 'three review cycles');
  });
}

function polishCorporate(deck) {
  deck.meta.title = 'Corporate Wave Blue — Executive Communication System';
  ensureRuntime(deck, { type: 'fade', durationMs: 300, easing: 'ease-out', autoAnimate: true, unmatched: 'fade' });
  replaceContent(deck, new Map([
    ['Presentation Design System', 'Executive Communication System'],
    ['Color, Layout, Typography, Components', 'Strategy, Evidence, Layout, Components'],
    ['A comprehensive visual system\nfor building clean, controlled,\nand impactful presentations.', 'A reusable executive deck system\nfor structured decisions,\ncredible evidence, and fast review.'],
    ['Design Guidelines', 'Decision Slide Guidelines'],
    ['Do / Don’t', 'Quality Checklist']
  ]));
  deck.meta.defaultFont = 'Inter, sans-serif';
}

const polishers = new Map([
  ['examples/animation-showcase/deck.json', polishAnimationShowcase],
  ['examples/ascii-terminal-portfolio/deck.json', polishAsciiPortfolio],
  ['examples/constructivism-defense/deck.json', polishConstructivism],
  ['examples/dreamy-blur-physics/deck.json', polishDreamyPhysics],
  ['examples/neon-glass-dark/deck.json', polishNeon],
  ['examples/type-collage-marketing/deck.json', polishTypeCollage],
  ['examples/corporate-wave-blue/dsl/deck.json', polishCorporate]
]);

for (const rel of decks) {
  const deck = readDeck(rel);
  polishers.get(rel)?.(deck);
  writeDeck(rel, deck);
  console.log(`polished ${rel}`);
}
