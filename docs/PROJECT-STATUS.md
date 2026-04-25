# Maliang Deck — Project Status

## What's Been Done (MVP Complete)

### Design & Planning
- Deep interview (8 rounds, Socratic questioning) — ambiguity reduced from 100% to 18%
- Consensus planning: Planner → Architect → Critic loop with RALPLAN-DR
- Architecture decisions documented and ratified before implementation began

### Implementation

#### `packages/schema/`
- JSON scene graph DSL with full TypeScript types
- Zod validation schema for all element types and slide structure
- Exported types include `Slide`, `Element`, `TextElement`, `RectElement`, `CircleElement`, `EllipseElement`, `LineElement`, `PathElement`, `PolygonElement`, `ImageElement`, `ChartElement`, `TableElement`, `GroupElement`, `LayoutElement`, and `Animation`
- Chart/table schema is intentionally bounded in v1: chart types are `bar`, `line`, `pie`, and `doughnut`; table cells support primitives and simple `{ text, options }` objects
- Optional `meta.htmlRuntime.transition` config gates live HTML slide transitions; absent config preserves static/default behavior
- Deterministic pixel-only layout schema supports recursive `layout` containers with grid/flex modes, child placement metadata, overflow policy, and shared diagnostics
- Schema gates AI/agent output before it reaches any renderer

#### `packages/renderer-svg/`
- DSL → SVG string renderer (TypeScript)
- Compliant with `ppt-master`'s `shared-standards.md` rules
- Images base64-encoded at render time
- Width-aware SVG text wrapping for PDF/SVG export using deterministic text-width estimation
- Shape/SVG element types supported: text, rect, circle, ellipse, line, path, polygon, image, group, layout, chart, and table
- Layout SVG support statically resolves grid/flex geometry, preserves supported layout-level clip/rotation/opacity, and emits explicit layout diagnostics
- Chart/table SVG support is intentionally static/basic: tables render as SVG grids, bar/line render all series, pie/doughnut render the first series, and unsupported/degraded options produce explicit SVG warnings

#### `packages/renderer-html/`
- DSL → interactive HTML renderer (TypeScript)
- Integrates with `runtime/runtime.js` for browser presentation
- Speaker notes support
- Theme injection via CSS variable system
- Canvas FX layer support
- Static chart/table preview support with semantic HTML tables, escaped text, ragged-row normalization, visible bar/line/pie/doughnut markup, optional deterministic value labels, nested group support, and documented ignored options
- Layout preview support with CSS Grid/Flex containers while preserving nested layout metadata and animation attributes

#### `packages/cli/`
- `maliang-deck serve` — Node.js HTTP server with live presentation
- `maliang-deck export` — triggers SVG render + reusable export service → PDF/PPTX bridges
- `maliang-deck validate` — Zod-based schema validation for `.json` files
- `maliang-deck workflow ...` — project-based document-to-slides workflow commands
- `maliang-deck template ...` — extract, validate, sample, and list draft/approved template packs

#### `packages/exporter/`
- Reusable PDF/PPTX export service consumed by both `maliang-deck export` and workflow builds
- Structured export reports and warnings
- PPTX animation plan generation from DSL element `animation` descriptors
- PPTX animation capability reporting: supported, downgraded, and unsupported entries

#### `packages/workflow/`
- Project manifest, source, requirement, deck-plan, work-order, and stage-report schemas
- Safe project scaffolding and stage progression helpers
- MinerU precise API client with typed response validation, robust `.env` token loading, token redaction, local upload URLs, PUT upload support, and batch-result polling
- Local/offline extraction paths: MinerU-style fixtures/prepared artifacts plus optional Docling CLI provider for PDFs
- MinerU ZIP safety checks, extraction records, result ZIP download/unpack helpers, and live smoke coverage gated by `MINERU_LIVE=1`
- Provider-aware normalization from MinerU/Docling Markdown, content lists, tables, and image assets into `materials.json`, `blocks.json`, `assets.json`, and `source-summary.md`
- Outline, deck-plan, and slide DSL work-order gates for agent/manual authoring
- Deck assembly, HTML build, PDF/PPTX export orchestration, and resumable `workflow run`
- Template extraction subsystem under `packages/workflow/src/templates/`: deterministic PPTX/HTML/PDF/PNG adapters, `TemplateExtractionIR`, draft `TemplatePack` inference, advisory coverage thresholds, compile-to-guidance/style helpers, registry activation filtering, and sample DSL/HTML generation

