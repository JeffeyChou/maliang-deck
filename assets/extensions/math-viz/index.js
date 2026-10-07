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
      var hasSteps = config.steps && config.steps.length > 0;
      var renderer = getRenderer();
      if (!renderer) {
        renderFormulaLatex(el, config.latex, config);
        return;
      }
      el.style.position = el.style.position || 'relative';
      window.Texmorph.renderFormula(renderer, el, { latex: config.latex, displayMode: config.displayMode !== false })
        .then(function () {
          if (hasSteps && !state.stopped) setupFormulaSteps(el, config, state);
        }, function (e) {
          console.warn('[math-viz] KaTeX render error:', e);
          renderFormulaLatex(el, config.latex, config);
        });
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

  // ─── Formula Morph (texmorph bridge) ─────────────────────────────────────
  //
  // texmorph (assets/lib/texmorph.iife.js) owns tokenizing, matching and frame
  // sampling; this file owns the clock, step navigation and presenter sync.

  var activeFormulaSteppers = [];
  var formulaRenderer = null;

  function getRenderer() {
    if (!formulaRenderer && window.Texmorph && window.katex) {
      formulaRenderer = window.Texmorph.katexRenderer(window.katex);
    }
    return formulaRenderer;
  }

  function formulaEasing(name) {
    if (!name || !window.Texmorph) return undefined;
    try {
      return window.Texmorph.parseEasing(name);
    } catch (e) {
      console.warn('[math-viz] unknown morphEasing "' + name + '", using easeInOutCubic');
      return 'easeInOutCubic';
    }
  }

  function setupFormulaSteps(el, config, state) {
    var steps = config.steps;
    state.totalSteps = steps.length;
    state.morphing = false;
    state.live = null;
    state.frame = 0;

    var duration = config.morphDuration || 800;
    var displayMode = config.displayMode !== false;
    var easing = formulaEasing(config.morphEasing);

    el.style.cursor = 'pointer';
    el.title = 'Click or press → to advance formula (' + steps.length + ' steps)';

    function latexAt(step) {
      return step < 0 ? config.latex : steps[step].latex;
    }

    function shown(step) {
      var root = el.querySelector('.texmorph-katex');
      var fallback = { latex: latexAt(step), displayMode: displayMode };
      return root ? { adopt: root, fallback: fallback } : fallback;
    }

    function options(morphMap) {
      var opts = { katex: window.katex, duration: duration };
      if (easing) opts.easing = easing;
      if (morphMap) opts.morphMap = morphMap;
      return opts;
    }

    function animate(morph, from, to, done) {
      var start = performance.now();
      function frame(now) {
        var p = Math.min((now - start) / duration, 1);
        morph.render(from + (to - from) * p);
        if (p < 1) {
          state.frame = requestAnimationFrame(frame);
        } else {
          state.frame = 0;
          done();
        }
      }
      state.frame = requestAnimationFrame(frame);
    }

    function broadcast() {
      if (window.__vsliExtensions && window.__vsliExtensions.broadcast) {
        var elemId = el.getAttribute('data-maliang-deck-id') || el.id;
        window.__vsliExtensions.broadcast('formula-step', { id: elemId, step: state.currentStep });
      }
    }

    function fail(error) {
      state.morphing = false;
      console.warn('[math-viz] formula morph failed:', error);
    }

    function advanceStep() {
      if (state.currentStep >= steps.length - 1 || state.morphing || !getRenderer()) return false;
      state.morphing = true;
      var next = state.currentStep + 1;
      var from;
      if (state.live) {
        state.live.dispose({ settle: 'target' });
        from = state.live.target;
        state.live = null;
      } else {
        from = shown(state.currentStep);
      }
      state.currentStep = next;
      broadcast();
      window.Texmorph.createMorph(el, from, { latex: latexAt(next), displayMode: displayMode }, options(steps[next].morphMap))
        .then(function (morph) {
          state.live = morph;
          animate(morph, 0, 1, function () { state.morphing = false; });
        }, fail);
      return true;
    }

    function retreatStep() {
      if (state.currentStep < 0 || state.morphing || !getRenderer()) return false;
      state.morphing = true;
      var undone = state.currentStep;
      state.currentStep = undone - 1;
      broadcast();
      var ready = state.live
        ? Promise.resolve(state.live)
        : window.Texmorph.createMorph(
          el,
          { latex: latexAt(undone - 1), displayMode: displayMode },
          shown(undone),
          options(steps[undone].morphMap)
        );
      state.live = null;
      ready.then(function (morph) {
        morph.render(1);
        animate(morph, 1, 0, function () {
          morph.dispose({ settle: 'source' });
          state.morphing = false;
        });
      }, fail);
      return true;
    }

    el.addEventListener('click', advanceStep);
    state.clickHandler = advanceStep;
    state.advance = advanceStep;
    state.retreat = retreatStep;
    state.hasMoreSteps = function () { return state.currentStep < steps.length - 1 && !state.morphing; };
    state.canRetreat = function () { return state.currentStep >= 0 && !state.morphing; };

    activeFormulaSteppers.push(state);
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
      if (origShouldConsume(direction)) return true;
      for (var i = 0; i < activeFormulaSteppers.length; i++) {
        var s = activeFormulaSteppers[i];
        if (direction === 'forward' && s.hasMoreSteps()) return true;
        if (direction === 'backward' && s.canRetreat()) return true;
      }
      return false;
    };

    tl.advance = function (direction) {
      if (direction === 'forward') {
        // Forward: built-in steps first, then formula steppers
        if (origShouldConsume(direction)) {
          origAdvance(direction);
          return;
        }
        for (var i = 0; i < activeFormulaSteppers.length; i++) {
          var s = activeFormulaSteppers[i];
          if (s.hasMoreSteps()) { s.advance(); return; }
        }
      } else {
        // Backward: formula steppers first (they come after built-in steps)
        for (var j = 0; j < activeFormulaSteppers.length; j++) {
          var b = activeFormulaSteppers[j];
          if (b.canRetreat()) { b.retreat(); return; }
        }
        if (origShouldConsume(direction)) {
          origAdvance(direction);
          return;
        }
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
    if (state) state.stopped = true;
    if (state && state.clickHandler) {
      el.removeEventListener('click', state.clickHandler);
    }
    if (state && state.frame) {
      cancelAnimationFrame(state.frame);
      state.frame = 0;
    }
    if (state && state.live) {
      state.live.dispose({ settle: 'target' });
      state.live = null;
      state.morphing = false;
    }
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
    if (!config) return null;
    // 3D/ascii modes: delegate to graph3d module before the 2D guards
    if (config.asciiMode && window.__graph3d) {
      return window.__graph3d.init(el, config);
    }
    if (config.mode === '3d' && window.__graph3d) {
      return window.__graph3d.init(el, config);
    }
    // 2D path requires axes + functions
    if (!config.axes || !config.functions) return null;
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

    // Annotations (inside clip group)
    if (config.annotations && config.annotations.length > 0) {
      config.annotations.forEach(function (ann, ai) {
        var annColor = ann.color || '#e94560';
        var annId = 'ann-' + ai;
        if (ann.type === 'point' && ann.at != null) {
          // Find y value at x for first function
          var ptEval = config.functions[0] ? compileExpr(config.functions[0].expr) : function () { return 0; };
          var ptY = ptEval(ann.at);
          if (isFinite(ptY)) {
            var px = toScreenX(ann.at);
            var py = toScreenY(ptY);
            svg += '<circle id="' + annId + '" cx="' + px + '" cy="' + py + '" r="5" fill="' + annColor + '"' + (ann.animate ? ' opacity="0"' : '') + '/>';
            if (ann.label) {
              svg += '<text x="' + (px + 8) + '" y="' + (py - 8) + '" font-size="11" fill="' + annColor + '">' + ann.label + '</text>';
            }
            if (ann.animate) pathElements.push({ id: annId, duration: 500, isAnnotation: true });
          }
        } else if (ann.type === 'vertical-line' && ann.at != null) {
          var vx = toScreenX(ann.at);
          svg += '<line id="' + annId + '" x1="' + vx + '" y1="' + padding + '" x2="' + vx + '" y2="' + (h - padding) + '" stroke="' + annColor + '" stroke-width="1.5" stroke-dasharray="6 3"' + (ann.animate ? ' opacity="0"' : '') + '/>';
          if (ann.label) {
            svg += '<text x="' + (vx + 5) + '" y="' + (padding + 12) + '" font-size="11" fill="' + annColor + '">' + ann.label + '</text>';
          }
          if (ann.animate) pathElements.push({ id: annId, duration: 400, isAnnotation: true });
        } else if (ann.type === 'tangent' && ann.at != null) {
          var tEval = config.functions[0] ? compileExpr(config.functions[0].expr) : function () { return 0; };
          var tY = tEval(ann.at);
          // Numerical derivative
          var dx = 0.001;
          var slope = (tEval(ann.at + dx) - tEval(ann.at - dx)) / (2 * dx);
          if (isFinite(tY) && isFinite(slope)) {
            var tLen = (xMax - xMin) * 0.15;
            var tx1 = toScreenX(ann.at - tLen);
            var ty1 = toScreenY(tY - slope * tLen);
            var tx2 = toScreenX(ann.at + tLen);
            var ty2 = toScreenY(tY + slope * tLen);
            svg += '<line id="' + annId + '" x1="' + tx1 + '" y1="' + ty1 + '" x2="' + tx2 + '" y2="' + ty2 + '" stroke="' + annColor + '" stroke-width="2"' + (ann.animate ? ' opacity="0"' : '') + '/>';
            svg += '<circle cx="' + toScreenX(ann.at) + '" cy="' + toScreenY(tY) + '" r="4" fill="' + annColor + '"/>';
            if (ann.label) {
              svg += '<text x="' + (tx2 + 5) + '" y="' + (ty2 - 5) + '" font-size="11" fill="' + annColor + '">' + ann.label + '</text>';
            }
            if (ann.animate) pathElements.push({ id: annId, duration: 600, isAnnotation: true });
          }
        } else if (ann.type === 'area' && ann.at != null) {
          // Shade area under curve from 0 to ann.at
          var aEval = config.functions[0] ? compileExpr(config.functions[0].expr) : function () { return 0; };
          var areaPath = 'M ' + toScreenX(0) + ',' + toScreenY(0);
          var steps = 50;
          var aStart = 0, aEnd = ann.at;
          if (aStart > aEnd) { var tmp = aStart; aStart = aEnd; aEnd = tmp; }
          for (var s = 0; s <= steps; s++) {
            var ax = aStart + (aEnd - aStart) * s / steps;
            var ay = aEval(ax);
            if (!isFinite(ay)) ay = 0;
            areaPath += ' L ' + toScreenX(ax).toFixed(1) + ',' + toScreenY(ay).toFixed(1);
          }
          areaPath += ' L ' + toScreenX(aEnd) + ',' + toScreenY(0) + ' Z';
          svg += '<path id="' + annId + '" d="' + areaPath + '" fill="' + annColor + '" fill-opacity="0.2" stroke="none"' + (ann.animate ? ' opacity="0"' : '') + '/>';
          if (ann.animate) pathElements.push({ id: annId, duration: 800, isAnnotation: true });
        }
      });
    }

    svg += '</g>'; // End clipped group
    svg += '</svg>';

    el.innerHTML = svg;
    el.style.overflow = 'hidden';

    // Animate draw-on paths and annotations using JS
    var animState = { rafId: null, stopped: false };
    if (pathElements.length > 0) {
      animateDrawOn(el, pathElements, animState);
    }

    // Parameter animation (re-samples curves with changing parameter)
    if (config.parameter && config.parameter.animate) {
      animateParameter(el, config, animState);
    }

    return animState;
  }

  function animateParameter(container, config, state) {
    var param = config.parameter;
    var paramName = param.name;
    var paramMin = param.range[0];
    var paramMax = param.range[1];
    var duration = param.duration || 4000;
    var startTime = performance.now();

    // Store original function expressions
    var origExprs = config.functions.map(function (f) { return f.expr; });

    function tick() {
      if (state.stopped) return;
      var elapsed = performance.now() - startTime;
      var t = (elapsed % duration) / duration; // loops
      var paramValue = paramMin + (paramMax - paramMin) * t;

      // Re-render with parameter substituted
      var modConfig = JSON.parse(JSON.stringify(config));
      modConfig.functions.forEach(function (f, i) {
        f.expr = origExprs[i].replace(new RegExp(paramName, 'g'), '(' + paramValue + ')');
      });
      // Disable animation on re-render to avoid stacking
      modConfig.functions.forEach(function (f) { f.animate = 'none'; });
      delete modConfig.parameter;
      delete modConfig.annotations;

      // Re-render (without animation)
      renderGraph(container, modConfig);
      state.rafId = requestAnimationFrame(tick);
    }

    state.rafId = requestAnimationFrame(tick);
  }

  function animateDrawOn(container, pathElements, state) {
    // Measure total path lengths and set up dasharray (for curve paths)
    var paths = pathElements.map(function (pe) {
      var pathEl = container.querySelector('#' + pe.id);
      if (!pathEl) return null;
      if (pe.isAnnotation) {
        // Annotations use opacity fade-in
        return { el: pathEl, duration: pe.duration, isAnnotation: true, delay: pe.duration };
      }
      var totalLength = pathEl.getTotalLength ? pathEl.getTotalLength() : 0;
      if (totalLength > 0) {
        pathEl.style.strokeDasharray = totalLength + '';
        pathEl.style.strokeDashoffset = totalLength + '';
      }
      return { el: pathEl, totalLength: totalLength, duration: pe.duration, isAnnotation: false, delay: 0 };
    }).filter(Boolean);

    if (!paths.length) return;

    // Annotations start after the longest curve finishes
    var maxCurveDur = 0;
    paths.forEach(function (p) { if (!p.isAnnotation && p.duration > maxCurveDur) maxCurveDur = p.duration; });
    paths.forEach(function (p) { if (p.isAnnotation) p.delay = maxCurveDur + 200; });

    var startTime = performance.now();
    var initialDelay = 200;

    function tick() {
      if (state.stopped) return;
      var elapsed = performance.now() - startTime - initialDelay;

      var allDone = true;
      paths.forEach(function (p) {
        var localElapsed = elapsed - (p.delay || 0);
        if (localElapsed < 0) { allDone = false; return; }
        var t = Math.max(0, Math.min(1, localElapsed / p.duration));
        var eased = 1 - Math.pow(1 - t, 3);

        if (p.isAnnotation) {
          p.el.style.opacity = String(eased);
        } else if (p.totalLength > 0) {
          p.el.style.strokeDashoffset = (p.totalLength * (1 - eased)) + '';
        }
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
    // 3D cleanup
    if (window.__graph3d) {
      window.__graph3d.stop(el);
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
      seek: function (el, handle, timeMs) {
        if (window.__graph3d) window.__graph3d.seek(el, handle, timeMs);
      },
      prewarm: function (el, config) {
        if (window.__graph3d) window.__graph3d.prewarm(el, config);
      },
    });
  }
})();
