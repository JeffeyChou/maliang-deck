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

  function init(el, config) {
    if (!config || !config.textAnimation) return null;

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
