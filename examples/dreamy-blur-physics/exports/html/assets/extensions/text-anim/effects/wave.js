/* Text Animation Effect: Wave
 * Continuous sine-wave vertical displacement across characters.
 * Creates a flowing wave motion that loops indefinitely.
 */
(function () {
  'use strict';

  var I = window.MaliangInterpolate;

  window.__textAnimEffects.wave = function (spans, config) {
    if (!spans.length) return null;

    var duration = config.duration ?? 2000; // Full wave cycle duration
    var amplitude = 12; // Pixels of vertical displacement
    var stagger = config.stagger ?? 80; // Phase offset between characters in ms
    var easing = config.easing; // Optional: unused for wave (sine is natural)
    var stopped = false;
    var rafId = null;

    // Make all spans visible immediately
    spans.forEach(function (span) {
      span.style.opacity = '1';
      span.style.transition = 'none';
      span.style.willChange = 'transform';
    });

    var startTime = performance.now();

    function tick() {
      if (stopped) return;
      var elapsed = performance.now() - startTime;

      spans.forEach(function (span, i) {
        // Each character has a phase offset
        var phase = (elapsed - i * stagger) / duration * Math.PI * 2;
        var y = Math.sin(phase) * amplitude;
        span.style.transform = 'translateY(' + y + 'px)';
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return {
      stop: function () {
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        // Reset transforms
        spans.forEach(function (span) {
          span.style.transform = '';
          span.style.willChange = '';
        });
      },
    };
  };
})();