#### `packages/text-measure/`
- Fontkit-based OpenType text measurement engine with `font.layout()` glyph shaping
- `FontRegistry` with sync resolution and precedence chain: CLI > project.json > DeckMeta > bundled generic-family fonts > heuristic
- Improved heuristic fallback with per-font calibration tables and CJK character class support
- `layoutTextBox()` word wrapping with CJK break opportunity insertion
- `reflowSlide()` / `reflowDeck()` post-processing: adjusts text element Y-positions based on measured wrapped heights
- Bundled Inter Regular/Bold, Noto Serif Regular/Bold, and JetBrains Mono Regular fonts for consistent cross-platform measurement
- data-* SVG attribute bridge: `data-maliang-deck-id`, `data-text-role`, `data-box-*`, `data-wrap-mode`

#### Python export bridges
- `python/maliang_deck_export.py` receives SVG strings from TypeScript and calls `svg_to_pptx`'s native DrawingML API
- `python/maliang_deck_export_pdf.py` converts SVG slides to PDF pages and merges them
- `python/svg_to_pptx/drawingml_elements.py` includes `convert_text_group()` for multi-line text via data-* attributes
- `python/svg_to_pptx/pptx_animation_model.py` and `pptx_animation_bridge.py` define the initial PPTX animation-plan bridge contract
- Python remains isolated to export/PPTX/PDF conversion responsibilities

#### pptxgenjs comparison study
- Transcribed `projects/cuszp_slides.js` (pptxgenjs, 15 slides) into maliang-deck DSL format
- Converter script: `projects/cuszp_pptxgenjs_to_dsl.mjs` (inch→pixel coordinate mapping, chart decomposition)
- Exported via both pipelines: pptxgenjs 505KB (native charts/tables) vs maliang-deck 66KB (shapes only)
- Key finding: pptxgenjs produces editable PowerPoint charts and tables; the legacy maliang-deck DrawingML path decomposes them to rects+text
- ADR implemented: opt-in pptxgenjs backend for native chart/table support alongside existing DrawingML

#### `@maliang-deck/exporter-pptxgenjs` and native chart/table export
- `ChartElement` and `TableElement` added to the schema and Zod validation
- `@maliang-deck/exporter-pptxgenjs` package added as an opt-in JavaScript PPTX backend
- Native PowerPoint charts and tables are emitted through `pptxgenjs` `addChart()` / `addTable()`
- Layout contents render through `pptxgenjs` after deterministic resolution; unsupported layout-level clip/rotation/opacity produce explicit warnings
- `@maliang-deck/exporter` exposes `pptxEngine?: 'drawingml' | 'pptxgenjs'`; default remains DrawingML/Python
- CLI exposes `maliang-deck export deck.json deck.pptx --pptx-engine pptxgenjs`
- Chart/table decks fail fast on default DrawingML and PDF paths, including nested `group.elements`
- Explicit JS engine failures return JS errors and do not automatically fall back to Python

#### `runtime/`
- Ported from `html-ppt-skill` source repo
- `runtime.js` — reveal-style slide navigation (`←/→`), in-slide animation steps (`↑/↓`), fullscreen, PowerPoint-like smoothed laser pointer with fading trail (`L`), and popup whiteboard with smoothed marker strokes, eraser, undo, and redo (`W`)
- Opt-in HTML slide transitions and adjacent-slide shared-key auto-animate via `meta.htmlRuntime.transition`; reduced-motion users get static/instant behavior
- Presenter mode with speaker notes pane, remote animation-step forwarding, timer slide counter, and chrome-free current/next preview iframes
- Theme cycling (36 themes)
- Scaling/fit-to-viewport logic
- `fx-runtime.js` + 20 canvas FX modules

#### `assets/themes/`
- 36 CSS theme files covering: minimal, dark, retro, branded, editorial, developer aesthetics
- Themes: academic-paper, arctic-cool, aurora, bauhaus, blueprint, catppuccin-latte, catppuccin-mocha, corporate-clean, cyberpunk-neon, dracula, editorial-serif, engineering-whiteprint, glassmorphism, gruvbox-dark, japanese-minimal, magazine-bold, memphis-pop, midcentury, minimal-white, neo-brutalism, news-broadcast, nord, pitch-deck-vc, rainbow-gradient, retro-tv, rose-pine, sharp-mono, soft-pastel, solarized-light, sunset-warm, swiss-grid, terminal-green, tokyo-night, vaporwave, xiaohongshu-white, y2k-chrome

#### `examples/demo.json`
- 4-slide demo exercising all element types
- Validates against schema, renders to HTML and PPTX

