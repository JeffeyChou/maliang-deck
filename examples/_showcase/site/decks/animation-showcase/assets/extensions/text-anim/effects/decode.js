/* Text Animation Effect: Decode
 * Binary/cipher decode — characters appear as 0/1 then resolve to actual text.
 */
(function () {
  'use strict';

  var BINARY = '01';
  var HEX = '0123456789ABCDEF';

  window.__textAnimEffects.decode = function (spans, config) {
    if (!spans.length) return null;
    var staggerMs = config.stagger ?? 50;
    var duration = config.duration ?? 1000;
    var direction = config.direction || 'forward';

    var order = getOrder(spans.length, direction);
    var delays = new Array(spans.length);
    order.forEach(function (spanIdx, position) { delays[spanIdx] = position * staggerMs; });

    var originals = spans.map(function (s) { return s.textContent; });
    var totalDuration = (spans.length - 1) * staggerMs + duration;
    var startTime = performance.now();
    var rafId = null;
    var stopped = false;

    spans.forEach(function (span) {
      span.style.opacity = '1';
      span.style.color = 'inherit';
    });

    function tick() {
      if (stopped) return;
      var elapsed = performance.now() - startTime;

      spans.forEach(function (span, i) {
        var localTime = elapsed - delays[i];
        if (localTime < 0) {
          span.textContent = BINARY[Math.floor(Math.random() * 2)];
          span.style.opacity = '0.4';
          return;
        }
        var t = Math.min(localTime / duration, 1);
        if (t >= 1) {
          span.textContent = originals[i];
          span.style.opacity = '1';
        } else if (t > 0.6) {
          // Hex phase then resolve
          span.textContent = Math.random() > (t - 0.6) / 0.4 ? HEX[Math.floor(Math.random() * 16)] : originals[i];
          span.style.opacity = String(0.6 + t * 0.4);
        } else {
          // Binary phase
          span.textContent = BINARY[Math.floor(Math.random() * 2)];
          span.style.opacity = String(0.4 + t * 0.5);
        }
      });

      if (elapsed < totalDuration) { rafId = requestAnimationFrame(tick); }
      else { spans.forEach(function (s, i) { s.textContent = originals[i]; s.style.opacity = '1'; }); }
    }
    rafId = requestAnimationFrame(tick);
    return { stop: function () { stopped = true; if (rafId) cancelAnimationFrame(rafId); spans.forEach(function (s, i) { s.textContent = originals[i]; s.style.opacity = '1'; }); } };
  };

  function getOrder(count, direction) {
    var indices = []; for (var i = 0; i < count; i++) indices.push(i);
    if (direction === 'backward') return indices.reverse();
    if (direction === 'random') { for(var j=indices.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1));var t=indices[j];indices[j]=indices[k];indices[k]=t;} }
    return indices;
  }
})();
