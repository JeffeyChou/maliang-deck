# Maliang Deck Architecture

## Core Principle

Maliang Deck uses a JSON scene graph DSL as the single source of truth. Every deck validates against `@maliang-deck/schema`; renderers and exporters consume only validated DSL, not each other's output. HTML can provide richer live presentation behavior, but static PDF/PPTX export must remain predictable from the DSL.

```text
Deck DSL
  -> schema validation
  -> HTML renderer + runtime
  -> SVG renderer -> PDF bridge
  -> SVG renderer -> DrawingML PPTX bridge
```

## Package Boundaries

| Package | Responsibility |
| --- | --- |
| `@maliang-deck/schema` | Public DSL types, Zod validation, layout resolver, diagnostics. |
| `@maliang-deck/text-measure` | Fontkit metrics, wrapping, CJK breaks, font registry, reflow helpers. |
| `@maliang-deck/renderer-html` | DSL to interactive browser presentation. |
| `@maliang-deck/renderer-svg` | DSL to exportable SVG with text/layout/chart/table diagnostics. |
| `@maliang-deck/exporter` | HTML/PDF/PPTX orchestration, reports, and animation plans. |
| `@maliang-deck/workflow` | Project artifacts, extraction, normalization, gates, templates, guidance. |
| `@maliang-deck/cli` | Command surface over schema, renderers, exporter, and workflow. |

Python is isolated to conversion bridges:

- `python/maliang_deck_export_pdf.py`: SVG slides to PDF.
- `python/maliang_deck_export.py`: SVG slides to editable DrawingML PPTX through `svg_to_pptx`.

Python does not own DSL parsing, workflow state, extraction, or file discovery.

## Render and Export Paths

HTML rendering emits DOM, CSS variables, `data-anim-*` attributes, slide FX containers, notes, and runtime metadata. The runtime handles navigation, presenter mode, timeline steps, transitions, laser pointer, whiteboard, themes, and scaling. CSS themes are HTML-only polish; workflow style alignment is driven by the `deckDesign` contract and DSL-native colors, fonts, spacing, and assets.

SVG rendering emits deterministic static geometry. It wraps text with `@maliang-deck/text-measure`, resolves layouts, renders chart/table/formula/graph final frames, and attaches `data-*` metadata used by the DrawingML bridge for native text, table, chart, formula, image, and animation targets.

PDF export is SVG-based. PPTX export is SVG-to-DrawingML through the Python bridge. Chart/table elements are carried through SVG metadata so the bridge can emit native PPTX table graphic frames and chart parts.

Workflow build copies referenced image assets into `render/assets/materials/` and generates target-specific deck views with portable relative paths. The canonical `dsl/deck.json` remains the source DSL artifact.

## Workflow Artifacts

Workflow projects are persistent filesystem artifacts:

```text
projects/<slug>/
  project.json
  requirements.md
  extraction/
    mineru/
      tasks.json
      raw/m1/source.md
      raw/m1/artifacts/
    docling/
      tasks.json
      raw/m1/source.md
      raw/m1/artifacts/
    normalized/
      materials.json
      blocks.json
      assets.json
  planning/
    tasks.json
    outline-draft.md
    outline-approved.md
    deck-plan.json
  dsl/
    tasks.json
    slides/
    deck.json
  render/html/index.html
  exports/
    deck.pdf
    deck.pptx
    export-report.json
    pptx-animation-plan.json
```

Gates are explicit: extract/normalize source material, draft and approve outline, validate deck plan, author slide DSL, assemble, then build exports. Content generation is manual or agent-authored through artifacts; there is no hidden provider mode.

## Chart, Table, and Custom HTML

Charts and tables support typed `style` fields (`ChartStyle`, `TableStyle`) with hex-validated colors that work across all renderers. The HTML renderer also reads theme CSS variables (`--chart-*`, `--table-*`) defined in `_chart-table-base.css`, which derive from core theme variables. Color resolution is renderer-specific:

- HTML: explicit `style` (hex) → theme CSS vars → hardcoded defaults
- SVG/PDF: explicit `style` (hex) → hardcoded defaults (no CSS context)
- DrawingML PPTX: SVG metadata `style`/DSL payload → native chart/table/formula objects where supported

`customHtml` is an HTML-only escape hatch for arbitrary visualizations. SVG/PDF/PPTX exporters use the `fallbackImage` field or show a placeholder. The HTML renderer strips `<script>`, `<iframe>`, `<object>`, `<embed>`, and inline event handlers. The `customHtml-usage` lint rule flags these elements for review.

## HTML Runtime Extensions

HTML-only extensions live under `assets/extensions/` and are loaded by the HTML
renderer after the core runtime. They enhance slides in the browser without
changing the static export contract:

| Extension | Purpose | Authoring surface |
| --- | --- | --- |
| `text-anim/` | Text splitting and per-character effects. | DSL animation/text metadata. |
| `shape-morph/` | Shape and group/layout morph steps. | DSL `morphSteps`. |
| `math-viz/` | Three.js graphs/models, including interactive 3D plots. | Graph/model elements and `customHtml`. |
| `gif-ascii/` | Browser GIF decoder plus Three.js-backed ASCII playback. | `customHtml` with `data-gif-ascii`. |

Extensions must treat HTML as presentation output, not authoring truth. If a
visual is needed in PDF/PPTX, provide a static DSL equivalent or `fallbackImage`.
Interactive modules should stop pointer/wheel propagation when they own input so
deck navigation does not conflict with local controls.

## Authoring Model

The implemented authoring direction is DSL-first hybrid:

- `layout` elements provide deterministic pixel-only grid/flex containers.
- Component/macro authoring is planned as a compile-time layer that expands into ordinary DSL.
- Renderers stay macro-unaware.
- `customHtml` elements are an explicit escape hatch for HTML-only content, not authoring truth.

See [Authoring](./AUTHORING.md).

## Template Extraction Boundary

Template extraction is a workflow subsystem. Adapters read reference PPTX, HTML, PDF, or PNG files and produce draft `TemplatePack` artifacts with provenance and coverage evidence. Approved packs compile into existing style/guidance surfaces. Renderers and exporters remain template-unaware.

See [Template Extraction](./TEMPLATE-EXTRACTION.md).

## Extraction Providers

MinerU is the default precision provider. The live path uses token-redacted upload URLs, PUT upload, polling, ZIP download/unpack, and `MINERU_API_TOKEN` from environment/local `.env`; token values are never persisted.

Docling is an optional local PDF provider invoked as an external CLI. It stays outside the npm dependency graph and writes isolated artifacts under `extraction/docling/`. True air-gapped use requires pre-downloaded model artifacts via `--artifacts-path`.

## Runtime and Animation Boundary

Element animations use DSL descriptors and Web Animations API keyframes in `runtime/timeline.js`. Slide FX are separate canvas modules registered under `window.HPX`. Slide transitions live under `meta.htmlRuntime.transition` and are HTML-only. Shape and component morphing extensions (`assets/extensions/shape-morph/`) animate rect/circle/ellipse/group/layout elements through DSL-declared `morphSteps`. Three.js visualization extensions provide interactive graph/model rendering, and the GIF-to-ASCII extension provides browser-side animated ASCII filters for `customHtml`. The `morph` slide transition matches elements across slides by ID with FLIP + CSS property interpolation; group matching scope rules prevent double-animation of nested elements. SVG/PDF/PPTX exporters preserve the static final deck and ignore runtime-only presentation polish, emitting diagnostics when morph fields are present.

## DrawingML PPTX Summary

PPTX export has one backend: SVG metadata plus the Python DrawingML bridge. The bridge preserves stable DSL element IDs into shape IDs for animation timing, emits native `a:tbl` table frames, creates chart parts and slide relationships for bar/line/pie/doughnut charts, and emits OfficeMath-marked formula text with SVG-style fallback data when full MathML lowering is not available.
