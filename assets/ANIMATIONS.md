# Maliang Deck Animation System

Reference for runtime motion in the HTML renderer. SVG/PDF/PPTX keep the
static deck; PPTX gets the closest mapped effect available in the exporter.

## Quick Reading Workflow

1. Identify the DSL surface first.
   - `animation.enter` for element entrances.
   - `meta.htmlRuntime.transition` for slide transitions.
   - `slide.fx` for canvas FX.
   - `textAnimation` for text-anim effects.
   - `morphSteps` / `morphStepTrigger` for morphing.
   - `customHtml` and extension fields for browser-only visuals.
2. Check slide density. FX that fill most or all of the frame need sparse slides.
3. Match the effect to the slide role: hero, divider, evidence, or interactive demo.
4. Verify reduced-motion and export behavior before shipping.

## Where Things Live

- `assets/animations/` - element timeline, animation CSS, slide transitions.
- `assets/fx/` - canvas FX modules loaded by `fx-runtime.js`.
- `assets/extensions/` - text, shape, 3D, and GIF runtime extensions.
- `assets/themes/` - CSS variables read by runtime FX.

## 1. Element Animations (Element Entrance)

Applied via `animation.enter` in the DSL. Orchestrated by `timeline.js`
using the Web Animations API. Use `step: 0` for auto-play on slide enter; use
`step: 1+` for click-to-reveal content.

### DSL Usage

```json
{
  "type": "text",
  "id": "title",
  "x": 64,
  "y": 48,
  "width": 600,
  "content": "Key Finding",
  "animation": {
    "enter": "fade-up",
    "duration": 500,
    "delay": 0,
    "easing": "ease",
    "step": 0
  }
}
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enter` | string | - | Animation name from the registry below |
| `duration` | number | 600 | Duration in milliseconds |
| `delay` | number | 0 | Delay before start in milliseconds |
| `easing` | string | `ease` | CSS easing function |
| `step` | number | 0 | `0` = auto-play on slide enter; `1+` = click |

### Step System

- **Step 0**: Auto-play on slide enter. Use for the main title, lead text, or
  the first visual.
- **Step N (1+)**: Reveals on click/right-arrow. Use for evidence, callouts,
  and follow-up details.

### Core Animations

| Name | Effect | Recommended for | Related field |
| --- | --- | --- | --- |
| `fade-up` | Fade in + move up 30px | Titles, body text, general use | `animation.enter` |
| `fade-down` | Fade in + move down 30px | Subtitles, secondary text | `animation.enter` |
| `fade-left` | Fade in + move left 30px | Left-aligned content reveals | `animation.enter` |
| `fade-right` | Fade in + move right 30px | Right-aligned content reveals | `animation.enter` |
| `rise-in` | Fade in + move up 60px | Hero statements, key findings | `animation.enter` |
| `slide-from-left` | Fade in + enter from left edge | Timeline items, sequential flows | `animation.enter` |
| `slide-from-right` | Fade in + enter from right edge | Timeline items, sequential flows | `animation.enter` |
| `slide-from-top` | Fade in + enter from top edge | Headers, top panels | `animation.enter` |
| `slide-from-bottom` | Fade in + enter from bottom edge | Footers, bottom panels | `animation.enter` |

### Emphasis Animations

| Name | Effect | Recommended for | Related field |
| --- | --- | --- | --- |
| `scale-in` | Fade in + scale from 0.8 | Cards, thumbnails | `animation.enter` |
| `zoom-in` | Fade in + scale from 0 | Icons, focal points | `animation.enter` |
| `zoom-pop` | Scale 0 -> 1.1 -> 1 | KPI numbers, stat highlights | `animation.enter` |
| `shrink-in` | Fade in + scale from 1.6 to 1 | Dramatic reveals, section titles | `animation.enter` |
| `rotate-in` | Fade in + rotate -10deg + scale 0.9 | Decorative elements, badges | `animation.enter` |
| `spin-in` | Fade in + rotate 360deg + scale 0.5 -> 1 | Icons, playful elements | `animation.enter` |
| `flip-in` | Fade in + perspective rotateX 90deg -> 0 | Cards, panels, before/after reveals | `animation.enter` |

### Dynamic Animations

