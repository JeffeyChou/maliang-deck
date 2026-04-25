# pptxgenjs PPTX Export

Maliang Deck has two PPTX paths:

| Request | Engine |
| --- | --- |
| `format: "pptx"` or `pptxEngine: "drawingml"` | Default Python/DrawingML bridge. |
| `format: "pptx", pptxEngine: "pptxgenjs"` | Opt-in JavaScript `pptxgenjs` backend. |

Use `pptxgenjs` when native, editable PowerPoint charts or tables are required. Keep DrawingML as the default for existing shape-heavy decks.

## Contract

- Chart/table decks must not be silently dropped.
- Default DrawingML PPTX fails fast for chart/table elements, including nested `group` and `layout` contents.
- PDF export is allowed through static SVG chart/table rendering and should report degradation warnings.
- Explicit JS-engine failures return JS errors and do not fall back to Python.
- `pptxgenjs` layout rendering warns on unsupported layout-level rotation, opacity, or clipping.

## CLI and API

```bash
maliang-deck export deck.json deck.pptx --pptx-engine pptxgenjs
```

```ts
import { exportDeckAsync } from '@maliang-deck/exporter';

await exportDeckAsync({
  deckPath: 'deck.json',
  outputPath: 'deck.pptx',
  format: 'pptx',
  pptxEngine: 'pptxgenjs',
});
```

Omit `pptxEngine` or set `drawingml` to keep the legacy bridge.

## DSL Slice

`ChartElement` supports `bar`, `line`, `pie`, and `doughnut`.

```json
{
  "type": "chart",
  "id": "revenue-chart",
  "x": 80,
  "y": 150,
  "width": 520,
  "height": 360,
  "chartType": "bar",
  "data": [{ "name": "Revenue", "labels": ["Q1", "Q2"], "values": [12, 18] }]
}
```

`TableElement` accepts primitive cells and simple `{ "text", "options" }` cells. `null` normalizes to an empty string in the JS exporter.

## Limitations

The JS engine is not a full DrawingML replacement. It targets text, basic supported shapes/images, layout contents, speaker notes/backgrounds where possible, and native chart/table mappings. Unsupported behavior must warn or fail explicitly.

Static HTML/SVG/PDF chart/table rendering is intentionally basic: tables render visible grids, bar/line charts render all series, pie/doughnut render the first series, unsupported options warn, and all-zero pie/doughnut data gets visible fallback text.

## Verification

Focused checks:

```bash
pnpm exec vitest run tests/schema/chart-table.test.ts \
  tests/exporter/chart-table-unsupported-paths.test.ts \
  tests/exporter/chart-table-pdf.test.ts \
  tests/exporter/drawingml-default.test.ts \
  tests/exporter/pptxgenjs-no-fallback.test.ts \
  tests/exporter/pptxgenjs-routing.test.ts \
  tests/exporter/layout.test.ts \
  tests/renderer-html/chart-table.test.ts \
  tests/renderer-svg/chart-table.test.ts

pnpm -r typecheck
pnpm -r build
pnpm lint
```

Manual smoke:

```bash
pnpm --filter @maliang-deck/cli dev export \
  "$PWD/tests/fixtures/exporter/chart-table-deck.json" \
  /tmp/chart-table-js.pptx \
  --pptx-engine pptxgenjs
test -s /tmp/chart-table-js.pptx
```
