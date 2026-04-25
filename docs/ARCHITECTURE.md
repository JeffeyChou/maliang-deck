# Maliang Deck — Architecture

## Design Method

Maliang Deck was built using a 3-stage design pipeline:

1. **Deep Interview** — 8 rounds of Socratic questioning to reduce ambiguity. Covered: target output formats, text handling strategy, animation scope, runtime dependencies, Python interop approach. Ambiguity reduced from 100% to 18% before any code was written.

2. **RALPLAN Consensus** — Planner → Architect → Critic loop (RALPLAN-DR). Planner proposed the monorepo split and dual-renderer architecture. Architect ratified the DSL-as-single-source-of-truth constraint. Critic challenged pre-wrapped text and Python isolation decisions; both were retained with documented rationale.

3. **Autopilot Execution** — Autonomous implementation from the ratified plan. Each package built and verified in sequence: schema → renderer-svg → renderer-html → cli → python bridge → runtime.

---

## Architecture Overview

The core design principle is **JSON DSL as single source of truth**. Every slide is a JSON document that validates against the schema. Both renderers consume only the DSL — neither has access to the other's output. The Python bridge is isolated to DrawingML/PDF conversion; static chart/table PDF output flows through the SVG renderer, while native editable chart/table PPTX export is handled by the opt-in JavaScript `pptxgenjs` engine.

```
┌─────────────────────────────────────────────────────────┐
│                    JSON Scene Graph DSL                   │
│              (Single Source of Truth)                     │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
           ▼                      ▼
┌─────────────────────┐  ┌──────────────────────────────┐
│   HTML Renderer      │  │  @maliang-deck/text-measure        │
│   (TypeScript)       │  │  fontkit metrics, layout,     │
│                      │  │  reflow, CJK word-breaking    │
│ DSL → DOM elements   │  └──────────┬───────────────────┘
│ + CSS animations     │             │
│ + Canvas FX          │             ▼
└──────────┬───────────┘  ┌─────────────────────────┐
           │              │    SVG Renderer          │
           ▼              │    (TypeScript)          │
┌─────────────────────┐   │ DSL → SVG strings        │
│   Browser Runtime    │   │ + fontkit text wrap      │
│   (nav, presenter,   │   │ + data-* PPTX bridge     │
│    themes, scaling)  │   └──────────┬──────────────┘
└──────────────────────┘              │
                                      ▼
                            ┌─────────────────────────┐
                            │  @maliang-deck/exporter       │
                            │  PDF/PPTX orchestration  │
                            └──────────┬──────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
       ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
       │  PDF bridge       │ │ svg_to_pptx      │ │ pptxgenjs engine │
       │  (CairoSVG)       │ │ (DrawingML)      │ │ (opt-in)         │
       │  shapes + text    │ │ shapes + text    │ │ charts + tables  │
       └──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Key Architectural Decisions

### TypeScript monorepo with pnpm workspaces
Each concern lives in its own package with explicit dependencies. Schema is consumed by both renderers and the CLI. Renderers are independent. This allows the CLI to import only what it needs and keeps package boundaries enforced by TypeScript's module resolution.

Current package split:

- `@maliang-deck/schema` — public deck DSL and Zod validation
- `@maliang-deck/text-measure` — fontkit-based text measurement, layout, word wrapping, and DSL reflow
- `@maliang-deck/renderer-html` — DSL to interactive HTML
- `@maliang-deck/renderer-svg` — DSL to SVG for PDF/PPTX export (uses text-measure for fontkit wrapping)
- `@maliang-deck/exporter` — reusable PDF/PPTX export orchestration, engine routing, and PPTX animation-plan reporting
- `@maliang-deck/exporter-pptxgenjs` — opt-in JavaScript PPTX engine for native chart/table output (v1 bounded slice)
- `@maliang-deck/workflow` — project artifacts, MinerU extraction/normalization, template extraction contracts/adapters, work-order gates, assembly, and workflow build orchestration
- `@maliang-deck/cli` — command-line interface over schema/render/export/workflow packages

### SVG renderer generates ppt-master-compliant SVG
Rather than generating arbitrary SVG and post-processing it, the SVG renderer emits SVG that already conforms to `ppt-master/shared-standards.md` rules. This skips a post-processing step and makes the output deterministic from the DSL alone.

The SVG renderer now performs approximate width-aware text wrapping before PDF/PPTX export. SVG has no automatic text wrapping at `width`, so the renderer emits explicit line-positioned `<text>` elements. This fixes the PDF overflow/clipping class of bugs, but it is not yet full font-metric layout. Phase 3 still needs `fontkit` or `node-canvas` metrics and overflow detection.

### Exporter package owns PDF/PPTX orchestration
`@maliang-deck/exporter` is the single TypeScript export service used by both `maliang-deck export` and `maliang-deck workflow build`. It validates a deck, renders SVG slides, dispatches to the correct Python bridge, and emits structured export reports.

PPTX animation support is currently a two-part bridge:

1. TypeScript generates `pptx-animation-plan.json` from DSL element animations.
2. The Python bridge accepts the plan and writes a capability report.

The current bridge reports supported/downgraded/unsupported effects and preserves static editable PPTX export. Full PowerPoint animation XML lowering remains future work.

### Python isolated to export conversion
`python/maliang_deck_export.py` receives SVG strings from the TypeScript exporter, converts them to DrawingML using `svg_to_pptx`, and writes the `.pptx` file. `python/maliang_deck_export_pdf.py` converts SVG slides to PDF. Python does not own DSL parsing, workflow state, MinerU extraction, or file discovery. This keeps the TS/Python boundary sharp and testable.

### Workflow package: project artifacts and gates
`@maliang-deck/workflow` turns document-to-slides generation into explicit filesystem artifacts:

```
projects/<slug>/
├── project.json
├── requirements.md
├── extraction/
│   ├── mineru/
│   │   ├── extract-work-order.json
│   │   ├── tasks.json
│   │   ├── zips/
│   │   └── unpacked/
│   ├── docling/
│   │   ├── extract-work-order.json
│   │   ├── tasks.json
│   │   ├── raw/
│   │   └── unpacked/
│   └── normalized/
│       ├── materials.json
│       ├── blocks.json
│       ├── assets.json
│       └── source-summary.md
├── planning/
│   ├── outline-draft.md
│   ├── outline-approved.md
│   └── deck-plan.json
├── dsl/
│   ├── work-orders/
│   ├── slides/
│   └── deck.json
├── render/html/index.html
└── exports/
    ├── deck.pdf
    ├── deck.pptx
    ├── export-report.json
    └── pptx-animation-plan.json
