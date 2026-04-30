/* Text Animation Effect: Rotate Chars
 * Each unit rotates in from a random angle.
 */
(function () {
  'use strict';
  var I = window.MaliangInterpolate;

  window.__textAnimEffects['rotate-chars'] = function (spans, config) {
    if (!spans.length) return null;
    var staggerMs = config.stagger ?? 40;
    var duration = config.duration ?? 600;
    var easing = I.getEasing(config.easing || 'easeOutCubic');
    var direction = config.direction || 'forward';

    var order = getOrder(spans.length, direction);
    var delays = new Array(spans.length);
    order.forEach(function (spanIdx, position) { delays[spanIdx] = position * staggerMs; });

    // Random starting angle per character
    var angles = spans.map(function () { return (Math.random() - 0.5) * 180; });

    var totalDuration = (spans.length - 1) * staggerMs + duration;
    var startTime = performance.now();
    var rafId = null;
    var stopped = false;

    spans.forEach(function (span, i) {
      span.style.opacity = '0';
      span.style.transform = 'rotate(' + angles[i] + 'deg) scale(0.5)';
      span.style.transformOrigin = 'center center';
    });

    function tick() {
      if (stopped) return;
      var elapsed = performance.now() - startTime;
      spans.forEach(function (span, i) {
        var localTime = elapsed - delays[i];
        if (localTime < 0) return;
        var t = I.clamp(localTime / duration, 0, 1);
        var e = easing(t);
        span.style.opacity = String(e);
        span.style.transform = 'rotate(' + I.lerp(angles[i], 0, e) + 'deg) scale(' + I.lerp(0.5, 1, e) + ')';
      });
      if (elapsed < totalDuration) { rafId = requestAnimationFrame(tick); }
      else { spans.forEach(function (s) { s.style.opacity = '1'; s.style.transform = 'none'; }); }
    }
    rafId = requestAnimationFrame(tick);
    return { stop: function () { stopped = true; if (rafId) cancelAnimationFrame(rafId); } };
  };

  function getOrder(count, direction) {
    var indices = []; for (var i = 0; i < count; i++) indices.push(i);
    if (direction === 'backward') return indices.reverse();
    if (direction === 'center') { var mid = Math.floor(count/2); var r=[mid]; for(var d=1;d<=mid;d++){if(mid-d>=0)r.push(mid-d);if(mid+d<count)r.push(mid+d);} return r; }
    if (direction === 'random') { for(var j=indices.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1));var t=indices[j];indices[j]=indices[k];indices[k]=t;} }
    return indices;
  }
})();
