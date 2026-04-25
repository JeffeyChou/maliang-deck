# @maliang-deck/exporter-pptxgenjs

Opt-in JavaScript PPTX exporter for Maliang Deck decks.

This package uses [`pptxgenjs`](https://gitbrent.github.io/PptxGenJS/) to write native PowerPoint objects. Its v1 purpose is native, editable `chart` and `table` DSL elements. It is **not** the default PPTX exporter yet; `@maliang-deck/exporter` still defaults to the Python/DrawingML path for legacy decks.

## When to use it

Use this engine when a deck contains `ChartElement` or `TableElement` and the output must be editable in PowerPoint:

```bash
maliang-deck export deck.json deck.pptx --pptx-engine pptxgenjs
```

Programmatic entry point through `@maliang-deck/exporter`:

```ts
import { exportDeckAsync } from '@maliang-deck/exporter';

await exportDeckAsync({
  deckPath: 'deck.json',
  outputPath: 'deck.pptx',
  format: 'pptx',
  pptxEngine: 'pptxgenjs',
});
```

Direct package entry point:

```ts
import { exportDeckWithPptxGenJs } from '@maliang-deck/exporter-pptxgenjs';

await exportDeckWithPptxGenJs({
  deck,
  outputPath: '/tmp/deck.pptx',
  basePath: process.cwd(),
});
```

## v1 supported slice

- Native charts via `slide.addChart()`
  - chart types: `bar`, `line`, `pie`, `doughnut`
- Native tables via `slide.addTable()`
  - primitive cells
  - `{ text, options }` cells
  - `null` cells normalized to empty strings
- Basic text/shape/image rendering where supported
- speaker notes and slide backgrounds where possible

Unsupported/non-parity areas should be reported through warnings or errors. Do not treat this package as a full DrawingML replacement yet.

## Default and fail-fast behavior

`@maliang-deck/exporter` enforces the engine boundary:

- no `pptxEngine` option → Python/DrawingML PPTX path
- `pptxEngine: 'drawingml'` → Python/DrawingML PPTX path
- `pptxEngine: 'pptxgenjs'` → this JS package

Chart/table decks fail fast on the default DrawingML/Python PPTX path, including when chart/table elements are nested inside `group.elements`. If the JS engine fails after being explicitly selected, the exporter returns the JS error and does **not** automatically fall back to Python.

PDF export is separate from PPTX engine selection: chart/table decks render to PDF through the static SVG chart/table renderer. Use `pptxEngine: 'pptxgenjs'` when the PowerPoint output itself must contain native editable chart/table objects.

## Verification

Useful focused checks:

```bash
pnpm exec vitest run tests/schema/chart-table.test.ts \
  tests/exporter/chart-table-unsupported-paths.test.ts \
  tests/exporter/drawingml-default.test.ts \
  tests/exporter/pptxgenjs-no-fallback.test.ts \
  tests/exporter/pptxgenjs-routing.test.ts \
  tests/exporter/exporter.test.ts

pnpm --filter @maliang-deck/exporter-pptxgenjs typecheck
pnpm --filter @maliang-deck/exporter-pptxgenjs build
pnpm -r typecheck
pnpm -r build
```

Manual smoke:

```bash
pnpm --filter @maliang-deck/cli dev export \
  "$PWD/tests/fixtures/exporter/chart-table-deck.json" \
  /tmp/chart-table-js.pptx \
  --pptx-engine pptxgenjs

test -s /tmp/chart-table-js.pptx
```
