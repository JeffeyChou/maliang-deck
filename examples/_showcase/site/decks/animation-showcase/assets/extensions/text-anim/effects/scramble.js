/* Text Animation Effect: Scramble
 * Characters cycle through random glyphs before resolving to final text.
 */
(function () {
  'use strict';

  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';

  window.__textAnimEffects.scramble = function (spans, config) {
    if (!spans.length) return null;
    var staggerMs = config.stagger ?? 40;
    var duration = config.duration ?? 800;
    var direction = config.direction || 'forward';

    var order = getOrder(spans.length, direction);
    var delays = new Array(spans.length);
    order.forEach(function (spanIdx, position) { delays[spanIdx] = position * staggerMs; });

    var originals = spans.map(function (s) { return s.textContent; });
    var totalDuration = (spans.length - 1) * staggerMs + duration;
    var startTime = performance.now();
    var rafId = null;
    var stopped = false;

    // Show all spans but with scrambled content
    spans.forEach(function (span) {
      span.style.opacity = '1';
    });

    function tick() {
      if (stopped) return;
      var elapsed = performance.now() - startTime;

      spans.forEach(function (span, i) {
        var localTime = elapsed - delays[i];
        if (localTime < 0) {
          // Not started yet — show random char
          span.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
          return;
        }
        var t = Math.min(localTime / duration, 1);
        if (t >= 1) {
          span.textContent = originals[i];
        } else if (t > 0.7) {
          // Settling — mostly correct with occasional flicker
          span.textContent = Math.random() > 0.3 ? originals[i] : CHARS[Math.floor(Math.random() * CHARS.length)];
        } else {
          span.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      });

      if (elapsed < totalDuration) { rafId = requestAnimationFrame(tick); }
      else { spans.forEach(function (s, i) { s.textContent = originals[i]; }); }
    }
    rafId = requestAnimationFrame(tick);
    return { stop: function () { stopped = true; if (rafId) cancelAnimationFrame(rafId); spans.forEach(function (s, i) { s.textContent = originals[i]; }); } };
  };

  function getOrder(count, direction) {
    var indices = []; for (var i = 0; i < count; i++) indices.push(i);
    if (direction === 'backward') return indices.reverse();
    if (direction === 'random') { for(var j=indices.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1));var t=indices[j];indices[j]=indices[k];indices[k]=t;} }
    return indices;
  }
})();