#### `projects/cuszp/` workflow artifact (local, ignored)
- 12-slide, 15-minute academic paper presentation generated from the cuSZp paper
- Built outputs: HTML, PDF, PPTX
- Uses local/offline extraction artifacts for checked-in workflow examples; live MinerU extraction has also been verified against the cuSZp PDF with a token-gated smoke run
- Demonstrates the new workflow path: project → normalized source → outline approval → deck plan → DSL slices → assembled deck → HTML/PDF/PPTX

### Verification
- End-to-end pipeline verified: DSL → HTML + SVG → PDF/PPTX
- `pnpm lint` passes with the root ESLint 9 flat config
- `pnpm -r build` passes
- `pnpm -r typecheck` passes
- Focused chart/table renderer/export gates pass: HTML/SVG chart-table tests, PDF chart-table export, DrawingML fail-fast, and pptxgenjs routing
- Full `pnpm test` is blocked only by the ignored/local `projects/cuszp/dsl/deck.json` fixture required by three text-measure/cuSZp tests; focused workflow/schema/renderer/exporter tests pass
- Existing deck validation/export smoke checks pass
- Workflow gate smoke check passes: DSL generation is blocked until outline approval
- Generated cuSZp deck validates, exports PDF/PPTX, and has 12 PPTX slides
- Live MinerU smoke verified the cuSZp PDF path: upload, poll, ZIP download, safe unpack, 1 Markdown material, 334 blocks, and 60 normalized image assets with zero warnings
- Local Docling smoke verified the cuSZp-HPC PDF path: 1 material, 1036 normalized blocks, 33 normalized image assets, and table/image/text/title/list block coverage
- Template extraction verification passes: `pnpm test tests/workflow`, `pnpm test tests/schema`, `pnpm test tests/renderer-html tests/renderer-svg tests/exporter`, `pnpm -r build`, `pnpm -r typecheck`, `pnpm lint`, and template CLI extract/validate/sample/list smoke

---

## Current Progress

Phase 1 (MVP), Phase 2 (Animation Layer), and the first workflow/extraction/export orchestration slice are complete.

| Feature | Status |
|---|---|
| JSON DSL schema + Zod validation | Done |
| SVG renderer (ppt-master compliant) | Done |
| HTML renderer + runtime.js | Done |
| CLI (serve, export, validate) | Done |
| CLI workflow command family | Done |
| Reusable exporter package | Done |
| Python PPTX bridge | Done |
| Python PDF bridge | Done |
| 36 CSS themes | Done |
| Presenter mode + speaker notes + timer-only slide index | Done |
| 20 canvas FX modules | Done |
| Editable DrawingML export | Done |
| Full shape set (9 element types) | Done |
| Example demo (4 slides) | Done |
| **Animation schema (step, enter, duration, delay, easing)** | **Done** |
| **Unified timeline engine (Web Animations API)** | **Done** |
| **Auto-play (step 0) + click-to-advance (step N)** | **Done** |
| **11 starter animations (professional + calm)** | **Done** |
| **Slide-level canvas FX via DSL `fx` property** | **Done** |
| **Cooperative navigation hook (all nav paths)** | **Done** |
| **Presenter step indicator** | **Done** |
| **Viewport auto-scaling (transform: scale)** | **Done** |
| **Contrast-aware progress bar + slide number** | **Done** |
| **Presenter auto-resize on window resize** | **Done** |
| **prefers-reduced-motion support** | **Done** |
| **SVG/PPTX graceful animation ignore** | **Done** |
| **Animation demo deck (5 slides)** | **Done** |
| **Extensibility guide (ADDING-ANIMATIONS.md)** | **Done** |
| **PPTX animation plan + capability report** | **Initial bridge done** |
| **MinerU precise API client + live smoke** | **Done: token-gated upload/poll/ZIP/normalize verified** |
| **Workflow project scaffolding and artifact gates** | **Done** |
| **MinerU-style normalization to blocks/assets/source summary** | **Done** |
| **Agent/manual work-order contracts** | **Done** |
| **SVG width-aware text wrapping for PDF export** | **Done, approximate** |
| **cuSZp workflow-generated deck** | **Done** |
| **Fontkit text measurement engine** | **Done** |
| **Font registry with precedence chain** | **Done** |
| **CJK word-breaking in text layout** | **Done** |
| **DSL reflow utility (reflowSlide/reflowDeck)** | **Done** |
| **data-* SVG bridge for PPTX text sizing** | **Done** |
| **pptxgenjs comparison study** | **Done** |
| **Hybrid PPTX export ADR (pptxgenjs + DrawingML)** | **Implemented as opt-in v1 engine** |
| **Chart DSL element type** | **Done** |
| **Table DSL element type** | **Done** |
| **pptxgenjs PPTX exporter** | **Done: opt-in JS engine package, routing, CLI, and tests** |
| **ESLint 9 flat config** | **Done: `pnpm lint` passes** |
| **Static HTML/SVG/PDF chart-table rendering** | **Done: basic non-native rendering with warnings/degradation tests** |
| **HTML runtime slide transitions (`meta.htmlRuntime.transition`)** | **Done: opt-in live runtime, SVG/PDF/PPTX ignore config** |
| **Shared-key auto-animate between adjacent slides** | **Done: bounded FLIP-style runtime path with scoped DOM IDs + shared data keys** |
| **Targeted chart/table fidelity follow-ups** | **Done: deterministic value labels and SVG rich cell formatting parity; spans/autopaging deferred** |
| **Live MinerU precise API smoke** | **Done: token-gated cuSZp PDF upload/poll/ZIP/normalize verified** |
| **Template extraction system** | **Done: workflow-level PPTX/HTML/PDF/PNG draft packs, coverage, sample DSL/HTML, CLI, docs, tests** |
| **DSL-first hybrid layout** | **Done: pixel-only grid/flex layout element, resolver, HTML/SVG/exporter/pptxgenjs support, diagnostics, tests** |

