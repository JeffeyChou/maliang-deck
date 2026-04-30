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

    // Save original content for clean restoration on stop
    var originalHTML = el.innerHTML;
    var state = { handles: [], originalHTML: originalHTML, stopped: false, timers: [] };

    // Reduced motion: show content immediately without animation
    if (reducedMotion) {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      return state;
    }

    var anims = Array.isArray(config.textAnimation)
      ? config.textAnimation
      : [config.textAnimation];

    // If path config exists, use the path effect (overrides normal animation flow)
    if (config.path && config.path.d && effects.path) {
      var pathSpans = window.TextSplitter.graphemes(el);
      var pathHandle = effects.path(pathSpans, config.textAnimation[0] || config.textAnimation, el);
      if (pathHandle) state.handles.push(pathHandle);
      el.style.opacity = '1';
      return state;
    }

    // If morphTo exists, run the normal animation first then trigger morph
    if (config.morphTo && effects.morph) {
      // Morph runs after the primary animation completes
      var morphDelay = 0;
      anims.forEach(function (a) {
        var d = (a.duration || 600) + ((a.stagger || 50) * el.textContent.length);
        if (d > morphDelay) morphDelay = d;
      });
      var morphTimer = setTimeout(function () {
        if (state.stopped) return;
        var morphSpans = el.querySelectorAll('[data-char-idx], [data-word-idx]');
        var spanArray = Array.prototype.slice.call(morphSpans);
        if (spanArray.length === 0) spanArray = window.TextSplitter.graphemes(el);
        var morphHandle = effects.morph(spanArray, anims[0] || {}, el);
        if (morphHandle) state.handles.push(morphHandle);
      }, morphDelay + 200);
      state.timers.push(morphTimer);
    }

    var hasAsyncEffect = false;

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
        hasAsyncEffect = true;
        // Line splitting is async (needs font load) — handle differently
        window.TextSplitter.lines(el).then(function (lineSpans) {
          if (state.stopped) return;
          var handle = effectFn(lineSpans, animConfig, el);
          if (handle) state.handles.push(handle);
          el.style.opacity = '1';
        });
        return;
      } else {
        spans = window.TextSplitter.graphemes(el);
      }

      var handle = effectFn(spans, animConfig, el);
      if (handle) state.handles.push(handle);
    });

    // Reveal container after sync effects have set initial span states
    if (!hasAsyncEffect) {
      el.style.opacity = '1';
    }

    return state;
  }

  function stop(el, state) {
    if (!state) return;
    state.stopped = true;

    // Cancel pending morph/delayed timers
    if (state.timers) {
      state.timers.forEach(function (t) { clearTimeout(t); });
    }

    // Cancel running animations
    if (state.handles) {
      state.handles.forEach(function (h) {
        if (h && h.stop) h.stop();
      });
    }

    // Restore original content for clean re-initialization
    if (state.originalHTML != null) {
      el.innerHTML = state.originalHTML;
    }

    // Remove inline opacity so CSS rule ([data-animated-text] { opacity: 0 }) takes over
    el.style.opacity = '';
    el.removeAttribute('aria-label');
    el.removeAttribute('role');
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
