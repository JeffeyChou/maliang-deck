# Maliang Deck Architecture

## Core Principle

Maliang Deck uses a JSON scene graph DSL as the single source of truth. Every deck validates against `@maliang-deck/schema`; renderers and exporters consume only validated DSL, not each other's output. HTML can provide richer live presentation behavior, but static PDF/PPTX export must remain predictable from the DSL.

```text
Deck DSL
  -> schema validation
  -> HTML renderer + runtime
  -> SVG renderer -> PDF bridge
  -> SVG renderer -> DrawingML PPTX bridge
  -> pptxgenjs engine when explicitly selected
```

## Package Boundaries

| Package | Responsibility |
| --- | --- |
| `@maliang-deck/schema` | Public DSL types, Zod validation, layout resolver, diagnostics. |
| `@maliang-deck/text-measure` | Fontkit metrics, wrapping, CJK breaks, font registry, reflow helpers. |
| `@maliang-deck/renderer-html` | DSL to interactive browser presentation. |
| `@maliang-deck/renderer-svg` | DSL to exportable SVG with text/layout/chart/table diagnostics. |
| `@maliang-deck/exporter` | PDF/PPTX orchestration, engine routing, reports, animation plans. |
| `@maliang-deck/exporter-pptxgenjs` | Opt-in JavaScript PPTX backend for native chart/table output. |
| `@maliang-deck/workflow` | Project artifacts, extraction, normalization, gates, templates, guidance. |
| `@maliang-deck/cli` | Command surface over schema, renderers, exporter, and workflow. |

Python is isolated to conversion bridges:

- `python/maliang_deck_export_pdf.py`: SVG slides to PDF.
- `python/maliang_deck_export.py`: SVG slides to editable DrawingML PPTX through `svg_to_pptx`.

Python does not own DSL parsing, workflow state, extraction, or file discovery.

## Render and Export Paths

HTML rendering emits DOM, CSS variables, `data-anim-*` attributes, slide FX containers, notes, and runtime metadata. The runtime handles navigation, presenter mode, timeline steps, transitions, laser pointer, whiteboard, themes, and scaling. CSS themes are HTML-only polish; workflow style alignment is driven by the `deckDesign` contract and DSL-native colors, fonts, spacing, and assets.

SVG rendering emits deterministic static geometry. It wraps text with `@maliang-deck/text-measure`, resolves layouts, renders chart/table primitives, and attaches `data-*` metadata used by the DrawingML bridge for text boxes.

PDF export is SVG-based. Default PPTX export is SVG-to-DrawingML. Native chart/table PPTX export requires the explicit `pptxgenjs` engine; default DrawingML fails fast for chart/table decks so content is not silently dropped.

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

## Authoring Model

The implemented authoring direction is DSL-first hybrid:

- `layout` elements provide deterministic pixel-only grid/flex containers.
- Component/macro authoring is planned as a compile-time layer that expands into ordinary DSL.
- Renderers stay macro-unaware.
- Raw HTML/CSS/JS is not accepted as authoring truth.

See [Authoring](./AUTHORING.md).

## Template Extraction Boundary

Template extraction is a workflow subsystem. Adapters read reference PPTX, HTML, PDF, or PNG files and produce draft `TemplatePack` artifacts with provenance and coverage evidence. Approved packs compile into existing style/guidance surfaces. Renderers and exporters remain template-unaware.

See [Template Extraction](./TEMPLATE-EXTRACTION.md).

## Extraction Providers

MinerU is the default precision provider. The live path uses token-redacted upload URLs, PUT upload, polling, ZIP download/unpack, and `MINERU_API_TOKEN` from environment/local `.env`; token values are never persisted.

Docling is an optional local PDF provider invoked as an external CLI. It stays outside the npm dependency graph and writes isolated artifacts under `extraction/docling/`. True air-gapped use requires pre-downloaded model artifacts via `--artifacts-path`.

## Runtime and Animation Boundary

Element animations use DSL descriptors and Web Animations API keyframes in `runtime/timeline.js`. Slide FX are separate canvas modules registered under `window.HPX`. Slide transitions live under `meta.htmlRuntime.transition` and are HTML-only. SVG/PDF/PPTX exporters preserve the static final deck and ignore runtime-only presentation polish.

## pptxgenjs ADR Summary

`pptxgenjs` is an opt-in PPTX backend for native chart/table output. The Python/DrawingML path remains the default for legacy shape-heavy decks. Explicit JS failures do not fall back to Python. Unsupported JS-engine behavior must warn or fail explicitly, especially for layout-level clip/rotation/opacity.

See [pptxgenjs Export](./PPTXGENJS-EXPORT.md).
