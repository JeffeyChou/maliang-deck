/* Maliang Deck Shape Morph Extension
 * Animates shape elements (rect, circle, ellipse) through morph steps.
 * Integrates with timeline step system for click-to-advance navigation.
 *
 * Requires: ext-runtime.js, interpolate.js, morph-engine.js
 */
(function () {
  'use strict';

  var M = null; // MaliangMorphEngine — resolved lazily
  var I = null; // MaliangInterpolate — resolved lazily

  function engine() {
    if (!M) M = window.MaliangMorphEngine;
    return M;
  }

  function interp() {
    if (!I) I = window.MaliangInterpolate;
    return I;
  }

  // ─── State Snapshot ─────────────────────────────────────────────────────────

  /**
   * Snapshot the initial CSS state of a shape element for morph interpolation.
   */
  /**
   * Extract rotation degrees from a CSS transform string.
   */
  function parseRotation(el) {
    var transform = el.style.transform || '';
    var match = transform.match(/rotate\(\s*([-\d.]+)deg\s*\)/);
    if (match) return parseFloat(match[1]) || 0;
    // Fallback: decompose computed transform matrix
    var I = window.MaliangInterpolate;
    if (I && I.decomposeTransform) {
      try {
        var decomposed = I.decomposeTransform(getComputedStyle(el).transform);
        return decomposed.rotation || 0;
      } catch (e) { /* ignore */ }
    }
    return 0;
  }

  /**
   * Read the intended visible opacity for an element.
   * During ext-runtime activation the timeline hasn't played step-0 yet,
   * so the element may still have opacity:0 / visibility:hidden from the
   * pre-animation reset.  Use data-anim-final-opacity (set by renderer)
   * to recover the real value.
   */
  function intendedOpacity(el) {
    var attr = el.getAttribute('data-anim-final-opacity');
    if (attr != null) return parseFloat(attr);
    var computed = parseFloat(getComputedStyle(el).opacity);
    // If element is in pre-animation hidden state, default to fully opaque
    if (computed === 0 && el.style.visibility === 'hidden') return 1;
    return computed;
  }

  function snapshotState(el) {
    var style = getComputedStyle(el);
    return {
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      width: parseFloat(style.width) || 0,
      height: parseFloat(style.height) || 0,
      opacity: intendedOpacity(el),
      backgroundColor: style.backgroundColor || 'transparent',
      borderRadius: style.borderRadius || '0px',
      borderColor: style.borderColor || 'transparent',
      borderWidth: parseFloat(style.borderWidth) || 0,
      rotation: parseRotation(el),
    };
  }

  // ─── Init ───────────────────────────────────────────────────────────────────

  function initShapeMorph(el, config) {
    if (!config || !config.morphSteps || !config.morphSteps.length) return null;
    if (!engine()) {
      console.warn('[shape-morph] MaliangMorphEngine not loaded');
      return null;
    }

    var state = {
      config: config,
      currentStep: -1,
      totalSteps: config.morphSteps.length,
      initialState: null,
      stepStates: [],
      runningHandle: null,
      el: el,
      elementType: config.elementType || 'rect',
    };

    // Snapshot initial state after render
    state.initialState = snapshotState(el);

    // Pre-compute cumulative target states for each step
    var current = Object.assign({}, state.initialState);
    for (var i = 0; i < config.morphSteps.length; i++) {
      var step = config.morphSteps[i];
      var cssTarget = engine().dslTargetToCss(step.target, state.elementType);
      // Merge target into current state (cumulative)
      current = Object.assign({}, current, cssTarget);
      state.stepStates.push(Object.assign({}, current));
    }

    // Register with timeline step system if available
    registerWithTimeline(el, state);

    return state;
  }

  // ─── Step Navigation ────────────────────────────────────────────────────────

  function advanceStep(state, direction) {
    if (!state || !engine()) return false;

    var nextStep;
    if (direction === 'backward') {
      nextStep = state.currentStep - 1;
    } else {
      nextStep = state.currentStep + 1;
    }

    if (nextStep < -1 || nextStep >= state.totalSteps) return false;

    // Cancel any running animation
    if (state.runningHandle) {
      engine().cancelMorph(state.runningHandle);
      state.runningHandle = null;
    }

    var from = state.currentStep < 0 ? state.initialState : state.stepStates[state.currentStep];
    var to = nextStep < 0 ? state.initialState : state.stepStates[nextStep];
    var stepConfig = nextStep >= 0 ? state.config.morphSteps[nextStep] : state.config.morphSteps[0];
    var duration = (stepConfig && stepConfig.duration) || 800;
    var easing = (stepConfig && stepConfig.easing) || 'easeInOutCubic';

    state.currentStep = nextStep;

    state.runningHandle = engine().animateShape(state.el, from, to, duration, easing, function () {
      state.runningHandle = null;
    });

    return true;
  }

  function seekStep(state, stepNum) {
    if (!state || !engine()) return;

    // Cancel any running animation
    if (state.runningHandle) {
      engine().cancelMorph(state.runningHandle);
      state.runningHandle = null;
    }

    var clamped = Math.max(-1, Math.min(stepNum, state.totalSteps - 1));
    state.currentStep = clamped;

    var target = clamped < 0 ? state.initialState : state.stepStates[clamped];
    engine().finalizeMorph(state.el, target);
  }

  // ─── Timeline Integration ───────────────────────────────────────────────────

  function registerWithTimeline(el, state) {
    var tl = window.__vsliTimeline;
    if (!tl) return;

    var trigger = state.config.morphStepTrigger || 'click';

    if (trigger === 'click' && typeof tl.registerStepConsumer === 'function') {
      // Use first-class step consumer API
      var slide = el.closest('.slide');
      if (!slide) return;

      tl.registerStepConsumer({
        slide: slide,
        totalSteps: state.totalSteps,
        advance: function (direction) {
          return advanceStep(state, direction);
        },
        seek: function (step) {
          seekStep(state, step);
        },
      });
    } else if (trigger === 'auto') {
      // Auto-trigger: play all steps sequentially on slide activation
      playAutoSteps(state);
    }
  }

  function playAutoSteps(state) {
    var stepIndex = 0;
    function playNext() {
      if (stepIndex >= state.totalSteps) return;
      var step = state.config.morphSteps[stepIndex];
      var delay = (step && step.duration) || 800;
      stepIndex++;
      advanceStep(state, 'forward');
      if (stepIndex < state.totalSteps) {
        setTimeout(playNext, delay);
      }
    }
    // Start after a small delay to let the slide activate
    setTimeout(playNext, 200);
  }

  // ─── Stop ───────────────────────────────────────────────────────────────────

  function stopShapeMorph(el, state) {
    if (!state) return;
    if (state.runningHandle) {
      engine().cancelMorph(state.runningHandle);
      state.runningHandle = null;
    }
    // Snap to final state of last completed step
    if (state.currentStep >= 0 && state.currentStep < state.stepStates.length) {
      engine().finalizeMorph(el, state.stepStates[state.currentStep]);
    }
  }

  // ─── Seek ───────────────────────────────────────────────────────────────────

  function seekShapeMorph(el, state, timeMs) {
    if (!state || !engine()) return;
    // Map timeMs to a step based on cumulative durations
    var elapsed = 0;
    for (var i = 0; i < state.totalSteps; i++) {
      var stepDuration = (state.config.morphSteps[i] && state.config.morphSteps[i].duration) || 800;
      if (timeMs <= elapsed + stepDuration) {
        // We're within this step — interpolate
        var t = (timeMs - elapsed) / stepDuration;
        var from = i === 0 ? state.initialState : state.stepStates[i - 1];
        var to = state.stepStates[i];
        var easing = interp() ? interp().getEasing(state.config.morphSteps[i].easing || 'easeInOutCubic') : function (x) { return x; };
        var interpolated = engine().interpolateProps(from, to, easing(t));
        engine().writeShapeProps(el, interpolated);
        state.currentStep = i;
        return;
      }
      elapsed += stepDuration;
    }
    // Past all steps — show final state
    if (state.totalSteps > 0) {
      engine().finalizeMorph(el, state.stepStates[state.totalSteps - 1]);
      state.currentStep = state.totalSteps - 1;
    }
  }

  // ─── Register Extension ─────────────────────────────────────────────────────

  if (window.__vsliExtensions) {
    window.__vsliExtensions.register({
      selector: '[data-shape-morph]',
      init: function (el, config) {
        return initShapeMorph(el, config);
      },
      stop: function (el, state) {
        stopShapeMorph(el, state);
      },
      seek: function (el, state, timeMs) {
        seekShapeMorph(el, state, timeMs);
      },
    });
  }
})();
