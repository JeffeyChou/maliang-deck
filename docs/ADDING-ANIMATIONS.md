# Adding Animations to Maliang Deck

This guide explains how to extend the animation system with new animations or canvas FX.

## Architecture Overview

```
JSON DSL (animation property)
    ↓
HTML Renderer (emits data-anim-* attributes)
    ↓
Timeline Engine (reads attributes, drives Web Animations API)
    ↓
Browser (element.animate() with JS keyframe objects)
```

The animation system uses **Web Animations API** (`element.animate()`) with JavaScript keyframe objects — NOT CSS `@keyframes`. The `runtime/animations.css` file is only for `prefers-reduced-motion` fallback.

## Adding a New CSS Animation

To add a new animation (e.g., "bounce-in"):

### Step 1: Add keyframes to the KEYFRAMES registry

Edit `runtime/timeline.js` and add an entry to the `KEYFRAMES` object:

```javascript
const KEYFRAMES = {
  // ... existing entries ...
  'bounce-in': [
    { opacity: 0, transform: 'scale(0.3)', offset: 0 },
    { opacity: 1, transform: 'scale(1.05)', offset: 0.5 },
    { opacity: 1, transform: 'scale(0.95)', offset: 0.7 },
    { opacity: 1, transform: 'scale(1)', offset: 1 }
  ],
};
```

Each entry is an array of [Web Animations API Keyframe objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats).

### Step 2: Use it in the DSL

```json
{
  "type": "text",
  "id": "my-element",
  "x": 100, "y": 100, "width": 400,
  "fontSize": 24,
  "content": "Hello!",
  "animation": {
    "enter": "bounce-in",
    "duration": 800,
    "easing": "ease-out",
    "step": 0
  }
}
```

That's it! No other files need modification.

### Keyframe Format Reference

```javascript
// Simple two-state animation (from → to)
'my-anim': [
  { opacity: 0, transform: 'translateY(20px)' },  // start state
  { opacity: 1, transform: 'translateY(0)' }       // end state
]

// Multi-step animation with offset (0-1)
'my-anim': [
  { opacity: 0, transform: 'scale(0)', offset: 0 },
  { opacity: 1, transform: 'scale(1.1)', offset: 0.7 },
  { opacity: 1, transform: 'scale(1)', offset: 1 }
]
```

Supported CSS properties in keyframes: `opacity`, `transform`, `filter`, `color`, `background-color`, and any animatable CSS property.

## Adding a New Canvas FX

Canvas FX are full-screen background effects rendered on `<canvas>`.

### Step 1: Create the FX module

Create `runtime/fx/my-effect.js`:

```javascript
// Register under window.HPX namespace
(window.HPX = window.HPX || {})['my-effect'] = function (container) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Responsive sizing
  const ro = new ResizeObserver(() => {
    canvas.width = container.clientWidth * devicePixelRatio;
    canvas.height = container.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  });
  ro.observe(container);

  // Read theme colors from CSS custom properties
  const style = getComputedStyle(container);
  const accent = style.getPropertyValue('--accent').trim() || '#58a6ff';

  // Animation loop
  let running = true;
  function loop() {
    if (!running) return;
    const w = container.clientWidth, h = container.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // ... your drawing logic here ...

    requestAnimationFrame(loop);
  }
  loop();

  // Return stop handle (called when slide deactivates)
  return {
    stop() {
      running = false;
      ro.disconnect();
      canvas.remove();
    }
  };
};
```

### Step 2: Use it in the DSL

```json
{
  "id": "my-slide",
  "fx": ["my-effect"],
  "elements": [...]
}
```

The `fx-runtime.js` auto-discovers and initializes any FX module registered under `window.HPX`.

## DSL Animation Property Reference

```typescript
interface Animation {
  enter?: string;      // Animation name (key in KEYFRAMES registry)
  duration?: number;   // Milliseconds (default: 600)
  delay?: number;      // Milliseconds (default: 0)
  easing?: string;     // CSS easing function (default: "ease")
  step?: number;       // 0 = auto-play on slide enter, N = Nth click
}
```

### Step Semantics

| Value | Behavior |
|-------|----------|
| `step: 0` (default) | Auto-play when slide becomes active, with stagger |
| `step: 1` | Animate on first click/keypress within the slide |
| `step: 2` | Animate on second click/keypress |
| Same step on multiple elements | They animate simultaneously |

## Timeline Engine API

