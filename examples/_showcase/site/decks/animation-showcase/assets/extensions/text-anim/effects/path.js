/* Text Animation Effect: Path
 * Positions characters along an SVG path using getPointAtLength().
 * Supports animated offset scrolling along the path.
 * Requires a hidden <svg> with a <path> element rendered by animatedText.ts.
 */
(function () {
  'use strict';

  window.__textAnimEffects.path = function (spans, config, container) {
    if (!spans.length) return null;

    // Find the path config from the extension config
    var extConfig = window.__vsliExtensions.readConfig(container);
    var pathConfig = extConfig && extConfig.path;
    if (!pathConfig || !pathConfig.d) return null;

    // Find or create an SVG path element to measure
    var elemId = container.getAttribute('data-maliang-deck-id') || container.id;
    var pathEl = document.getElementById(elemId + '-path');

    if (!pathEl) {
      // Create a temporary SVG to get path measurements
      var tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tempSvg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
      tempSvg.setAttribute('aria-hidden', 'true');
      var tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tempPath.setAttribute('d', pathConfig.d);
      tempSvg.appendChild(tempPath);
      document.body.appendChild(tempSvg);
      pathEl = tempPath;
    }

    var totalLength = pathEl.getTotalLength();
    if (totalLength <= 0) return null;

    // Calculate character widths for spacing along path
    var charWidths = spans.map(function (span) {
      return span.offsetWidth || 10;
    });
    var totalTextWidth = charWidths.reduce(function (a, b) { return a + b; }, 0);

    // Compute starting offset based on align
    var align = pathConfig.align || 'start';
    var baseOffset = 0;
    if (align === 'center') baseOffset = (totalLength - totalTextWidth) / 2;
    else if (align === 'end') baseOffset = totalLength - totalTextWidth;

    // Initial static offset (0-1 range mapped to path length)
    var staticOffset = (pathConfig.offset || 0) * totalLength;

    // Position container relatively for absolute-positioned children
    container.style.position = 'relative';
    container.style.width = container.style.width || (container.offsetWidth + 'px');
    container.style.height = container.style.height || (container.offsetHeight + 'px');

    // Get container bounds for relative positioning
    var containerRect = container.getBoundingClientRect();
    var containerX = containerRect.left;
    var containerY = containerRect.top;

    // Position each character on the path
    function positionChars(animOffset) {
      var accumulated = baseOffset + staticOffset + animOffset;

      spans.forEach(function (span, i) {
        var charCenter = accumulated + charWidths[i] / 2;
        // Wrap around path length
        var wrappedPos = ((charCenter % totalLength) + totalLength) % totalLength;

        var point = pathEl.getPointAtLength(wrappedPos);

        // Get tangent angle for rotation
        var tangentPoint = pathEl.getPointAtLength(Math.min(wrappedPos + 1, totalLength));
        var angle = Math.atan2(tangentPoint.y - point.y, tangentPoint.x - point.x) * (180 / Math.PI);

        span.style.position = 'absolute';
        span.style.left = point.x + 'px';
        span.style.top = point.y + 'px';
        span.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';
        span.style.transformOrigin = 'center center';
        span.style.opacity = '1';
        span.style.whiteSpace = 'nowrap';

        accumulated += charWidths[i];
      });
    }

    // Initial positioning
    positionChars(0);

    // Animate if configured
    var stopped = false;
    var rafId = null;

    if (pathConfig.animate) {
      var animDuration = pathConfig.animateDuration || 4000;
      var startTime = performance.now();

      function tick() {
        if (stopped) return;
        var elapsed = performance.now() - startTime;
        var progress = (elapsed % animDuration) / animDuration; // Loops forever
        var animOffset = progress * totalLength;
        positionChars(animOffset);
        rafId = requestAnimationFrame(tick);
      }

      rafId = requestAnimationFrame(tick);
    }

    return {
      stop: function () {
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
      },
    };
  };
})();
