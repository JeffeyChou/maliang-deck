/* Text Animation Effect: Stagger
 * Reveals characters/words one by one with configurable direction and timing.
 * Each unit fades in and translates from an offset position.
 */
(function () {
  'use strict';

  var I = window.MaliangInterpolate;

  /**
   * Compute stagger order based on direction.
   * Returns an array of indices in the order they should animate.
   */
  function getOrder(count, direction) {
    var indices = [];
    for (var i = 0; i < count; i++) indices.push(i);

    switch (direction) {
      case 'backward':
        return indices.reverse();
      case 'center': {
        var mid = Math.floor(count / 2);
        var result = [mid];
        for (var d = 1; d <= mid; d++) {
          if (mid - d >= 0) result.push(mid - d);
          if (mid + d < count) result.push(mid + d);
        }
        return result;
      }
      case 'edges': {
        var res = [];
        var l = 0, r = count - 1;
        while (l <= r) {
          res.push(l);
          if (l !== r) res.push(r);
          l++; r--;
        }
        return res;
      }
      case 'random': {
        var arr = indices.slice();
        for (var j = arr.length - 1; j > 0; j--) {
          var k = Math.floor(Math.random() * (j + 1));
          var tmp = arr[j]; arr[j] = arr[k]; arr[k] = tmp;
        }
        return arr;
      }
      default: // 'forward'
        return indices;
    }
  }

  window.__textAnimEffects.stagger = function (spans, config) {
    if (!spans.length) return null;

    var staggerMs = config.stagger ?? 50;
    var duration = config.duration ?? 600;
    var easing = I.getEasing(config.easing || 'easeOutCubic');
    var direction = config.direction || 'forward';
    var order = getOrder(spans.length, direction);

    // Create a priority array: order[i] = which span animates at position i
    var delays = new Array(spans.length);
    order.forEach(function (spanIdx, position) {
      delays[spanIdx] = position * staggerMs;
    });

    var totalDuration = (spans.length - 1) * staggerMs + duration;
    var startTime = performance.now();
    var rafId = null;
    var stopped = false;

    // Initialize: hide all spans
    spans.forEach(function (span) {
      span.style.opacity = '0';
      span.style.transform = 'translateY(20px)';
      span.style.transition = 'none';
    });

    function tick() {
      if (stopped) return;
      var elapsed = performance.now() - startTime;

      spans.forEach(function (span, i) {
        var localTime = elapsed - delays[i];
        if (localTime < 0) return;
        var t = I.clamp(localTime / duration, 0, 1);
        var easedT = easing(t);

        span.style.opacity = String(easedT);
        span.style.transform = 'translateY(' + I.lerp(20, 0, easedT) + 'px)';
      });

      if (elapsed < totalDuration) {
        rafId = requestAnimationFrame(tick);
      } else {
        // Ensure all spans are fully visible
        spans.forEach(function (span) {
          span.style.opacity = '1';
          span.style.transform = 'translateY(0)';
        });
      }
    }

    rafId = requestAnimationFrame(tick);

    return {
      stop: function () {
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
      },
    };
  };
})();