The timeline engine exposes `window.__vsliTimeline`:

```javascript
window.__vsliTimeline.play()              // Resume paused animations
window.__vsliTimeline.pause()             // Pause running animations
window.__vsliTimeline.seek(step)          // Jump to specific step
window.__vsliTimeline.getCurrentStep()    // Current step number
window.__vsliTimeline.getTotalSteps()     // Total steps for active slide
window.__vsliTimeline.onStepChange(cb)    // Register step change callback
```

## Runtime Keyboard Controls

The live HTML runtime follows a reveal.js-inspired split between slide routes and animation fragments:

| Key | Runtime behavior |
|-----|------------------|
| `←` / `→` | Switch slides directly; these keys bypass the timeline so slide movement is predictable. |
| `↑` / `↓` | Step backward/forward within the active slide's animation timeline. |
| `Space` / `Enter` | Convenience forward action: step the timeline when possible, otherwise move to the next slide. |
| `Backspace` | Convenience backward action: step backward when possible, otherwise move to the previous slide. |
| `L` | Toggle laser pointer mode. Move the mouse to point; press and hold the left mouse button to leave a temporary smoothed, tapered red trail that fades after a few seconds. |
| `W` | Toggle the popup whiteboard. Marker strokes use smoothed curves instead of raw line-segment joins; the toolbar includes Marker/Eraser, Undo/Redo, size, color, Clear, and Close controls. |

Presenter mode forwards `↑` / `↓` over the existing BroadcastChannel so the presenter window can drive audience-view animation steps without changing slides. Current/next preview iframes hide deck chrome such as the progress bar and slide number; the timer card remains the single presenter-facing slide index.

## Slide Transitions

Slide-to-slide transitions are configured separately from per-element
animations under `meta.htmlRuntime.transition`:

```json
{
  "meta": {
    "title": "Transition demo",
    "canvas": { "width": 1280, "height": 720 },
    "htmlRuntime": {
      "transition": {
        "type": "fade",
        "durationMs": 450,
        "easing": "ease",
        "autoAnimate": true,
        "unmatched": "fade"
      }
    }
  },
  "slides": []
}
```

This transition layer is **HTML runtime only**. SVG, PDF, and PPTX exporters
ignore `meta.htmlRuntime` so static export remains deterministic; use element
`animation` for browser timeline steps and treat slide transitions as live
presentation polish.

Current behavior is intentionally bounded:

- `type: "fade" | "slide" | "none"`
- `autoAnimate: true` matches adjacent-slide elements by shared data keys derived
  from DSL element IDs.
- DOM IDs are slide-scoped to avoid duplicate IDs when adjacent slides share the
  same DSL element ID.
- `prefers-reduced-motion` disables motion-heavy transitions.
- The `projects/cuszp-pptxgenjs/dsl/deck.json` fixture is configured as a
  live-inspection example.

## Data Attribute Reference

| Attribute | Purpose |
|-----------|---------|
| `data-anim-enter` | Animation name (KEYFRAMES registry key) |
| `data-anim-step` | Step number (0 = auto, N = click) |
| `data-anim-duration` | Duration in ms |
| `data-anim-delay` | Delay in ms |
| `data-anim-easing` | CSS easing function |
| `data-anim-final-opacity` | Target opacity (for elements with DSL opacity) |
| `data-fx` | Canvas FX name (on slide-level container divs) |

## Available Starter Animations

| Name | Effect |
|------|--------|
| `fade-up` | Fade in while sliding up 30px |
| `fade-down` | Fade in while sliding down 30px |
| `fade-left` | Fade in while sliding left 30px |
| `fade-right` | Fade in while sliding right 30px |
| `scale-in` | Fade in while scaling from 80% |
| `blur-in` | Fade in while removing 8px blur |
| `slide-from-left` | Slide in from -100% left |
| `slide-from-right` | Slide in from 100% right |
| `rise-in` | Fade in while rising 60px |
| `zoom-pop` | Scale from 0 → 1.1 → 1 with overshoot |
| `rotate-in` | Fade in with -10deg rotation |

## Available Canvas FX

| Name | Effect |
|------|--------|
| `gradient-blob` | 4 drifting blurred radial gradients |
| `constellation` | Points connected when within 150px |
| `starfield` | 3D perspective stars flying outward |
| `orbit-ring` | Concentric rings with orbiting dots |
| `sparkle-trail` | Pointer-driven sparkle emitter |
