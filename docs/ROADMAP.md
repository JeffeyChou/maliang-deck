# Maliang Deck — Roadmap

## Phase 1: MVP (COMPLETE)

**Goal:** End-to-end slide pipeline from JSON to editable PPTX.

- [x] JSON scene graph DSL with TypeScript types and Zod validation
- [x] SVG renderer — DSL → ppt-master-compliant SVG strings
- [x] HTML renderer — DSL → interactive browser presentation
- [x] Editable PPTX export via native DrawingML (svg_to_pptx bridge)
- [x] CLI tools: `serve`, `export`, `validate`
- [x] Browser runtime: reveal-style keyboard navigation, presenter mode, speaker notes, theme cycling, PowerPoint-like smoothed laser pointer trail, popup whiteboard with smoothed marker strokes, eraser, undo, and redo
- [x] 36 CSS themes
- [x] 20 canvas FX modules (ported from html-ppt-skill)
- [x] 4-slide demo exercising all 9 element types

---

## Phase 2: Animation Layer (COMPLETE)

**Goal:** Bring slides to life in the browser while keeping PPTX export clean.

- [x] Animation schema in DSL: `enter`, `duration`, `delay`, `easing`, `step` per element
- [x] Unified timeline engine (`runtime/timeline.js`) — Web Animations API with JS KEYFRAMES registry
- [x] Auto-play mode (step 0) with stagger timing + click-to-advance (step N) sequencing
- [x] Reveal-style navigation split — `←/→` switch slides while `↑/↓` step in-slide animations
- [x] Canvas FX integration — slide-level `fx: string[]` emits `data-fx` divs, `fx-runtime.js` auto-initializes
- [x] 11 starter animations (professional + calm): fade-up/down/left/right, scale-in, blur-in, slide-from-left/right, rise-in, zoom-pop, rotate-in
- [x] Animation degradation: SVG/PPTX renderers gracefully ignore `animation`/`fx` properties
- [x] Presenter step indicator ("Step 3/7") via BroadcastChannel
- [x] Presenter window forwards `↑/↓` animation-step commands to the audience deck
- [x] Timeline API surface: `play()`, `pause()`, `seek()`, `getCurrentStep()`, `getTotalSteps()`, `onStepChange()`
- [x] `prefers-reduced-motion` respected (elements visible instantly, click-steps still work)
- [x] Viewport auto-scaling (`transform: scale()`) fits any viewport while maintaining design resolution
- [x] Contrast-aware UI: progress bar and slide number auto-switch light/dark based on slide background luminance
- [x] Presenter auto-resize: card layout reflows on window resize, clamps cards on-screen
- [x] Presenter preview cleanup: current/next preview iframes hide deck slide numbers while the timer card remains the slide-index source
- [x] Animation demo deck (`examples/animation-demo.json`, 5 slides)
- [x] Extensibility guide (`docs/ADDING-ANIMATIONS.md`)

---

## Phase 3: Workflow, Advanced Text, and Layout

**Goal:** Production-quality document-to-slides workflows, text handling, and reusable layout primitives.

### Completed in the first Phase 3 slice

- [x] `@maliang-deck/exporter` package — reusable PDF/PPTX export service shared by CLI and workflow builds
- [x] PDF export through the reusable export service
- [x] PPTX animation plan generation from DSL animations
- [x] PPTX animation capability report with supported/downgraded/unsupported mappings
- [x] `@maliang-deck/workflow` package — project manifests, requirements, sources, work orders, stages, and reports
- [x] MinerU precise API client with typed response validation and token redaction policy
- [x] Local/offline MinerU-style extraction path for fixture and local artifact workflows
- [x] Optional Docling local PDF extraction provider with isolated staging and provider-aware normalization
- [x] MinerU-style normalization to materials, blocks, assets, and source summary
- [x] Agent/manual work-order contracts for outline, deck-plan, and slide DSL authoring
- [x] CLI commands under `maliang-deck workflow ...`
- [x] Workflow approval gate: slide DSL generation is blocked until outline approval
- [x] Approximate width-aware SVG text wrapping for PDF/SVG export
- [x] cuSZp 15-minute academic-paper deck generated through the workflow

### Completed in the second Phase 3 slice (text measurement + export study)

