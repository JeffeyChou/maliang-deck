# Opt-in pptxgenjs PPTX Export

Maliang Deck now includes a JavaScript PPTX engine backed by `pptxgenjs` so chart and table DSL elements can become native, editable PowerPoint objects. This path is **opt-in** in v1. The existing Python/DrawingML PPTX exporter remains the default.

## Implementation status

Implemented in v1:

- `ChartElement`, `TableElement`, and deterministic `LayoutElement` TypeScript/Zod schema support
- `@maliang-deck/exporter-pptxgenjs` package
- `@maliang-deck/exporter` engine routing via `pptxEngine`
- CLI `--pptx-engine <drawingml|pptxgenjs>` option
- fail-fast chart/table guards for the default DrawingML/Python PPTX path, including nested groups and layout containers
- static HTML/SVG/PDF chart/table rendering for non-native previews/exports
- no automatic Python fallback after explicit JS engine failure
- focused schema/exporter/routing tests and chart/table fixture

## Engine contract

| Request | Expected engine | Notes |
| --- | --- | --- |
| `exportDeck({ format: 'pptx' })` | Python/DrawingML | Default for existing decks. |
| `exportDeck({ format: 'pptx', pptxEngine: 'drawingml' })` | Python/DrawingML | Explicit legacy path. |
| `exportDeck({ format: 'pptx', pptxEngine: 'pptxgenjs' })` | JS `pptxgenjs` | Required for native chart/table export. |
| `exportDeck({ format: 'pdf' })` | SVG render + Python PDF bridge | Chart/table decks render through the static SVG chart/table renderer. |

The CLI exposes the same switch:

```bash
maliang-deck export deck.json deck.pptx --pptx-engine pptxgenjs
```

Omitting the option keeps using the current DrawingML/Python path.

Package API usage:

```ts
import { exportDeckAsync } from '@maliang-deck/exporter';

await exportDeckAsync({
  deckPath: 'deck.json',
  outputPath: 'deck.pptx',
  format: 'pptx',
  pptxEngine: 'pptxgenjs',
});
```

Use `exportDeck()`/`exportDeckAsync()` without `pptxEngine`, or with `pptxEngine: 'drawingml'`, to preserve the existing Python/DrawingML PPTX path.

## Chart/table DSL slice

`ChartElement` v1 supports common chart types only: `bar`, `line`, `pie`, and `doughnut`.

```json
{
  "type": "chart",
  "id": "revenue-chart",
  "x": 80,
  "y": 150,
  "width": 520,
  "height": 360,
  "chartType": "bar",
  "data": [
    { "name": "Revenue", "labels": ["Q1", "Q2"], "values": [12, 18] }
  ],
  "options": { "showLegend": true }
}
```

`TableElement` v1 accepts primitive cells and simple object cells. `null` cells normalize to empty strings in the JS exporter.

```json
{
  "type": "table",
  "id": "summary-table",
  "x": 650,
  "y": 150,
  "width": 520,
  "rows": [
    [{ "text": "Metric", "options": { "bold": true } }, "Value"],
    ["Revenue", 32],
    ["Notes", null]
  ]
}
```

## Non-drop and fail-fast rules

Chart/table elements must not be silently dropped by non-JS export paths.

- Default PPTX / `pptxEngine: 'drawingml'` must fail fast for chart/table decks.
- PDF export is allowed after SVG chart/table rendering and must carry any SVG degradation warnings as `svg-*` export warnings.
- Default-PPTX detection must recurse through `group.elements` and `layout.elements`.
- Explicit JS failures must return a JS-engine error and must not automatically fall back to Python/DrawingML.

## v1 limitations

The JS engine is not a full DrawingML replacement yet. It targets a bounded smoke slice: text, basic shapes/images where supported, deterministic layout resolution, speaker notes/backgrounds where possible, and native chart/table mappings. Unsupported elements should return warnings or errors; docs and tests must not claim full visual parity with the Python bridge.

Layout containers are resolved before child rendering. Supported primitive/chart/table children render through their existing pptxgenjs paths. Layout-level `rotation`, `opacity`, and `overflow: "clip"` are not preserved by the v1 JS exporter and emit explicit `pptxgenjs.layout.*-unsupported` warnings instead of being silently ignored.

The non-native HTML/SVG/PDF chart/table renderers are intentionally static/basic:

- tables render primitive and `{ text, options }` cells with escaped text and stable ragged rows
- bar and line charts render all series with deterministic visual primitives
- pie and doughnut charts render the first series; additional series and unsupported options are warnings/degradations, not full parity
- all-zero or invalid pie/doughnut data produces visible fallback text instead of invalid arcs
- native, editable PowerPoint chart/table objects still require `pptxEngine: 'pptxgenjs'`

## Verification checklist

- `pnpm exec vitest run tests/schema/chart-table.test.ts`
- `pnpm exec vitest run tests/exporter/drawingml-default.test.ts tests/exporter/pptxgenjs-no-fallback.test.ts tests/exporter/pptxgenjs-routing.test.ts tests/exporter/layout.test.ts`
- `pnpm --filter @maliang-deck/exporter-pptxgenjs typecheck`
- `pnpm --filter @maliang-deck/exporter typecheck`
- `pnpm --filter @maliang-deck/cli typecheck`
- `pnpm -r build`

Manual smoke:

```bash
pnpm --filter @maliang-deck/cli dev export \
  "$PWD/tests/fixtures/exporter/chart-table-deck.json" \
  /tmp/chart-table-js.pptx \
  --pptx-engine pptxgenjs
test -s /tmp/chart-table-js.pptx
```


## Verified commands

Current implementation verification:

```bash
pnpm exec vitest run tests/schema/chart-table.test.ts \
  tests/exporter/chart-table-unsupported-paths.test.ts \
  tests/exporter/chart-table-pdf.test.ts \
  tests/exporter/drawingml-default.test.ts \
  tests/exporter/pptxgenjs-no-fallback.test.ts \
  tests/exporter/pptxgenjs-routing.test.ts tests/exporter/layout.test.ts \
  tests/exporter/exporter.test.ts \
  tests/renderer-html/chart-table.test.ts \
  tests/renderer-svg/chart-table.test.ts

pnpm -r typecheck
pnpm -r build
pnpm lint
```

The focused chart/table renderer/export checks, `pnpm lint`, `pnpm -r build`, and `pnpm -r typecheck` pass. Full `pnpm test` still requires the local ignored `projects/cuszp/dsl/deck.json` fixture for text-measure debug/visual tests.
