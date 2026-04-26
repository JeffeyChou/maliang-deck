/* Maliang Deck Text Splitter
 * Splits text elements into individually addressable spans for animation.
 * Uses Intl.Segmenter for grapheme-correct splitting (emoji, ZWJ, RTL, combining marks).
 * Provides accessibility: aria-label on container, aria-hidden on child spans.
 */
(function () {
  'use strict';

  var hasSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';

  /**
   * Split a string into grapheme clusters.
   * Uses Intl.Segmenter where available, falls back to Array.from (codepoint-based).
   */
  function splitGraphemes(text) {
    if (hasSegmenter) {
      var segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      var segments = segmenter.segment(text);
      var result = [];
      for (var seg of segments) {
        result.push(seg.segment);
      }
      return result;
    }
    // Fallback: Array.from splits by codepoints (handles basic emoji but not ZWJ sequences)
    return Array.from(text);
  }

  /**
   * Split a string into words (preserving whitespace as separate segments).
   * Uses Intl.Segmenter where available, falls back to whitespace splitting.
   * Whitespace segments are included so that spacing is preserved in the DOM.
   */
  function splitWords(text) {
    if (hasSegmenter) {
      var segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
      var segments = segmenter.segment(text);
      var result = [];
      for (var seg of segments) {
        result.push(seg.segment);
      }
      return result;
    }
    // Fallback: split on whitespace boundaries, keep all segments including spaces
    return text.split(/(\s+)/).filter(function (s) { return s.length > 0; });
  }

  /**
   * Wrap each unit in a <span> with indexed data attributes.
   * Sets up accessibility attributes on the container.
   * @param {HTMLElement} el - Container element
   * @param {string[]} units - Array of text segments
   * @param {string} prefix - Data attribute prefix ('char', 'word', 'line')
   * @returns {HTMLElement[]} Array of created span elements
   */
  function wrapUnits(el, units, prefix) {
    var originalText = el.textContent || '';

    // Set accessibility: container gets full text as aria-label
    el.setAttribute('aria-label', originalText);
    el.setAttribute('role', 'text');

    // Clear and rebuild
    el.textContent = '';
    var spans = [];

    units.forEach(function (unit, idx) {
      var span = document.createElement('span');
      span.textContent = unit;
      span.setAttribute('data-' + prefix + '-idx', idx);
      span.setAttribute('aria-hidden', 'true');
      span.style.display = 'inline-block';
      // Preserve whitespace rendering
      if (unit === ' ' || unit === '\u00a0') {
        span.style.whiteSpace = 'pre';
      }
      el.appendChild(span);
      spans.push(span);
    });

    return spans;
  }

  /**
   * Split element content into grapheme clusters, each wrapped in a span.
   * @param {HTMLElement} el
   * @returns {HTMLElement[]} Array of span elements
   */
  function graphemes(el) {
    var text = el.textContent || '';
    var units = splitGraphemes(text);
    return wrapUnits(el, units, 'char');
  }

  /**
   * Split element content into words, each wrapped in a span.
   * @param {HTMLElement} el
   * @returns {HTMLElement[]} Array of span elements
   */
  function words(el) {
    var text = el.textContent || '';
    var units = splitWords(text);
    return wrapUnits(el, units, 'word');
  }

  /**
   * Split element content into lines, each wrapped in a span.
   * Must be called after fonts are loaded and layout is complete.
   * Uses a temporary measurement approach in design coordinates.
   * @param {HTMLElement} el
   * @returns {Promise<HTMLElement[]>} Array of span elements
   */
  function lines(el) {
    return document.fonts.ready.then(function () {
      var text = el.textContent || '';
      if (!text) return [];

      // Detect line breaks by measuring: wrap each word, find Y changes
      var computed = getComputedStyle(el);
      var tempDiv = document.createElement('div');
      tempDiv.style.cssText = [
        'position: absolute',
        'visibility: hidden',
        'width: ' + el.offsetWidth + 'px',
        'font-size: ' + computed.fontSize,
        'font-family: ' + computed.fontFamily,
        'font-weight: ' + computed.fontWeight,
        'line-height: ' + computed.lineHeight,
        'white-space: pre-wrap',
        'overflow-wrap: anywhere',
      ].join(';');

      // Split into characters and measure positions
      var chars = splitGraphemes(text);
      chars.forEach(function (ch) {
        var span = document.createElement('span');
        span.textContent = ch;
        span.style.display = 'inline';
        tempDiv.appendChild(span);
      });

      el.parentNode.appendChild(tempDiv);

      // Group characters by line based on offsetTop
      var lineGroups = [];
      var currentLine = [];
      var currentTop = -1;

      var childSpans = tempDiv.children;
      for (var i = 0; i < childSpans.length; i++) {
        var top = childSpans[i].offsetTop;
        if (currentTop === -1) {
          currentTop = top;
        }
        if (Math.abs(top - currentTop) > 2) {
          // New line
          lineGroups.push(currentLine.join(''));
          currentLine = [];
          currentTop = top;
        }
        currentLine.push(chars[i]);
      }
      if (currentLine.length > 0) {
        lineGroups.push(currentLine.join(''));
      }

      el.parentNode.removeChild(tempDiv);
      return wrapUnits(el, lineGroups, 'line');
    });
  }

  // Public API
  window.TextSplitter = {
    graphemes: graphemes,
    words: words,
    lines: lines,
    // Utility: split string without DOM manipulation
    splitGraphemes: splitGraphemes,
    splitWords: splitWords,
  };
})();