- [x] `@maliang-deck/text-measure` package — fontkit-based OpenType glyph measurement engine
- [x] `FontRegistry` with sync resolution and precedence chain (CLI > project.json > DeckMeta > bundled generic-family fonts > heuristic)
- [x] Improved heuristic fallback with per-font calibration tables and CJK character classes
- [x] `layoutTextBox()` word wrapping with CJK break opportunity insertion
- [x] `reflowSlide()` / `reflowDeck()` — adjusts text element Y-positions based on measured wrapped heights
- [x] Bundled Inter Regular/Bold, Noto Serif Regular/Bold, and JetBrains Mono Regular fonts for consistent cross-platform measurement across `sans-serif`, `serif`, and `monospace` defaults
- [x] data-* SVG attribute bridge for PPTX text sizing (`data-maliang-deck-id`, `data-box-*`, `data-wrap-mode`)
- [x] Python `convert_text_group()` intercepts `<g data-maliang-deck-id>` for precise PPTX text boxes
- [x] `textRole` field on TextElement schema (`body`, `label`, `heading`, `stat`)
- [x] `fonts` field on DeckMeta schema for per-deck font configuration
- [x] cuSZp deck reflowed — S02, S06, S09 text overlaps fixed
- [x] pptxgenjs comparison study: transcribed 15-slide deck, exported via both pipelines, documented findings
- [x] Hybrid PPTX export ADR implemented: opt-in pptxgenjs for charts/tables, DrawingML remains default

### Completed in the third Phase 3 slice (native chart/table PPTX)

- [x] `ChartElement` schema with v1 chart types: `bar`, `line`, `pie`, `doughnut`
- [x] `TableElement` schema with primitive cells and simple `{ text, options }` cells
- [x] `@maliang-deck/exporter-pptxgenjs` package — opt-in JavaScript PPTX backend
- [x] Native PPTX chart/table output through `pptxgenjs` `addChart()` / `addTable()`
- [x] CLI/package routing with `pptxEngine` and `--pptx-engine pptxgenjs`
- [x] Fail-fast guards for chart/table decks on the default DrawingML/Python PPTX path, including nested groups
- [x] No auto-fallback after explicit JS engine failure
- [x] Focused tests and manual CLI smoke for chart/table PPTX export


### Completed in the fourth Phase 3 slice (template extraction)

- [x] Workflow-level template extraction subsystem under `packages/workflow/src/templates/`
- [x] Deterministic v1 adapters for PPTX, HTML, PDF, and PNG references
- [x] Draft `TemplatePack` artifacts with design tokens, layout archetypes, slots, fragments, provenance, activation state, and coverage evidence
- [x] Advisory `coverage-thresholds.proposed.json` review artifact; thresholds are not enforced until approved
- [x] Compile layer maps template packs into existing `StyleDefinition`, `DeckDesign`, and `WorkOrderGuidance` surfaces
- [x] Template sample generation outputs ordinary JSON DSL and HTML preview while keeping renderers template-unaware
- [x] `maliang-deck template extract|validate|sample|list` CLI commands
- [x] Template extraction docs, dependency review note, fixtures, security/boundary tests, and renderer-unaware regression tests

### Completed in the fifth Phase 3 slice (DSL-first hybrid layout)

- [x] DSL-first hybrid direction ratified: DSL remains export-aware truth, not HTML-first source
- [x] `LayoutElement` schema with deterministic pixel-only `grid` and `flex` modes
- [x] Pure layout resolver in `@maliang-deck/schema` with non-mutating output, grid auto-placement, flex wrapping, and diagnostics
- [x] HTML layout preview via CSS Grid/Flex while keeping nested layout containers
- [x] SVG/PDF layout export via static resolver output, layout flattening diagnostics, and SVG clip/rotation/opacity handling
- [x] Default DrawingML/PDF export guard recurses through layout contents for chart/table fail-fast behavior
- [x] Explicit `pptxgenjs` layout rendering with warnings for unsupported layout-level rotation/opacity/clip
- [x] Focused schema, resolver, renderer, exporter, and pptxgenjs tests for layout behavior
- [x] Operator contract documented in [`docs/DSL-FIRST-HYBRID-AUTHORING.md`](./DSL-FIRST-HYBRID-AUTHORING.md)

### Still required for Phase 3 quality

