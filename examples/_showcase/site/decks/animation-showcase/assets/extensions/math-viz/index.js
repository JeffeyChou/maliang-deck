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

  // ─── Manim-style Morph Engine ─────────────────────────────────────────────

  var I = window.MaliangInterpolate;

  function splitGraphemes(text) {
    if (window.TextSplitter && window.TextSplitter.splitGraphemes) {
      return window.TextSplitter.splitGraphemes(text);
    }
    return Array.from(text);
  }

  function tokenRole(el) {
    var role = [];
    var node = el.parentElement;
    while (node) {
      var classes = node.className ? String(node.className).split(/\s+/) : [];
      if (classes.indexOf('mfrac') !== -1) role.push('frac');
      if (classes.indexOf('sqrt') !== -1 || classes.indexOf('msqrt') !== -1) role.push('sqrt');
      if (classes.indexOf('vlist-r') !== -1 || classes.indexOf('pstrut') !== -1) role.push('script');
      if (classes.indexOf('sizing') !== -1 || classes.some(function (c) { return /^reset-size|^size/.test(c); })) role.push('sized');
      node = node.parentElement;
    }
    return role.join(':');
  }

  function tokenClass(el) {
    var node = el.parentElement;
    var atomClasses = ['mord', 'mbin', 'mrel', 'mopen', 'mclose', 'mpunct', 'mop', 'minner'];
    while (node) {
      var classes = node.className ? String(node.className).split(/\s+/) : [];
      for (var i = 0; i < atomClasses.length; i++) {
        if (classes.indexOf(atomClasses[i]) !== -1) return atomClasses[i];
      }
      node = node.parentElement;
    }
    return '';
  }

  /** Collect the nearest KaTeX font class from the token's ancestor chain.
   *  These classes control font-family, italic correction, and kerning in
   *  KaTeX CSS (e.g. `.katex .mathnormal { font-family: KaTeX_Math }`).
   */
  var katexFontClasses = [
    'mathnormal', 'mathit', 'mathbf', 'mathsf', 'mathtt', 'mainit',
    'boldsymbol', 'mathbb', 'mathcal', 'mathfrak', 'textit', 'textbf',
    'textsf', 'texttt', 'amsrm',
  ];
  function getKatexFontClass(el) {
    var node = el.parentElement;
    while (node) {
      if (node.className) {
        var classes = String(node.className).split(/\s+/);
        for (var i = 0; i < katexFontClasses.length; i++) {
          if (classes.indexOf(katexFontClasses[i]) !== -1) return katexFontClasses[i];
        }
      }
      node = node.parentElement;
    }
    return '';
  }

  function ghostLineHeight(token, fallback) {
    if (token && tokenType(token) === 'text' && token.h > 0) {
      return token.h + 'px';
    }
    return fallback;
  }

  function tokenType(token) {
    return token && token.type ? token.type : 'text';
  }

  function sameTokenType(a, b) {
    return tokenType(a) === tokenType(b);
  }

  function sameLayerToken(a, b) {
    return sameTokenType(a, b) && a.text === b.text && a.role === b.role;
  }

  function structureRole(el) {
    if (el.classList && el.classList.contains('frac-line')) return 'frac-bar';
    if (el.classList && el.classList.contains('sqrt-line')) return 'sqrt-line';
    return 'structure';
  }

  function wrapFormulaTextTokens(container) {
    var root = container.querySelector('.katex-html') || container.querySelector('.katex') || container;
    if (root.querySelector('[data-formula-token]')) return;

    var textNodes = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || node.nodeValue.length === 0) return NodeFilter.FILTER_REJECT;
        var parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('math, annotation, script, style, [data-formula-token]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var next;
    while ((next = walker.nextNode())) textNodes.push(next);

    var index = 0;
    textNodes.forEach(function (node) {
      var parts = splitGraphemes(node.nodeValue || '');
      var fragment = document.createDocumentFragment();
      parts.forEach(function (part) {
        var span = document.createElement('span');
        span.textContent = part;
        span.setAttribute('data-formula-token', 'tok-' + index);
        span.setAttribute('data-formula-token-index', String(index));
        span.setAttribute('data-formula-token-text', part);
        // Use display:inline to avoid disrupting KaTeX's layout flow
        span.style.display = 'inline';
        fragment.appendChild(span);
        index += 1;
      });
      if (node.parentNode) node.parentNode.replaceChild(fragment, node);
    });
  }

  function tokenBoxFromRect(rect, containerRect, scaleX, scaleY) {
    var x = (rect.left - containerRect.left) / scaleX;
    var y = (rect.top - containerRect.top) / scaleY;
    var w = rect.width / scaleX;
    var h = rect.height / scaleY;
    return {
      x: x,
      y: y,
      w: w,
      h: h,
      cx: x + w / 2,
      cy: y + h / 2,
    };
  }

  /**
   * Snapshot individually addressable rendered math tokens.
   * Each token is a rendered grapheme, so superscripts/subscripts keep their
   * measured visual size and position instead of being flattened into text.
   * Fraction and square-root rules are appended as structure tokens after text
   * tokens so existing morphMap text indices remain stable.
   */
  function snapshotFormulaTokens(container) {
    wrapFormulaTextTokens(container);
    var containerRect = container.getBoundingClientRect();
    var scaleX = containerRect.width && container.offsetWidth ? containerRect.width / container.offsetWidth : 1;
    var scaleY = containerRect.height && container.offsetHeight ? containerRect.height / container.offsetHeight : scaleX;
    if (!Number.isFinite(scaleX) || scaleX === 0) scaleX = 1;
    if (!Number.isFinite(scaleY) || scaleY === 0) scaleY = 1;
    var tokens = [];
    var nodes = container.querySelectorAll('[data-formula-token]');
    nodes.forEach(function (node, index) {
      var rect = node.getBoundingClientRect();
      var text = node.textContent || '';
      var box = tokenBoxFromRect(rect, containerRect, scaleX, scaleY);
      node.setAttribute('data-formula-token-index', String(index));
      node.setAttribute('data-formula-token-id', 'formula-token-' + index + '-' + text.charCodeAt(0));
      tokens.push({
        el: node,
        id: node.getAttribute('data-formula-token-id'),
        type: 'text',
        text: text,
        tokenClass: tokenClass(node),
        role: tokenRole(node),
        index: index,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        cx: box.cx,
        cy: box.cy,
      });
    });
    container.querySelectorAll('.frac-line, .sqrt-line').forEach(function (node) {
      var rect = node.getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      var role = structureRole(node);
      var index = tokens.length;
      var box = tokenBoxFromRect(rect, containerRect, scaleX, scaleY);
      node.setAttribute('data-formula-structure-token', role);
      node.setAttribute('data-formula-token-index', String(index));
      node.setAttribute('data-formula-token-id', 'formula-token-' + index + '-' + role);
      tokens.push({
        el: node,
        id: node.getAttribute('data-formula-token-id'),
        type: 'structure',
        text: role,
        tokenClass: 'structure',
        role: role,
        index: index,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        cx: box.cx,
        cy: box.cy,
      });
    });
    return tokens;
  }

  function normalizeMorphMap(map) {
    var normalized = new Map();
    if (!map) return normalized;
    if (Array.isArray(map)) {
      map.forEach(function (entry) {
        if (Array.isArray(entry) && entry.length >= 2) normalized.set(Number(entry[0]), Number(entry[1]));
        else if (entry && typeof entry === 'object') normalized.set(Number(entry.source), Number(entry.target));
      });
    } else if (typeof map === 'object') {
      Object.keys(map).forEach(function (key) { normalized.set(Number(key), Number(map[key])); });
    }
    return normalized;
  }

  /**
   * Structural matching: optional explicit source-index -> target-index map,
   * then same text/class/role or same structure role, then same text fallback.
   */
  function structuralMatch(oldAtoms, newAtoms, explicitMap) {
    var matched = [];
    var usedOld = new Set();
    var usedNew = new Set();

    normalizeMorphMap(explicitMap).forEach(function (newIdx, oldIdx) {
      if (!Number.isFinite(oldIdx) || !Number.isFinite(newIdx)) return;
      if (!oldAtoms[oldIdx] || !newAtoms[newIdx]) return;
      if (!sameTokenType(oldAtoms[oldIdx], newAtoms[newIdx])) return;
      matched.push({ old: oldAtoms[oldIdx], new: newAtoms[newIdx], oldIdx: oldIdx, newIdx: newIdx });
      usedOld.add(oldIdx);
      usedNew.add(newIdx);
    });

    // Pass 1: exact match (same text + same class + same visual role)
    // or same structural line role.
    oldAtoms.forEach(function (oa, oi) {
      if (usedOld.has(oi)) return;
      var bestNi = -1;
      var bestDist = Infinity;
      newAtoms.forEach(function (na, ni) {
        if (usedNew.has(ni)) return;
        var exactText = tokenType(oa) === 'text' && tokenType(na) === 'text' &&
          oa.text === na.text && oa.tokenClass === na.tokenClass && oa.role === na.role;
        var exactStructure = tokenType(oa) === 'structure' && tokenType(na) === 'structure' &&
          oa.role === na.role;
        if (exactText || exactStructure) {
          // Prefer positionally closest match
          var dist = Math.abs(oa.cx - na.cx) + Math.abs(oa.cy - na.cy);
          if (dist < bestDist) { bestDist = dist; bestNi = ni; }
        }
      });
      if (bestNi !== -1) {
        matched.push({ old: oa, new: newAtoms[bestNi], oldIdx: oi, newIdx: bestNi });
        usedOld.add(oi);
        usedNew.add(bestNi);
      }
    });

    // Pass 2: text-only match for remaining
    oldAtoms.forEach(function (oa, oi) {
      if (usedOld.has(oi)) return;
      if (tokenType(oa) !== 'text') return;
      var bestNi = -1;
      var bestDist = Infinity;
      newAtoms.forEach(function (na, ni) {
        if (usedNew.has(ni)) return;
        if (tokenType(na) !== 'text') return;
        if (oa.text === na.text) {
          var dist = Math.abs(oa.cx - na.cx) + Math.abs(oa.cy - na.cy);
          if (dist < bestDist) { bestDist = dist; bestNi = ni; }
        }
      });
      if (bestNi !== -1) {
        matched.push({ old: oa, new: newAtoms[bestNi], oldIdx: oi, newIdx: bestNi });
        usedOld.add(oi);
        usedNew.add(bestNi);
      }
    });

    var removed = oldAtoms.filter(function (_, i) { return !usedOld.has(i); });
    var added = newAtoms.filter(function (_, i) { return !usedNew.has(i); });
    return { matched: matched, removed: removed, added: added };
  }

  function setGhostBox(ghost, x, y, w, h) {
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
    ghost.style.width = w + 'px';
    ghost.style.height = h + 'px';
  }

  function createTextGhost(token, sourceEl, text, opacity) {
    var ghost = document.createElement('span');
    ghost.textContent = text;
    ghost.className = getKatexFontClass(sourceEl);
    var computed = getComputedStyle(sourceEl);
    ghost.style.cssText = [
      'position:absolute',
      'display:inline-block',
      'pointer-events:none',
      'white-space:pre',
      'font-family:' + computed.fontFamily,
      'font-size:' + computed.fontSize,
      'font-weight:' + computed.fontWeight,
      'font-style:' + computed.fontStyle,
      'line-height:' + ghostLineHeight(token, computed.lineHeight),
      'letter-spacing:' + computed.letterSpacing,
      'color:' + computed.color,
      'opacity:' + opacity,
    ].join(';');
    setGhostBox(ghost, token.x, token.y, token.w, token.h);
    return ghost;
  }

  function createStructureGhost(token, sourceEl, opacity) {
    var ghost = document.createElement('div');
    ghost.setAttribute('data-formula-structure-ghost', token.role);
    var computed = getComputedStyle(sourceEl);
    ghost.style.cssText = [
      'position:absolute',
      'display:block',
      'pointer-events:none',
      'box-sizing:border-box',
      'background:' + computed.backgroundColor,
      'border-top:' + computed.borderTopWidth + ' ' + computed.borderTopStyle + ' ' + computed.borderTopColor,
      'border-right:' + computed.borderRightWidth + ' ' + computed.borderRightStyle + ' ' + computed.borderRightColor,
      'border-bottom:' + computed.borderBottomWidth + ' ' + computed.borderBottomStyle + ' ' + computed.borderBottomColor,
      'border-left:' + computed.borderLeftWidth + ' ' + computed.borderLeftStyle + ' ' + computed.borderLeftColor,
      'color:' + computed.color,
      'opacity:' + opacity,
    ].join(';');
    setGhostBox(ghost, token.x, token.y, token.w, token.h);
    return ghost;
  }

  function createTokenGhost(token, sourceEl, text, opacity) {
    if (tokenType(token) === 'structure') return createStructureGhost(token, sourceEl, opacity);
    return createTextGhost(token, sourceEl, text, opacity);
  }

  /**
   * Compute a curved arc path between two points (manim-style).
   * Returns interpolated (x, y) at progress t.
   */
  function arcInterpolate(x1, y1, x2, y2, t, arcFactor) {
    arcFactor = arcFactor || 0.3;
    // Control point offset perpendicular to the line
    var mx = (x1 + x2) / 2;
    var my = (y1 + y2) / 2;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var dist = Math.sqrt(dx * dx + dy * dy);
    // Perpendicular offset for arc
    var cpx = mx - dy * arcFactor;
    var cpy = my + dx * arcFactor;
    // Quadratic bezier
    var u = 1 - t;
    var x = u * u * x1 + 2 * u * t * cpx + t * t * x2;
    var y = u * u * y1 + 2 * u * t * cpy + t * t * y2;
    return { x: x, y: y };
  }

  function curvedBoundaryPath(from, to) {
    var startX = from.x + from.w;
    var startY = from.y + from.h / 2;
    var endX = to.x;
    var endY = to.y + to.h / 2;
    if (to.cx < from.cx) {
      startX = from.x;
      endX = to.x + to.w;
    }
    var dx = endX - startX;
    var dy = endY - startY;
    var lift = Math.max(18, Math.min(80, Math.sqrt(dx * dx + dy * dy) * 0.28));
    var c1x = startX + dx * 0.35;
    var c1y = startY - lift;
    var c2x = startX + dx * 0.65;
    var c2y = endY - lift;
    return 'M ' + startX + ' ' + startY + ' C ' + c1x + ' ' + c1y + ' ' + c2x + ' ' + c2y + ' ' + endX + ' ' + endY;
  }

  function ensureAnnotationLayer(el) {
    var layer = el.querySelector(':scope > .maliang-formula-annotation-layer');
    if (layer) return layer;
    layer = document.createElement('svg');
    layer.className = 'maliang-formula-annotation-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none;overflow:visible;';
    el.appendChild(layer);
    return layer;
  }

  window.MaliangFormulaMorph = window.MaliangFormulaMorph || {};
  window.MaliangFormulaMorph.curvedBoundaryPath = curvedBoundaryPath;

  // Track active formula steppers for timeline integration
  var activeFormulaSteppers = [];

  function setupFormulaSteps(el, config, state) {
    var steps = config.steps;
    state.totalSteps = steps.length;
    state.morphing = false;

    var morphDuration = config.morphDuration || 600;
    var I = window.MaliangInterpolate;
    var easing = I ? I.getEasing(config.morphEasing || 'easeInOutCubic') : function (t) { return t; };
    var lerp = I && I.lerp ? I.lerp : function (from, to, t) { return from + (to - from) * t; };

    // Click on the formula advances to next step
    el.style.cursor = 'pointer';
    el.title = 'Click or press → to advance formula (' + steps.length + ' steps)';

    /**
     * Manim-style morph transition between formula states.
     * Phase 1: matched tokens move; unmatched source tokens stay fully visible.
     * Phase 2: target visibility swaps in, source-only tokens fade out.
     */
    function morphTo(targetLatex, morphMap) {
      if (state.morphing) return;
      state.morphing = true;

      // Use fixed container position as reference
      el.style.position = 'relative';
      el.style.overflow = 'visible';

      // Snapshot old tokens (positions relative to el)
      var oldAtoms = snapshotFormulaTokens(el);

      Array.prototype.slice.call(el.children).forEach(function (child) {
        if (child.classList && child.classList.contains('maliang-formula-annotation-layer')) child.remove();
      });

      // Save old KaTeX HTML as a static layer with explicit dimensions
      // (so it doesn't shift if el's auto-height changes after new formula render)
      var oldHtml = el.innerHTML;
      var oldElHeight = el.offsetHeight;
      var oldLayer = document.createElement('div');
      oldLayer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:' + oldElHeight + 'px;z-index:1;pointer-events:none;overflow:visible;';
      oldLayer.innerHTML = oldHtml;

      // Render new formula
      renderFormulaLatex(el, targetLatex, config);
      var newElHeight = el.offsetHeight;
      el.style.minHeight = Math.max(oldElHeight, newElHeight) + 'px';

      // New content becomes the base layer (initially hidden)
      var newKatex = el.querySelector('.katex');
      if (newKatex) newKatex.style.opacity = '0';

      // Snapshot new tokens BEFORE appending oldLayer (so we only get new KaTeX tokens)
      var newAtoms = snapshotFormulaTokens(el);

      // Append old layer on top (after snapshotting new atoms to avoid duplicates)
      el.appendChild(oldLayer);
      var oldLayerTokens = snapshotFormulaTokens(oldLayer);

      // Match old and new atoms
      var result = structuralMatch(oldAtoms, newAtoms, morphMap);

      // Create ghost layer for matched symbols that move
      var ghostLayer = document.createElement('div');
      ghostLayer.className = 'katex';
      ghostLayer.style.cssText = 'position:absolute;inset:0;z-index:3;pointer-events:none;';
      el.appendChild(ghostLayer);
      var annotationLayer = ensureAnnotationLayer(el);
      annotationLayer.innerHTML = '';

      // During Phase 1 the old layer remains visible. Hide matched source
      // tokens there so their visual clone is the only moving copy.
      result.matched.forEach(function (pair) {
        var liveToken = oldLayerTokens[pair.oldIdx];
        if (liveToken && sameLayerToken(liveToken, pair.old)) liveToken.el.style.visibility = 'hidden';

        var sourceEl = pair.new.el || (liveToken ? liveToken.el : pair.old.el);
        var ghost = createTokenGhost(pair.old, sourceEl, pair.old.text, 1);
        setGhostBox(ghost, pair.old.x, pair.old.y, pair.old.w, pair.old.h);
        ghostLayer.appendChild(ghost);
        pair.ghost = ghost;

        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', curvedBoundaryPath(pair.old, pair.new));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'transparent');
        annotationLayer.appendChild(path);
        pair.path = path;
      });

      // Fade-out ghosts for removed (unmatched old) tokens
      var removedGhosts = [];
      result.removed.forEach(function (token) {
        var liveToken = oldLayerTokens[token.index];
        if (liveToken && sameLayerToken(liveToken, token)) {
          liveToken.el.style.visibility = 'hidden';
        }
        var sourceEl = (liveToken && sameLayerToken(liveToken, token)) ? liveToken.el : token.el;
        var ghost = createTokenGhost(token, sourceEl, token.text, 1);
        ghostLayer.appendChild(ghost);
        removedGhosts.push(ghost);
      });

      // Fade-in ghosts for added (unmatched new) tokens
      var addedGhosts = [];
      result.added.forEach(function (token) {
        token.el.style.opacity = '0';
        var ghost = createTokenGhost(token, token.el, token.text, 0);
        ghostLayer.appendChild(ghost);
        addedGhosts.push(ghost);
      });

      // Keep old layer visible. Matched/removed text and structure tokens are
      // hidden there so their visual clones are the only moving copies; any
      // unsupported residual KaTeX structure fades with the layer.
      // The old layer retains its fixed height, preventing layout shifts.

      var startTime = performance.now();

      function tick() {
        var elapsed = performance.now() - startTime;
        var t = Math.min(elapsed / morphDuration, 1);
        var e = easing(t);

        // Matched ghosts: animate position and size
        result.matched.forEach(function (pair) {
          if (!pair.ghost) return;
          var currentWidth = lerp(pair.old.w, pair.new.w, e);
          var currentHeight = lerp(pair.old.h, pair.new.h, e);
          var pos = arcInterpolate(pair.old.x, pair.old.y, pair.new.x, pair.new.y, e, 0.2);
          setGhostBox(pair.ghost, pos.x, pos.y, currentWidth, currentHeight);
          if (tokenType(pair.old) === 'text' || tokenType(pair.new) === 'text' ||
              pair.old.role.indexOf('frac') !== -1 || pair.new.role.indexOf('frac') !== -1 ||
              pair.old.role.indexOf('script') !== -1 || pair.new.role.indexOf('script') !== -1) {
            pair.ghost.style.lineHeight = currentHeight + 'px';
          }
        });

        // Fade old layer. Text tokens and captured structure rules are hidden
        // there; unsupported residual KaTeX structure fades as a fallback.
        oldLayer.style.opacity = String(1 - e);

        // Removed tokens: fade out + slight shrink
        removedGhosts.forEach(function (ghost) {
          ghost.style.opacity = String(1 - e);
          ghost.style.transform = 'scale(' + lerp(1, 0.7, e) + ')';
        });

        // Added tokens: fade in with 30% delay
        var fadeInStart = 0.3;
        var fadeT = t > fadeInStart ? Math.min((t - fadeInStart) / (1 - fadeInStart), 1) : 0;
        var fadeE = easing(fadeT);
        addedGhosts.forEach(function (ghost) {
          ghost.style.opacity = String(fadeE);
          ghost.style.transform = 'scale(' + lerp(0.7, 1, fadeE) + ')';
        });

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          // Settle every ghost exactly onto its measured target box, then let
          // the browser paint one final frame before revealing real KaTeX.
          result.matched.forEach(function (pair) {
            if (!pair.ghost) return;
            setGhostBox(pair.ghost, pair.new.x, pair.new.y, pair.new.w, pair.new.h);
            if (tokenType(pair.old) === 'text' || tokenType(pair.new) === 'text' ||
                pair.old.role.indexOf('frac') !== -1 || pair.new.role.indexOf('frac') !== -1 ||
                pair.old.role.indexOf('script') !== -1 || pair.new.role.indexOf('script') !== -1) {
              pair.ghost.style.lineHeight = pair.new.h + 'px';
            }
          });
          oldLayer.style.opacity = '0';
          removedGhosts.forEach(function (ghost) {
            ghost.style.opacity = '0';
            ghost.style.transform = 'scale(0.7)';
          });
          addedGhosts.forEach(function (ghost) {
            ghost.style.opacity = '1';
            ghost.style.transform = 'scale(1)';
          });
          requestAnimationFrame(function () {
            result.added.forEach(function (token) { token.el.style.opacity = '1'; });
            if (oldLayer.parentNode) oldLayer.parentNode.removeChild(oldLayer);
            if (ghostLayer.parentNode) ghostLayer.parentNode.removeChild(ghostLayer);
            annotationLayer.innerHTML = '';
            if (newKatex) newKatex.style.opacity = '1';
            el.style.overflow = '';
            el.style.minHeight = '';
            state.morphing = false;
          });
        }
      }

      requestAnimationFrame(tick);
    }

    function advanceStep() {
      if (state.currentStep >= steps.length - 1) return false;
      if (state.morphing) return false;
      state.currentStep++;
      morphTo(steps[state.currentStep].latex, steps[state.currentStep].morphMap);
      // Sync with presenter
      if (window.__vsliExtensions && window.__vsliExtensions.broadcast) {
        var elemId = el.getAttribute('data-maliang-deck-id') || el.id;
        window.__vsliExtensions.broadcast('formula-step', { id: elemId, step: state.currentStep });
      }
      return true;
    }

    function retreatStep() {
      if (state.currentStep < 0) return false;
      if (state.morphing) return false;
      state.currentStep--;
      var targetLatex = state.currentStep < 0 ? config.latex : steps[state.currentStep].latex;
      var map = state.currentStep < 0 ? config.morphMap : steps[state.currentStep].morphMap;
      morphTo(targetLatex, map);
      // Sync with presenter
      if (window.__vsliExtensions && window.__vsliExtensions.broadcast) {
        var elemId = el.getAttribute('data-maliang-deck-id') || el.id;
        window.__vsliExtensions.broadcast('formula-step', { id: elemId, step: state.currentStep });
      }
      return true;
    }

    el.addEventListener('click', advanceStep);
    state.clickHandler = advanceStep;
    state.advance = advanceStep;
    state.retreat = retreatStep;
    state.hasMoreSteps = function () { return state.currentStep < steps.length - 1 && !state.morphing; };
    state.canRetreat = function () { return state.currentStep >= 0 && !state.morphing; };

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
        for (var i = 0; i < activeFormulaSteppers.length; i++) {
          var s = activeFormulaSteppers[i];
          if (s.canRetreat()) { s.retreat(); return; }
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