```

Workflow code owns deterministic scaffolding, validation, extraction, normalization, gates, assembly, and exports. Content generation remains explicit agent/manual artifact authoring through work orders. There is no hidden provider-backed generation mode.

### DSL-first hybrid authoring and deterministic layout

The current authoring direction is **DSL-first hybrid**, not HTML-first. The DSL remains the export-aware truth for validation, static analysis, SVG/PDF export, DrawingML PPTX export, and the opt-in `pptxgenjs` engine. HTML can provide the richest live preview, but arbitrary DOM/CSS is not the source of record for traditional exports.

The first hybrid slice adds a recursive `layout` element to `@maliang-deck/schema`. Layouts support deterministic pixel-only `grid` and `flex` containers. A pure resolver in `packages/schema/src/layout.ts` converts layout children into explicit boxes without mutating the source deck. HTML keeps layout containers and renders CSS Grid/Flex for preview; SVG/PDF use resolved static geometry and explicit layout diagnostics; `pptxgenjs` resolves layout contents natively where possible and warns when layout-level effects such as clipping, opacity, or rotation cannot be preserved.

This improves agent authoring efficiency without giving up export predictability. Component/macro authoring should build on this layer by compiling reusable components into ordinary validated DSL/layout elements before renderers run. See [`docs/DSL-FIRST-HYBRID-AUTHORING.md`](./DSL-FIRST-HYBRID-AUTHORING.md).

### Template extraction boundary
Template extraction is an implemented workflow-level subsystem for turning reference PPTX, HTML, PDF, and PNG material into reusable draft template packs. It preserves the DSL-first architecture: adapters produce `TemplateExtractionIR`, inference emits draft `TemplatePack` artifacts and coverage reports, and a compile layer maps approved packs into existing `StyleDefinition`, `DeckDesign`, `SlideDesign`, and `WorkOrderGuidance` surfaces.

Renderers and exporters remain template-unaware. They continue to consume ordinary deck DSL only. Template fragments are generation guidance, not renderer input. Draft packs are excluded from generation-safe style listing by default until explicitly approved, and proposed coverage thresholds remain advisory until reviewed.

See [`docs/TEMPLATE-EXTRACTION.md`](./TEMPLATE-EXTRACTION.md) for the operator contract, dependency review gate, CLI behavior, registry semantics, verification evidence, and review checklist.

### Extraction provider boundaries
MinerU remains the default/precision provider. Its live path owns token-redacted upload URLs, PUT upload, polling, result ZIP download/unpack, and `MINERU_API_TOKEN` handling; no token value is persisted.

Docling is an optional local PDF provider. It is invoked as an external CLI through argv-based process execution, so Python/PyTorch/OCR packages stay outside the npm dependency graph. Docling output is isolated under `extraction/docling/`, then adapted into the same normalized `materials`, `blocks`, `assets`, and `source-summary` artifacts. True air-gapped Docling runs require pre-downloaded model artifacts via `--artifacts-path`.

### Animation Layer: Unified Timeline with Cooperative Navigation

Phase 2 adds a unified timeline engine (`runtime/timeline.js`) that powers both auto-play (step 0) and click-to-advance (step N) animations as sugar over one internal model.

**Key design decisions:**

- **Web Animations API with JS keyframes registry** — `element.animate()` is driven by a `KEYFRAMES` JS object, NOT CSS `@keyframes`. This gives programmatic control (pause, seek, cancel) while keeping definitions inspectable. The `runtime/animations.css` file is only for `prefers-reduced-motion` fallback.

- **Reveal-style step controls with explicit slide navigation** — The timeline integrates with `runtime.js` through a null-safe `go()` hook, but arrow-key intent is now split: `←/→` (and PageUp/PageDown/Home/End) use slide-only navigation with `skipTimeline`, while `↑/↓` call `window.__vsliTimeline.advance()` for in-slide steps. Space/Enter preserve a convenience path by advancing a step first and moving slides only when no further step is available.

- **Layered DSL: element `animation` + slide `fx`** — Per-element CSS animations use `animation: { enter, step, duration, delay, easing }`. Per-slide canvas FX backgrounds use `fx: ["gradient-blob"]`. Two separate concerns, two separate DSL properties.

- **Renderer declares, runtime executes** — The HTML renderer emits `data-anim-*` attributes. The timeline engine reads them and drives WAAPI. The renderer never calls `element.animate()` directly. This preserves the renderer as a pure function (DSL in, HTML string out).

- **Contrast-aware UI** — Progress bar and slide number auto-detect slide background luminance and switch between light/dark color schemes per slide.

- **Live presenter tools** — `runtime.js` provides built-in, dependency-free `L` laser pointer mode and `W` popup whiteboard mode. The laser pointer follows the cursor and, while the left mouse button is held, draws a PowerPoint-like temporary red trail using smoothed, tapered Bézier segments that fade automatically. Whiteboard marker strokes use midpoint quadratic smoothing for the same non-segmented feel, and whiteboard operations are retained as replayable marker/eraser strokes so Undo, Redo, resize replay, and erasing work without an external plugin. These mirror reveal.js' plugin-oriented interaction model without taking an external dependency for the v1 runtime.

- **Presenter preview chrome boundary** — Presenter current/next cards load the same deck through `?preview=N` iframes. Preview mode hides deck chrome, including progress bar and slide number, so the timer card is the only slide-index source in presenter mode while audience view keeps its normal progress UI.

- **Viewport auto-scaling** — Slides maintain their design resolution (e.g., 1280x720) and are CSS-transformed with `scale()` to fit any viewport. This preserves pixel-perfect element positioning while supporting any screen size.

- **HTML slide transitions / auto-animate** — Decks can opt into live slide transitions with `meta.htmlRuntime.transition`. The renderer emits `data-slide-id`, scoped DOM IDs, and shared data keys (`data-maliang-deck-id` / `data-maliang-deck-auto-animate-id`) so adjacent slides can animate matching elements without duplicate DOM IDs. This layer is HTML-runtime-only; SVG, PDF, and PPTX exporters ignore it for deterministic static output.

### HTML renderer extends html-ppt-skill's existing runtime
Rather than writing a new presentation runtime, `runtime/runtime.js` was ported from the `html-ppt-skill` source repo. This brought navigation, presenter mode, theme cycling, and 20 canvas FX modules into Maliang Deck without reimplementation. The runtime now also includes reveal.js-inspired keyboard separation (`←/→` for slides, `↑/↓` for animation steps), laser pointer mode, and a popup whiteboard with eraser plus undo/redo history.

### Text layout: fontkit-based measurement engine

HTML text uses browser/CSS wrapping. SVG/PDF/PPTX export uses `@maliang-deck/text-measure`, a fontkit-based measurement engine that provides:

- **Precise glyph measurement** via `font.layout()` with OpenType shaping, kerning, and ligatures
- **Hybrid fallback**: fontkit primary, improved character-width heuristic when font files unavailable
- **Font registry** with precedence: CLI flags > project.json > DeckMeta > bundled defaults (Inter for `sans-serif`, Noto Serif for `serif`, JetBrains Mono for `monospace`) > heuristic
- **CJK word-breaking**: zero-width space insertion between CJK characters for line break opportunities
- **DSL reflow utility**: `reflowSlide()` / `reflowDeck()` adjusts text element Y-positions based on measured heights to eliminate overlaps
- **data-* SVG attributes**: bridge DSL metadata to the Python PPTX converter via `data-maliang-deck-id`, `data-text-role`, `data-box-*`, `data-wrap-mode`

The SVG renderer wraps multi-line text in `<g data-*>` groups. The Python PPTX converter intercepts these groups and uses the data attributes for precise text box sizing instead of heuristic estimation.

### Opt-in pptxgenjs PPTX engine (ADR)

**Decision:** Add a JavaScript PPTX engine backed by `pptxgenjs` for native chart/table output, but keep the Python/DrawingML PPTX path as the default for v1. Selection is explicit through `pptxEngine: 'pptxgenjs'` / `exportDeckAsync()` in the package API and the CLI `--pptx-engine pptxgenjs` option.

**Context:** A comparative study (April 2025) transcribed a pptxgenjs presentation into maliang-deck DSL and exported via both pipelines. pptxgenjs produces native PowerPoint charts and tables — capabilities the DrawingML converter cannot provide from unknown DSL elements. The approved v1 plan is not a PPTX merge pipeline; it is an opt-in JavaScript engine with a bounded support slice.

**Drivers:**
1. pptxgenjs gives native `<c:chartSpace>` and table objects editable in PowerPoint
2. The existing Python DrawingML converter remains the safest default for legacy shape-heavy decks
3. Chart/table decks must either render visibly or fail fast; unsupported elements must not be silently dropped
4. Explicit JS failures must stay explicit and must not automatically fall back to Python/DrawingML

**Plan:**
1. Extend the DSL schema with `chart` and `table` element types
2. Add `@maliang-deck/exporter-pptxgenjs` as a Node.js PPTX backend
3. Route `format: 'pptx', pptxEngine: 'pptxgenjs'` to the JS engine
4. Keep omitted or `drawingml` PPTX exports on the Python/DrawingML bridge
5. Keep default DrawingML/Python PPTX fail-fast for chart/table decks, including nested group contents
6. Render chart/table decks in HTML/SVG/PDF through basic static primitives with explicit warnings/degradation for unsupported options
7. Retire the Python DrawingML converter only after the JS exporter reaches a separately verified parity milestone

**Consequences:**
- The v1 JS exporter should document unsupported non-parity areas through warnings/errors rather than claiming full DrawingML parity
- Tests must prove schema validation, routing, DrawingML fail-fast behavior, PDF/SVG warning mapping, no-auto-fallback behavior, table normalization, chart mapping, and a smoke PPTX write
- The Python bridges remain required for default PPTX and PDF export

See `docs/PPTXGENJS-EXPORT.md` for the operator-facing contract and verification checklist.

### Images base64-encoded at SVG render time
External image URLs are resolved and base64-encoded when the SVG renderer runs. This makes SVG output self-contained — no external asset references that could break in PPTX or offline contexts.

### Why a DSL at all?
Three concrete benefits drove the JSON DSL approach:

1. **Static analysis of animations** — with a DSL, the animation graph is inspectable before rendering. You can detect conflicts, validate timing, and generate both CSS keyframes and PPTX animation XML from the same source.

2. **Multi-target rendering** — the same DSL document renders to HTML (interactive), SVG (vector), and PPTX (editable) without any format-specific logic leaking into the document itself.

3. **AI agent constraint space** — LLM-generated slide content is validated by Zod before reaching any renderer. This bounds the output space and prevents malformed content from causing partial renders or silent data loss.

---

## Repository Structure

```
maliang-deck/
├── packages/
│   ├── schema/          # JSON DSL types + Zod validation
│   │   └── src/
│   │       ├── schema.ts      # Zod validators
│   │       └── types.ts       # TypeScript types (Slide, Element, ...)
│   ├── text-measure/    # fontkit measurement, layout, reflow
│   │   ├── src/
│   │   │   ├── font-registry.ts     # Font resolution with precedence chain
│   │   │   ├── fontkit-measurer.ts  # OpenType glyph measurement
│   │   │   ├── heuristic-measurer.ts # Calibrated fallback heuristic
│   │   │   ├── layout.ts           # Word wrapping and line layout
│   │   │   ├── reflow.ts           # DSL element Y-position adjustment
│   │   │   └── types.ts
│   │   └── assets/                  # Bundled font files (Inter, Noto Serif, JetBrains Mono)
│   ├── renderer-svg/    # DSL → SVG string renderer
│   │   └── src/
│   │       └── index.ts
│   ├── renderer-html/   # DSL → HTML string renderer
│   │   └── src/
│   │       └── index.ts
│   ├── exporter/        # DSL/SVG → PDF/PPTX export orchestration
│   │   └── src/
│   │       ├── export-deck.ts
│   │       ├── export-report.ts
│   │       └── pptx-animation.ts
│   ├── exporter-pptxgenjs/ # opt-in JS PPTX engine for native charts/tables
│   │   └── src/
│   │       ├── export-deck.ts
│   │       ├── geometry.ts
│   │       ├── table.ts
│   │       └── types.ts
│   ├── workflow/        # MinerU/project workflow artifacts and gates
│   │   └── src/
│   │       ├── mineru-client.ts
│   │       ├── extraction.ts
│   │       ├── normalize.ts
│   │       ├── outline.ts
│   │       ├── deck-plan.ts
│   │       ├── dsl-generation.ts
│   │       ├── assemble.ts
│   │       ├── build.ts
│   │       └── run.ts
│   └── cli/             # serve / export / validate commands
│       └── src/
│           └── index.ts
├── python/
│   ├── maliang_deck_export.py        # CLI entry: receives SVG, outputs PPTX
│   ├── maliang_deck_export_pdf.py    # SVG slides to PDF
│   ├── svg_to_pptx/             # DrawingML conversion engine
│   └── svg_finalize/            # SVG pre-processing utilities
├── runtime/
│   ├── runtime.js               # Browser runtime (nav, presenter, themes, viewport scaling, contrast UI)
│   ├── fx-runtime.js            # Canvas FX dispatcher
│   ├── timeline.js              # Unified animation timeline engine (WAAPI + cooperative hook)
│   ├── animations.css           # prefers-reduced-motion fallback + no-JS fallback
│   └── fx/                      # 20 canvas FX modules
├── assets/
│   └── themes/                  # 36 CSS theme files
├── examples/
│   ├── demo.json                # 4-slide demo (Phase 1)
│   └── animation-demo.json      # 5-slide animation demo (Phase 2)
├── docs/                        # Project documentation
├── tsconfig.base.json
├── pnpm-workspace.yaml
└── package.json
```

---

## How to Add a New Element Type

1. **Add to schema** (`packages/schema/src/types.ts` and `schema.ts`):
   - Define a new `interface MyElement extends BaseElement` with discriminant `type: 'my-element'`
   - Add a Zod schema `myElementSchema` and include it in the `slotElementSchema` union
   - Add `MyElement` to the `Element` union type

2. **Add to SVG renderer** (`packages/renderer-svg/src/index.ts`):
   - Add a `case 'my-element':` branch in the element dispatch function
   - Return a valid SVG string. Follow the ppt-master SVG compliance rules below.

3. **Add to HTML renderer** (`packages/renderer-html/src/index.ts`):
   - Add a `case 'my-element':` branch in the element dispatch function
   - Return an HTML string with inline styles for position/size
   - Position using `position: absolute; left: {x}px; top: {y}px`

4. **Test the new element**:
   - Add an instance to `examples/demo.json`
   - Run `maliang-deck validate examples/demo.json` to confirm schema acceptance
   - Run `maliang-deck serve examples/demo.json` and verify HTML render
   - Run `maliang-deck export examples/demo.json` and open the PPTX

---

## SVG Compliance Rules (from shared-standards.md)

The SVG renderer must produce SVG that the `svg_to_pptx` DrawingML converter can process. Key rules:

- **Coordinate system**: all coordinates in pixels at 96dpi; slide dimensions 1280×720px
- **No `<use>` elements**: inline all referenced symbols; `<use>` is not supported by the converter
- **No external references**: images must be `data:` URIs (base64); no `href` to external files
- **Text in `<text>` elements**: do not use `<foreignObject>` for text; use SVG `<text>` with `<tspan>` children
- **No CSS classes for geometry**: use inline `style` or direct SVG attributes (`fill`, `stroke`, `stroke-width`); CSS classes are stripped during conversion
- **Explicit `font-size`**: always set `font-size` on text elements; do not rely on SVG/CSS inheritance
- **`transform` on groups**: group transforms are supported; avoid nested transforms on leaf elements
- **No `filter` elements in export path**: CSS/SVG filters are HTML-only and will be ignored in PPTX

---

## CLI Usage

```bash
# Install dependencies
pnpm install

