# DSL-First Hybrid Authoring

Maliang Deck's authoring direction is **DSL-first hybrid**, not HTML-first. The JSON DSL remains the export-aware source of truth. HTML is still the richest live-preview/runtime target, but PDF/PPTX behavior must be predictable from the DSL without reverse-engineering arbitrary DOM/CSS.

This document records the implemented Phase 1 layout contract and the next Phase 2 component/macro direction.

## Design goals

1. Keep normal decks validated by `@maliang-deck/schema` before any renderer/exporter runs.
2. Give agents higher-level layout primitives so they do not need to hand-place every element.
3. Preserve static export consistency across HTML preview, SVG/PDF, default DrawingML PPTX, and opt-in `pptxgenjs` PPTX.
4. Make degradation explicit through warnings/diagnostics; never silently omit content-bearing elements.
5. Gate more open-ended HTML/CSS features behind later, explicit RFCs.

## Implemented Phase 1: deterministic `layout` element

Phase 1 adds a recursive `layout` element to the normal deck DSL.

```ts
interface LayoutElement extends BaseElement {
  type: 'layout';
  width: number;
  height: number;
  layout: GridLayoutConfig | FlexLayoutConfig;
  elements: Element[];
  overflow?: 'clip' | 'visible' | 'warn';
}
```

Child elements may provide `placement` metadata. The original child `x/y` fields are retained for backward schema compatibility, but flow layout computes exported positions from the parent layout.

### Supported grid contract

```ts
interface GridLayoutConfig {
  mode: 'grid';
  columns: number[];      // positive pixel tracks
  rows?: number[];        // positive pixel tracks; omitted rows are derived deterministically
  gap?: number | { row?: number; column?: number };
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';
}
```

Grid placement is 0-based:

```ts
{
  placement: {
    column?: number;
    row?: number;
    columnSpan?: number;
    rowSpan?: number;
  }
}
```

Behavior:

- flow children auto-place in row-major order;
- explicit cells are reserved before auto-placement, so auto children do not overlap explicit children;
- explicit overlapping grid placements fail schema validation;
- spans affect resolved box size;
- Phase 1 is pixel-only: no `fr`, `%`, `auto`, min/max-content, grid areas, media queries, or browser computed-layout extraction.

### Supported flex contract

```ts
interface FlexLayoutConfig {
  mode: 'flex';
  direction?: 'row' | 'column';
  wrap?: boolean;
  gap?: number;
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between';
}
```

Flex placement may use a fixed pixel `basis`:

```ts
{ "placement": { "basis": 180 } }
```

Behavior:

- deterministic simplified packing, not full browser flexbox parity;
- no grow/shrink algorithm in Phase 1;
- wrapping is deterministic using fixed child sizes/basis;
- `justifyContent` is implemented in the resolver so SVG/PDF/PPTX match the HTML preview for supported cases.

### Absolute placement inside layout

Any child may opt out of flow placement:

```json
{
  "placement": { "mode": "absolute", "x": 20, "y": 12 }
}
```

Absolute placement is relative to the parent layout box. Negative offsets are allowed by schema and may trigger overflow diagnostics when `overflow: "warn"`.

## Renderer and export behavior

| Target | Behavior |
| --- | --- |
| HTML | Keeps layout containers and renders CSS Grid/Flex for live preview. Nested layouts remain nested DOM containers. |
| SVG | Uses the deterministic resolver and renders static exportable geometry. Layout containers are represented by SVG groups, with layout-level `rotation`, `opacity`, and `overflow: "clip"` preserved where supported. |
| PDF | Uses SVG output, so it inherits static layout resolution and SVG diagnostics. |
| Default PPTX / DrawingML | Uses SVG/Python path. Chart/table elements nested inside layout fail fast, just like top-level chart/table content. |
| Opt-in `pptxgenjs` | Resolves layout to native pptxgenjs elements where possible. Layout-level `rotation`, `opacity`, and `clip` that cannot be preserved emit explicit warnings instead of being silently ignored. |

Overflow semantics:

- `visible` or omitted: allow overflow without warning;
- `warn`: allow overflow and emit `layout-overflow` diagnostics;
- `clip`: HTML/SVG clip where supported; `pptxgenjs` emits an explicit unsupported warning for clipping.

## Example

```json
{
  "type": "layout",
  "id": "metrics-grid",
  "x": 80,
  "y": 120,
  "width": 960,
  "height": 280,
  "overflow": "warn",
  "layout": {
    "mode": "grid",
    "columns": [300, 300, 300],
    "rows": [120, 120],
    "gap": { "row": 24, "column": 24 },
    "padding": 12,
    "alignItems": "start",
    "justifyItems": "stretch"
  },
  "elements": [
    {
      "type": "rect",
      "id": "card-bg-1",
      "x": 0,
      "y": 0,
      "width": 260,
      "height": 100,
      "fill": "#f8fafc",
      "radius": 18,
      "placement": { "column": 0, "row": 0 }
    },
    {
      "type": "text",
      "id": "card-title-1",
      "x": 0,
      "y": 0,
      "width": 240,
      "fontSize": 24,
      "fontWeight": "bold",
      "content": "Export-aware layout"
    }
  ]
}
```

## Current diagnostics surface

Layout diagnostics use the shared `MaliangDeckDiagnostic` shape from `@maliang-deck/schema` and are adapted to renderer/export warnings. Important warning codes include:

- `layout-flattened` — SVG export has converted a layout container to static geometry;
- `layout-overflow` — child geometry exceeds a layout configured with `overflow: "warn"`;
- `renderer-unsupported-element` — renderer encountered an unsupported element type instead of silently returning empty output;
- `pptxgenjs.layout.transform-unsupported`, `pptxgenjs.layout.opacity-unsupported`, `pptxgenjs.layout.clip-unsupported` — opt-in JS PPTX path could not preserve a layout-level effect.

## Phase 2 direction: component/macro authoring

Phase 2 adds a compile-time component/macro layer on top of the existing DSL and layout elements. Renderers still consume ordinary validated deck DSL. Components are an authoring convenience, not a renderer-time plugin system. The detailed authoring contract lives in [`docs/COMPONENT-MACRO-AUTHORING.md`](./COMPONENT-MACRO-AUTHORING.md).

The boundary is:

```text
AuthoringDeckInput with ComponentInvocation nodes
  -> @maliang-deck/authoring compile step
  -> ordinary Deck DSL
  -> validateDeck
  -> HTML/SVG/PDF/PPTX renderers and exporters
```

Recommended Phase 2 scope:

1. Define `ComponentInvocation` with `kind: "component"` outside the canonical `Element` union.
2. Add a compile step that expands approved components into ordinary DSL/layout elements.
3. Produce deterministic generated IDs and source maps from component invocation to emitted elements.
4. Validate component props before expansion and validate the expanded deck after expansion.
5. Ship a small built-in component registry:
   - `metric-card` / `stat-card`
   - `two-column` / `split-section`
   - `feature-grid`
   - `timeline-section` and/or `timeline-step`
   - optional `hero` / `section-header` if it remains a thin heading convenience
6. Support only finite compiler-controlled visual tokens such as `glass`, `gradient`, `spotlight`, `shadow`, `badge`, `connector`, and `stagger`.
7. Add component fixtures, tests, an authoring demo, and a deterministic macro-vs-raw DSL verbosity comparison before exposing the authoring layer in templates/workflow.

Do **not** add raw HTML islands, arbitrary scoped CSS, user-defined macro files, runtime JavaScript components, or a general DOM/CSS compiler in Phase 2. Those remain later gated phases.
