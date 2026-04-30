/* Maliang Deck Component Morph Extension
 * Animates group/layout elements through morph steps.
 * Supports container-level morphing plus per-child targeted morphing with stagger.
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

  function parseRotation(el) {
    var transform = el.style.transform || '';
    var match = transform.match(/rotate\(\s*([-\d.]+)deg\s*\)/);
    if (match) return parseFloat(match[1]) || 0;
    var Interp = window.MaliangInterpolate;
    if (Interp && Interp.decomposeTransform) {
      try {
        var decomposed = Interp.decomposeTransform(getComputedStyle(el).transform);
        return decomposed.rotation || 0;
      } catch (e) { /* ignore */ }
    }
    return 0;
  }

  function intendedOpacity(el) {
    var attr = el.getAttribute('data-anim-final-opacity');
    if (attr != null) return parseFloat(attr);
    var computed = parseFloat(getComputedStyle(el).opacity);
    if (computed === 0 && el.style.visibility === 'hidden') return 1;
    return computed;
  }

  function snapshotContainer(el) {
    var style = getComputedStyle(el);
    return {
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      width: parseFloat(style.width) || 0,
      height: parseFloat(style.height) || 0,
      opacity: intendedOpacity(el),
      rotation: parseRotation(el),
    };
  }

  function snapshotChild(el) {
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

  // ─── Child Element Lookup ──────────────────────────────────────────────────

  /**
   * Build a map of child element ID -> DOM element within the container.
   */
  function buildChildMap(containerEl) {
    var map = {};
    var children = containerEl.querySelectorAll('[data-maliang-deck-id]');
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var id = child.getAttribute('data-maliang-deck-id');
      if (id && !map[id]) map[id] = child;
    }
    return map;
  }

  // ─── DSL Target to CSS (container-level) ───────────────────────────────────

  function containerTargetToCss(target) {
    var css = {};
    if (target.x != null) css.x = target.x;
    if (target.y != null) css.y = target.y;
    if (target.width != null) css.width = target.width;
    if (target.height != null) css.height = target.height;
    if (target.opacity != null) css.opacity = target.opacity;
    if (target.rotation != null) css.rotation = target.rotation;
    return css;
  }

  // ─── Init ───────────────────────────────────────────────────────────────────

  function initComponentMorph(el, config) {
    if (!config || !config.morphSteps || !config.morphSteps.length) return null;
    if (!engine()) {
      console.warn('[component-morph] MaliangMorphEngine not loaded');
      return null;
    }

    var childMap = buildChildMap(el);

    var state = {
      config: config,
      currentStep: -1,
      totalSteps: config.morphSteps.length,
      initialContainerState: null,
      containerStepStates: [],
      // Per-child: { initialState, stepStates[] }
      childStates: {},
      childMap: childMap,
      runningHandles: [],
      el: el,
    };

    // Snapshot initial container state
    state.initialContainerState = snapshotContainer(el);

    // Snapshot initial child states for children referenced in any step
    var referencedChildren = {};
    for (var s = 0; s < config.morphSteps.length; s++) {
      var step = config.morphSteps[s];
      if (step.children) {
        var childIds = Object.keys(step.children);
        for (var c = 0; c < childIds.length; c++) {
          referencedChildren[childIds[c]] = true;
        }
      }
    }

    var refChildIds = Object.keys(referencedChildren);
    for (var ci = 0; ci < refChildIds.length; ci++) {
      var childId = refChildIds[ci];
      var childEl = childMap[childId];
      if (childEl) {
        state.childStates[childId] = {
          el: childEl,
          initialState: snapshotChild(childEl),
          stepStates: [],
        };
      }
    }

    // Pre-compute cumulative states for each step
    var currentContainer = Object.assign({}, state.initialContainerState);
    var currentChildStates = {};
    for (var cid in state.childStates) {
      currentChildStates[cid] = Object.assign({}, state.childStates[cid].initialState);
    }

    for (var si = 0; si < config.morphSteps.length; si++) {
      var morphStep = config.morphSteps[si];

      // Container target
      var containerCss = containerTargetToCss(morphStep.target);
      currentContainer = Object.assign({}, currentContainer, containerCss);
      state.containerStepStates.push(Object.assign({}, currentContainer));

      // Per-child targets
      if (morphStep.children) {
        var stepChildIds = Object.keys(morphStep.children);
        for (var sci = 0; sci < stepChildIds.length; sci++) {
          var scid = stepChildIds[sci];
          if (state.childStates[scid] && currentChildStates[scid]) {
            var childTarget = morphStep.children[scid];
            // Detect element type from child DOM for proper DSL->CSS mapping
            var childElType = state.childStates[scid].el.getAttribute('data-maliang-deck-type') || 'rect';
            var childCss = engine().dslTargetToCss(childTarget, childElType);
            currentChildStates[scid] = Object.assign({}, currentChildStates[scid], childCss);
          }
        }
      }

      // Snapshot cumulative child states for this step
      for (var csid in state.childStates) {
        if (!currentChildStates[csid]) continue;
        state.childStates[csid].stepStates.push(Object.assign({}, currentChildStates[csid]));
      }
    }

    // Register with timeline
    registerWithTimeline(el, state);

    return state;
  }

  // ─── Step Navigation ────────────────────────────────────────────────────────

  function cancelAllHandles(state) {
    for (var i = 0; i < state.runningHandles.length; i++) {
      engine().cancelMorph(state.runningHandles[i]);
    }
    state.runningHandles = [];
  }

  function advanceStep(state, direction) {
    if (!state || !engine()) return false;

    var nextStep;
    if (direction === 'backward') {
      nextStep = state.currentStep - 1;
    } else {
      nextStep = state.currentStep + 1;
    }

    if (nextStep < -1 || nextStep >= state.totalSteps) return false;

    cancelAllHandles(state);

    var fromContainer = state.currentStep < 0 ? state.initialContainerState : state.containerStepStates[state.currentStep];
    var toContainer = nextStep < 0 ? state.initialContainerState : state.containerStepStates[nextStep];
    var stepConfig = nextStep >= 0 ? state.config.morphSteps[nextStep] : state.config.morphSteps[0];
    var duration = (stepConfig && stepConfig.duration) || 800;
    var easing = (stepConfig && stepConfig.easing) || 'easeInOutCubic';
    var stagger = (stepConfig && stepConfig.stagger) || 0;

    state.currentStep = nextStep;

    // Animate container
    var containerHandle = engine().animateShape(state.el, fromContainer, toContainer, duration, easing, null);
    state.runningHandles.push(containerHandle);

    // Animate children with stagger
    var childIds = Object.keys(state.childStates);
    for (var i = 0; i < childIds.length; i++) {
      var cid = childIds[i];
      var cs = state.childStates[cid];
      var fromChild = state.currentStep <= 0 ? cs.initialState : cs.stepStates[Math.max(0, state.currentStep - 1)];
      // For backward to -1, use initial state
      if (nextStep < 0) {
        fromChild = cs.stepStates[0] || cs.initialState;
      } else if (direction === 'backward') {
        fromChild = cs.stepStates[state.currentStep + 1] || cs.initialState;
      } else {
        fromChild = state.currentStep <= 0 ? cs.initialState : cs.stepStates[state.currentStep - 1];
      }
      var toChild = nextStep < 0 ? cs.initialState : cs.stepStates[nextStep];

      if (stagger > 0 && i > 0) {
        (function (childEl, from, to, delay) {
          var timerId = setTimeout(function () {
            var h = engine().animateShape(childEl, from, to, duration, easing, null);
            state.runningHandles.push(h);
          }, delay);
          // Store timeout for cleanup
          state.runningHandles.push({ cancel: function () { clearTimeout(timerId); } });
        })(cs.el, fromChild, toChild, stagger * i);
      } else {
        var childHandle = engine().animateShape(cs.el, fromChild, toChild, duration, easing, null);
        state.runningHandles.push(childHandle);
      }
    }

    return true;
  }

  function seekStep(state, stepNum) {
    if (!state || !engine()) return;

    cancelAllHandles(state);

    var clamped = Math.max(-1, Math.min(stepNum, state.totalSteps - 1));
    state.currentStep = clamped;

    // Container
    var containerTarget = clamped < 0 ? state.initialContainerState : state.containerStepStates[clamped];
    engine().finalizeMorph(state.el, containerTarget);

    // Children
    var childIds = Object.keys(state.childStates);
    for (var i = 0; i < childIds.length; i++) {
      var cs = state.childStates[childIds[i]];
      var childTarget = clamped < 0 ? cs.initialState : cs.stepStates[clamped];
      engine().finalizeMorph(cs.el, childTarget);
    }
  }

  // ─── Timeline Integration ───────────────────────────────────────────────────

  function registerWithTimeline(el, state) {
    var tl = window.__vsliTimeline;
    if (!tl) return;

    var trigger = state.config.morphStepTrigger || 'click';

    if (trigger === 'click' && typeof tl.registerStepConsumer === 'function') {
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
    setTimeout(playNext, 200);
  }

  // ─── Stop ───────────────────────────────────────────────────────────────────

  function stopComponentMorph(el, state) {
    if (!state) return;
    cancelAllHandles(state);
    // Snap to current step final state
    if (state.currentStep >= 0 && state.currentStep < state.containerStepStates.length) {
      engine().finalizeMorph(el, state.containerStepStates[state.currentStep]);
      var childIds = Object.keys(state.childStates);
      for (var i = 0; i < childIds.length; i++) {
        var cs = state.childStates[childIds[i]];
        if (cs.stepStates[state.currentStep]) {
          engine().finalizeMorph(cs.el, cs.stepStates[state.currentStep]);
        }
      }
    }
  }

  // ─── Seek ───────────────────────────────────────────────────────────────────

  function seekComponentMorph(el, state, timeMs) {
    if (!state || !engine()) return;
    // Map timeMs to a step based on cumulative durations
    var elapsed = 0;
    for (var i = 0; i < state.totalSteps; i++) {
      var stepDuration = (state.config.morphSteps[i] && state.config.morphSteps[i].duration) || 800;
      if (timeMs <= elapsed + stepDuration) {
        var t = (timeMs - elapsed) / stepDuration;
        var easingFn = interp() ? interp().getEasing(state.config.morphSteps[i].easing || 'easeInOutCubic') : function (x) { return x; };
        var easedT = easingFn(t);

        // Interpolate container
        var fromC = i === 0 ? state.initialContainerState : state.containerStepStates[i - 1];
        var toC = state.containerStepStates[i];
        var interpC = engine().interpolateProps(fromC, toC, easedT);
        engine().writeShapeProps(el, interpC);

        // Interpolate children
        var childIds = Object.keys(state.childStates);
        for (var ci = 0; ci < childIds.length; ci++) {
          var cs = state.childStates[childIds[ci]];
          var fromChild = i === 0 ? cs.initialState : cs.stepStates[i - 1];
          var toChild = cs.stepStates[i];
          var interpChild = engine().interpolateProps(fromChild, toChild, easedT);
          engine().writeShapeProps(cs.el, interpChild);
        }

        state.currentStep = i;
        return;
      }
      elapsed += stepDuration;
    }
    // Past all steps — show final state
    if (state.totalSteps > 0) {
      seekStep(state, state.totalSteps - 1);
    }
  }

  // ─── Register Extension ─────────────────────────────────────────────────────

  if (window.__vsliExtensions) {
    window.__vsliExtensions.register({
      selector: '[data-component-morph]',
      init: function (el, config) {
        return initComponentMorph(el, config);
      },
      stop: function (el, state) {
        stopComponentMorph(el, state);
      },
      seek: function (el, state, timeMs) {
        seekComponentMorph(el, state, timeMs);
      },
    });
  }
})();
