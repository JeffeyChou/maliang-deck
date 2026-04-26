/* Maliang Deck Text Animation Extension
 * Registers with __vsliExtensions to animate [data-animated-text] elements.
 * Uses TextSplitter for grapheme/word/line splitting and MaliangInterpolate for easing.
 * Integrates with __vsliTimeline continuous tracks for duration-based playback.
 */
(function () {
  'use strict';

  // Effect registry — each effect is a function(spans, config, timeline) returning { stop }
  var effects = {};

  /**
   * Load effect modules. They register themselves on this object.
   */
  window.__textAnimEffects = effects;

  // Reduced motion: skip all animations, show final state immediately
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(el, config) {
    if (!config || !config.textAnimation) return null;

    // Reduced motion: show content immediately without animation
    if (reducedMotion) {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      return { handles: [] };
    }

    var anims = Array.isArray(config.textAnimation)
      ? config.textAnimation
      : [config.textAnimation];

    var handles = [];

    // If path config exists, use the path effect (overrides normal animation flow)
    if (config.path && config.path.d && effects.path) {
      var pathSpans = window.TextSplitter.graphemes(el);
      var pathHandle = effects.path(pathSpans, config.textAnimation[0] || config.textAnimation, el);
      if (pathHandle) handles.push(pathHandle);
      return { handles: handles };
    }

    // If morphTo exists, run the normal animation first then trigger morph
    if (config.morphTo && effects.morph) {
      // Morph runs after the primary animation completes
      var morphDelay = 0;
      anims.forEach(function (a) {
        var d = (a.duration || 600) + ((a.stagger || 50) * el.textContent.length);
        if (d > morphDelay) morphDelay = d;
      });
      setTimeout(function () {
        if (handles.some(function (h) { return h && h.stopped; })) return;
        var morphSpans = el.querySelectorAll('[data-char-idx], [data-word-idx]');
        var spanArray = Array.prototype.slice.call(morphSpans);
        if (spanArray.length === 0) spanArray = window.TextSplitter.graphemes(el);
        var morphHandle = effects.morph(spanArray, anims[0] || {}, el);
        if (morphHandle) handles.push(morphHandle);
      }, morphDelay + 200);
    }

    anims.forEach(function (animConfig) {
      var effectFn = effects[animConfig.name];
      if (!effectFn) {
        console.warn('[text-anim] Unknown effect:', animConfig.name);
        return;
      }

      // Split text according to splitMode
      var splitMode = animConfig.splitMode || 'char';
      var spans;
      if (splitMode === 'word') {
        spans = window.TextSplitter.words(el);
      } else if (splitMode === 'line') {
        // Line splitting is async (needs font load) — handle differently
        window.TextSplitter.lines(el).then(function (lineSpans) {
          var handle = effectFn(lineSpans, animConfig, el);
          if (handle) handles.push(handle);
        });
        return;
      } else {
        spans = window.TextSplitter.graphemes(el);
      }

      var handle = effectFn(spans, animConfig, el);
      if (handle) handles.push(handle);
    });

    return { handles: handles };
  }

  function stop(el, state) {
    if (!state || !state.handles) return;
    state.handles.forEach(function (h) {
      if (h && h.stop) h.stop();
    });
  }

  // Register with extension runtime
  if (window.__vsliExtensions) {
    window.__vsliExtensions.register({
      selector: '[data-animated-text]',
      init: init,
      stop: stop,
    });
  }
})();