| Name | Effect | Recommended for | Related field |
| --- | --- | --- | --- |
| `bounce-in` | Scale 0.3 -> 1.05 -> 0.95 -> 1 | KPIs, callout badges | `animation.enter` |
| `elastic-in` | Scale 0.4 with elastic settle | Interactive elements, emphasis | `animation.enter` |
| `swing-in` | Pendulum rotation from -12deg to settle | Hanging labels, playful headings | `animation.enter` |
| `drop-in` | Fall from above with subtle bounce | Alert items, notification cards | `animation.enter` |

### Effect Animations

| Name | Effect | Recommended for | Related field |
| --- | --- | --- | --- |
| `blur-in` | Fade in + blur 8px -> 0 | Atmospheric reveals, backgrounds | `animation.enter` |
| `blur-zoom` | Fade in + blur 12px + scale 0.7 -> 1 | Sparse openers, section starts | `animation.enter` |
| `skew-in` | Fade in + skewX 20deg -> normal | Dynamic text, modern layouts | `animation.enter` |
| `stretch-x` | Fade in + scaleX 0 -> 1 | Progress bars, horizontal dividers | `animation.enter` |
| `stretch-y` | Fade in + scaleY 0 -> 1 | Vertical bars, column charts | `animation.enter` |
| `flash-in` | Opacity flicker: 0 -> 1 -> 0.4 -> 1 | Attention-grabbing highlights | `animation.enter` |

## 2. Slide Transitions

Applied via `meta.htmlRuntime.transition` in the DSL. Handled by `runtime.js`
with CSS animations in `transitions.css`.

### DSL Usage

```json
{
  "meta": {
    "htmlRuntime": {
      "transition": {
        "type": "push",
        "durationMs": 400,
        "easing": "cubic-bezier(.2,.8,.2,1)",
        "autoAnimate": true,
        "unmatched": "fade"
      }
    }
  }
}
```

### Available Transition Types

| Type | Effect | Recommended for | Related field |
| --- | --- | --- | --- |
| `none` | Instant cut, no animation | Fast demos, dense slides | `meta.htmlRuntime.transition.type` |
| `fade` | Vertical scroll + cross-fade | General purpose, formal tone | `meta.htmlRuntime.transition.type` |
| `slide` | Vertical scroll with softer fade | Narrative flow, sequential content | `meta.htmlRuntime.transition.type` |
| `dissolve` | Cross-dissolve with subtle blur | Academic, reflective decks | `meta.htmlRuntime.transition.type` |
| `zoom` | Outgoing shrinks, incoming grows | Section transitions, dramatic shifts | `meta.htmlRuntime.transition.type` |
| `push` | Both slides move together | Consulting, progressive disclosure | `meta.htmlRuntime.transition.type` |
| `cover` | New slide covers old with depth shadow | Layered reveals, executive decks | `meta.htmlRuntime.transition.type` |
| `morph` | Shared-element morph between slides; implies `autoAnimate` | Repeated structure, visual continuity | `meta.htmlRuntime.transition.type` |

### Auto-Animate

When `autoAnimate: true`, elements with matching `id` values across consecutive
slides interpolate position, size, and style. Use `unmatched: "fade"` for
leftover elements or `unmatched: "instant"` to snap them.

## 3. Canvas FX (Background Effects)

Applied via `slide.fx` string arrays. Managed by `fx-runtime.js`, which
pre-warms FX during transitions and stops them when the slide deactivates.

FX render behind all content. Some are light ambience; others fill most or all
of the frame or sit in the center of the slide. Treat those as sparse-layout
effects: use one headline, maybe one short subtitle, and avoid dense body copy,
long bullets, or tables on the same slide.

### DSL Usage

```json
{
  "id": "title-slide",
  "fx": ["constellation"],
  "elements": [...]
}
```

FX layers render behind all elements (`z-index: 0`, `pointer-events: none`).
Multiple FX can be stacked on one slide. Old slide FX keep running during the
transition and stop only after full deactivation.

### Particle / Accent

| Name | Effect | Recommended for | Related field |
| --- | --- | --- | --- |
| `particle-burst` | Center burst of particles with gravity | Title slides, celebrations, minimal copy | `slide.fx` |
| `confetti-cannon` | Corner confetti burst with motion | Achievement slides, milestones, sparse layouts | `slide.fx` |
| `firework` | Repeating firework launches and bursts | Grand reveals, closing slides, dark sparse layouts | `slide.fx` |
| `counter-explosion` | Centered count-up with particle burst | KPI moments, one metric per slide | `slide.fx` |
| `sparkle-trail` | Cursor-follow sparkles across the slide | Live demos, playful accents, sparse layouts | `slide.fx` |

