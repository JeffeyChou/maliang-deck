/* Text Animation Effect: Glitch
 * Digital glitch — random displacement, color shifts, and flicker.
 */
(function () {
  'use strict';
  var I = window.MaliangInterpolate;

  window.__textAnimEffects.glitch = function (spans, config) {
    if (!spans.length) return null;
    var duration = config.duration ?? 1500;
    var staggerMs = config.stagger ?? 20;
    var direction = config.direction || 'forward';

    var order = getOrder(spans.length, direction);
    var delays = new Array(spans.length);
    order.forEach(function (spanIdx, position) { delays[spanIdx] = position * staggerMs; });

    var totalDuration = (spans.length - 1) * staggerMs + duration;
    var startTime = performance.now();
    var rafId = null;
    var stopped = false;

    var glitchColors = ['#ff0040', '#00ff41', '#4040ff', '#ff00ff', '#00ffff'];

    spans.forEach(function (span) {
      span.style.opacity = '0';
      span.style.position = 'relative';
    });

    function tick() {
      if (stopped) return;
      var elapsed = performance.now() - startTime;

      spans.forEach(function (span, i) {
        var localTime = elapsed - delays[i];
        if (localTime < 0) return;
        var t = I.clamp(localTime / duration, 0, 1);

        if (t >= 1) {
          // Settled
          span.style.opacity = '1';
          span.style.transform = 'none';
          span.style.color = '';
          span.style.textShadow = '';
          return;
        }

        span.style.opacity = '1';

        // Glitch intensity decreases over time
        var intensity = (1 - t) * (1 - t);

        if (Math.random() < intensity * 0.4) {
          // Random displacement
          var dx = (Math.random() - 0.5) * 20 * intensity;
          var dy = (Math.random() - 0.5) * 8 * intensity;
          span.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
        } else {
          span.style.transform = 'none';
        }

        if (Math.random() < intensity * 0.3) {
          // Color shift
          span.style.color = glitchColors[Math.floor(Math.random() * glitchColors.length)];
          span.style.textShadow = (Math.random() * 4 - 2) + 'px 0 ' + glitchColors[Math.floor(Math.random() * glitchColors.length)];
        } else {
          span.style.color = '';
          span.style.textShadow = '';
        }

        if (Math.random() < intensity * 0.15) {
          // Flicker
          span.style.opacity = String(Math.random() * 0.5 + 0.5);
        }
      });

      if (elapsed < totalDuration) { rafId = requestAnimationFrame(tick); }
      else {
        spans.forEach(function (s) {
          s.style.opacity = '1';
          s.style.transform = 'none';
          s.style.color = '';
          s.style.textShadow = '';
        });
      }
    }
    rafId = requestAnimationFrame(tick);
    return { stop: function () { stopped = true; if (rafId) cancelAnimationFrame(rafId); } };
  };

  function getOrder(count, direction) {
    var indices = []; for (var i = 0; i < count; i++) indices.push(i);
    if (direction === 'backward') return indices.reverse();
    if (direction === 'random') { for(var j=indices.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1));var t=indices[j];indices[j]=indices[k];indices[k]=t;} }
    return indices;
  }
})();
