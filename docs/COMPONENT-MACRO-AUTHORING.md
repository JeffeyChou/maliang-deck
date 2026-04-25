# Component/Macro Authoring

Component/macro authoring is Maliang Deck's Phase 2 authoring layer on top of the validated JSON Deck DSL. It lets agents write compact, reusable slide patterns and then compile them into ordinary `Deck` DSL before validation, rendering, or export.

The contract is deliberately compile-time only:

- macro inputs are authoring artifacts, not canonical DSL elements;
- the compiler expands macros into `layout`, `rect`, `text`, `line`, `group`, and other existing schema-valid elements;
- `validateDeck` runs on the expanded deck;
- HTML/SVG/PDF/PPTX renderers consume only the expanded deck and stay macro-unaware.

## Mental model

```text
AuthoringDeckInput
  ├─ ordinary DSL elements are passed through
  └─ ComponentInvocation nodes are expanded by @maliang-deck/authoring
        ↓
Expanded Deck DSL
        ↓ validateDeck
HTML preview / SVG / PDF / PPTX exporters
```

Use macros when the intent is a known visual pattern. Use raw DSL when the slide needs one-off geometry or an element type that is already concise.

## Authoring input shape

A component invocation uses `kind: "component"` rather than `type`. This keeps it out of the canonical `Element` union, which is discriminated by `type`.

```json
{
  "kind": "component",
  "id": "metric-speed",
  "component": "metric-card",
  "props": {
    "x": 80,
    "y": 190,
    "width": 340,
    "height": 220,
    "label": "Authoring input",
    "value": "64% shorter",
    "accent": "#38BDF8",
    "tokens": ["glass", "shadow", "badge"]
  },
  "slots": {}
}
```

Authoring containers may mix ordinary DSL elements and component invocations:

```ts
ComponentInvocation = {
  kind: 'component';
  id: string;
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, AuthoringNode[]>;
}

AuthoringNode = Element | ComponentInvocation;
```

## Compiler API

The authoring package owns the compiler boundary.

```ts
import { compileAuthoringDeck } from '@maliang-deck/authoring';

const result = compileAuthoringDeck(authoringDeck);

if (!result.success) {
  console.error(result.diagnostics);
  process.exit(1);
}

// This is an ordinary @maliang-deck/schema Deck.
const deck = result.deck;
```

Expected result shape:

```ts
type CompileAuthoringDeckResult =
  | {
      success: true;
      deck: Deck;
      diagnostics: MaliangDeckDiagnostic[];
      sourceMap: AuthoringSourceMap;
    }
  | {
      success: false;
      diagnostics: MaliangDeckDiagnostic[];
      sourceMap?: AuthoringSourceMap;
    };
```

The compiler must fail before successful expansion when:

- the component name is unknown;
- required props are missing;
- prop values have the wrong type or invalid range;
- a visual token is outside the finite vocabulary;
- the expanded deck fails `validateDeck`.

Diagnostics should include a stable code, macro name, invocation ID, and path whenever possible.

## Deterministic IDs and source maps

Generated IDs are derived from the invocation ID/path and a role name. They must not use timestamps, random values, or insertion-order-dependent state.

Example generated IDs for `metric-speed`:

```text
metric-speed__card-bg
metric-speed__accent
metric-speed__label
metric-speed__value
metric-speed__caption
```

Every invocation receives a source-map entry listing all generated element IDs:

```json
{
  "invocationId": "metric-speed",
  "component": "metric-card",
  "path": "slides[0].elements[2]",
  "generatedElementIds": [
    "metric-speed__card-bg",
    "metric-speed__accent",
    "metric-speed__label",
    "metric-speed__value"
  ]
}
```

Use the source map for diagnostics, editor selection, review diffs, and explaining which macro produced a primitive in the expanded deck.

## Built-in macro reference

The first registry is intentionally small. Aliases compile through the same prop schemas and expansion functions as their canonical names.

### `metric-card` / `stat-card`

Use for compact KPI cards, status cards, or callout stats.

Common props:

| Prop | Type | Notes |
| --- | --- | --- |
| `x`, `y`, `width`, `height` | number | Target box in slide coordinates. |
| `label` | string | Small heading. |
| `value` | string | Main statistic or status. |
| `caption` | string | Optional supporting copy. |
| `accent` | color string | Accent bar/badge color. |
| `badge` | string | Optional short badge text. |
| `tokens` | string[] | Optional finite visual tokens. |

Expansion should emit a card background, accent primitive, label/value text, optional caption, and optional badge primitives.

### `two-column` / `split-section`

Use for comparison, input/output, before/after, or narrative-plus-evidence sections.

Common props:

| Prop | Type | Notes |
| --- | --- | --- |
| `x`, `y`, `width`, `height` | number | Container box. |
| `title` | string | Optional section title. |
| `gap` | number | Pixel gap between columns. |
| `leftTitle`, `rightTitle` | string | Optional column headings. |
| `tokens` | string[] | Optional finite visual tokens. |

Slots:

| Slot | Type | Notes |
| --- | --- | --- |
| `left` | `AuthoringNode[]` | Ordinary DSL or nested invocations for the left column. |
| `right` | `AuthoringNode[]` | Ordinary DSL or nested invocations for the right column. |

Expansion should emit a `LayoutElement` with two deterministic grid columns and then recursively expand slot content into that layout.

### `feature-grid`

Use for a set of repeated feature, benefit, risk, or capability cards.

Common props:

| Prop | Type | Notes |
| --- | --- | --- |
| `x`, `y`, `width`, `height` | number | Grid container box. |
| `columns` | number | Positive integer column count. |
| `items` | array | Each item should include `title` and `body`. |
| `tokens` | string[] | Optional finite visual tokens. |

Expansion should emit a grid `LayoutElement` and one card-like primitive set for each item.

### `timeline-section` / `timeline-step`

Use for roadmaps, process slides, release plans, and causal sequences.

Common `timeline-section` props:

| Prop | Type | Notes |
| --- | --- | --- |
| `x`, `y`, `width`, `height` | number | Timeline region. |
| `title` | string | Section title. |
| `accent` | color string | Connector and step accent. |
| `steps` | array | Each step includes `label`, `title`, and `body`. |
| `tokens` | string[] | Optional finite visual tokens. |

Expansion should emit connector primitives and deterministic step groups/cards. If a registry exposes only `timeline-step`, authors can repeat `timeline-step` invocations inside a raw `layout` or `two-column` slot.

### Optional `hero` / `section-header`

Use only when the built-in registry includes it. It should remain a thin convenience macro for heading/subheading/accent primitives, not a general landing-page or DOM component model.

## Visual token vocabulary

Visual richness is allowed only through a finite, compiler-controlled token set. Tokens map to current schema-valid fields, known `slide.fx` values, or accepted animation descriptors.

| Token | Intended mapping |
| --- | --- |
| `glass` | translucent fill, subtle stroke, rounded card primitives |
| `gradient` | compiler-controlled gradient-like color choices or known slide `fx` |
| `spotlight` | background circles/ellipses or known slide `fx` |
| `neon` | high-contrast accent/stroke primitives |
| `shadow` | schema-valid low-opacity offset primitive |
| `badge` | pill-shaped rect plus label text |
| `connector` | line/path primitives for timelines or flows |
| `stagger` | accepted element animation delay/step values |

Reject unknown tokens by default. Reject selector/class-like values such as `.card:hover`, `:before`, media queries, arbitrary class names, raw CSS strings, and JavaScript snippets.

## Agent recipes

### KPI or status summary

1. Use one raw title/subtitle pair.
2. Add three to five `metric-card` invocations.
3. Use `feature-grid` for short supporting claims.
4. Keep each card's `value` short; move nuance into `caption`.

### Comparison or transformation slide

1. Use `two-column` with `leftTitle` and `rightTitle`.
2. Put raw text or nested `metric-card` invocations in slots.
3. Use `connector` only when the relationship between columns is directional.

### Roadmap or process slide

1. Use `timeline-section` for a single linear sequence.
2. Keep each step body under two lines.
3. Use `stagger` for HTML preview pacing, knowing static exporters will preserve the final static state.

### When not to use macros

- One-off diagrams where raw `line`, `path`, or `polygon` elements are clearer.
- User-defined component systems; those are outside the first slice.
- Arbitrary HTML/CSS/JS authoring.
- Runtime interactivity that requires renderers to know about macros.

## Demo and token comparison

See [`examples/macro-authoring-demo`](../examples/macro-authoring-demo/) for:

- `authoring-deck.json` — macro-authored input;
- `raw-expanded-deck.json` — equivalent raw DSL fixture;
- `TOKEN-COMPARISON.md` — deterministic character-count comparison;
- `measure-token-comparison.mjs` — dependency-free measurement script.

## Non-goals and safety boundary

The first slice does **not** add:

- arbitrary DOM or HTML source files;
- a runtime JavaScript component model;
- user-defined macro/component files;
- arbitrary CSS selectors, pseudo-elements, media queries, or class names as authoring truth;
- renderer/exporter plugin hooks for macro nodes;
- workflow/template integration before the package compiler and tests are stable.

The safe invariant is simple: if a deck reaches a renderer or exporter, it is already ordinary validated Maliang Deck DSL.