# Build CLI before using the repo-root node examples below
pnpm -r build

# Validate a DSL file
node packages/cli/dist/index.js validate examples/demo.json

# Serve a presentation in the browser (default port 3000)
node packages/cli/dist/index.js serve examples/demo.json

# Export to PPTX
node packages/cli/dist/index.js export examples/demo.json out.pptx

# Export to PDF
node packages/cli/dist/index.js export examples/demo.json out.pdf

# Create a workflow project and gates
node packages/cli/dist/index.js workflow init my-paper --sources paper.pdf
node packages/cli/dist/index.js workflow extract projects/my-paper
node packages/cli/dist/index.js workflow normalize projects/my-paper
node packages/cli/dist/index.js workflow outline projects/my-paper --mode agent
node packages/cli/dist/index.js workflow approve-outline projects/my-paper
node packages/cli/dist/index.js workflow plan-deck projects/my-paper --validate-only
node packages/cli/dist/index.js workflow generate-dsl projects/my-paper --mode agent --parallel
node packages/cli/dist/index.js workflow assemble projects/my-paper
node packages/cli/dist/index.js workflow build projects/my-paper --formats html,pdf,pptx

# Build all packages
pnpm -r build

# Typecheck all packages
pnpm -r typecheck
```

### Python bridge (direct)

```bash
# Prefer the CLI/exporter service for normal use.
node packages/cli/dist/index.js export examples/demo.json out.pptx
node packages/cli/dist/index.js export examples/demo.json out.pdf
```
