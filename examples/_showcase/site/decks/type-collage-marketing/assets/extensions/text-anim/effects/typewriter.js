/* Text Animation Effect: Typewriter
 * Reveals characters sequentially with a blinking cursor.
 * Classic typewriter feel with configurable speed.
 */
(function () {
  'use strict';

  window.__textAnimEffects.typewriter = function (spans, config, container) {
    if (!spans.length) return null;

    var staggerMs = config.stagger ?? 60;
    var direction = config.direction || 'forward';
    var stopped = false;

    // Typewriter always goes forward by default (direction only reverses start point)
    var order = [];
    if (direction === 'backward') {
      for (var i = spans.length - 1; i >= 0; i--) order.push(i);
    } else {
      for (var j = 0; j < spans.length; j++) order.push(j);
    }

    // Hide all spans initially
    spans.forEach(function (span) {
      span.style.opacity = '0';
      span.style.transition = 'none';
    });

    // Create cursor element
    var cursor = document.createElement('span');
    cursor.textContent = '|';
    cursor.style.cssText = 'display:inline-block; animation: typewriter-blink 0.7s step-end infinite; font-weight:normal; margin-left:-1px;';
    cursor.setAttribute('aria-hidden', 'true');

    // Add blink keyframes if not already present
    if (!document.getElementById('typewriter-blink-style')) {
      var style = document.createElement('style');
      style.id = 'typewriter-blink-style';
      style.textContent = '@keyframes typewriter-blink { 0%,100%{opacity:1} 50%{opacity:0} }';
      document.head.appendChild(style);
    }

    var currentIdx = 0;
    var intervalId = null;

    function revealNext() {
      if (stopped || currentIdx >= order.length) {
        // Done — remove cursor after a brief pause
        if (cursor.parentNode) {
          setTimeout(function () {
            if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
          }, 1000);
        }
        if (intervalId) clearInterval(intervalId);
        return;
      }

      var spanIdx = order[currentIdx];
      spans[spanIdx].style.opacity = '1';

      // Move cursor after the revealed character
      var nextSpan = spans[spanIdx];
      if (nextSpan.parentNode) {
        nextSpan.parentNode.insertBefore(cursor, nextSpan.nextSibling);
      }

      currentIdx++;
    }

    // Insert cursor at start
    var firstSpanIdx = order[0];
    if (spans[firstSpanIdx] && spans[firstSpanIdx].parentNode) {
      spans[firstSpanIdx].parentNode.insertBefore(cursor, spans[firstSpanIdx]);
    }

    intervalId = setInterval(revealNext, staggerMs);

    return {
      stop: function () {
        stopped = true;
        if (intervalId) clearInterval(intervalId);
        if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
        // Show all spans
        spans.forEach(function (span) {
          span.style.opacity = '1';
        });
      },
    };
  };
})();
