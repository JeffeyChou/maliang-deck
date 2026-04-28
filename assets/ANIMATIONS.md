# Maliang Deck Animation System

Complete reference for animations, transitions, and canvas FX available in the
HTML runtime. SVG/PDF/PPTX exporters ignore animations; PPTX receives a
best-effort mapping via the exporter's `PPTX_ANIMATION_MAPPINGS` table.

---

## Directory Layout

```
assets/
  animations/
    timeline.js        # Web Animations API keyframe registry + step engine
    animations.css     # will-change hints, no-JS fallback, reduced-motion
    transitions.css    # CSS slide-to-slide transition definitions
  fx/
    fx-runtime.js      # Canvas FX autoloader + lifecycle manager
    _util.js           # Shared helpers (palette, canvas, RAF loop)
    *.js               # Individual canvas FX modules (20 effects)
  themes/              # CSS theme files (color variables consumed by FX)
```

---

## 1. Component Animations (Element Entrance)

Applied via `element.animation.enter` in the DSL. Orchestrated by
`timeline.js` using the Web Animations API for GPU-accelerated 60fps playback.

### DSL Usage

```json
{
  "type": "text",
  "id": "title",
  "x": 64, "y": 48, "width": 600,
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

| Field      | Type   | Default | Description                                    |
|------------|--------|---------|------------------------------------------------|
| `enter`    | string | —       | Animation name from the registry below         |
| `duration` | number | 600     | Duration in milliseconds                       |
| `delay`    | number | 0       | Delay before start in milliseconds             |
| `easing`   | string | `ease`  | CSS easing function                            |
| `step`     | number | 0       | 0 = auto-play on slide enter; N >= 1 = click   |

### Step System

- **Step 0**: Elements animate automatically when the slide becomes active.
  Step-0 elements receive index-based stagger (80ms between siblings).
- **Step N (1+)**: Elements reveal on the Nth click/right-arrow press.
  All elements sharing the same step number animate together.

### Animation Registry

#### Core Animations (fade/slide family)

| Name               | Effect                                     | Recommended For                    |
|--------------------|--------------------------------------------|------------------------------------|
| `fade-up`          | Fade in + translate up 30px                | Titles, body text, general purpose |
| `fade-down`        | Fade in + translate down 30px              | Subtitles, secondary text          |
| `fade-left`        | Fade in + translate left 30px              | Left-aligned content reveals       |
| `fade-right`       | Fade in + translate right 30px             | Right-aligned content reveals      |
| `rise-in`          | Fade in + translate up 60px (larger range) | Hero statements, key findings      |
| `slide-from-left`  | Fade in + translate from -100% X           | Timeline items, sequential flows   |
| `slide-from-right` | Fade in + translate from +100% X           | Timeline items, sequential flows   |
| `slide-from-top`   | Fade in + translate from -100% Y           | Dropdown reveals, headers          |
| `slide-from-bottom`| Fade in + translate from +100% Y           | Footer reveals, bottom panels      |

#### Emphasis Animations (scale/rotate family)

| Name         | Effect                                      | Recommended For                     |
|--------------|---------------------------------------------|-------------------------------------|
| `scale-in`   | Fade in + scale from 0.8                    | Cards, image thumbnails             |
| `zoom-in`    | Fade in + scale from 0                      | Focal points, icons                 |
| `zoom-pop`   | Scale 0 → 1.1 → 1 (overshoot bounce)       | KPI numbers, stat highlights        |
| `shrink-in`  | Fade in + scale from 1.6 down to 1          | Dramatic reveals, section titles    |
| `rotate-in`  | Fade in + rotate -10deg + scale 0.9         | Decorative elements, badges         |
| `spin-in`    | Fade in + rotate 360deg + scale 0.5 → 1     | Icons, playful elements             |
| `flip-in`    | Fade in + perspective rotateX 90deg → 0      | Cards, panels, before/after reveals |

#### Dynamic Animations (bounce/elastic family)

| Name         | Effect                                      | Recommended For                     |
|--------------|---------------------------------------------|-------------------------------------|
| `bounce-in`  | Scale 0.3 → 1.05 → 0.95 → 1 (bounce)      | KPIs, callout badges, fun decks     |
| `elastic-in` | Scale 0.4 with elastic overshoot settle     | Interactive elements, emphasis       |
| `swing-in`   | Pendulum rotation from -12deg to settle     | Hanging labels, playful headings     |
| `drop-in`    | Fall from above with subtle bounce          | Alert items, notification cards      |

#### Effect Animations (blur/skew/stretch family)

| Name        | Effect                                       | Recommended For                     |
|-------------|----------------------------------------------|-------------------------------------|
| `blur-in`   | Fade in + blur 8px → 0                       | Atmospheric reveals, backgrounds     |
| `blur-zoom` | Fade in + blur 12px + scale 0.7 → clear 1    | Dramatic intro, section openers      |
| `skew-in`   | Fade in + skewX 20deg + translateX → normal  | Dynamic text, modern layouts         |
| `stretch-x` | Fade in + scaleX 0 → 1 (horizontal expand)   | Progress bars, horizontal dividers   |
| `stretch-y` | Fade in + scaleY 0 → 1 (vertical expand)     | Vertical bars, column charts         |
| `flash-in`  | Opacity flicker: 0 → 1 → 0.4 → 1            | Attention-grabbing highlights        |

---

## 2. Slide Transitions

Applied via `meta.htmlRuntime.transition` in the DSL. Handled by `runtime.js`
with CSS animations defined in `transitions.css`.

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

| Type        | Effect                                         | Recommended For                      |
|-------------|-------------------------------------------------|--------------------------------------|
| `none`      | Instant cut, no animation                       | Fast-paced technical demos           |
| `fade`      | Vertical scroll + cross-fade (30% slide height) | General purpose, formal tone         |
| `slide`     | Vertical scroll with softer fade                | Narrative flow, sequential content   |
| `dissolve`  | Cross-dissolve with subtle blur                 | Academic, reflective presentations   |
| `zoom`      | Outgoing shrinks, incoming grows                | Section transitions, dramatic shifts |
| `push`      | Both slides move together (directional)         | Consulting, progressive disclosure   |
| `cover`     | New slide covers old with depth shadow          | Layered reveals, executive decks     |

### Auto-Animate

When `autoAnimate: true`, elements with matching `id` values across consecutive
slides smoothly interpolate position, size, and style. The `unmatched` field
controls non-matching elements: `"fade"` (cross-fade) or `"instant"` (snap).

---

## 3. Canvas FX (Background Effects)

Applied via `slide.fx` (string array) in the DSL. Managed by `fx-runtime.js`,
which dynamically loads FX modules and ties their lifecycle to slide activation.

### DSL Usage

```json
{
  "id": "title-slide",
  "fx": ["constellation"],
  "elements": [...]
}
```

FX layers render behind all elements (`z-index: 0`, `pointer-events: none`).
Multiple FX can be stacked on a single slide. FX are **pre-warmed** during
slide transitions: `initFxIn()` fires when `is-transition-next` is set (at
transition start), so the canvas is already rendering before the transition
completes. Old slide FX keep running during the transition and stop only
after full deactivation.

### Available Canvas FX

#### Particle / Physics

| Name                | Effect                                      | Recommended For                    |
|---------------------|---------------------------------------------|------------------------------------|
| `particle-burst`    | 90 particles burst from center with gravity | Title slides, celebrations         |
| `confetti-cannon`   | Colorful confetti burst                     | Achievement slides, milestones     |
| `firework`          | Firework explosion animation                | Grand reveals, closing slides      |
| `counter-explosion` | Numeric counter with particle burst         | KPI reveals, stats highlights      |
| `magnetic-field`    | Magnetic attraction field visualization     | Physics, force diagrams            |

#### Data / Graph Visualization

| Name              | Effect                                        | Recommended For                    |
|-------------------|-----------------------------------------------|------------------------------------|
| `knowledge-graph` | Connected node visualization                  | Concept maps, relationship slides  |
| `neural-net`      | Neural network topology animation             | AI/ML topics, architecture slides  |
| `data-stream`     | Flowing data particle streams                 | Data pipeline, streaming topics    |
| `constellation`   | Connected star points with gentle drift       | Abstract backgrounds, networking   |

#### Space / Ambient

| Name           | Effect                                         | Recommended For                    |
|----------------|------------------------------------------------|------------------------------------|
| `starfield`    | Static twinkling starfield                     | Space themes, dark backgrounds     |
| `galaxy-swirl` | Swirling galaxy spiral                         | Cosmic themes, grand openings      |
| `orbit-ring`   | Orbiting rings around center point             | Planetary, orbital concepts        |
| `matrix-rain`  | Matrix-style falling characters                | Tech/hacker themes, code topics    |

#### Text / Typography

| Name               | Effect                                      | Recommended For                    |
|---------------------|---------------------------------------------|------------------------------------|
| `letter-explode`   | Individual letters burst outward             | Title reveals, creative slides     |
| `typewriter-multi` | Multi-line typewriter effect                 | Code demos, narrative reveals      |

#### Visual

| Name            | Effect                                        | Recommended For                    |
|-----------------|-----------------------------------------------|------------------------------------|
| `gradient-blob` | Animated gradient blob morphing               | Abstract backgrounds, ambient      |
| `sparkle-trail` | Trailing sparkles/stars                       | Celebration, achievement slides    |

### FX and Themes

Canvas FX read CSS variables from the active theme:
- `--accent` / `--accent-2` — primary effect colors
- `--text-1` — text effect color
- `--ok`, `--warn`, `--danger` — palette for multi-color effects

Switching themes (T key) dynamically recolors active FX.

---

## 4. Best Practices

### Animation Pacing Strategy

1. **Step 0 (auto-play)**: Title, heading, and primary visual elements.
   These appear immediately on slide enter with stagger.
2. **Step 1**: Key evidence — the chart, figure, or KPI that supports the title.
3. **Step 2+**: Supporting details — annotations, callouts, secondary data.

### Style-Appropriate Animation Choices

| Style       | Recommended Enter Effects                         | Transition   | FX Usage        |
|-------------|---------------------------------------------------|--------------|-----------------|
| Academic    | fade-up, fade-down, blur-in, rise-in              | fade/dissolve| Title slides only|
| Consulting  | fade-up, rise-in, scale-in, zoom-pop, bounce-in   | slide/push   | Section dividers |
| Creative    | flip-in, elastic-in, swing-in, spin-in            | zoom/cover   | Freely           |
| Technical   | fade-up, slide-from-left, stretch-x               | slide/none   | Sparingly        |

### Performance

- All element animations use the Web Animations API (GPU-composited).
- Canvas FX use `requestAnimationFrame` with DPR-aware canvas sizing.
- FX auto-stop when a slide loses focus to prevent background CPU usage.
- `will-change: opacity, transform, filter` hints are set via `animations.css`.

### Accessibility

- The `prefers-reduced-motion: reduce` media query disables all animations:
  element animations show instantly, slide transitions snap, FX are suppressed.
- This is handled automatically in `timeline.js`, `animations.css`, and
  `transitions.css`. No DSL changes needed.

### PPTX Export Compatibility

Not all HTML animations have native PPTX equivalents. The exporter maps each
effect to the closest PowerPoint animation with a fallback:

- **Supported**: slide-from-left/right, zoom-pop, bounce-in, zoom-in, flash-in,
  slide-from-top/bottom
- **Downgraded** (mapped to simpler PPTX effect): fade-*, scale-in, blur-in,
  rise-in, rotate-in, flip-in, elastic-in, and others
- Canvas FX are HTML-only; they do not appear in SVG/PDF/PPTX output.

---

## 6. Morph System

The morph system provides three levels of morphing, all HTML-only. SVG/PDF/PPTX
exports silently ignore morph fields and emit a `MORPH_IGNORED` diagnostic.

### Directory Layout (morph-specific)

```
assets/
  lib/
    morph-engine.js     # Shared morph engine (read/write/interpolate/animate)
  extensions/
    shape-morph/
      index.js          # Shape morph extension (rect, circle, ellipse)
      component-morph.js# Component morph extension (group, layout)