---

## Workflow Guide

For the recommended human/agent slide-generation process, see [`docs/WORKFLOW.md`](./WORKFLOW.md).

## What Needs To Be Done

### Near-Term
- **Component/macro authoring (DSL-first hybrid Phase 2)** — add compile-time components such as metric-card, two-column, feature-grid, and timeline-step that expand into validated DSL/layout elements with deterministic IDs and source maps.
- **Template pack approval UX** — v1 extracts draft packs and can explicitly include drafts; a first-class approval command/policy can be added when desired.
- **Chart/table remaining fidelity** — spans/autopaging and automated visual regression coverage remain deferred; deterministic data labels and SVG rich cell formatting are done.
- **Runtime transition hardening** — keep `meta.htmlRuntime.transition` HTML-only; add browser visual regression only after a separate harness decision.
- **Font bundle expansion** — Noto Serif Regular/Bold and JetBrains Mono Regular are bundled; italic and expanded monospace weights remain deferred until rich text/weight mapping requires them.
- **Workflow polish** — add `.env.example`, a user-facing workflow guide, and a status command for project artifacts.

### Medium-Term
- **Layout presets** — built-in DSL shortcuts for cover, two-column, title-body, stat cards, comparison tables, pipeline diagrams, and section dividers
- **Approved extracted template packs** — create curated academic/technical/report template packs from real references and mark them approved for generation-safe use
- **Rich text support** — mixed formatting within a single text element, mapping to SVG `<tspan>` and PPTX run properties
- **Richer PPTX animation bridge** — write actual PowerPoint timing/effect XML where supported, not only plan/capability reporting
- **Retire Python DrawingML** — once pptxgenjs handles all shape types, migrate remaining DrawingML logic to pptxgenjs and remove the Python PPTX bridge
- **Video export** — Puppeteer headless capture of HTML slides + frame-by-frame during animations + ffmpeg assembly to MP4/WebM
- **Vite dev server with HMR** — replace current basic Node.js HTTP server with Vite for instant reload during development

### Longer-Term
- **`maliang-deck` as publishable global CLI** — npm package, `npx maliang-deck` invocation, proper bin entry
- **Automated visual regression testing** — screenshot comparison between HTML render and PPTX output per slide
- **Rich text support** — mixed formatting (bold, italic, color, size) within a single text element
- **Provider-backed generation mode** — optional future `--mode provider` with explicit credential, privacy, and cost controls; not part of the current no-hidden-provider workflow

## Good To Do

- Add `.env.example` documenting `MINERU_API_TOKEN` without committing secrets
- Add a `docs/WORKFLOW.md` user guide with a complete local and live-MinerU example
- Add `docs/TEXT-LAYOUT.md` explaining current approximate SVG wrapping and the planned font-metric layout engine
- Add fixture decks for academic paper, technical talk, and project update workflows
- Add a command that summarizes workflow project status and missing artifacts
- Add stronger token redaction tests for request/response artifacts
- Add manual QA checklist for inspecting PDF/PPTX/HTML outputs
