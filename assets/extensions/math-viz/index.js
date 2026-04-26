/* Maliang Deck Math Visualization Extension
 * Handles [data-formula] and [data-graph] elements.
 * Loads KaTeX from CDN for formula rendering.
 * Renders function graphs as SVG with JS-driven draw-on animation.
 */
(function () {
  'use strict';

  var katexLoaded = false;
  var katexLoading = false;
  var katexCallbacks = [];

  function loadKaTeX(cb) {
    if (katexLoaded) { cb(); return; }
    katexCallbacks.push(cb);
    if (katexLoading) return;
    katexLoading = true;

    // Load KaTeX CSS
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
    document.head.appendChild(link);

    // Load KaTeX JS
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
    script.onload = function () {
      katexLoaded = true;
      katexCallbacks.forEach(function (fn) { fn(); });
      katexCallbacks = [];
    };
    script.onerror = function () {
      console.error('[math-viz] Failed to load KaTeX from CDN');
    };
    document.head.appendChild(script);
  }

  // ─── Formula Extension ──────────────────────────────────────────────────────

  function initFormula(el, config) {
    if (!config || !config.latex) return null;

    var state = { config: config, currentStep: -1 };

    loadKaTeX(function () {
      renderFormulaLatex(el, config.latex, config);

      // Set up step navigation if steps are defined
      if (config.steps && config.steps.length > 0) {
        setupFormulaSteps(el, config, state);
      }
    });

    return state;
  }

  function renderFormulaLatex(el, latex, config) {
    if (!window.katex) return;
    try {
      window.katex.render(latex, el, {
        displayMode: config.displayMode !== false,
        throwOnError: false,
        output: 'html',
      });
    } catch (e) {
      el.textContent = latex;
      console.warn('[math-viz] KaTeX render error:', e);
    }
  }

  // Track active formula steppers for timeline integration
  var activeFormulaSteppers = [];

  function setupFormulaSteps(el, config, state) {
    var steps = config.steps;
    state.totalSteps = steps.length;

    // Click on the formula advances to next step
    el.style.cursor = 'pointer';
    el.title = 'Click or press → to advance formula (' + steps.length + ' steps)';

    function advanceStep() {
      if (state.currentStep >= steps.length - 1) return false;
      state.currentStep++;
      renderFormulaLatex(el, steps[state.currentStep].latex, config);
      return true;
    }

    function retreatStep() {
      if (state.currentStep < 0) return false;
      state.currentStep--;
      if (state.currentStep < 0) {
        renderFormulaLatex(el, config.latex, config);
      } else {
        renderFormulaLatex(el, steps[state.currentStep].latex, config);
      }
      return true;
    }

    el.addEventListener('click', advanceStep);
    state.clickHandler = advanceStep;
    state.advance = advanceStep;
    state.retreat = retreatStep;
    state.hasMoreSteps = function () { return state.currentStep < steps.length - 1; };
    state.canRetreat = function () { return state.currentStep >= 0; };

    // Register as active stepper
    activeFormulaSteppers.push(state);

    // Monkey-patch __vsliTimeline to include formula steps in navigation
    patchTimeline();
  }

  var timelinePatched = false;
  function patchTimeline() {
    if (timelinePatched) return;
    timelinePatched = true;

    var tl = window.__vsliTimeline;
    if (!tl) return;

    var origShouldConsume = tl.shouldConsumeNavigation;
    var origAdvance = tl.advance;
    var origHasElements = tl.hasTimelineElements;

    tl.shouldConsumeNavigation = function (direction) {
      // First check original timeline steps
      if (origShouldConsume(direction)) return true;
      // Then check formula steppers
      for (var i = 0; i < activeFormulaSteppers.length; i++) {
        var s = activeFormulaSteppers[i];
        if (direction === 'forward' && s.hasMoreSteps()) return true;
        if (direction === 'backward' && s.canRetreat()) return true;
      }
      return false;
    };

    tl.advance = function (direction) {
      // First try original timeline steps
      if (origShouldConsume(direction)) {
        origAdvance(direction);
        return;
      }
      // Then try formula steppers
      for (var i = 0; i < activeFormulaSteppers.length; i++) {
        var s = activeFormulaSteppers[i];
        if (direction === 'forward' && s.hasMoreSteps()) { s.advance(); return; }
        if (direction === 'backward' && s.canRetreat()) { s.retreat(); return; }
      }
    };

    tl.hasTimelineElements = function () {
      if (origHasElements()) return true;
      return activeFormulaSteppers.length > 0 && activeFormulaSteppers.some(function (s) {
        return s.hasMoreSteps() || s.canRetreat();
      });
    };
  }

  function stopFormula(el, state) {
    if (state && state.clickHandler) {
      el.removeEventListener('click', state.clickHandler);
    }
    // Remove from active steppers
    var idx = activeFormulaSteppers.indexOf(state);
    if (idx !== -1) activeFormulaSteppers.splice(idx, 1);
  }

  // ─── Graph Extension ────────────────────────────────────────────────────────

  // Safe math expression evaluator
  var mathFns = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sqrt: Math.sqrt, abs: Math.abs, log: Math.log,
    exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
    round: Math.round, sign: Math.sign,
    pi: Math.PI, e: Math.E, PI: Math.PI, E: Math.E,
  };

  function compileExpr(expr) {
    // Replace ^ with ** and implicit multiplication
    var prepared = expr
      .replace(/\^/g, '**')
      .replace(/(\d)([a-zA-Z])/g, '$1*$2')
      .replace(/\)(\w)/g, ')*$1');

    // Validate: only allowed characters
    if (/[^0-9x+\-*/().,%\s*a-zA-Z_]/.test(prepared)) {
      return function () { return NaN; };
    }

    try {
      var fnBody = 'with(m){return ' + prepared + '}';
      var fn = new Function('x', 'm', fnBody);
      return function (x) {
        try {
          var result = fn(x, mathFns);
          return typeof result === 'number' && isFinite(result) ? result : NaN;
        } catch (e) { return NaN; }
      };
    } catch (e) {
      return function () { return NaN; };
    }
  }

  function initGraph(el, config) {
    if (!config || !config.functions || !config.axes) return null;
    var state = renderGraph(el, config);
    return state;
  }

  function renderGraph(el, config) {
    var w = parseInt(el.style.width) || el.offsetWidth || 600;
    var h = parseInt(el.style.height) || el.offsetHeight || 400;
    var axes = config.axes;
    var xMin = axes.x[0], xMax = axes.x[1];
    var yMin = axes.y[0], yMax = axes.y[1];
    var padding = 40;

    var plotW = w - padding * 2;
    var plotH = h - padding * 2;

    function toScreenX(x) { return padding + (x - xMin) / (xMax - xMin) * plotW; }
    function toScreenY(y) { return padding + (yMax - y) / (yMax - yMin) * plotH; }

    var clipId = 'graph-clip-' + Math.random().toString(36).slice(2, 8);

    var svg = '<svg width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg">';

    // Define clip path for the plot area (curves must not overflow axes)
    svg += '<defs><clipPath id="' + clipId + '">';
    svg += '<rect x="' + padding + '" y="' + padding + '" width="' + plotW + '" height="' + plotH + '"/>';
    svg += '</clipPath></defs>';

    // Grid (drawn behind everything)
    if (axes.grid !== false) {
      var tickX = axes.tickInterval || (xMax - xMin) / 8;
      var tickY = axes.tickInterval || (yMax - yMin) / 6;
      svg += '<g stroke="#e0e0e0" stroke-width="0.5">';
      for (var gx = Math.ceil(xMin / tickX) * tickX; gx <= xMax; gx += tickX) {
        var sx = toScreenX(gx);
        svg += '<line x1="' + sx + '" y1="' + padding + '" x2="' + sx + '" y2="' + (h - padding) + '"/>';
      }
      for (var gy = Math.ceil(yMin / tickY) * tickY; gy <= yMax; gy += tickY) {
        var sy = toScreenY(gy);
        svg += '<line x1="' + padding + '" y1="' + sy + '" x2="' + (w - padding) + '" y2="' + sy + '"/>';
      }
      svg += '</g>';
    }

    // Axes lines
    var axisY = Math.max(padding, Math.min(h - padding, toScreenY(0)));
    var axisX = Math.max(padding, Math.min(w - padding, toScreenX(0)));
    svg += '<g stroke="#333" stroke-width="1.5">';
    svg += '<line x1="' + padding + '" y1="' + axisY + '" x2="' + (w - padding) + '" y2="' + axisY + '"/>';
    svg += '<line x1="' + axisX + '" y1="' + padding + '" x2="' + axisX + '" y2="' + (h - padding) + '"/>';
    svg += '</g>';

    // Axis labels
    if (axes.labels !== false) {
      var tickXL = axes.tickInterval || (xMax - xMin) / 8;
      var tickYL = axes.tickInterval || (yMax - yMin) / 6;
      svg += '<g font-size="10" fill="#666" text-anchor="middle">';
      for (var lx = Math.ceil(xMin / tickXL) * tickXL; lx <= xMax; lx += tickXL) {
        if (Math.abs(lx) < 0.001) continue;
        var lxRound = Math.round(lx * 100) / 100;
        svg += '<text x="' + toScreenX(lx) + '" y="' + (axisY + 15) + '">' + lxRound + '</text>';
      }
      for (var ly = Math.ceil(yMin / tickYL) * tickYL; ly <= yMax; ly += tickYL) {
        if (Math.abs(ly) < 0.001) continue;
        var lyRound = Math.round(ly * 100) / 100;
        svg += '<text x="' + (axisX - 15) + '" y="' + (toScreenY(ly) + 4) + '">' + lyRound + '</text>';
      }
      svg += '</g>';
    }

    // Function curves — clipped to plot area
    svg += '<g clip-path="url(#' + clipId + ')">';

    var pathElements = []; // For JS-driven animation

    config.functions.forEach(function (fnDef, fnIdx) {
      var evalFn = compileExpr(fnDef.expr);
      var color = fnDef.color || '#e94560';
      var strokeWidth = fnDef.strokeWidth || 2.5;
      var sampleCount = Math.min(2000, Math.max(400, plotW * 2));
      var points = [];
      var pathSegments = [];

      for (var i = 0; i <= sampleCount; i++) {
        var x = xMin + (xMax - xMin) * i / sampleCount;
        var y = evalFn(x);

        if (isNaN(y) || !isFinite(y)) {
          if (points.length > 1) pathSegments.push(points);
          points = [];
          continue;
        }

        // Detect discontinuities (large jumps)
        if (points.length > 0) {
          var lastPt = points[points.length - 1];
          var screenY = toScreenY(y);
          if (Math.abs(screenY - lastPt[1]) > plotH * 1.5) {
            if (points.length > 1) pathSegments.push(points);
            points = [];
          }
        }

        points.push([toScreenX(x), toScreenY(y)]);
      }
      if (points.length > 1) pathSegments.push(points);

      // Render each path segment
      pathSegments.forEach(function (pts, segIdx) {
        var d = 'M ' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ');
        var pathId = 'gpath-' + fnIdx + '-' + segIdx;

        if (fnDef.animate === 'draw-on') {
          // Path starts invisible, JS animates it
          svg += '<path id="' + pathId + '" d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-dasharray="0 99999"/>';
          pathElements.push({ id: pathId, duration: fnDef.animateDuration || 2000 });
        } else {
          svg += '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" stroke-linecap="round"/>';
        }
      });

      // Label
      if (fnDef.label) {
        var labelX = toScreenX(xMax * 0.7);
        var labelYVal = evalFn(xMax * 0.7);
        if (isFinite(labelYVal)) {
          var labelY = toScreenY(labelYVal);
          labelY = Math.max(padding + 15, Math.min(h - padding - 5, labelY - 10));
          svg += '<text x="' + labelX + '" y="' + labelY + '" font-size="13" font-weight="bold" fill="' + color + '">' + fnDef.label + '</text>';
        }
      }
    });

    svg += '</g>'; // End clipped group
    svg += '</svg>';

    el.innerHTML = svg;
    el.style.overflow = 'hidden';

    // Animate draw-on paths using JS (not SMIL)
    var animState = { rafId: null, stopped: false };
    if (pathElements.length > 0) {
      animateDrawOn(el, pathElements, animState);
    }

    return animState;
  }

  function animateDrawOn(container, pathElements, state) {
    // Measure total path lengths and set up dasharray
    var paths = pathElements.map(function (pe) {
      var pathEl = container.querySelector('#' + pe.id);
      if (!pathEl) return null;
      var totalLength = pathEl.getTotalLength();
      pathEl.style.strokeDasharray = totalLength + '';
      pathEl.style.strokeDashoffset = totalLength + '';
      return { el: pathEl, totalLength: totalLength, duration: pe.duration };
    }).filter(Boolean);

    if (!paths.length) return;

    var startTime = performance.now();
    var delay = 200; // Small initial delay

    function tick() {
      if (state.stopped) return;
      var elapsed = performance.now() - startTime - delay;

      var allDone = true;
      paths.forEach(function (p) {
        var t = Math.max(0, Math.min(1, elapsed / p.duration));
        // Ease out cubic
        var eased = 1 - Math.pow(1 - t, 3);
        p.el.style.strokeDashoffset = (p.totalLength * (1 - eased)) + '';
        if (t < 1) allDone = false;
      });

      if (!allDone) {
        state.rafId = requestAnimationFrame(tick);
      }
    }

    state.rafId = requestAnimationFrame(tick);
  }

  function stopGraph(el, state) {
    if (state && state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.stopped = true;
    }
  }

  // ─── Register Extensions ────────────────────────────────────────────────────

  if (window.__vsliExtensions) {
    window.__vsliExtensions.register({
      selector: '[data-formula]',
      init: initFormula,
      stop: stopFormula,
    });

    window.__vsliExtensions.register({
      selector: '[data-graph]',
      init: initGraph,
      stop: stopGraph,
    });
  }
})();