runtime/
  runtime.js            # Morph slide transition + group matching scope rules
```

### 6.1 Shape Morphing (intra-slide)

Animates shape elements (`rect`, `circle`, `ellipse`) through a sequence of
morph steps. Each step specifies a target state; steps are cumulative.

**DSL fields** (on `RectElement`, `CircleElement`, `EllipseElement`):
- `morphSteps: ShapeMorphStep[]` — array of `{ target, duration?, easing? }`
- `morphStepTrigger: 'click' | 'auto'` — default `'click'`

**Morphable properties per element type**:

| Element  | Properties                                                            |
|----------|-----------------------------------------------------------------------|
| `rect`   | x, y, width, height, fill, stroke, strokeWidth, radius, opacity, rotation |
| `circle` | x, y, radius, fill, stroke, strokeWidth, opacity, rotation            |
| `ellipse`| x, y, width, height, fill, stroke, strokeWidth, opacity, rotation     |

**Trigger modes**:
- `click`: Steps integrate with the timeline step system via
  `registerStepConsumer()`. Built-in animation steps play first, then morph
  steps advance on click/arrow-right.
- `auto`: All steps play sequentially on slide activation with each step's
  `duration` as the interval.

### 6.2 Component Morphing (intra-slide)

Animates group/layout elements as coordinated units. The container box morphs
alongside per-child targeted morphing with optional stagger.

**DSL fields** (on `GroupElement`, `LayoutElement`):
- `morphSteps: ComponentMorphStep[]` — each step has:
  - `target: ComponentMorphTarget` — container properties (x, y, width, height, opacity, rotation)
  - `children?: Record<string, ShapeMorphTarget>` — per-child targets keyed by element ID
  - `duration?: number` — ms, default 800
  - `easing?: string` — default `'easeInOutCubic'`
  - `stagger?: number` — ms delay between child animations
- `morphStepTrigger: 'click' | 'auto'` — default `'click'`

**Child targeting**: Children are looked up by `data-maliang-deck-id` within the
container. Each child's target uses the same `ShapeMorphTarget` properties
(fill, stroke, radius, etc.) mapped to CSS via `dslTargetToCss()`.

### 6.3 Morph Slide Transition (cross-slide)

A first-class `'morph'` transition type (like PowerPoint Morph / Keynote Magic
Move). Set `meta.htmlRuntime.transition.type: 'morph'` in the deck DSL.

**Behavior**:
- `type: 'morph'` implies `autoAnimate: true` (no need to set both).
- Elements are matched across slides by `data-maliang-deck-auto-animate-id`
  (derived from the DSL element `id` field).
- Matched elements interpolate via FLIP (position, scale) plus CSS properties:
  `backgroundColor`, `borderRadius`, `borderColor`, `color`, `fontSize`.
- Unmatched outgoing elements: fade out + scale(0.95).
- Unmatched incoming elements: fade in + scale(1.03), delayed 20%.
- No whole-slide scroll animation (morph replaces it entirely).

**Group matching scope rules** (prevents double-animate):
When a group/layout element is matched as a morph root:
1. The group container animates (position, size, transform, opacity).
2. Descendants are excluded from the global shared element map.
3. Child matching runs recursively within the matched group.
4. Child FLIP deltas are computed in group-local coordinates (subtracting the
   parent group's delta) to prevent compounding transforms.
5. Unmatched children within the group fade in/out independently.

### 6.4 Morph Engine API

`window.MaliangMorphEngine` exposes a shared, reusable animation engine:

| Function | Description |
|----------|-------------|
| `readShapeProps(el)` | Read current visual state from DOM element |
| `writeShapeProps(el, props)` | Apply properties to DOM element |
| `interpolateProps(from, to, t)` | Interpolate property set (numbers, colors, snap) |
| `animateShape(el, from, to, duration, easing, onComplete)` | rAF-based animation with cancellation |
| `finalizeMorph(el, targetState)` | Instant snap (reduced-motion or cleanup) |
| `cancelMorph(handle)` | Cancel running morph animation |
| `dslTargetToCss(target, elementType)` | Map DSL field names to CSS equivalents |

### 6.5 Reduced Motion

All morph paths respect `prefers-reduced-motion: reduce`:
- **Morph engine**: `animateShape()` checks the media query and snaps instantly.
- **Runtime transitions**: `runSlideTransition()` skips all WAAPI animations.
- **Extensions**: shape-morph and component-morph delegate to morph engine.

### 6.6 Presenter Sync

Morph step state changes are broadcast via the `maliang-deck-timeline`
BroadcastChannel. The presenter window receives `{ type: 'step', step, total }`
messages and updates the step indicator. Presenter-initiated navigation sends
`{ type: 'timeline-step', direction }` back to the main window.

### 6.7 Export Compatibility

| Format | Morph Support |
|--------|---------------|
| HTML   | Full support (shape, component, transition) |
| SVG    | Ignored — `MORPH_IGNORED` diagnostic emitted |
| PDF    | Ignored — static SVG rendering |
| PPTX   | Future: map `morph` to PowerPoint Morph XML (`<p:transition><p:morph/></p:transition>`) |
