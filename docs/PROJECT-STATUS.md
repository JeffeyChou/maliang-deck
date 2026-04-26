# Maliang Deck Status and Roadmap

## Current State

Maliang Deck has a working end-to-end pipeline from JSON DSL to interactive HTML, SVG/PDF, and editable PPTX. The architecture remains DSL-first: renderers and exporters consume validated deck DSL, while workflow and authoring helpers produce or transform that DSL.

Implemented packages and subsystems:

| Area | Status |
| --- | --- |
| `@maliang-deck/schema` | Deck DSL, Zod validation, chart/table/group/layout/customHtml elements, typed ChartStyle/TableStyle, animation metadata, HTML runtime config. |
| `@maliang-deck/text-measure` | Fontkit measurement, bundled fonts, CJK break opportunities, text wrapping, and DSL reflow helpers. |
| `@maliang-deck/renderer-html` | Interactive HTML presentation with notes, themes, layout preview, theme-aware chart/table rendering, customHtml elements, animations, FX, laser pointer, whiteboard, presenter mode, and slide transitions. |
| `@maliang-deck/renderer-svg` | Static SVG renderer for PDF/PPTX export with wrapped text, layout resolution, chart/table primitives, diagnostics, and PPTX bridge metadata. |
| `@maliang-deck/exporter` | Shared PDF/PPTX/HTML orchestration, engine routing, export reports, and PPTX animation-plan capability reporting. HTML export produces a self-contained folder (readonly or editable) with patched FX list and selected theme only. |
| `@maliang-deck/exporter-pptxgenjs` | Opt-in JavaScript PPTX backend for native chart/table output and resolved layout contents. |
| `@maliang-deck/workflow` | Project scaffolding, requirements, extraction, normalization, outline/deck-plan/DSL gates, assembly, build orchestration, template extraction, and guidance enrichment. |
| `@maliang-deck/cli` | `serve`, `export`, `validate`, `workflow ...`, and `template ...` commands. |
| Python bridges | Isolated SVG-to-PDF and SVG-to-DrawingML PPTX conversion. |
| Runtime/assets | 37 themes (incl. chart/table base), 20 canvas FX modules, unified timeline engine, presenter tools, and responsive slide scaling. |

## Completed Milestones

- Phase 1 MVP: schema, renderers, CLI, DrawingML PPTX, runtime, themes, demo deck.
- Phase 2 animation layer: DSL animation descriptors, Web Animations API timeline, click steps, presenter step forwarding, FX, reduced-motion handling, and static-export degradation.
- Phase 3 workflow slice: project artifacts, MinerU/Docling extraction paths, normalization, gated outline/deck-plan/slide DSL authoring, reusable exporter, and cuSZp workflow deck.
- Phase 3 text/export slice: fontkit text measurement, font registry precedence, wrapped SVG text, PPTX text sizing bridge, and reflow utilities.
- Phase 3 chart/table slice: chart/table schema, HTML/SVG/PDF static rendering, DrawingML fail-fast guards, and opt-in `pptxgenjs` native chart/table export.
- Phase 3 template slice: deterministic PPTX/HTML/PDF/PNG draft template packs, coverage reports, sample generation, template registry behavior, and CLI.
- Phase 3 layout slice: deterministic pixel-only `layout` element, resolver, HTML/SVG/PDF/pptxgenjs support, and layout diagnostics.
- Phase 3 chart/table theming: theme-aware CSS variable defaults, typed `ChartStyle`/`TableStyle` DSL fields with hex-validated Zod schemas, `customHtml` escape hatch element, pptxgenjs style mapping, 3 new lint rules (chart-theme-coherence, table-header-contrast, customHtml-usage), and guidance system integration.
- HTML export: `maliang-deck export deck.json ./out/ --format html [--html-mode editable|readonly]` produces a self-contained folder. Readonly strips editor (E key disabled). Editable bundles `deck.json` + `serve.js` (node serve.js for server-backed editing) and embeds deck source for client-side download-save when opened as a static file. Only the deck's selected theme and referenced FX modules are included.

## Verification Snapshot

Known passing verification from the current implementation history:

- `pnpm lint`
- `pnpm -r build`
- `pnpm -r typecheck`
- focused schema, workflow, renderer, exporter, template, chart/table, layout, and CLI smoke tests
- live MinerU smoke gated by `MINERU_LIVE=1` / `MINERU_API_TOKEN`
- local Docling smoke on the cuSZp-HPC PDF path

Known full-suite gap: `pnpm test` requires ignored local `projects/cuszp/dsl/deck.json` for three text-measure/cuSZp tests. Focused suites remain the preferred verification unless that fixture is present.

## Near-Term Roadmap

- Component/macro authoring: compile-time `metric-card`, `two-column`, `feature-grid`, and `timeline` components that expand into validated DSL/layout elements.
- Template pack approval UX: first-class command/policy for promoting draft packs into generation-safe packs.
- Workflow polish: `.env.example`, project status command, stronger token-redaction tests, and manual QA checklist.
- Runtime transition hardening: keep `meta.htmlRuntime.transition` HTML-only and add browser visual regression after a harness decision.
- Font/rich-text expansion: add italic/weight coverage only when rich text run support requires it.

## Medium-Term Roadmap

- Layout presets for cover, title-body, comparison, stat cards, pipeline diagrams, section dividers, and report pages.
- Approved academic, technical, consulting, and report template packs.
- Rich text runs mapped to SVG `<tspan>` and PPTX run properties.
- PowerPoint animation XML lowering beyond plan/capability reporting.
- Vite dev server with HMR.
- Automated visual regression across HTML/PDF/PPTX outputs.

## Longer-Term Roadmap

- Publishable global CLI with `npx maliang-deck`.
- Video export through browser capture plus ffmpeg.
- Plugin system for custom element types/renderers.
- Explicit provider-backed generation mode with privacy, credential, and cost controls.
- Optional hosted/collaborative platform work.

## Useful Entry Points

- [Architecture](./ARCHITECTURE.md)
- [Workflow](./WORKFLOW.md)
- [Authoring](./AUTHORING.md)
- [Configuration](./CONFIGURATION.md)
- [Template Extraction](./TEMPLATE-EXTRACTION.md)
- [pptxgenjs Export](./PPTXGENJS-EXPORT.md)
