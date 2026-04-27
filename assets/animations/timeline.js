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

  // Listen for remote track seek commands (presenter sync)
  if (bc) {
    bc.addEventListener('message', function (e) {
      var msg = e.data;
      if (msg && msg.type === 'track-seek' && msg.id) {
        seekTrack(msg.id, msg.elapsed || 0);
      }
    });
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
    // Cancel any running step animations and stop all continuous tracks
    cancelAllAnimations();
    stopAllTracks();
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

    // Start auto-triggered continuous tracks
    tracks.forEach(function (track) {
      if (track.trigger === 'auto') {
        startTrackAfterDelay(track);
      }
    });
  }

  // ─── PLAY A STEP ───────────────────────────────────────────────────────────
  function playStep(slide, stepNum) {
    var data = slideData.get(slide);
    if (!data) return;

    // Trigger any continuous tracks bound to this step
    triggerTracksForStep(stepNum);

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

  // ─── CONTINUOUS TRACKS ──────────────────────────────────────────────────────
  // Duration-based animation tracks that coexist with step-based reveal.
  // Tracks can be triggered by steps or auto-play on slide activation.

  var tracks = new Map(); // Map<trackId, TrackState>
  var trackCallbacks = new Map(); // Map<trackId, Set<callback>>

  /**
   * Register a continuous animation track.
   * @param {string} trackId - Unique identifier
   * @param {object} config
   * @param {number} config.duration - Track duration in ms
   * @param {string} [config.trigger='auto'] - 'auto'|'step'|'visible'
   * @param {number} [config.step] - Step number that triggers this track (when trigger='step')
   * @param {boolean|number} [config.loop=false] - Loop count or true for infinite
   * @param {number} [config.delay=0] - Delay before starting
   * @param {function} [config.onUpdate] - Called each frame with (progress: 0-1, elapsedMs)
   * @param {function} [config.onComplete] - Called when track finishes
   */
  function registerTrack(trackId, config) {
    var track = {
      id: trackId,
      duration: config.duration,
      trigger: config.trigger || 'auto',
      step: config.step || 0,
      loop: config.loop || false,
      delay: config.delay || 0,
      onUpdate: config.onUpdate || null,
      onComplete: config.onComplete || null,
      // Runtime state
      state: 'idle', // 'idle' | 'playing' | 'paused' | 'complete'
      startTime: 0,
      elapsed: 0,
      pausedAt: 0,
      rafId: null,
      loopCount: 0,
    };
    tracks.set(trackId, track);

    // If track triggers on auto and the slide is already active, start it
    if (track.trigger === 'auto' && activeSlide) {
      startTrackAfterDelay(track);
    }
  }

  function startTrackAfterDelay(track) {
    if (reducedMotion) {
      // Reduced motion: jump to end state
      track.state = 'complete';
      track.elapsed = track.duration;
      if (track.onUpdate) track.onUpdate(1, track.duration);
      if (track.onComplete) track.onComplete();
      notifyTrackCallbacks(track.id, 1, track.duration);
      return;
    }

    if (track.delay > 0) {
      setTimeout(function () { playTrackInternal(track); }, track.delay);
    } else {
      playTrackInternal(track);
    }
  }

  function playTrackInternal(track) {
    if (track.state === 'complete' && !track.loop) return;
    track.state = 'playing';
    track.startTime = performance.now() - track.elapsed;
    tickTrack(track);
  }

  function tickTrack(track) {
    if (track.state !== 'playing') return;

    track.rafId = requestAnimationFrame(function () {
      if (track.state !== 'playing') return;

      var now = performance.now();
      track.elapsed = now - track.startTime;
      var progress = Math.min(track.elapsed / track.duration, 1);

      if (track.onUpdate) track.onUpdate(progress, track.elapsed);
      notifyTrackCallbacks(track.id, progress, track.elapsed);

      // Broadcast track progress for presenter sync
      if (bc) {
        bc.postMessage({ type: 'track', id: track.id, progress: progress, elapsed: track.elapsed });
      }

      if (progress >= 1) {
        // Track completed one cycle
        track.loopCount++;
        var shouldLoop = track.loop === true || (typeof track.loop === 'number' && track.loopCount < track.loop);

        if (shouldLoop) {
          // Restart
          track.elapsed = 0;
          track.startTime = now;
          tickTrack(track);
        } else {
          track.state = 'complete';
          if (track.onComplete) track.onComplete();
        }
      } else {
        tickTrack(track);
      }
    });
  }

  function playTrack(trackId) {
    var track = tracks.get(trackId);
    if (!track) return;
    if (track.state === 'paused') {
      track.startTime = performance.now() - track.elapsed;
    }
    playTrackInternal(track);
  }

  function pauseTrack(trackId) {
    var track = tracks.get(trackId);
    if (!track || track.state !== 'playing') return;
    track.state = 'paused';
    if (track.rafId) {
      cancelAnimationFrame(track.rafId);
      track.rafId = null;
    }
  }

  function seekTrack(trackId, timeMs) {
    var track = tracks.get(trackId);
    if (!track) return;
    track.elapsed = Math.max(0, Math.min(timeMs, track.duration));
    var progress = track.elapsed / track.duration;
    track.startTime = performance.now() - track.elapsed;
    if (track.onUpdate) track.onUpdate(progress, track.elapsed);
    notifyTrackCallbacks(track.id, progress, track.elapsed);
  }

  function stopTrack(trackId) {
    var track = tracks.get(trackId);
    if (!track) return;
    track.state = 'idle';
    track.elapsed = 0;
    track.loopCount = 0;
    if (track.rafId) {
      cancelAnimationFrame(track.rafId);
      track.rafId = null;
    }
  }

  function stopAllTracks() {
    tracks.forEach(function (track) {
      track.state = 'idle';
      track.elapsed = 0;
      track.loopCount = 0;
      if (track.rafId) {
        cancelAnimationFrame(track.rafId);
        track.rafId = null;
      }
    });
  }

  function removeTrack(trackId) {
    stopTrack(trackId);
    tracks.delete(trackId);
    trackCallbacks.delete(trackId);
  }

  function onTrackUpdate(trackId, cb) {
    if (!trackCallbacks.has(trackId)) trackCallbacks.set(trackId, new Set());
    trackCallbacks.get(trackId).add(cb);
    return function () {
      var cbs = trackCallbacks.get(trackId);
      if (cbs) cbs.delete(cb);
    };
  }

  function notifyTrackCallbacks(trackId, progress, elapsed) {
    var cbs = trackCallbacks.get(trackId);
    if (cbs) {
      cbs.forEach(function (cb) { cb(progress, elapsed); });
    }
  }

  function getTrackState(trackId) {
    var track = tracks.get(trackId);
    if (!track) return null;
    return {
      state: track.state,
      elapsed: track.elapsed,
      progress: track.elapsed / track.duration,
      duration: track.duration,
    };
  }

  /**
   * Called when a step is played — checks if any continuous tracks should trigger.
   */
  function triggerTracksForStep(stepNum) {
    tracks.forEach(function (track) {
      if (track.trigger === 'step' && track.step === stepNum && track.state === 'idle') {
        startTrackAfterDelay(track);
      }
    });
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

  // ─── STEP CONSUMERS ────────────────────────────────────────────────────────
  // Extensions can register as step consumers to participate in click-to-advance
  // navigation without monkey-patching. Each consumer owns a range of "virtual"
  // steps that are appended after the built-in data-anim-enter steps.

  var stepConsumers = new Map(); // Map<slideEl, Array<{ totalSteps, advance, seek, consumed }>>

  /**
   * Register an extension as a step consumer for a slide.
   * @param {object} config
   * @param {Element} config.slide - The slide element
   * @param {number} config.totalSteps - Number of steps this consumer owns
   * @param {function} config.advance - Called with ('forward'|'backward') to advance a step. Return true if consumed.
   * @param {function} config.seek - Called with (stepNumber) to jump to a step (0-based within consumer)
   */
  function registerStepConsumer(config) {
    if (!config || !config.slide || !config.totalSteps) return;
    var slide = config.slide;

    // Clear any stale consumers from a previous activation of this slide
    // (ext-runtime drops handles on deactivation, so re-init re-registers)
    var oldConsumers = stepConsumers.get(slide);
    var oldConsumerSteps = 0;
    if (oldConsumers) {
      for (var oc = 0; oc < oldConsumers.length; oc++) oldConsumerSteps += oldConsumers[oc].totalSteps;
    }
    stepConsumers.set(slide, [{
      totalSteps: config.totalSteps,
      advance: config.advance,
      seek: config.seek,
      consumed: 0,
    }]);

    // Ensure slideData exists for morph-only slides (no data-anim-enter elements)
    var data = slideData.get(slide);
    if (!data) {
      data = { steps: new Map(), totalSteps: 0, currentStep: 0 };
      slideData.set(slide, data);
    }

    // Update total step count: remove old consumer steps, add new ones
    data.totalSteps = data.totalSteps - oldConsumerSteps + config.totalSteps;
  }

  // Patch advance to delegate to consumers after built-in steps are exhausted.
  var _origAdvance = advance;
  advance = function advanceWithConsumers(direction) {
    if (!activeSlide) return;
    var data = slideData.get(activeSlide);
    if (!data) return;
    var consumers = stepConsumers.get(activeSlide);
    if (!consumers || !consumers.length) {
      _origAdvance(direction);
      return;
    }

    // Calculate built-in anim step count (total minus consumer steps)
    var consumerStepTotal = 0;
    for (var i = 0; i < consumers.length; i++) consumerStepTotal += consumers[i].totalSteps;
    var builtinSteps = data.totalSteps - consumerStepTotal;

    if (direction === 'forward') {
      if (data.currentStep < builtinSteps) {
        // Still in built-in steps
        _origAdvance(direction);
      } else {
        // Delegate to consumers
        var offset = data.currentStep - builtinSteps;
        var acc = 0;
        for (var ci = 0; ci < consumers.length; ci++) {
          var c = consumers[ci];
          if (offset < acc + c.totalSteps) {
            if (c.advance('forward')) {
              c.consumed = Math.min(c.consumed + 1, c.totalSteps);
              data.currentStep++;
              broadcastStep(data.currentStep, data.totalSteps);
              notifyCallbacks(data.currentStep, data.totalSteps);
            }
            return;
          }
          acc += c.totalSteps;
        }
      }
    } else {
      // backward
      if (data.currentStep > builtinSteps) {
        // In consumer step range
        var offset = data.currentStep - builtinSteps - 1;
        var acc = 0;
        for (var ci = 0; ci < consumers.length; ci++) {
          var c = consumers[ci];
          if (offset < acc + c.totalSteps) {
            if (c.advance('backward')) {
              c.consumed = Math.max(c.consumed - 1, 0);
              data.currentStep--;
              broadcastStep(data.currentStep, data.totalSteps);
              notifyCallbacks(data.currentStep, data.totalSteps);
            }
            return;
          }
          acc += c.totalSteps;
        }
      } else {
        _origAdvance(direction);
      }
    }
  };

  // Patch shouldConsumeNavigation to include consumer steps
  var _origShouldConsume = shouldConsumeNavigation;
  shouldConsumeNavigation = function shouldConsumeWithConsumers(direction) {
    if (_origShouldConsume(direction)) return true;
    if (!activeSlide) return false;
    var consumers = stepConsumers.get(activeSlide);
    if (!consumers || !consumers.length) return false;
    var data = slideData.get(activeSlide);
    if (!data) return false;
    if (direction === 'forward') {
      return data.currentStep < data.totalSteps;
    } else {
      return data.currentStep > 0;
    }
  };

  // ─── EXPOSE GLOBAL API ──────────────────────────────────────────────────────
  window.__vsliTimeline = {
    // Step-based (legacy)
    play: play,
    pause: pause,
    seek: seek,
    getCurrentStep: getCurrentStep,
    getTotalSteps: getTotalSteps,
    onStepChange: onStepChange,
    shouldConsumeNavigation: shouldConsumeNavigation,
    advance: advance,
    hasTimelineElements: hasTimelineElements,
    // Continuous tracks
    registerTrack: registerTrack,
    playTrack: playTrack,
    pauseTrack: pauseTrack,
    seekTrack: seekTrack,
    stopTrack: stopTrack,
    removeTrack: removeTrack,
    onTrackUpdate: onTrackUpdate,
    getTrackState: getTrackState,
    // Step consumers (extensions)
    registerStepConsumer: registerStepConsumer,
  };

  // ─── BOOT ───────────────────────────────────────────────────────────────────
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