### Data / Network

| Name | Effect | Recommended for | Related field |
| --- | --- | --- | --- |
| `knowledge-graph` | Connected node graph with labels | Concept maps, relationship slides, light copy | `slide.fx` |
| `neural-net` | Layered network topology with pulses | AI/ML topics, architecture slides, small text blocks | `slide.fx` |
| `data-stream` | Flowing data text and particle streams | Pipelines, streaming topics, sparse layouts | `slide.fx` |
| `magnetic-field` | Flowing line field across the canvas | Physics, force diagrams, sparse layouts | `slide.fx` |

### Ambient / Space

| Name | Effect | Recommended for | Related field |
| --- | --- | --- | --- |
| `starfield` | Full-frame starfield with depth drift | Space themes, dark title slides, sparse content | `slide.fx` |
| `galaxy-swirl` | Swirling galaxy spiral across the frame | Grand openers, section dividers, sparse content | `slide.fx` |
| `orbit-ring` | Orbiting rings around a center point | Science or planetary concepts, short copy | `slide.fx` |
| `constellation` | Connected star points with gentle drift | Abstract backgrounds, networking slides, moderate content | `slide.fx` |
| `matrix-rain` | Full-frame falling characters | Tech/hacker themes, title slides only | `slide.fx` |

### Text / Takeover

| Name | Effect | Recommended for | Related field |
| --- | --- | --- | --- |
| `letter-explode` | Letters burst outward from a headline | Title reveals, creative openers, headline-sized text only | `slide.fx` |
| `typewriter-multi` | Centered terminal-style multi-line type | Code demos, narrative openers, one short block of text | `slide.fx` |

### FX and Themes

Canvas FX read CSS variables from the active theme:

- `--accent` / `--accent-2` - primary effect colors
- `--text-1` - text effect color
- `--ok`, `--warn`, `--danger` - palette for multi-color effects

Switching themes (T key) dynamically recolors active FX.

## 4. Runtime Extensions

Runtime extensions live under `assets/extensions/` and are loaded by the HTML
renderer. Use them when the slide needs browser-only behavior that the static
DSL cannot express. If the visual must survive PDF/PPTX export, author the
fallback first.

| Extension | Use when | Related field | Export note |
| --- | --- | --- | --- |
| `text-anim/` | Text needs per-character, word, or line motion | `textAnimation` | HTML-only; keep final text readable in static export |
| `shape-morph/` | Rect/circle/ellipse/group/layout need step-based morphing | `morphSteps`, `morphStepTrigger` | HTML-only; static exporters ignore morph fields |
| `math-viz/graph3d.js` | Need interactive 3D surface, curve, scatter, vector field, or model visuals | `type: "graph"` or `customHtml` | HTML-only; provide `fallbackImage` |
| `gif-ascii/index.js` | Need an animated GIF shown as a terminal-style ASCII filter | `customHtml` with `data-gif-ascii` | HTML-only; provide `fallbackImage` |

## 5. Morph System

Morphing is HTML-only. SVG/PDF/PPTX ignore morph fields and emit diagnostics,
so the final static state must still communicate the slide.

```
assets/
  lib/
    morph-engine.js     # Shared morph engine
  extensions/
    shape-morph/
      index.js          # Shape morph extension
        component-morph.js    # Component morph extension
runtime/
  runtime.js            # Morph transition + group matching scope rules
```

### 5.1 Shape Morphing (intra-slide)

Applies to `rect`, `circle`, and `ellipse`.

**DSL fields**

- `morphSteps: ShapeMorphStep[]` - array of `{ target, duration?, easing? }`
- `morphStepTrigger: 'click' | 'auto'` - default `'click'`

**Morphable properties**

| Element | Properties |
| --- | --- |
| `rect` | x, y, width, height, fill, stroke, strokeWidth, radius, opacity, rotation |
| `circle` | x, y, radius, fill, stroke, strokeWidth, opacity, rotation |
| `ellipse` | x, y, width, height, fill, stroke, strokeWidth, opacity, rotation |

`click` integrates with the timeline step system; built-in animation steps play
first, then morph steps advance on click/arrow-right. `auto` plays sequentially
on slide activation using each step's duration.

### 5.2 Component Morphing (intra-slide)

Applies to `group` and `layout`.

**DSL fields**

