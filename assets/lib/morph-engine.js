/* Maliang Deck Morph Engine
 * Shared, reusable animation engine for shape and component morphing.
 * Consumes MaliangInterpolate for color, transform, and path interpolation.
 * Zero dependencies beyond interpolate.js.
 */
(function () {
  'use strict';

  var I = window.MaliangInterpolate;
  if (!I) {
    console.warn('[morph-engine] MaliangInterpolate not loaded');
    return;
  }

  // ─── Property Type Detection ────────────────────────────────────────────────

  var COLOR_RE = /^#([0-9a-f]{3,8})$/i;
  var RGB_RE = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/;

  function isColorValue(v) {
    if (typeof v !== 'string') return false;
    return COLOR_RE.test(v) || RGB_RE.test(v) || v === 'transparent' || v === 'none';
  }

  function normalizeColor(v) {
    if (!v || v === 'transparent' || v === 'none') return '#000000';
    if (COLOR_RE.test(v)) return v;
    var m = RGB_RE.exec(v);
    if (m) return I.rgbToHex(+m[1], +m[2], +m[3]);
    return v;
  }

  // ─── Property Reading ───────────────────────────────────────────────────────

  /**
   * Read morphable visual properties from a DOM element.
   * Returns a plain object suitable for interpolation.
   */
  function readShapeProps(el) {
    var style = getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    var parentRect = el.offsetParent ? el.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };

    return {
      x: parseFloat(el.style.left) || (rect.left - parentRect.left),
      y: parseFloat(el.style.top) || (rect.top - parentRect.top),
      width: parseFloat(style.width) || rect.width,
      height: parseFloat(style.height) || rect.height,
      opacity: parseFloat(style.opacity),
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      borderWidth: parseFloat(style.borderWidth) || 0,
      color: style.color,
      rotation: 0, // read from transform matrix if needed
    };
  }

  /**
   * Apply morphable properties to a DOM element.
   */
  function writeShapeProps(el, props) {
    if (props.x != null) el.style.left = props.x + 'px';
    if (props.y != null) el.style.top = props.y + 'px';
    if (props.width != null) el.style.width = props.width + 'px';
    if (props.height != null) el.style.height = props.height + 'px';
    if (props.opacity != null) el.style.opacity = String(props.opacity);
    if (props.backgroundColor != null) el.style.backgroundColor = props.backgroundColor;
    if (props.borderRadius != null) el.style.borderRadius = props.borderRadius;
    if (props.borderColor != null) el.style.borderColor = props.borderColor;
    if (props.borderWidth != null) el.style.borderWidth = props.borderWidth + 'px';
    if (props.color != null) el.style.color = props.color;
    if (props.fill != null) el.style.backgroundColor = props.fill;
    if (props.stroke != null) el.style.borderColor = props.stroke;
    if (props.strokeWidth != null) el.style.borderWidth = props.strokeWidth + 'px';
    if (props.radius != null) el.style.borderRadius = props.radius + 'px';
    if (props.rotation !== undefined) {
      var currentTransform = el.style.transform || '';
      // Strip existing rotate and add new one
      var stripped = currentTransform.replace(/rotate\([^)]*\)\s*/g, '').trim();
      if (props.rotation !== 0) {
        el.style.transform = (stripped ? stripped + ' ' : '') + 'rotate(' + props.rotation + 'deg)';
      } else {
        el.style.transform = stripped || '';
      }
    }
  }

  // ─── Property Interpolation ─────────────────────────────────────────────────

  /**
   * Interpolate between two property sets.
   * Handles numbers, colors (hex/rgb), and strings (snap at t=0.5).
   */
  function interpolateProps(from, to, t) {
    var result = {};
    var keys = Object.keys(to);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var a = from[key];
      var b = to[key];
      if (a == null || b == null) {
        result[key] = b;
        continue;
      }
      if (typeof a === 'number' && typeof b === 'number') {
        result[key] = I.lerp(a, b, t);
      } else if (isColorValue(a) && isColorValue(b)) {
        var ca = normalizeColor(a);
        var cb = normalizeColor(b);
        result[key] = I.lerpColor(ca, cb, t);
      } else {
        // Non-interpolatable: snap at halfway
        result[key] = t < 0.5 ? a : b;
      }
    }
    return result;
  }

  // ─── Animation Loop ─────────────────────────────────────────────────────────

  /**
   * Animate a shape element from one state to another.
   * Returns a handle with { cancel(), finished: Promise }.
   */
  function animateShape(el, from, to, duration, easingName, onComplete) {
    var easing = I.getEasing(easingName || 'easeInOutCubic');
    var startTime = -1;
    var rafId = 0;
    var cancelled = false;
    var resolveFinished;
    var finished = new Promise(function (resolve) { resolveFinished = resolve; });

    // Check reduced motion preference
    var mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mql && mql.matches) {
      writeShapeProps(el, to);
      if (onComplete) onComplete();
      resolveFinished();
      return { cancel: function () {}, finished: finished };
    }

    function tick(timestamp) {
      if (cancelled) return;
      if (startTime < 0) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var rawT = duration > 0 ? Math.min(elapsed / duration, 1) : 1;
      var t = easing(rawT);

      var interpolated = interpolateProps(from, to, t);
      writeShapeProps(el, interpolated);

      if (rawT < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        writeShapeProps(el, to);
        if (onComplete) onComplete();
        resolveFinished();
      }
    }

    rafId = requestAnimationFrame(tick);

    return {
      cancel: function () {
        cancelled = true;
        if (rafId) cancelAnimationFrame(rafId);
        resolveFinished();
      },
      finished: finished,
    };
  }

  /**
   * Instantly apply final morph state (for reduced-motion or cleanup).
   */
  function finalizeMorph(el, targetState) {
    writeShapeProps(el, targetState);
  }

  /**
   * Cancel a running morph animation.
   */
  function cancelMorph(handle) {
    if (handle && typeof handle.cancel === 'function') {
      handle.cancel();
    }
  }

  // ─── DSL-to-CSS Property Mapping ────────────────────────────────────────────

  /**
   * Convert DSL morph target properties to CSS-applicable properties.
   * Maps DSL field names (fill, stroke, radius) to CSS equivalents.
   */
  function dslTargetToCss(target, elementType) {
    var css = {};
    if (target.x != null) css.x = target.x;
    if (target.y != null) css.y = target.y;
    if (target.width != null) css.width = target.width;
    if (target.height != null) css.height = target.height;
    if (target.opacity != null) css.opacity = target.opacity;
    if (target.rotation != null) css.rotation = target.rotation;
    if (target.fill != null) css.backgroundColor = target.fill;
    if (target.stroke != null) css.borderColor = target.stroke;
    if (target.strokeWidth != null) css.borderWidth = target.strokeWidth;
    if (target.radius != null) {
      if (elementType === 'circle') {
        // Circle radius changes diameter
        var d = target.radius * 2;
        css.width = d;
        css.height = d;
        css.borderRadius = target.radius + 'px';
      } else {
        css.borderRadius = target.radius + 'px';
      }
    }
    return css;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  window.MaliangMorphEngine = {
    readShapeProps: readShapeProps,
    writeShapeProps: writeShapeProps,
    interpolateProps: interpolateProps,
    animateShape: animateShape,
    finalizeMorph: finalizeMorph,
    cancelMorph: cancelMorph,
    dslTargetToCss: dslTargetToCss,
    isColorValue: isColorValue,
    normalizeColor: normalizeColor,
  };
})();
