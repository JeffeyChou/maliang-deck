# Maliang Deck Authoring

Maliang Deck is DSL-first. The JSON deck DSL is the source of truth for validation, static analysis, HTML preview, SVG/PDF export, and PPTX export. HTML runtime features add polish, but arbitrary DOM/CSS is not an export source.

## Layout Elements

Use `layout` when repeated manual coordinates would obscure intent. Layouts are recursive DSL elements with deterministic pixel-only `grid` or `flex` behavior.

```json
{
  "type": "layout",
  "id": "metrics",
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
    "padding": 12
  },
  "elements": []
}
```

Grid children may use 0-based `placement.column`, `placement.row`, `columnSpan`, and `rowSpan`. Flex children may use fixed pixel `placement.basis`. Any child can opt out with absolute placement:

```json
{ "placement": { "mode": "absolute", "x": 20, "y": 12 } }
```

Renderer behavior is intentionally bounded:

| Target | Layout behavior |
| --- | --- |
| HTML | Keeps layout containers and previews with CSS Grid/Flex. |
| SVG/PDF | Resolves static geometry and emits layout diagnostics. |
| DrawingML PPTX | Uses SVG/Python path; chart/table content still fails fast. |
| `pptxgenjs` PPTX | Resolves children natively where supported; warns on unsupported layout clip/rotation/opacity. |

Important diagnostics: `layout-flattened`, `layout-overflow`, `renderer-unsupported-element`, `pptxgenjs.layout.transform-unsupported`, `pptxgenjs.layout.opacity-unsupported`, and `pptxgenjs.layout.clip-unsupported`.

## Component/Macro Layer

Component authoring is compile-time only. A component invocation is not a canonical DSL element; it expands into ordinary validated DSL before renderers run.

```text
AuthoringDeckInput
  -> compileAuthoringDeck()
  -> Deck DSL
  -> validateDeck()
  -> render/export
```

Invocations use `kind: "component"` instead of `type`:

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
  }
}
```

Compiler requirements:

- fail on unknown components, missing props, invalid prop ranges, unknown visual tokens, or invalid expanded DSL;
- generate deterministic IDs such as `metric-speed__card-bg`, never random or timestamp IDs;
- return a source map from invocation IDs to generated element IDs;
- validate both component props and the expanded deck.

Initial built-ins should stay small: `metric-card`/`stat-card`, `two-column`/`split-section`, `feature-grid`, `timeline-section`/`timeline-step`, and optionally a thin `hero`/`section-header`.

Allowed visual tokens are finite compiler-controlled values: `glass`, `gradient`, `spotlight`, `neon`, `shadow`, `badge`, `connector`, and `stagger`. Reject raw CSS, selectors, pseudo-elements, media queries, JavaScript snippets, arbitrary class names, raw HTML islands, runtime components, and user-defined macro files in this slice.

## Animations

Element animations are HTML runtime features declared in DSL and ignored gracefully by static exporters.

```json
{
  "type": "text",
  "id": "headline",
  "x": 100,
  "y": 100,
  "width": 420,
  "fontSize": 28,
  "content": "Hello",
  "animation": {
    "enter": "fade-up",
    "duration": 600,
    "delay": 0,
    "easing": "ease-out",
    "step": 0
  }
}
```

`step: 0` auto-plays on slide entry. `step: 1+` participates in click/key advance. Multiple elements on the same step animate together.

To add an animation, register Web Animations API keyframes in `runtime/timeline.js`:

```js
const KEYFRAMES = {
  'bounce-in': [
    { opacity: 0, transform: 'scale(0.3)', offset: 0 },
    { opacity: 1, transform: 'scale(1.05)', offset: 0.5 },
    { opacity: 1, transform: 'scale(1)', offset: 1 }
  ]
};
```

Starter animation names: `fade-up`, `fade-down`, `fade-left`, `fade-right`, `scale-in`, `blur-in`, `slide-from-left`, `slide-from-right`, `rise-in`, `zoom-pop`, and `rotate-in`.

Keyboard behavior:

| Key | Behavior |
| --- | --- |
| Left/right | Move slides directly. |
| Up/down | Move through in-slide animation steps. |
| Space/Enter | Advance a step, then move slides when no step remains. |
| Backspace | Step backward, then move to previous slide. |
| `L` | Toggle laser pointer. |
| `W` | Toggle popup whiteboard. |

## Canvas FX and Transitions

Slide-level FX use `fx: ["effect-name"]`. FX modules register under `window.HPX` and return an optional `stop()` handle:

```js
(window.HPX = window.HPX || {})['my-effect'] = function (container) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  return { stop() { canvas.remove(); } };
};
```

Common FX: `gradient-blob`, `constellation`, `starfield`, `orbit-ring`, and `sparkle-trail`.

Slide-to-slide transitions live under `meta.htmlRuntime.transition` and are HTML-only:

```json
{
  "meta": {
    "htmlRuntime": {
      "transition": {
        "type": "fade",
        "durationMs": 450,
        "easing": "ease",
        "autoAnimate": true,
        "unmatched": "fade"
      }
    }
  }
}
```

Supported transition types are `fade`, `slide`, and `none`. `autoAnimate` matches adjacent-slide elements by shared data keys derived from DSL IDs. Static exporters ignore `meta.htmlRuntime`.

## Practical Guidance

- Use layout for repeatable spatial structure and raw DSL for one-off geometry.
- Use macros for known visual patterns, not custom component systems.
- Keep animation sparse; static PDF/PPTX must still communicate the final state.
- Do not add raw HTML/CSS/JS as authoring truth unless a future RFC explicitly expands the boundary.