- [x] ESLint v9 flat config — root config and direct TypeScript lint dependencies added; `pnpm lint` passes
- [x] HTML/SVG/PDF static chart/table rendering — HTML/SVG visible primitives, PDF via SVG, DrawingML fail-fast preserved, and degradation warnings covered
- [x] Targeted chart/table fidelity — deterministic data labels plus SVG table rich cell formatting parity for existing cell options; spans/autopaging and visual regression remain deferred
- [ ] Component/macro authoring — compile-time components such as metric-card, two-column, feature-grid, and timeline-step that expand into validated DSL/layout elements
- [x] Template extraction system — implemented workflow-level PPTX/HTML/PDF/PNG extraction into draft template packs, coverage reports, compiled guidance/style surfaces, sample DSL/HTML output, and renderer-unaware CLI/docs/tests
- [ ] Rich text support — mixed formatting (bold, italic, color, font-size, link) within a single text element, mapping to SVG `<tspan>` and PPTX run properties
- [x] Live MinerU API path — local PDF upload via MinerU precise API, ZIP download/unpack, Markdown normalization, and extracted image asset normalization verified with `MINERU_API_TOKEN`
- [x] Optional Docling provider — external CLI runner, no npm dependency, local cuSZp-HPC smoke verified with 1 material, 1036 blocks, and 33 image assets
- [x] Download remaining bundled fonts (Noto Serif, JetBrains Mono) for text-measure; expanded italic and additional monospace weights remain deferred until rich text/weight mapping needs them
- [x] HTML runtime slide transitions and adjacent-slide shared-key auto-animate — opt-in through `meta.htmlRuntime.transition`; static exporters ignore this live-runtime config

### Good to do

- [ ] `.env.example` with `MINERU_API_TOKEN=replace_me`
- [ ] `maliang-deck workflow status <project>` command
- [ ] Visual regression tests for HTML/PDF/PPTX outputs
- [ ] Academic/technical/report deck templates and approved extracted template packs
- [x] Live MinerU smoke test gated by `MINERU_API_TOKEN` and an explicit opt-in flag
- [ ] Provider-backed generation mode (`--mode provider`) as a separate, explicit PRD with privacy/cost controls

---

## Phase 4: Video Export

**Goal:** Export slides and animations as video files.

- Puppeteer or Playwright headless capture of HTML slide renderer
- Frame-by-frame capture during animation playback (configurable FPS)
- ffmpeg assembly of frames into MP4 and WebM
- Audio track support (attach narration audio per slide in DSL)
- Remotion-style programmatic video generation from DSL (no browser required for static slides)
- Thumbnail generation for each slide (PNG export)

---

## Phase 5: Platform Maturity

**Goal:** Ecosystem, collaboration, and extensibility.

- **`maliang-deck` as publishable global CLI** — npm package with proper `bin` entry; `npx maliang-deck init`, `npx maliang-deck serve`, `npx maliang-deck export`
- **Vite dev server with HMR** — instant reload on DSL file save during development
- **Automated visual regression testing** — per-slide HTML vs PPTX screenshot diff; CI gate
- **Full PPTX animation support** — lower DSL animation descriptors into actual PowerPoint animation XML via the PPTX animation bridge
- **Plugin system** — register custom element types and renderers without forking core; `maliang-deck.config.ts` entry point
- **AI agent integration** — schema-constrained generation endpoint; LLM output validated by Zod before any render; provider-backed mode must remain explicit and opt-in
- **Cloud deployment (optional SaaS mode)** — stateless render API, hosted presentation URLs
- **Collaborative editing** — CRDT-based concurrent DSL editing with live multi-user preview


## Latest DSL-first hybrid status

Phase 1 of DSL-first hybrid authoring is implemented: deterministic pixel-only layout containers are now part of the DSL, HTML previews use CSS Grid/Flex, SVG/PDF exports flatten layouts with diagnostics, and pptxgenjs handles layout contents with explicit unsupported-effect warnings. Phase 2 should add compile-time component/macro authoring on top of these layout primitives. See `docs/DSL-FIRST-HYBRID-AUTHORING.md`.

## Latest template extraction status

The v1 workflow-level template extraction system is implemented. It supports draft `TemplatePack` creation from PPTX, HTML, PDF, and PNG references; emits extraction IR, coverage reports, advisory threshold proposals, and sample DSL/HTML output; and compiles approved packs into existing guidance/style surfaces. Renderers remain template-unaware. See `docs/TEMPLATE-EXTRACTION.md`.