- `morphSteps: ComponentMorphStep[]`
- `morphStepTrigger: 'click' | 'auto'` - default `'click'`

Each step can target the container (`x`, `y`, `width`, `height`, `opacity`,
`rotation`) and children by element ID. `stagger` offsets child animations.

### 5.3 Morph Slide Transition (cross-slide)

Set `meta.htmlRuntime.transition.type: 'morph'` for PowerPoint-style morphing.

**Behavior**

- `type: 'morph'` implies `autoAnimate: true`.
- Elements match by `data-maliang-deck-auto-animate-id` (from the DSL `id`).
- Matched elements interpolate via FLIP plus CSS properties:
  `backgroundColor`, `borderRadius`, `borderColor`, `color`, `fontSize`.
- Unmatched outgoing elements fade out + scale(0.95).
- Unmatched incoming elements fade in + scale(1.03), delayed 20%.
- Group matching scope rules prevent double-animating nested descendants.

### 5.4 Morph Engine API

`window.MaliangMorphEngine` exposes a shared animation engine.

| Function | Description |
| --- | --- |
| `readShapeProps(el)` | Read current visual state from a DOM element |
| `writeShapeProps(el, props)` | Apply properties to a DOM element |
| `interpolateProps(from, to, t)` | Interpolate numbers, colors, and snap values |
| `animateShape(el, from, to, duration, easing, onComplete)` | rAF-based animation with cancellation |
| `finalizeMorph(el, targetState)` | Instant snap for reduced motion or cleanup |
| `cancelMorph(handle)` | Cancel a running morph animation |
| `dslTargetToCss(target, elementType)` | Map DSL fields to CSS properties |

### 5.5 Reduced Motion

All morph paths respect `prefers-reduced-motion: reduce`:

- The morph engine snaps instantly.
- Runtime transitions skip WAAPI animations.
- Shape-morph and component-morph delegate to the shared morph engine.

### 5.6 Presenter Sync

Morph step state changes are broadcast via the `maliang-deck-timeline`
`BroadcastChannel`. The presenter window receives `{ type: 'step', step, total }`
messages and updates the step indicator. Presenter navigation sends
`{ type: 'timeline-step', direction }` back to the main window.

### 5.7 Export Compatibility

| Format | Morph Support |
| --- | --- |
| HTML | Full support (shape, component, transition) |
| SVG | Ignored - `MORPH_IGNORED` diagnostic emitted |
| PDF | Ignored - static SVG rendering |
| PPTX | Future: map `morph` to PowerPoint Morph XML |

## 6. Best Practices

### Animation Pacing

1. Step 0: Title, heading, and the first visual.
2. Step 1: Evidence that supports the title.
3. Step 2+: Supporting details, annotations, and secondary data.

### Style Fit

| Style | Recommended enter effects | Transition | FX usage |
| --- | --- | --- | --- |
| Academic | `fade-up`, `fade-down`, `blur-in`, `rise-in` | `fade` / `dissolve` | Title or divider slides only |
| Consulting | `fade-up`, `rise-in`, `scale-in`, `zoom-pop`, `bounce-in` | `slide` / `push` | Section dividers |
| Creative | `flip-in`, `elastic-in`, `swing-in`, `spin-in` | `zoom` / `cover` | Freely, but keep content readable |
| Technical | `fade-up`, `slide-from-left`, `stretch-x` | `slide` / `none` | Sparingly |

### Performance

- Element animations use the Web Animations API.
- Canvas FX use `requestAnimationFrame` with DPR-aware canvas sizing.
- FX stop when a slide loses focus to avoid background CPU usage.
- `will-change: opacity, transform, filter` hints are set in `animations.css`.

### Accessibility

- `prefers-reduced-motion: reduce` snaps element animations, slide transitions,
  text-anim, and morph paths to their final state.
- Canvas FX are separate decorative layers; keep them optional and avoid using
  them to carry critical content.

### PPTX Export Compatibility

- Supported natively or near-natively: `slide-from-left/right`, `zoom-pop`,
  `bounce-in`, `zoom-in`, `flash-in`, `slide-from-top/bottom`.
- Downgraded to simpler PPTX effects: `fade-*`, `scale-in`, `blur-in`,
  `rise-in`, `rotate-in`, `flip-in`, `elastic-in`, and similar.
- Canvas FX are HTML-only and do not appear in SVG/PDF/PPTX output.
