/* Maliang Deck Timeline Engine
 * Unified animation orchestration via Web Animations API.
 * Auto-play (step 0) and click-to-advance (step N) are sugar over one timeline model.
 *
 * Integration: cooperative hook in runtime.js go() + MutationObserver on .is-active.
 * Zero dependencies. No capture-phase listeners.
 */
(function () {
  'use strict';

  // ─── KEYFRAMES REGISTRY ─────────────────────────────────────────────────────
  const KEYFRAMES = {
    'fade-up': [
      { opacity: 0, transform: 'translateY(30px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    'fade-down': [
      { opacity: 0, transform: 'translateY(-30px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    'fade-left': [
      { opacity: 0, transform: 'translateX(-30px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    'fade-right': [
      { opacity: 0, transform: 'translateX(30px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    'scale-in': [
      { opacity: 0, transform: 'scale(0.8)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    'blur-in': [
      { opacity: 0, filter: 'blur(8px)' },
      { opacity: 1, filter: 'blur(0px)' }
    ],
    'slide-from-left': [
      { opacity: 0, transform: 'translateX(-100%)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    'slide-from-right': [
      { opacity: 0, transform: 'translateX(100%)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    'rise-in': [
      { opacity: 0, transform: 'translateY(60px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    'zoom-pop': [
      { opacity: 0, transform: 'scale(0)', offset: 0 },
      { opacity: 1, transform: 'scale(1.1)', offset: 0.7 },
      { opacity: 1, transform: 'scale(1)', offset: 1 }
    ],
    'rotate-in': [
      { opacity: 0, transform: 'rotate(-10deg) scale(0.9)' },
      { opacity: 1, transform: 'rotate(0deg) scale(1)' }
    ],

    // ── Component animations (extended set) ──────────────────────────────────
    'flip-in': [
      { opacity: 0, transform: 'perspective(600px) rotateX(90deg)' },
      { opacity: 1, transform: 'perspective(600px) rotateX(0deg)' }
    ],
    'bounce-in': [
      { opacity: 0, transform: 'scale(0.3)', offset: 0 },
      { opacity: 1, transform: 'scale(1.05)', offset: 0.5 },
      { opacity: 1, transform: 'scale(0.95)', offset: 0.7 },
      { opacity: 1, transform: 'scale(1)', offset: 1 }
    ],
    'elastic-in': [
      { opacity: 0, transform: 'scale(0.4)', offset: 0 },
      { opacity: 1, transform: 'scale(1.08)', offset: 0.55 },
      { opacity: 1, transform: 'scale(0.97)', offset: 0.75 },
      { opacity: 1, transform: 'scale(1.01)', offset: 0.9 },
      { opacity: 1, transform: 'scale(1)', offset: 1 }
    ],
    'swing-in': [
      { opacity: 0, transform: 'rotate(-12deg)', transformOrigin: 'top center' },
      { opacity: 1, transform: 'rotate(6deg)', transformOrigin: 'top center', offset: 0.4 },
      { opacity: 1, transform: 'rotate(-3deg)', transformOrigin: 'top center', offset: 0.7 },
      { opacity: 1, transform: 'rotate(0deg)', transformOrigin: 'top center', offset: 1 }
    ],
    'slide-from-top': [
      { opacity: 0, transform: 'translateY(-100%)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    'slide-from-bottom': [
      { opacity: 0, transform: 'translateY(100%)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    'drop-in': [
      { opacity: 0, transform: 'translateY(-80px) scale(0.95)', offset: 0 },
      { opacity: 1, transform: 'translateY(6px) scale(1)', offset: 0.65 },
      { opacity: 1, transform: 'translateY(-2px) scale(1)', offset: 0.85 },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 }
    ],
    'zoom-in': [
      { opacity: 0, transform: 'scale(0)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    'shrink-in': [
      { opacity: 0, transform: 'scale(1.6)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    'spin-in': [
      { opacity: 0, transform: 'rotate(360deg) scale(0.5)' },
      { opacity: 1, transform: 'rotate(0deg) scale(1)' }
    ],
    'blur-zoom': [
      { opacity: 0, filter: 'blur(12px)', transform: 'scale(0.7)' },
      { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }
    ],
    'skew-in': [
      { opacity: 0, transform: 'skewX(20deg) translateX(-30px)' },
      { opacity: 1, transform: 'skewX(0deg) translateX(0)' }
    ],
    'stretch-x': [
      { opacity: 0, transform: 'scaleX(0)' },
      { opacity: 1, transform: 'scaleX(1)' }
    ],
    'stretch-y': [
      { opacity: 0, transform: 'scaleY(0)' },
      { opacity: 1, transform: 'scaleY(1)' }
    ],
    'flash-in': [
      { opacity: 0, offset: 0 },
      { opacity: 1, offset: 0.25 },
      { opacity: 0.4, offset: 0.5 },
      { opacity: 1, offset: 0.75 },
      { opacity: 1, offset: 1 }
    ],
  };

  // ─── STATE ──────────────────────────────────────────────────────────────────
  var slideData = new Map(); // Map<slideEl, { steps: Map<number, Element[]>, totalSteps, currentStep }>
  var activeSlide = null;
  var reducedMotion = false;
  var runningAnimations = [];
  var callbacks = new Set();
  var bc = null;
  var STAGGER_MS = 80;

  // ─── REDUCED MOTION ─────────────────────────────────────────────────────────
  var mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion = mql.matches;
  mql.addEventListener('change', function (e) { reducedMotion = e.matches; });

  // ─── BROADCAST CHANNEL ──────────────────────────────────────────────────────
  try { bc = new BroadcastChannel('maliang-deck-timeline'); } catch (e) { /* unsupported */ }

  function broadcastStep(step, total) {
    if (bc) bc.postMessage({ type: 'step', step: step, total: total });
  }

  // ─── INITIALIZATION ─────────────────────────────────────────────────────────
  function init() {
    var deck = document.querySelector('.deck');
    if (!deck) return;
    var slides = deck.querySelectorAll('.slide');

    slides.forEach(function (slide) {
      var animEls = slide.querySelectorAll('[data-anim-enter]');
      if (!animEls.length) return;

      var steps = new Map(); // Map<stepNumber, Element[]>
      var maxStep = 0;

      animEls.forEach(function (el) {
        var step = parseInt(el.getAttribute('data-anim-step') || '0', 10);
        if (!steps.has(step)) steps.set(step, []);
        steps.get(step).push(el);
        if (step > maxStep) maxStep = step;
      });

      slideData.set(slide, { steps: steps, totalSteps: maxStep, currentStep: -1 });
    });

    // MutationObserver to detect slide activation
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type !== 'attributes' || m.attributeName !== 'class') return;
        var el = m.target;
        if (!el.classList.contains('slide')) return;
        if (el.classList.contains('is-active') && el !== activeSlide) {
          activateSlide(el, !!window.__vsliTimelineBackward);
        }
      });
    });

    slides.forEach(function (slide) {
      observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
    });

    // Handle initial active slide
    var initialActive = deck.querySelector('.slide.is-active');
    if (initialActive && slideData.has(initialActive)) {
      activateSlide(initialActive);
    }
  }

  // ─── SLIDE ACTIVATION ───────────────────────────────────────────────────────
  function activateSlide(slide, skipAnimation) {
    // Cancel any running animations
    cancelAllAnimations();
    activeSlide = slide;

    var data = slideData.get(slide);
    if (!data) return;

    // Reset: hide all animated elements
    data.steps.forEach(function (elements) {
      elements.forEach(function (el) {
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
      });
    });

    // Show step 0 elements
    data.currentStep = 0;
    if (skipAnimation) {
      // Instantly show step-0 elements without animation (backward navigation)
      var step0 = data.steps.get(0);
      if (step0) {
        step0.forEach(function (el) {
          var finalOpacity = parseFloat(el.getAttribute('data-anim-final-opacity') || '1');
          el.style.visibility = 'visible';
          el.style.opacity = String(finalOpacity);
          el.style.transform = '';
          el.style.filter = '';
        });
      }
    } else {
      playStep(slide, 0);
    }
    broadcastStep(0, data.totalSteps);
    notifyCallbacks(0, data.totalSteps);
  }

  // ─── PLAY A STEP ───────────────────────────────────────────────────────────
  function playStep(slide, stepNum) {
    var data = slideData.get(slide);
    if (!data) return;

    var elements = data.steps.get(stepNum);
    if (!elements) return;

    elements.forEach(function (el, index) {
      var enterName = el.getAttribute('data-anim-enter');
      var duration = parseInt(el.getAttribute('data-anim-duration') || '600', 10);
      var delay = parseInt(el.getAttribute('data-anim-delay') || '0', 10);
      var easing = el.getAttribute('data-anim-easing') || 'ease';
      var finalOpacity = parseFloat(el.getAttribute('data-anim-final-opacity') || '1');

      // Stagger: step 0 gets index-based stagger, click-steps don't
      var stagger = (stepNum === 0) ? index * STAGGER_MS : 0;
      var totalDelay = delay + stagger;

      // Make visible before animating
      el.style.visibility = 'visible';

      if (reducedMotion) {
        // Reduced motion: make immediately visible, no animation
        el.style.opacity = String(finalOpacity);
        el.style.transform = '';
        el.style.filter = '';
        return;
      }

      var keyframes = KEYFRAMES[enterName];
      if (!keyframes) {
        console.warn('[maliang-deck-timeline] Unknown animation: "' + enterName + '"');
        el.style.opacity = String(finalOpacity);
        return;
      }

      // Clone keyframes and adjust final opacity if needed
      var frames = keyframes.map(function (f, i) {
        if (i === keyframes.length - 1 && finalOpacity !== 1) {
          var clone = Object.assign({}, f);
          clone.opacity = finalOpacity;
          return clone;
        }
        return f;
      });

      var anim = el.animate(frames, {
        duration: duration,
        delay: totalDelay,
        easing: easing,
        fill: 'forwards',
      });

      runningAnimations.push(anim);

      anim.onfinish = function () {
        // Commit final state to inline styles
        el.style.opacity = String(finalOpacity);
        el.style.transform = '';
        el.style.filter = '';
        // Remove animation fill to avoid WAAPI holding compositing layer
        anim.cancel();
      };
    });
  }

  // ─── HIDE A STEP (for backward navigation) ─────────────────────────────────
  function hideStep(slide, stepNum) {
    var data = slideData.get(slide);
    if (!data) return;

    var elements = data.steps.get(stepNum);
    if (!elements) return;

    elements.forEach(function (el) {
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.transform = '';
      el.style.filter = '';
    });
  }

  // ─── CANCEL ALL RUNNING ANIMATIONS ─────────────────────────────────────────
  function cancelAllAnimations() {
    runningAnimations.forEach(function (a) {
      try { a.cancel(); } catch (e) { /* already finished */ }
    });
    runningAnimations = [];
  }

  // ─── NAVIGATION COOPERATION ─────────────────────────────────────────────────
  function shouldConsumeNavigation(direction) {
    if (!activeSlide) return false;
    var data = slideData.get(activeSlide);
    if (!data || data.totalSteps === 0) return false;

    if (direction === 'forward') {
      return data.currentStep < data.totalSteps;
    } else {
      return data.currentStep > 0;
    }
  }

  function advance(direction) {
    if (!activeSlide) return;
    var data = slideData.get(activeSlide);
    if (!data) return;

    if (direction === 'forward' && data.currentStep < data.totalSteps) {
      data.currentStep++;
      playStep(activeSlide, data.currentStep);
      broadcastStep(data.currentStep, data.totalSteps);
      notifyCallbacks(data.currentStep, data.totalSteps);
    } else if (direction === 'backward' && data.currentStep > 0) {
      hideStep(activeSlide, data.currentStep);
      data.currentStep--;
      broadcastStep(data.currentStep, data.totalSteps);
      notifyCallbacks(data.currentStep, data.totalSteps);
    }
  }

  // ─── PUBLIC API ─────────────────────────────────────────────────────────────
  function notifyCallbacks(step, total) {
    callbacks.forEach(function (cb) { cb(step, total); });
  }

  function hasTimelineElements() {
    if (!activeSlide) return false;
    return slideData.has(activeSlide);
  }

  function play() {
    runningAnimations.forEach(function (a) {
      try { a.play(); } catch (e) {}
    });
  }

  function pause() {
    runningAnimations.forEach(function (a) {
      try { a.pause(); } catch (e) {}
    });
  }

  function seek(step) {
    if (!activeSlide) return;
    var data = slideData.get(activeSlide);
    if (!data) return;

    step = Math.max(0, Math.min(data.totalSteps, step));
    cancelAllAnimations();

    // Hide all elements first
    data.steps.forEach(function (elements) {
      elements.forEach(function (el) {
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.style.transform = '';
        el.style.filter = '';
      });
    });

    // Show all elements at steps <= target immediately
    for (var s = 0; s <= step; s++) {
      var elements = data.steps.get(s);
      if (!elements) continue;
      elements.forEach(function (el) {
        var finalOpacity = parseFloat(el.getAttribute('data-anim-final-opacity') || '1');
        el.style.visibility = 'visible';
        el.style.opacity = String(finalOpacity);
      });
    }

    data.currentStep = step;
    broadcastStep(step, data.totalSteps);
    notifyCallbacks(step, data.totalSteps);
  }

  function getCurrentStep() {
    if (!activeSlide) return 0;
    var data = slideData.get(activeSlide);
    return data ? data.currentStep : 0;
  }

  function getTotalSteps() {
    if (!activeSlide) return 0;
    var data = slideData.get(activeSlide);
    return data ? data.totalSteps : 0;
  }

  function onStepChange(cb) {
    callbacks.add(cb);
    return function () { callbacks.delete(cb); };
  }

  // ─── EXPOSE GLOBAL API ──────────────────────────────────────────────────────
  window.__vsliTimeline = {
    play: play,
    pause: pause,
    seek: seek,
    getCurrentStep: getCurrentStep,
    getTotalSteps: getTotalSteps,
    onStepChange: onStepChange,
    shouldConsumeNavigation: shouldConsumeNavigation,
    advance: advance,
    hasTimelineElements: hasTimelineElements,
  };

  // ─── BOOT ───────────────────────────────────────────────────────────────────
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
