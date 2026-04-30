/* Text Animation Effect: Morph
 * Morphs text content from current to target using LCS (Longest Common Subsequence).
 * Matched graphemes animate position, unmatched fade out/in.
 * Triggered when animatedText element has morphTo field.
 */
(function () {
  'use strict';
  var I = window.MaliangInterpolate;

  /**
   * Compute LCS (Longest Common Subsequence) indices.
   * Returns array of [oldIdx, newIdx] pairs for matched characters.
   */
  function lcs(oldChars, newChars) {
    var m = oldChars.length;
    var n = newChars.length;
    // DP table
    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp[i] = new Array(n + 1).fill(0);
    }
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        if (oldChars[i - 1] === newChars[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    // Backtrack to find matches
    var matches = [];
    var i = m, j = n;
    while (i > 0 && j > 0) {
      if (oldChars[i - 1] === newChars[j - 1]) {
        matches.unshift([i - 1, j - 1]);
        i--; j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    return matches;
  }

  window.__textAnimEffects.morph = function (spans, config, container) {
    // Read morph target from extension config
    var extConfig = window.__vsliExtensions.readConfig(container);
    var morphTo = extConfig && extConfig.morphTo;
    if (!morphTo) return null;

    var duration = (extConfig && extConfig.morphDuration) || config.duration || 1200;
    var easing = I ? I.getEasing(config.easing || 'easeInOutCubic') : function (t) { return t; };

    // Get current characters
    var oldChars = spans.map(function (s) { return s.textContent; });
    var newChars = window.TextSplitter.splitGraphemes(morphTo);

    // Compute LCS matching
    var matches = lcs(oldChars, newChars);
    var matchedOld = new Set(matches.map(function (m) { return m[0]; }));
    var matchedNew = new Set(matches.map(function (m) { return m[1]; }));

    // Measure current positions
    var containerRect = container.getBoundingClientRect();
    var oldPositions = spans.map(function (s) {
      var r = s.getBoundingClientRect();
      return { x: r.left - containerRect.left, y: r.top - containerRect.top, w: r.width, h: r.height };
    });

    // Create a hidden measurement container for new text
    var measureDiv = document.createElement('div');
    measureDiv.style.cssText = container.style.cssText;
    measureDiv.style.position = 'absolute';
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.pointerEvents = 'none';
    measureDiv.textContent = morphTo;
    container.parentNode.appendChild(measureDiv);

    // Split and measure new positions
    var newSpans = window.TextSplitter.graphemes(measureDiv);
    var newPositions = newSpans.map(function (s) {
      var r = s.getBoundingClientRect();
      var mr = measureDiv.getBoundingClientRect();
      return { x: r.left - mr.left, y: r.top - mr.top, w: r.width, h: r.height };
    });
    container.parentNode.removeChild(measureDiv);

    // Setup animation: position container relatively
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // Convert all spans to absolute positioning
    spans.forEach(function (span, i) {
      span.style.position = 'absolute';
      span.style.left = oldPositions[i].x + 'px';
      span.style.top = oldPositions[i].y + 'px';
      span.style.transition = 'none';
    });

    // Create spans for new characters that don't match
    var addedSpans = [];
    newChars.forEach(function (ch, ni) {
      if (matchedNew.has(ni)) return;
      var span = document.createElement('span');
      span.textContent = ch;
      span.style.cssText = 'position:absolute;display:inline-block;opacity:0;';
      span.style.left = newPositions[ni].x + 'px';
      span.style.top = newPositions[ni].y + 'px';
      span.setAttribute('aria-hidden', 'true');
      container.appendChild(span);
      addedSpans.push({ span: span, pos: newPositions[ni], idx: ni });
    });

    // Animate
    var startTime = performance.now();
    var rafId = null;
    var stopped = false;

    function tick() {
      if (stopped) return;
      var elapsed = performance.now() - startTime;
      var t = Math.min(elapsed / duration, 1);
      var e = easing(t);

      // Matched: move from old position to new position
      matches.forEach(function (pair) {
        var oldIdx = pair[0];
        var newIdx = pair[1];
        var span = spans[oldIdx];
        var ox = oldPositions[oldIdx].x;
        var oy = oldPositions[oldIdx].y;
        var nx = newPositions[newIdx].x;
        var ny = newPositions[newIdx].y;
        span.style.left = I.lerp(ox, nx, e) + 'px';
        span.style.top = I.lerp(oy, ny, e) + 'px';
        span.style.opacity = '1';
      });

      // Removed old: fade out
      spans.forEach(function (span, i) {
        if (!matchedOld.has(i)) {
          span.style.opacity = String(1 - e);
          span.style.transform = 'scale(' + I.lerp(1, 0.5, e) + ')';
        }
      });

      // Added new: fade in (delayed start)
      var fadeInStart = 0.3;
      var fadeT = t > fadeInStart ? (t - fadeInStart) / (1 - fadeInStart) : 0;
      addedSpans.forEach(function (item) {
        item.span.style.opacity = String(fadeT);
        item.span.style.transform = 'scale(' + I.lerp(0.5, 1, Math.min(1, fadeT * 1.5)) + ')';
      });

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        // Finalize: replace content with morphed result
        container.textContent = '';
        container.style.position = '';
        container.style.overflow = '';
        container.textContent = morphTo;
        // Re-apply aria
        container.setAttribute('aria-label', morphTo);
      }
    }

    // Delay morph start slightly to let user see the original
    setTimeout(function () {
      if (!stopped) rafId = requestAnimationFrame(tick);
    }, 500);

    return {
      stop: function () {
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
      },
    };
  };
})();
