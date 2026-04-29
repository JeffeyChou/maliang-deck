# Maliang Deck Status and Roadmap

## Current State

Maliang Deck has a working end-to-end pipeline from JSON DSL to interactive HTML, SVG/PDF, and editable PPTX. The architecture remains DSL-first: renderers and exporters consume validated deck DSL, while workflow and authoring helpers produce or transform that DSL.

Implemented packages and subsystems:

| Area | Status |
| --- | --- |
| `@maliang-deck/schema` | Deck DSL, Zod validation, chart/table/group/layout/customHtml elements, typed ChartStyle/TableStyle, animation metadata, HTML runtime config. |
| `@maliang-deck/text-measure` | Fontkit measurement, bundled fonts, CJK break opportunities, text wrapping, and DSL reflow helpers. |
| `@maliang-deck/renderer-html` | Interactive HTML presentation with notes, themes, layout preview, theme-aware chart/table rendering, customHtml elements, animations, FX, runtime extensions, laser pointer, whiteboard, presenter mode, and slide transitions. |
| `@maliang-deck/renderer-svg` | Static SVG renderer for PDF/PPTX export with wrapped text, layout resolution, chart/table primitives, diagnostics, and PPTX bridge metadata. |
| `@maliang-deck/exporter` | Shared PDF/PPTX/HTML orchestration, export reports, and PPTX animation-plan capability reporting. HTML export produces a self-contained folder (readonly or editable) with patched FX list and selected theme only. |
| `@maliang-deck/workflow` | Project scaffolding, requirements, extraction, normalization, outline/deck-plan/DSL gates, assembly, build orchestration, template extraction, and guidance enrichment. |
| `@maliang-deck/cli` | `serve`, `export`, `validate`, `workflow ...`, and `template ...` commands. |
| Python bridges | Isolated SVG-to-PDF and SVG-to-DrawingML PPTX conversion. |
| Runtime/assets | 37 themes (incl. chart/table base), 20 canvas FX modules, unified timeline engine, Three.js math visualization, GIF-to-ASCII playback, presenter tools, and responsive slide scaling. |

## Completed Milestones

- Phase 1 MVP: schema, renderers, CLI, DrawingML PPTX, runtime, themes, demo deck.
- Phase 2 animation layer: DSL animation descriptors, Web Animations API timeline, click steps, presenter step forwarding, FX, reduced-motion handling, and static-export degradation.
- Phase 3 workflow slice: project artifacts, MinerU/Docling extraction paths, normalization, gated outline/deck-plan/slide DSL authoring, reusable exporter, and cuSZp workflow deck.
- Phase 3 text/export slice: fontkit text measurement, font registry precedence, wrapped SVG text, PPTX text sizing bridge, and reflow utilities.
- Phase 3 chart/table slice: chart/table schema, HTML/SVG/PDF static rendering, and DrawingML native chart/table metadata export.
- Phase 3 template slice: deterministic PPTX/HTML/PDF/PNG draft template packs, coverage reports, sample generation, template registry behavior, and CLI.
- Phase 3 layout slice: deterministic pixel-only `layout` element, resolver, HTML/SVG/PDF/PPTX support, and layout diagnostics.
- Phase 3 chart/table theming: theme-aware CSS variable defaults, typed `ChartStyle`/`TableStyle` DSL fields with hex-validated Zod schemas, `customHtml` escape hatch element, 3 new lint rules (chart-theme-coherence, table-header-contrast, customHtml-usage), and guidance system integration.
- HTML export: `maliang-deck export deck.json ./out/ --format html [--html-mode editable|readonly]` produces a self-contained folder. Readonly strips editor (E key disabled). Editable bundles `deck.json` + `serve.js` (node serve.js for server-backed editing) and embeds deck source for client-side download-save when opened as a static file. Only the deck's selected theme and referenced FX modules are included.
- Morph system: shape morphing (rect/circle/ellipse `morphSteps`), component morphing (group/layout with per-child targeting and stagger), morph slide transition (FLIP + CSS property interpolation with group matching scope rules), shared morph engine, reduced-motion support, presenter sync, and SVG/PDF export safety diagnostics.
- Interactive 3D plot polish: Three.js graph surfaces now have local orbit controls for drag-to-rotate and wheel zoom, correct horizontal drag direction, event isolation from deck navigation, and camera keyframe protection after user interaction.
- GIF-to-ASCII extension: browser-side GIF frame extraction, disposal-aware compositing, black/white ink thresholding, glyph-density rendering through Three.js projection, and reusable `data-gif-ascii` authoring for terminal-style animated media.
- CLI preview networking: `serve` listens on `127.0.0.1` by default, prints both `127.0.0.1` and `localhost` hints, and accepts `--host 0.0.0.0` for WSL/container/LAN forwarding cases.

## Verification Snapshot

- `pnpm lint`
- `pnpm -r build` (schema package; text-measure requires dist/ fallback)
- `pnpm -r typecheck`
- `npx vitest run` — 196/196 tests pass across 27 test files
- live MinerU smoke gated by `MINERU_LIVE=1` / `MINERU_API_TOKEN`

## Useful Entry Points

- [Architecture](./ARCHITECTURE.md)
- [Workflow](./WORKFLOW.md)
- [Authoring](./AUTHORING.md)
- [Configuration](./CONFIGURATION.md)
- [Template Extraction](./TEMPLATE-EXTRACTION.md)
- [Animation and Runtime Extensions](../assets/ANIMATIONS.md)
