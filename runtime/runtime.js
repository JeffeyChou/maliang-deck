/* html-ppt :: runtime.js
 * Keyboard-driven deck runtime. Zero dependencies.
 *
 * Features:
 *   ← → / PgUp PgDn / Home End  slide navigation
 *   ↑ ↓  in-slide animation step control (reveal.js-style fragment stepping)
 *   L  laser pointer mode
 *   W  popup whiteboard for live drawing
 *   F  fullscreen
 *   S  presenter mode (opens a NEW WINDOW with current/next slide preview + notes + timer)
 *       The original window stays as audience view, synced via BroadcastChannel.
 *       Slide previews use CSS transform:scale() at design resolution for pixel-perfect layout.
 *   N  quick notes overlay (bottom drawer)
 *   O  slide overview grid
 *   T  cycle themes (reads data-themes on <html> or <body>)
 *   A  cycle demo animation on current slide
 *   URL hash #/N  deep-link to slide N (1-based)
 *   Progress bar auto-managed
 */
(function () {
  'use strict';

  const ANIMS = ['fade-up','fade-down','fade-left','fade-right','rise-in','drop-in',
    'zoom-pop','blur-in','glitch-in','typewriter','neon-glow','shimmer-sweep',
    'gradient-flow','stagger-list','counter-up','path-draw','parallax-tilt',
    'card-flip-3d','cube-rotate-3d','page-turn-3d','perspective-zoom',
    'marquee-scroll','kenburns','confetti-burst','spotlight','morph-shape','ripple-reveal'];

  function ready(fn){ if(document.readyState!='loading')fn(); else document.addEventListener('DOMContentLoaded',fn);}

  /* ========== Parse URL for preview-only mode ==========
   * When loaded as iframe.src = "index.html?preview=3", runtime enters a
   * locked single-slide mode: only slide N is visible, no chrome, no keys,
   * no hash updates. This is how the presenter window shows pixel-perfect
   * previews — by loading the actual deck file in an iframe and telling it
   * to display only a specific slide.
   */
  function getPreviewIdx() {
    const m = /[?&]preview=(\d+)/.exec(location.search || '');
    return m ? parseInt(m[1], 10) - 1 : -1;
  }

  ready(function () {
    const deck = document.querySelector('.deck');
    if (!deck) return;
    const slides = Array.from(deck.querySelectorAll('.slide'));
    if (!slides.length) return;

    const previewOnlyIdx = getPreviewIdx();
    const isPreviewMode = previewOnlyIdx >= 0 && previewOnlyIdx < slides.length;

    /* ===== Preview-only mode: show one slide, hide everything else ===== */
    if (isPreviewMode) {
      function showSlide(i) {
        slides.forEach((s, j) => {
          const active = (j === i);
          s.classList.toggle('is-active', active);
          s.style.display = active ? '' : 'none';
          if (active) {
            s.style.opacity = '1';
            s.style.transform = 'none';
            s.style.pointerEvents = 'auto';
          }
        });
      }
      showSlide(previewOnlyIdx);
      /* Hide chrome that the presenter shouldn't see in preview */
      const hideSel = '.progress-bar, .slide-number, .notes-overlay, .overview, .notes, aside.notes, .speaker-notes';
      document.querySelectorAll(hideSel).forEach(el => { el.style.display = 'none'; });
      document.documentElement.setAttribute('data-preview', '1');
      document.body.setAttribute('data-preview', '1');
      /* Auto-detect theme base path for theme switching in preview mode */
      function getPreviewThemeBase() {
        const base = document.documentElement.getAttribute('data-theme-base');
        if (base) return base;
        const tl = document.getElementById('theme-link');
        if (tl) {
          const raw = tl.getAttribute('href') || '';
          const ls = raw.lastIndexOf('/');
          if (ls >= 0) return raw.substring(0, ls + 1);
        }
        return 'assets/themes/';
      }
      const previewThemeBase = getPreviewThemeBase();

      /* Listen for postMessage from parent presenter window:
       *  - preview-goto: switch visible slide WITHOUT reloading
       *  - preview-theme: switch theme CSS link to match audience window */
      window.addEventListener('message', function(e) {
        if (!e.data) return;
        if (e.data.type === 'preview-goto') {
          const n = parseInt(e.data.idx, 10);
          if (n >= 0 && n < slides.length) showSlide(n);
        } else if (e.data.type === 'preview-theme' && e.data.name) {
          let link = document.getElementById('theme-link');
          if (!link) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.id = 'theme-link';
            document.head.appendChild(link);
          }
          link.href = previewThemeBase + e.data.name + '.css';
          document.documentElement.setAttribute('data-theme', e.data.name);
        }
      });
      /* Signal to parent that preview iframe is ready */
      try { window.parent && window.parent.postMessage({ type: 'preview-ready' }, '*'); } catch(e) {}
      return;
    }

    let idx = 0;
    const total = slides.length;
    const runtimeConfig = readRuntimeConfig();
    const slideTransition = normalizeSlideTransition(runtimeConfig.transition);
    const showProgressBar = runtimeConfig.showProgressBar !== false;
    const showSlideNumber = runtimeConfig.showSlideNumber !== false;
    const reducedMotionQuery = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    function readRuntimeConfig() {
      const script = document.getElementById('maliang-deck-runtime-config');
      if (!script) return {};
      try {
        const parsed = JSON.parse(script.textContent || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (e) {
        console.warn('[maliang-deck-runtime] Invalid runtime config; transitions disabled.');
        return {};
      }
    }

    function normalizeSlideTransition(config) {
      if (!config || typeof config !== 'object') {
        return { type: 'none', durationMs: 0, easing: 'ease', autoAnimate: false, unmatched: 'fade' };
      }
      const type = (config.type === 'fade' || config.type === 'slide' || config.type === 'none')
        ? config.type
        : 'fade';
      const durationMs = Number.isFinite(config.durationMs)
        ? Math.max(0, config.durationMs)
        : 420;
      const easing = typeof config.easing === 'string' && config.easing.trim()
        ? config.easing
        : 'ease';
      const unmatched = config.unmatched === 'instant' ? 'instant' : 'fade';
      return {
        type: type,
        durationMs: durationMs,
        easing: easing,
        autoAnimate: config.autoAnimate === true,
        unmatched: unmatched,
      };
    }

    function prefersReducedMotion() {
      return !!(reducedMotionQuery && reducedMotionQuery.matches);
    }

    /* ===== UI contrast detection ===== */
    function updateUIContrast(slideEl) {
      var bg = slideEl.style.background || slideEl.style.backgroundColor || '';
      var r = 255, g = 255, b = 255; // default: assume light
      var m = bg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
      if (m) { r = parseInt(m[1],16); g = parseInt(m[2],16); b = parseInt(m[3],16); }
      else {
        m = bg.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
        if (m) { r = parseInt(m[1]+m[1],16); g = parseInt(m[2]+m[2],16); b = parseInt(m[3]+m[3],16); }
        else {
          m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
          if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
        }
      }
      // Fallback: read computed style when inline background is not set
      if (!m) {
        var computedBg = getComputedStyle(slideEl).backgroundColor || '';
        m = computedBg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
      }
      // Relative luminance (sRGB)
      var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      var root = document.documentElement;
      if (lum < 0.5) {
        // dark background → light UI
        root.style.setProperty('--ui-text', 'rgba(255,255,255,.65)');
        root.style.setProperty('--ui-bar-bg', 'rgba(255,255,255,.15)');
        root.style.setProperty('--ui-bar-fill', '#58a6ff');
        root.style.setProperty('--ui-shadow', '0 1px 4px rgba(0,0,0,.5)');
      } else {
        // light background → dark UI
        root.style.setProperty('--ui-text', 'rgba(0,0,0,.5)');
        root.style.setProperty('--ui-bar-bg', 'rgba(0,0,0,.1)');
        root.style.setProperty('--ui-bar-fill', '#3b82f6');
        root.style.setProperty('--ui-shadow', '0 1px 4px rgba(255,255,255,.3)');
      }
    }

    /* ===== viewport auto-scaling ===== */
    const slideW = parseInt(deck.style.getPropertyValue('--slide-w'), 10) || 1280;
    const slideH = parseInt(deck.style.getPropertyValue('--slide-h'), 10) || 720;
    function rescaleViewport() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(vw / slideW, vh / slideH);
      slides.forEach(s => { s.style.transform = 'scale(' + scale + ')'; });
    }
    rescaleViewport();
    window.addEventListener('resize', rescaleViewport);

    /* ===== BroadcastChannel for presenter sync ===== */
    const CHANNEL_NAME = 'html-ppt-presenter-' + location.pathname;
    let bc;
    try { bc = new BroadcastChannel(CHANNEL_NAME); } catch(e) { bc = null; }

    // Are we running inside the presenter popup? (legacy flag, now unused)
    const isPresenterWindow = false;

    /* ===== progress bar ===== */
    let bar = document.querySelector('.progress-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'progress-bar';
      bar.innerHTML = '<span></span>';
      document.body.appendChild(bar);
    }
    if (!showProgressBar) bar.style.display = 'none';
    const barFill = bar.querySelector('span');

    /* ===== slide number visibility ===== */
    var slideNumEl = document.querySelector('.slide-number');
    if (slideNumEl && !showSlideNumber) slideNumEl.style.display = 'none';

    /* ===== notes overlay (N key) ===== */
    let notes = document.querySelector('.notes-overlay');
    if (!notes) {
      notes = document.createElement('div');
      notes.className = 'notes-overlay';
      document.body.appendChild(notes);
    }

    /* ===== overview grid (O key) ===== */
    let overview = document.querySelector('.overview');
    if (!overview) {
      overview = document.createElement('div');
      overview.className = 'overview';
      slides.forEach((s, i) => {
        const t = document.createElement('div');
        t.className = 'thumb';
        const title = s.getAttribute('data-title') ||
          (s.querySelector('h1,h2,h3')||{}).textContent || ('Slide '+(i+1));
        t.innerHTML = '<div class="n">'+(i+1)+'</div><div class="t">'+title.trim().slice(0,80)+'</div>';
        t.addEventListener('click', () => { go(i, false, { skipTimeline: true }); toggleOverview(false); });
        overview.appendChild(t);
      });
      document.body.appendChild(overview);
    }

    /* ===== transition lifecycle ===== */
    function transitionIsEnabled() {
      return slideTransition.type !== 'none' || slideTransition.autoAnimate;
    }

    function slideScale(slide) {
      const rect = slide.getBoundingClientRect();
      const width = parseFloat(getComputedStyle(slide).width) || slideW || rect.width || 1;
      const height = parseFloat(getComputedStyle(slide).height) || slideH || rect.height || 1;
      return {
        x: rect.width ? rect.width / width : 1,
        y: rect.height ? rect.height / height : 1,
      };
    }

    function computeFlipDelta(previousRect, nextRect, scale) {
      var scaleX = (typeof scale === 'object' && scale && Number.isFinite(scale.x)) ? scale.x : scale;
      var scaleY = (typeof scale === 'object' && scale && Number.isFinite(scale.y)) ? scale.y : scaleX;
      scaleX = Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
      scaleY = Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1;
      var previousWidth = previousRect && previousRect.width > 0 ? previousRect.width : 1;
      var previousHeight = previousRect && previousRect.height > 0 ? previousRect.height : 1;
      var nextWidth = nextRect && nextRect.width > 0 ? nextRect.width : 1;
      var nextHeight = nextRect && nextRect.height > 0 ? nextRect.height : 1;
      return {
        translateX: ((previousRect ? previousRect.left : 0) - (nextRect ? nextRect.left : 0)) / scaleX,
        translateY: ((previousRect ? previousRect.top : 0) - (nextRect ? nextRect.top : 0)) / scaleY,
        scaleX: previousWidth / nextWidth,
        scaleY: previousHeight / nextHeight,
      };
    }

    function sharedElementMap(slide) {
      var map = new Map();
      slide.querySelectorAll('[data-maliang-deck-auto-animate-id]').forEach(function(el) {
        var key = el.getAttribute('data-maliang-deck-auto-animate-id');
        if (key && !map.has(key)) map.set(key, el);
      });
      return map;
    }

    function baseTransform(el) {
      return el.style.transform || '';
    }

    function flipTransform(delta, existingTransform) {
      var parts = [
        'translate(' + delta.translateX + 'px, ' + delta.translateY + 'px)',
        'scale(' + delta.scaleX + ', ' + delta.scaleY + ')',
      ];
      if (existingTransform) parts.push(existingTransform);
      return parts.join(' ');
    }

    function animateSharedElements(previousSlide, nextSlide, duration, easing) {
      if (!slideTransition.autoAnimate) return [];
      var previous = sharedElementMap(previousSlide);
      var next = sharedElementMap(nextSlide);
      var nextScale = slideScale(nextSlide);
      var animations = [];
      var matched = new Set();

      next.forEach(function(nextEl, key) {
        var previousEl = previous.get(key);
        if (!previousEl) return;
        matched.add(key);
        var delta = computeFlipDelta(previousEl.getBoundingClientRect(), nextEl.getBoundingClientRect(), nextScale);
        var existing = baseTransform(nextEl);
        var animation = nextEl.animate([
          { transform: flipTransform(delta, existing), opacity: getComputedStyle(previousEl).opacity || '1' },
          { transform: existing || 'none', opacity: getComputedStyle(nextEl).opacity || '1' },
        ], { duration: duration, easing: easing, fill: 'both' });
        animations.push(animation);
      });

      if (slideTransition.unmatched === 'fade') {
        previous.forEach(function(previousEl, key) {
          if (matched.has(key)) return;
          animations.push(previousEl.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: Math.max(1, Math.round(duration * 0.7)),
            easing: easing,
            fill: 'both',
          }));
        });
        next.forEach(function(nextEl, key) {
          if (matched.has(key)) return;
          animations.push(nextEl.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: Math.max(1, Math.round(duration * 0.7)),
            easing: easing,
            fill: 'both',
          }));
        });
      }

      return animations;
    }

    function withSlideTranslate(base, amount) {
      return (base && base !== 'none' ? base + ' ' : '') + 'translateX(' + amount + 'px)';
    }

    function animateWholeSlides(previousSlide, nextSlide, direction, duration, easing) {
      if (slideTransition.type === 'none') return [];
      if (slideTransition.type === 'fade') {
        return [
          previousSlide.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration, easing: easing, fill: 'both' }),
          nextSlide.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration, easing: easing, fill: 'both' }),
        ];
      }

      var offset = direction === 'backward' ? -48 : 48;
      var previousBase = previousSlide.style.transform || '';
      var nextBase = nextSlide.style.transform || '';
      return [
        previousSlide.animate([
          { opacity: 1, transform: previousBase || 'none' },
          { opacity: 0, transform: withSlideTranslate(previousBase, -offset / 2) },
        ], { duration: duration, easing: easing, fill: 'both' }),
        nextSlide.animate([
          { opacity: 0, transform: withSlideTranslate(nextBase, offset) },
          { opacity: 1, transform: nextBase || 'none' },
        ], { duration: duration, easing: easing, fill: 'both' }),
      ];
    }

    function stageTransitionSlides(previousSlide, nextSlide, direction) {
      // Keep both adjacent slides laid out and measurable; never measure inside display:none.
      deck.classList.add('is-slide-transitioning');
      deck.setAttribute('data-transition-direction', direction);
      previousSlide.classList.add('is-transition-prev');
      nextSlide.classList.add('is-transition-next');
    }

    function cleanupTransitionSlides(previousSlide, nextSlide) {
      deck.classList.remove('is-slide-transitioning');
      deck.removeAttribute('data-transition-direction');
      previousSlide.classList.remove('is-transition-prev');
      nextSlide.classList.remove('is-transition-next');
    }

    function commitSlideTransition(n) {
      slides.forEach((s,i) => {
        s.classList.toggle('is-active', i===n);
        s.classList.toggle('is-prev', i<n);
      });
    }

    function runSlideTransition(previousSlide, nextSlide, direction, done) {
      var duration = slideTransition.durationMs;
      if (!transitionIsEnabled() || prefersReducedMotion() || duration <= 0 || previousSlide === nextSlide || typeof previousSlide.animate !== 'function') {
        commitSlideTransition(idx);
        done();
        return;
      }

      stageTransitionSlides(previousSlide, nextSlide, direction);
      // Force style resolution before measurement/animation.
      void nextSlide.offsetWidth;
      var animations = animateWholeSlides(previousSlide, nextSlide, direction, duration, slideTransition.easing)
        .concat(animateSharedElements(previousSlide, nextSlide, duration, slideTransition.easing));

      if (!animations.length) {
        cleanupTransitionSlides(previousSlide, nextSlide);
        commitSlideTransition(idx);
        done();
        return;
      }

      Promise.all(animations.map(function(animation) {
        return animation.finished.catch(function() {});
      })).then(function() {
        animations.forEach(function(animation) {
          try { animation.cancel(); } catch (e) {}
        });
        cleanupTransitionSlides(previousSlide, nextSlide);
        commitSlideTransition(idx);
        done();
      });
    }

    /* ===== navigation ===== */
    function go(n, fromRemote, options){
      options = options || {};
      // Cooperative timeline hook: legacy non-arrow navigation can still consume
      // step-based navigation, but explicit left/right slide navigation bypasses it.
      if (!fromRemote && !options.skipTimeline && window.__vsliTimeline) {
        var direction = n > idx ? 'forward' : 'backward';
        if (window.__vsliTimeline.shouldConsumeNavigation(direction)) {
          window.__vsliTimeline.advance(direction);
          return;
        }
      }
      n = Math.max(0, Math.min(total-1, n));
      var previousIdx = idx;
      var previousSlide = slides[previousIdx];
      var nextSlide = slides[n];
      var direction = n >= previousIdx ? 'forward' : 'backward';
      idx = n;

      // Update progress bar and slide number immediately (before transition)
      barFill.style.width = ((n+1)/total*100)+'%';
      var numEl = document.querySelector('.slide-number');
      if (numEl) { numEl.setAttribute('data-current', n+1); numEl.setAttribute('data-total', total); }

      // Signal backward direction to timeline for skip-animation on activation
      window.__vsliTimelineBackward = (direction === 'backward');

      function afterSlideCommit() {
      window.__vsliTimelineBackward = false;
      updateUIContrast(slides[n]);

      // notes (bottom overlay)
      const note = slides[n].querySelector('.notes, aside.notes, .speaker-notes');
      notes.innerHTML = note ? note.innerHTML : '';

      // hash
      const hashTarget = '#/'+(n+1);
      if (location.hash !== hashTarget && !isPresenterWindow) {
        history.replaceState(null,'', hashTarget);
      }

      // re-trigger entry animations
      slides[n].querySelectorAll('[data-anim]').forEach(el => {
        const a = el.getAttribute('data-anim');
        el.classList.remove('anim-'+a);
        void el.offsetWidth;
        el.classList.add('anim-'+a);
      });

      // counter-up
      slides[n].querySelectorAll('.counter').forEach(el => {
        const target = parseFloat(el.getAttribute('data-to')||el.textContent);
        const dur = parseInt(el.getAttribute('data-dur')||'1200',10);
        const start = performance.now();
        const from = 0;
        function tick(now){
          const t = Math.min(1,(now-start)/dur);
          const v = from + (target-from)*(1-Math.pow(1-t,3));
          el.textContent = (target % 1 === 0) ? Math.round(v) : v.toFixed(1);
          if (t<1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });

      // Broadcast to other window (audience ↔ presenter)
      if (!fromRemote && bc) {
        bc.postMessage({ type: 'go', idx: n });
      }
      }

      runSlideTransition(previousSlide, nextSlide, direction, afterSlideCommit);
    }

    /* ===== listen for remote navigation / theme changes ===== */
    if (bc) {
      bc.onmessage = function(e) {
        if (!e.data) return;
        if (e.data.type === 'go' && typeof e.data.idx === 'number') {
          go(e.data.idx, true);
        } else if (e.data.type === 'theme' && e.data.name) {
          /* Sync theme across windows */
          const i = themes.indexOf(e.data.name);
          if (i >= 0) themeIdx = i;
          applyTheme(e.data.name);
        } else if (e.data.type === 'timeline-step' && e.data.direction) {
          advanceTimelineStep(e.data.direction);
        }
      };
    }

    function toggleNotes(force){ notes.classList.toggle('open', force!==undefined?force:!notes.classList.contains('open')); }
    function toggleOverview(force){ overview.classList.toggle('open', force!==undefined?force:!overview.classList.contains('open')); }

    function shouldIgnoreShortcut(e) {
      const target = e.target;
      if (!target) return false;
      if (target.closest && target.closest('.maliang-deck-editor-toolbar, .maliang-deck-editor-selection')) {
        return true;
      }
      if (window.__maliangDeckEditorActive && window.__maliangDeckEditorActive()) {
        if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') return false;
        return true;
      }
      if (target.closest && target.closest('.maliang-deck-whiteboard')) {
        return e.key !== 'Escape' && e.key !== 'w' && e.key !== 'W';
      }
      const tag = (target.tagName || '').toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    }

    function advanceTimelineStep(direction) {
      const timeline = window.__vsliTimeline;
      if (!timeline || !timeline.hasTimelineElements || !timeline.hasTimelineElements()) return false;
      if (!timeline.shouldConsumeNavigation || !timeline.advance) return false;
      if (!timeline.shouldConsumeNavigation(direction)) return false;
      timeline.advance(direction);
      return true;
    }

    function ensurePresenterToolStyles() {
      if (document.getElementById('maliang-deck-presenter-tools-style')) return;
      const style = document.createElement('style');
      style.id = 'maliang-deck-presenter-tools-style';
      style.textContent = `
        .maliang-deck-laser-pointer {
          position: fixed;
          left: 0;
          top: 0;
          width: 26px;
          height: 26px;
          margin: -13px 0 0 -13px;
          border-radius: 999px;
          pointer-events: none;
          z-index: 3000;
          opacity: 0;
          transform: translate3d(-999px, -999px, 0);
          transition: opacity .12s ease, box-shadow .12s ease;
          background: radial-gradient(circle, rgba(255,255,255,.95) 0 10%, rgba(255,38,38,.95) 12% 27%, rgba(255,38,38,.25) 30% 58%, transparent 62%);
          box-shadow: 0 0 14px 5px rgba(255, 38, 38, .55), 0 0 34px 10px rgba(255, 0, 0, .22);
          mix-blend-mode: screen;
        }
        .maliang-deck-laser-pointer.is-visible { opacity: 1; }
        .maliang-deck-laser-pointer.is-pulsing { box-shadow: 0 0 22px 9px rgba(255, 38, 38, .85), 0 0 54px 18px rgba(255, 0, 0, .32); }
        .maliang-deck-laser-trails {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 2999;
          overflow: visible;
        }
        .maliang-deck-laser-trail {
          fill: none;
          overflow: visible;
          filter: drop-shadow(0 0 8px rgba(255, 38, 38, .85)) drop-shadow(0 0 20px rgba(255, 0, 0, .42));
        }
        .maliang-deck-laser-trail-segment {
          fill: none;
          stroke: rgb(255, 38, 38);
          stroke-linecap: round;
          stroke-linejoin: round;
          vector-effect: non-scaling-stroke;
        }
        .maliang-deck-laser-trail.is-fading {
          animation: maliangDeckLaserTrailFade 2.8s ease-out forwards;
        }
        @keyframes maliangDeckLaserTrailFade {
          0% { opacity: 1; }
          70% { opacity: .72; }
          100% { opacity: 0; }
        }
        body.maliang-deck-laser-active { cursor: crosshair; }

        .maliang-deck-whiteboard {
          position: fixed;
          inset: clamp(18px, 6vh, 52px) clamp(18px, 7vw, 76px);
          z-index: 3100;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: rgba(255,255,255,.96);
          color: #111827;
          border: 1px solid rgba(17,24,39,.18);
          border-radius: 18px;
          box-shadow: 0 24px 90px rgba(0,0,0,.42);
          backdrop-filter: blur(12px);
        }
        .maliang-deck-whiteboard[hidden] { display: none !important; }
        .maliang-deck-whiteboard__toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(17,24,39,.12);
          background: rgba(249,250,251,.92);
          font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .maliang-deck-whiteboard__toolbar button,
        .maliang-deck-whiteboard__toolbar input {
          font: inherit;
        }
        .maliang-deck-whiteboard__toolbar button {
          border: 1px solid rgba(17,24,39,.16);
          border-radius: 9px;
          background: #fff;
          color: #111827;
          padding: 7px 10px;
          cursor: pointer;
        }
        .maliang-deck-whiteboard__toolbar button:hover { border-color: #2563eb; color: #1d4ed8; }
        .maliang-deck-whiteboard__toolbar button[aria-pressed="true"] { border-color: #2563eb; background: #dbeafe; color: #1d4ed8; }
        .maliang-deck-whiteboard__toolbar button:disabled { opacity: .42; cursor: not-allowed; color: #6b7280; }
        .maliang-deck-whiteboard__toolbar button:disabled:hover { border-color: rgba(17,24,39,.16); color: #6b7280; }
        .maliang-deck-whiteboard__toolbar .danger:hover { border-color: #dc2626; color: #b91c1c; }
        .maliang-deck-whiteboard__tool-group { display: inline-flex; align-items: center; gap: 4px; padding: 2px; border-radius: 11px; background: rgba(17,24,39,.05); }
        .maliang-deck-whiteboard__toolbar .spacer { flex: 1; }
        .maliang-deck-whiteboard__surface {
          position: relative;
          flex: 1;
          min-height: 0;
          background:
            linear-gradient(rgba(148,163,184,.16) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,.16) 1px, transparent 1px),
            #fff;
          background-size: 28px 28px;
          touch-action: none;
        }
        .maliang-deck-whiteboard__canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          cursor: crosshair;
          touch-action: none;
        }
        .maliang-deck-whiteboard.is-eraser .maliang-deck-whiteboard__canvas { cursor: cell; }
        body.maliang-deck-whiteboard-open .deck { filter: saturate(.72) brightness(.75); }
      `;
      document.head.appendChild(style);
    }

    ensurePresenterToolStyles();

    const laserPointer = document.createElement('div');
    laserPointer.className = 'maliang-deck-laser-pointer';
    laserPointer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(laserPointer);

    const laserTrailSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    laserTrailSvg.classList.add('maliang-deck-laser-trails');
    laserTrailSvg.setAttribute('aria-hidden', 'true');
    laserTrailSvg.setAttribute('focusable', 'false');
    document.body.appendChild(laserTrailSvg);

    const LASER_TRAIL_DELAY_MS = 2200;
    const LASER_TRAIL_MAX_WIDTH = 11;
    const LASER_TRAIL_MIN_WIDTH = 1.2;
    const LASER_TRAIL_MIN_OPACITY = 0.12;
    const STROKE_INITIAL_WIDTH = 0.4;
    const STROKE_END_WIDTH = 0.1;
    const STROKE_MAX_SPEED = 2.0;
    const STROKE_WIDTH_DIFF_STEP = 0.1;
    const STROKE_BEZIER_STEP = 0.1;

    let laserEnabled = false;
    let laserPulseTimer = 0;
    let laserDrawing = false;
    let laserTrailGroup = null;
    let laserTrail = null;

    function toggleLaserPointer(force) {
      laserEnabled = force !== undefined ? !!force : !laserEnabled;
      document.body.classList.toggle('maliang-deck-laser-active', laserEnabled);
      laserPointer.classList.toggle('is-visible', false);
      if (!laserEnabled) {
        laserPointer.style.transform = 'translate3d(-999px, -999px, 0)';
        finishLaserTrail();
      }
    }

    function eventPoint(e, offsetEl) {
      if (offsetEl) {
        const rect = offsetEl.getBoundingClientRect();
        return {
          x: Math.round((e.clientX - rect.left) * 10) / 10,
          y: Math.round((e.clientY - rect.top) * 10) / 10,
          time: Date.now(),
        };
      }
      return {
        x: Math.round(e.clientX * 10) / 10,
        y: Math.round(e.clientY * 10) / 10,
        time: Date.now(),
      };
    }

    function strokeDistance(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function createStrokeModel(options) {
      return {
        points: [],
        lastPoint: null,
        lastWidth: STROKE_INITIAL_WIDTH,
        lastTime: 0,
        maxWidth: options.maxWidth,
        minWidth: options.minWidth,
        minSampleMs: options.minSampleMs,
        minSampleDistance: options.minSampleDistance,
        tool: options.tool || 'pen',
        color: options.color || '#111827',
      };
    }

    function clampStrokeWidth(width) {
      if (!Number.isFinite(width)) return STROKE_INITIAL_WIDTH;
      return Math.max(0.05, Math.min(1, width));
    }

    function strokeLineWidth(begin, end, beginWidth, step) {
      const elapsed = Math.max(1, end.time - begin.time);
      const distance = strokeDistance(begin, end);
      const speed = Math.min(STROKE_MAX_SPEED, distance / elapsed);
      let width = (STROKE_MAX_SPEED - speed) / STROKE_MAX_SPEED;
      const maxDiff = distance * step;
      if (width < 0.05) width = 0.05;
      if (Math.abs(width - beginWidth) > maxDiff) {
        width = width > beginWidth ? beginWidth + maxDiff : beginWidth - maxDiff;
      }
      return clampStrokeWidth(width);
    }

    function addStrokePoint(points, point) {
      const prev = points[points.length - 1];
      if (prev && prev.x === point.x && prev.y === point.y) return;
      points.push({ x: point.x, y: point.y, w: clampStrokeWidth(point.w) });
    }

    function differentialAddStrokePoint(points, point) {
      const last = points[points.length - 1];
      if (!last) {
        addStrokePoint(points, point);
        return;
      }
      const steps = Math.floor(Math.abs(point.w - last.w) / STROKE_WIDTH_DIFF_STEP) + 1;
      for (let i = 1; i < steps; i++) {
        addStrokePoint(points, {
          x: last.x + ((point.x - last.x) * i) / steps,
          y: last.y + ((point.y - last.y) * i) / steps,
          w: last.w + ((point.w - last.w) * i) / steps,
        });
      }
      addStrokePoint(points, point);
    }

    function quadraticBezierStroke(points, begin, control, end) {
      for (let t = STROKE_BEZIER_STEP; t <= 1.0001; t += STROKE_BEZIER_STEP) {
        const inv = 1 - t;
        differentialAddStrokePoint(points, {
          x: inv * inv * begin.x + 2 * t * inv * control.x + t * t * end.x,
          y: inv * inv * begin.y + 2 * t * inv * control.y + t * t * end.y,
          w: begin.w + t * (end.w - begin.w),
        });
      }
    }

    function actualStrokeWidth(model, width) {
      return model.minWidth + (model.maxWidth - model.minWidth) * clampStrokeWidth(width);
    }

    function insertStrokePoint(model, point) {
      const len = model.points.length;
      const sample = { x: point.x, y: point.y, time: point.time || Date.now() };

      if (len === 0) {
        addStrokePoint(model.points, { x: sample.x, y: sample.y, w: STROKE_INITIAL_WIDTH });
        model.lastPoint = sample;
        model.lastTime = sample.time;
        model.lastWidth = STROKE_INITIAL_WIDTH;
        return true;
      }

      const distance = strokeDistance(sample, model.lastPoint);
      if ((sample.time - model.lastTime) < model.minSampleMs || distance < model.minSampleDistance) {
        return false;
      }

      const step = len > 4 ? 0.05 : 0.2;
      let width = (strokeLineWidth(model.lastPoint, sample, model.lastWidth, step) + model.lastWidth) / 2;
      const generated = [];
      const previousRendered = model.points[len - 1];
      addStrokePoint(generated, previousRendered);

      if (len === 1) {
        const mid = {
          x: (model.lastPoint.x + sample.x + 1) / 2,
          y: (model.lastPoint.y + sample.y + 1) / 2,
          w: width,
        };
        differentialAddStrokePoint(generated, mid);
        width = mid.w;
      } else {
        quadraticBezierStroke(generated, previousRendered, model.lastPoint, {
          x: (model.lastPoint.x + sample.x) / 2,
          y: (model.lastPoint.y + sample.y) / 2,
          w: width,
        });
      }

      for (let i = 1; i < generated.length; i++) addStrokePoint(model.points, generated[i]);
      model.lastPoint = sample;
      model.lastTime = sample.time;
      model.lastWidth = width;
      return true;
    }

    function finishStrokeModel(model, point) {
      if (!model || !model.points.length || !point) return;
      const generated = [];
      const previousRendered = model.points[model.points.length - 1];
      addStrokePoint(generated, previousRendered);
      differentialAddStrokePoint(generated, { x: point.x, y: point.y, w: STROKE_END_WIDTH });
      for (let i = 1; i < generated.length; i++) addStrokePoint(model.points, generated[i]);
    }

    function createLaserTrailGroup() {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.classList.add('maliang-deck-laser-trail');
      laserTrailSvg.appendChild(group);
      return group;
    }

    function renderLaserTrail() {
      if (!laserTrailGroup || !laserTrail) return;
      laserTrailGroup.replaceChildren();
      const points = laserTrail.points;
      if (points.length < 2) return;

      const segmentCount = points.length - 1;
      for (let i = 1; i < points.length; i++) {
        const start = points[i - 1];
        const end = points[i];
        const ratio = segmentCount <= 1 ? 1 : i / segmentCount;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('maliang-deck-laser-trail-segment');
        path.setAttribute('d', 'M ' + start.x + ' ' + start.y + ' L ' + end.x + ' ' + end.y);
        path.style.strokeWidth = actualStrokeWidth(laserTrail, end.w).toFixed(2);
        path.style.opacity = (LASER_TRAIL_MIN_OPACITY + (1 - LASER_TRAIL_MIN_OPACITY) * ratio).toFixed(3);
        laserTrailGroup.appendChild(path);
      }
    }

    function startLaserTrail(e) {
      laserDrawing = true;
      laserTrailGroup = createLaserTrailGroup();
      laserTrail = createStrokeModel({
        maxWidth: LASER_TRAIL_MAX_WIDTH,
        minWidth: LASER_TRAIL_MIN_WIDTH,
        minSampleMs: 12,
        minSampleDistance: 3,
      });
      insertStrokePoint(laserTrail, eventPoint(e));
      renderLaserTrail();
    }

    function appendLaserTrailPoint(e) {
      if (!laserDrawing || !laserTrailGroup || !laserTrail) return;
      if (insertStrokePoint(laserTrail, eventPoint(e))) {
        if (laserTrail.points.length > 520) laserTrail.points.splice(0, laserTrail.points.length - 520);
        renderLaserTrail();
      }
    }

    function finishLaserTrail(e) {
      if (!laserTrailGroup) {
        laserDrawing = false;
        laserTrail = null;
        return;
      }
      if (laserTrail && e && typeof e.clientX === 'number') {
        finishStrokeModel(laserTrail, eventPoint(e));
        renderLaserTrail();
      }
      const group = laserTrailGroup;
      laserDrawing = false;
      laserTrailGroup = null;
      laserTrail = null;
      group.classList.add('is-fading');
      const remove = function(){ group.remove(); };
      group.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, 3200);
    }

    window.addEventListener('pointermove', function(e) {
      if (!laserEnabled) return;
      laserPointer.style.transform = 'translate3d(' + e.clientX + 'px, ' + e.clientY + 'px, 0)';
      laserPointer.classList.add('is-visible');
      appendLaserTrailPoint(e);
    });
    window.addEventListener('pointerleave', function() {
      laserPointer.classList.remove('is-visible');
      finishLaserTrail();
    });
    window.addEventListener('pointerdown', function(e) {
      if (!laserEnabled || e.button !== 0) return;
      if (whiteboard && !whiteboard.hidden) return;
      e.preventDefault();
      laserPointer.classList.add('is-pulsing');
      clearTimeout(laserPulseTimer);
      laserPulseTimer = setTimeout(function(){ laserPointer.classList.remove('is-pulsing'); }, 180);
      startLaserTrail(e);
    });
    window.addEventListener('pointerup', finishLaserTrail);
    window.addEventListener('pointercancel', finishLaserTrail);

    let whiteboard = null;
    let whiteboardCanvas = null;
    let whiteboardCtx = null;
    let whiteboardSurface = null;
    let whiteboardDrawing = false;
    let whiteboardColor = '#111827';
    let whiteboardSize = 4;
    let whiteboardTool = 'pen';
    let whiteboardStroke = null;
    let whiteboardRenderedIndex = 0;
    let whiteboardHistory = [];
    let whiteboardRedoStack = [];

    function ensureWhiteboard() {
      if (whiteboard) return;
      whiteboard = document.createElement('div');
      whiteboard.className = 'maliang-deck-whiteboard';
      whiteboard.hidden = true;
      whiteboard.setAttribute('role', 'dialog');
      whiteboard.setAttribute('aria-label', 'Popup whiteboard');
      whiteboard.innerHTML = [
        '<div class="maliang-deck-whiteboard__toolbar">',
        '  <span>Whiteboard</span>',
        '  <span class="maliang-deck-whiteboard__tool-group" aria-label="Whiteboard tools">',
        '    <button type="button" data-role="pen" aria-pressed="true">Marker</button>',
        '    <button type="button" data-role="eraser" aria-pressed="false">Eraser</button>',
        '  </span>',
        '  <span class="maliang-deck-whiteboard__tool-group" aria-label="Whiteboard history">',
        '    <button type="button" data-role="undo" disabled>↶ Undo</button>',
        '    <button type="button" data-role="redo" disabled>↷ Redo</button>',
        '  </span>',
        '  <label>Color <input data-role="color" type="color" value="#111827"></label>',
        '  <label>Size <input data-role="size" type="range" min="1" max="24" value="4"></label>',
        '  <button type="button" data-role="clear" class="danger">Clear</button>',
        '  <span class="spacer"></span>',
        '  <span><kbd>W</kbd> toggle · <kbd>Esc</kbd> close</span>',
        '  <button type="button" data-role="close">Close</button>',
        '</div>',
        '<div class="maliang-deck-whiteboard__surface"><canvas class="maliang-deck-whiteboard__canvas"></canvas></div>',
      ].join('');
      document.body.appendChild(whiteboard);
      whiteboardCanvas = whiteboard.querySelector('canvas');
      whiteboardSurface = whiteboard.querySelector('.maliang-deck-whiteboard__surface');
      whiteboardCtx = whiteboardCanvas.getContext('2d');

      whiteboard.querySelector('[data-role="color"]').addEventListener('input', function(e) {
        whiteboardColor = e.target.value || whiteboardColor;
      });
      whiteboard.querySelector('[data-role="size"]').addEventListener('input', function(e) {
        whiteboardSize = parseInt(e.target.value || '4', 10) || 4;
      });
      whiteboard.querySelector('[data-role="pen"]').addEventListener('click', function(){ setWhiteboardTool('pen'); });
      whiteboard.querySelector('[data-role="eraser"]').addEventListener('click', function(){ setWhiteboardTool('eraser'); });
      whiteboard.querySelector('[data-role="undo"]').addEventListener('click', undoWhiteboard);
      whiteboard.querySelector('[data-role="redo"]').addEventListener('click', redoWhiteboard);
      whiteboard.querySelector('[data-role="clear"]').addEventListener('click', clearWhiteboard);
      whiteboard.querySelector('[data-role="close"]').addEventListener('click', function(){ toggleWhiteboard(false); });
      updateWhiteboardToolbar();

      whiteboardCanvas.addEventListener('pointerdown', startWhiteboardStroke);
      whiteboardCanvas.addEventListener('pointermove', continueWhiteboardStroke);
      whiteboardCanvas.addEventListener('pointerup', endWhiteboardStroke);
      whiteboardCanvas.addEventListener('pointercancel', endWhiteboardStroke);
      whiteboardCanvas.addEventListener('pointerleave', endWhiteboardStroke);
      window.addEventListener('resize', function(){ if (whiteboard && !whiteboard.hidden) resizeWhiteboardCanvas(true); });
    }

    function resizeWhiteboardCanvas(preserve) {
      if (!whiteboardCanvas || !whiteboardSurface) return;
      const rect = whiteboardSurface.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      whiteboardCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
      whiteboardCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
      whiteboardCtx = whiteboardCanvas.getContext('2d');
      whiteboardCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      whiteboardCtx.lineCap = 'round';
      whiteboardCtx.lineJoin = 'round';
      if (preserve) renderWhiteboardHistory();
    }

    function whiteboardCanvasRect() {
      return whiteboardCanvas ? whiteboardCanvas.getBoundingClientRect() : { width: 1, height: 1 };
    }

    function clearWhiteboardCanvas() {
      if (!whiteboardCtx || !whiteboardCanvas) return;
      whiteboardCtx.save();
      whiteboardCtx.setTransform(1, 0, 0, 1, 0, 0);
      whiteboardCtx.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
      whiteboardCtx.restore();
    }

    function updateWhiteboardToolbar() {
      if (!whiteboard) return;
      const pen = whiteboard.querySelector('[data-role="pen"]');
      const eraser = whiteboard.querySelector('[data-role="eraser"]');
      const undo = whiteboard.querySelector('[data-role="undo"]');
      const redo = whiteboard.querySelector('[data-role="redo"]');
      if (pen) pen.setAttribute('aria-pressed', String(whiteboardTool === 'pen'));
      if (eraser) eraser.setAttribute('aria-pressed', String(whiteboardTool === 'eraser'));
      if (undo) undo.disabled = whiteboardHistory.length === 0 || whiteboardDrawing;
      if (redo) redo.disabled = whiteboardRedoStack.length === 0 || whiteboardDrawing;
      whiteboard.classList.toggle('is-eraser', whiteboardTool === 'eraser');
    }

    function setWhiteboardTool(tool) {
      whiteboardTool = tool === 'eraser' ? 'eraser' : 'pen';
      updateWhiteboardToolbar();
    }

    function renderWhiteboardOperation(operation) {
      if (!whiteboardCtx || !operation || !operation.points || !operation.points.length) return;
      const rect = whiteboardCanvasRect();
      const scaleX = operation.canvasWidth ? rect.width / operation.canvasWidth : 1;
      const scaleY = operation.canvasHeight ? rect.height / operation.canvasHeight : 1;
      const scale = Math.max(0.1, (scaleX + scaleY) / 2);
      const model = {
        maxWidth: operation.maxWidth * scale,
        minWidth: operation.minWidth * scale,
        tool: operation.tool,
        color: operation.color,
      };
      const points = operation.points.map(function(point) {
        return { x: point.x * scaleX, y: point.y * scaleY, w: point.w };
      });
      if (points.length === 1) {
        drawWhiteboardDot(points[0], model);
        return;
      }
      for (let i = 1; i < points.length; i++) {
        const start = points[i - 1];
        const end = points[i];
        configureWhiteboardStroke(actualStrokeWidth(model, end.w), model);
        whiteboardCtx.beginPath();
        whiteboardCtx.moveTo(start.x, start.y);
        whiteboardCtx.lineTo(end.x, end.y);
        whiteboardCtx.stroke();
      }
      whiteboardCtx.globalCompositeOperation = 'source-over';
    }

    function renderWhiteboardHistory() {
      clearWhiteboardCanvas();
      whiteboardHistory.forEach(renderWhiteboardOperation);
      if (whiteboardCtx) whiteboardCtx.globalCompositeOperation = 'source-over';
    }

    function clearWhiteboard() {
      if (!whiteboardCtx || !whiteboardCanvas) return;
      whiteboardHistory = [];
      whiteboardRedoStack = [];
      clearWhiteboardCanvas();
      updateWhiteboardToolbar();
    }

    function undoWhiteboard() {
      if (whiteboardDrawing || !whiteboardHistory.length) return;
      whiteboardRedoStack.push(whiteboardHistory.pop());
      renderWhiteboardHistory();
      updateWhiteboardToolbar();
    }

    function redoWhiteboard() {
      if (whiteboardDrawing || !whiteboardRedoStack.length) return;
      whiteboardHistory.push(whiteboardRedoStack.pop());
      renderWhiteboardHistory();
      updateWhiteboardToolbar();
    }

    function whiteboardPoint(e) {
      return eventPoint(e, whiteboardCanvas);
    }

    function configureWhiteboardStroke(width, model) {
      const strokeModel = model || whiteboardStroke || { tool: whiteboardTool, color: whiteboardColor };
      const isEraser = strokeModel.tool === 'eraser';
      whiteboardCtx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
      whiteboardCtx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : (strokeModel.color || whiteboardColor);
      whiteboardCtx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : (strokeModel.color || whiteboardColor);
      whiteboardCtx.lineWidth = width;
      whiteboardCtx.lineCap = 'round';
      whiteboardCtx.lineJoin = 'round';
    }

    function drawWhiteboardDot(point, model) {
      configureWhiteboardStroke(actualStrokeWidth(model, STROKE_INITIAL_WIDTH), model);
      whiteboardCtx.beginPath();
      whiteboardCtx.arc(point.x, point.y, Math.max(actualStrokeWidth(model, STROKE_INITIAL_WIDTH) / 2, 1), 0, Math.PI * 2);
      whiteboardCtx.fill();
      whiteboardCtx.globalCompositeOperation = 'source-over';
    }

    function drawWhiteboardStrokeTail() {
      if (!whiteboardStroke || !whiteboardCtx) return;
      const points = whiteboardStroke.points;
      if (points.length < 2) return;

      const startIndex = Math.max(1, whiteboardRenderedIndex + 1);
      for (let i = startIndex; i < points.length; i++) {
        const start = points[i - 1];
        const end = points[i];
        configureWhiteboardStroke(actualStrokeWidth(whiteboardStroke, end.w), whiteboardStroke);
        whiteboardCtx.beginPath();
        whiteboardCtx.moveTo(start.x, start.y);
        whiteboardCtx.lineTo(end.x, end.y);
        whiteboardCtx.stroke();
      }
      whiteboardRenderedIndex = points.length - 1;
    }

    function startWhiteboardStroke(e) {
      if (!whiteboardCtx) return;
      e.preventDefault();
      whiteboardDrawing = true;
      updateWhiteboardToolbar();
      whiteboardStroke = createStrokeModel({
        maxWidth: whiteboardTool === 'eraser' ? Math.max(whiteboardSize * 2, 12) : whiteboardSize,
        minWidth: whiteboardTool === 'eraser' ? Math.max(whiteboardSize, 6) : Math.max(0.8, whiteboardSize * 0.18),
        minSampleMs: 8,
        minSampleDistance: 2,
        tool: whiteboardTool,
        color: whiteboardColor,
      });
      whiteboardRenderedIndex = 0;
      insertStrokePoint(whiteboardStroke, whiteboardPoint(e));
      try { whiteboardCanvas.setPointerCapture(e.pointerId); } catch(err) {}
    }

    function rememberWhiteboardStroke(stroke) {
      if (!stroke || !stroke.points.length) return;
      const rect = whiteboardCanvasRect();
      whiteboardHistory.push({
        tool: stroke.tool || 'pen',
        color: stroke.color || whiteboardColor,
        maxWidth: stroke.maxWidth,
        minWidth: stroke.minWidth,
        canvasWidth: Math.max(1, rect.width),
        canvasHeight: Math.max(1, rect.height),
        points: stroke.points.map(function(point) { return { x: point.x, y: point.y, w: point.w }; }),
      });
      whiteboardRedoStack = [];
    }

    function continueWhiteboardStroke(e) {
      if (!whiteboardDrawing || !whiteboardCtx || !whiteboardStroke) return;
      e.preventDefault();
      if (insertStrokePoint(whiteboardStroke, whiteboardPoint(e))) {
        drawWhiteboardStrokeTail();
      }
    }

    function endWhiteboardStroke(e) {
      if (!whiteboardDrawing || !whiteboardStroke) return;
      if (whiteboardStroke.points.length === 1) {
        drawWhiteboardDot(whiteboardStroke.points[0], whiteboardStroke);
      } else if (e && typeof e.clientX === 'number') {
        finishStrokeModel(whiteboardStroke, whiteboardPoint(e));
        drawWhiteboardStrokeTail();
      }
      rememberWhiteboardStroke(whiteboardStroke);
      whiteboardDrawing = false;
      whiteboardStroke = null;
      whiteboardRenderedIndex = 0;
      if (whiteboardCtx) whiteboardCtx.globalCompositeOperation = 'source-over';
      updateWhiteboardToolbar();
      if (e && e.pointerId !== undefined) {
        try { whiteboardCanvas.releasePointerCapture(e.pointerId); } catch(err) {}
      }
    }

    function toggleWhiteboard(force) {
      if (force === false && !whiteboard) return;
      ensureWhiteboard();
      const open = force !== undefined ? !!force : whiteboard.hidden;
      whiteboard.hidden = !open;
      document.body.classList.toggle('maliang-deck-whiteboard-open', open);
      if (open) {
        resizeWhiteboardCanvas(true);
        const close = whiteboard.querySelector('[data-role="close"]');
        if (close) close.focus({ preventScroll: true });
      }
    }

    /* ===== Runtime editor lane (HTML Slide Editor Mode) ===== */
    const EDITOR_ENDPOINT = '/__maliang-deck/editor';
    const EDITOR_SAVE_ENDPOINT = '/__maliang-deck/editor/save';
    const editorState = {
      initialized: false,
      enabled: false,
      canPersist: false,
      temporaryOnly: true,
      baseRevision: null,
      capabilities: null,
      selected: null,
      selectedItems: [],
      pendingOps: [],
      undoStack: [],
      redoStack: [],
      toolbar: null,
      textToolbar: null,
      status: null,
      selection: null,
      resizeHandle: null,
      reorderDrawer: null,
      slideOrder: slides.map(function(slide){ return editorSlideId(slide); }),
      deletedSlides: [],
      drag: null,
      saving: false,
    };

    function editorIsActive() {
      return !!editorState.enabled;
    }
    window.__maliangDeckEditorActive = editorIsActive;

    function activeSlide() {
      return slides[idx] || deck.querySelector('.slide.is-active') || slides[0];
    }

    function editorSlideId(slide) {
      if (!slide) return 'slide-' + (idx + 1);
      return slide.getAttribute('data-slide-id') || slide.getAttribute('data-maliang-deck-slide-id') || slide.id || ('slide-' + (slides.indexOf(slide) + 1));
    }

    function editorElementId(el) {
      if (!el) return '';
      return el.getAttribute('data-maliang-deck-id') || el.id || '';
    }

    function editorElementType(el) {
      if (!el) return 'unknown';
      const explicit = el.getAttribute('data-maliang-deck-type') || el.getAttribute('data-maliang-deck-element');
      if (explicit) return explicit;
      const editable = (el.getAttribute('data-maliang-deck-editable') || '').toLowerCase();
      if (editable.indexOf('rect-style') >= 0 || editable.indexOf('rect') >= 0) return 'rect';
      if (editable.indexOf('text') >= 0) return 'text';
      if (el.tagName && el.tagName.toLowerCase() === 'rect') return 'rect';
      return 'unknown';
    }

    function editorTokens(el) {
      return (el.getAttribute('data-maliang-deck-editable') || '').toLowerCase().split(/\s+/).filter(Boolean);
    }

    function editorCanSelect(el) {
      if (!el || !el.closest) return false;
      if (!el.closest('.slide')) return false;
      const id = editorElementId(el);
      if (!id) return false;
      const tokens = editorTokens(el);
      if (!tokens.length) return false;
      return tokens.indexOf('geometry') >= 0 || tokens.indexOf('text') >= 0 || tokens.indexOf('rect-style') >= 0;
    }

    function numberFromStyle(el, prop, fallback) {
      const inline = el && el.style ? el.style[prop] : '';
      const computed = el ? getComputedStyle(el)[prop] : '';
      const parsed = parseFloat(inline || computed);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function slideSpaceScale(slide) {
      const rect = slide.getBoundingClientRect();
      const width = parseFloat(getComputedStyle(slide).width) || slideW || rect.width || 1;
      const height = parseFloat(getComputedStyle(slide).height) || slideH || rect.height || 1;
      return {
        x: rect.width ? rect.width / width : 1,
        y: rect.height ? rect.height / height : 1,
      };
    }

    function viewportToSlidePoint(slide, clientX, clientY) {
      const rect = slide.getBoundingClientRect();
      const scale = slideSpaceScale(slide);
      return {
        x: (clientX - rect.left) / (scale.x || 1),
        y: (clientY - rect.top) / (scale.y || 1),
      };
    }

    function viewportToSlideDelta(slide, dx, dy) {
      const scale = slideSpaceScale(slide);
      return {
        dx: dx / (scale.x || 1),
        dy: dy / (scale.y || 1),
      };
    }

    function editorSnapshot(el) {
      return {
        el: el,
        style: el.getAttribute('style') || '',
        html: el.innerHTML,
        text: el.textContent || '',
        contentEditable: el.getAttribute('contenteditable'),
        pendingLength: editorState.pendingOps.length,
      };
    }

    function editorGroupSnapshot(items) {
      return {
        group: true,
        selected: (items || []).slice(),
        snapshots: (items || []).map(editorSnapshot),
        pendingLength: editorState.pendingOps.length,
      };
    }

    function pushEditorUndo(el) {
      if (!el) return;
      editorState.undoStack.push(editorSnapshot(el));
      editorState.redoStack = [];
      if (editorState.undoStack.length > 50) editorState.undoStack.shift();
      updateEditorToolbar();
    }

    function restoreEditorSnapshot(snapshot) {
      if (!snapshot || !snapshot.el) return;
      snapshot.el.setAttribute('style', snapshot.style);
      snapshot.el.innerHTML = snapshot.html;
      if (snapshot.contentEditable == null) snapshot.el.removeAttribute('contenteditable');
      else snapshot.el.setAttribute('contenteditable', snapshot.contentEditable);
      editorState.pendingOps.length = snapshot.pendingLength;
      selectEditorElement(snapshot.el);
      positionEditorSelection();
      updateEditorToolbar();
    }

    function restoreEditorHistoryEntry(entry) {
      if (!entry) return;
      if (entry.group && Array.isArray(entry.snapshots)) {
        entry.snapshots.forEach(function(snapshot) {
          if (!snapshot || !snapshot.el) return;
          snapshot.el.setAttribute('style', snapshot.style);
          snapshot.el.innerHTML = snapshot.html;
          if (snapshot.contentEditable == null) snapshot.el.removeAttribute('contenteditable');
          else snapshot.el.setAttribute('contenteditable', snapshot.contentEditable);
        });
        editorState.pendingOps.length = entry.pendingLength;
        setEditorSelection(entry.selected || [], false);
        positionEditorSelection();
        updateEditorToolbar();
        return;
      }
      restoreEditorSnapshot(entry);
    }

    function undoEditor() {
      const entry = editorState.undoStack.pop();
      if (!entry) return;
      editorState.redoStack.push(editorGroupSnapshot(editorState.selectedItems.length ? editorState.selectedItems : (editorState.selected ? [editorState.selected] : [])));
      restoreEditorHistoryEntry(entry);
      setEditorStatus('Undid unsaved edit.');
    }

    function redoEditor() {
      const entry = editorState.redoStack.pop();
      if (!entry) return;
      editorState.undoStack.push(editorGroupSnapshot(editorState.selectedItems.length ? editorState.selectedItems : (editorState.selected ? [editorState.selected] : [])));
      restoreEditorHistoryEntry(entry);
      setEditorStatus('Redid unsaved edit.');
    }

    function constrainedEditorOp(el, patch) {
      const slide = el.closest('.slide') || activeSlide();
      const type = editorElementType(el);
      const safePatch = {};
      ['x', 'y', 'width', 'height', 'content', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'fill', 'stroke', 'strokeWidth', 'radius'].forEach(function(key) {
        if (Object.prototype.hasOwnProperty.call(patch, key)) safePatch[key] = patch[key];
      });
      return {
        op: 'updateElement',
        slideId: editorSlideId(slide),
        elementId: editorElementId(el),
        changes: safePatch,
      };
    }

    function addEditorOp(el, patch) {
      if (!el || !editorElementId(el)) return;
      const op = constrainedEditorOp(el, patch);
      if (!Object.keys(op.changes).length) return;
      editorState.pendingOps.push(op);
      editorState.redoStack = [];
      updateEditorToolbar();
    }

    function ensureEditorStyles() {
      if (document.getElementById('maliang-deck-editor-style')) return;
      const style = document.createElement('style');
      style.id = 'maliang-deck-editor-style';
      style.textContent = `
        .maliang-deck-editor-toolbar {
          position: fixed; left: 10px; top: 10px;
          z-index: 3400; display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
          max-width: min(680px, calc(100vw - 20px)); padding: 8px 10px;
          border: 1px solid rgba(37,99,235,.24); border-radius: 10px;
          background: rgba(15,23,42,.92); color: #e5e7eb;
          box-shadow: 0 18px 60px rgba(0,0,0,.34);
          font: 600 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          backdrop-filter: blur(12px);
          opacity: 0;
          transform: translateY(-5px);
          transition: opacity .18s ease, transform .18s ease;
        }
        .maliang-deck-editor-toolbar:hover,
        .maliang-deck-editor-toolbar:focus-within,
        .maliang-deck-editor-toolbar.show {
          opacity: 1;
          transform: translateY(0);
        }
        .maliang-deck-editor-toolbar button, .maliang-deck-editor-toolbar input {
          font: inherit;
        }
        .maliang-deck-editor-toolbar button {
          border: 1px solid rgba(255,255,255,.16); border-radius: 9px;
          background: rgba(255,255,255,.08); color: #f8fafc;
          padding: 6px 9px; cursor: pointer;
        }
        .maliang-deck-editor-toolbar button:hover { border-color: #60a5fa; }
        .maliang-deck-editor-toolbar button:disabled { opacity: .42; cursor: not-allowed; }
        .maliang-deck-editor-toolbar button[aria-pressed="true"] { background: #2563eb; border-color: #93c5fd; }
        .maliang-deck-editor-toolbar label { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
        .maliang-deck-editor-toolbar input[type="number"] { width: 64px; }
        .maliang-deck-editor-toolbar input[type="color"] { width: 30px; height: 26px; padding: 0; border: 0; background: transparent; }
        .maliang-deck-editor-toolbar .maliang-deck-editor-status { min-width: 120px; max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #bfdbfe; }
        .maliang-deck-editor-textbar {
          position: fixed; left: 50%; top: 16px; transform: translateX(-50%);
          z-index: 3410; display: none; align-items: center; gap: 6px;
          max-width: min(560px, calc(100vw - 24px)); padding: 7px 9px;
          border: 1px solid rgba(37,99,235,.24); border-radius: 10px;
          background: rgba(15,23,42,.94); color: #e5e7eb;
          box-shadow: 0 14px 44px rgba(0,0,0,.28);
          font: 600 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .maliang-deck-editor-textbar.show { display: flex; }
        .maliang-deck-editor-textbar button, .maliang-deck-editor-textbar input, .maliang-deck-editor-textbar select { font: inherit; }
        .maliang-deck-editor-textbar button, .maliang-deck-editor-textbar select {
          border: 1px solid rgba(255,255,255,.16); border-radius: 8px;
          background: rgba(255,255,255,.08); color: #f8fafc; padding: 5px 8px;
        }
        .maliang-deck-editor-textbar button[aria-pressed="true"] { background: #2563eb; border-color: #93c5fd; }
        .maliang-deck-editor-textbar input[type="number"] { width: 62px; }
        .maliang-deck-editor-reorder {
          position: fixed; right: 0; top: 0; bottom: 0; z-index: 3380;
          width: min(300px, calc(100vw - 28px)); max-height: 100vh;
          overflow: auto; padding: 10px; border-radius: 14px;
          border: 1px solid rgba(37,99,235,.24); background: rgba(15,23,42,.94);
          color: #e5e7eb; box-shadow: 0 18px 60px rgba(0,0,0,.34);
          font: 600 12px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .maliang-deck-editor-reorder[hidden] { display: none !important; }
        .maliang-deck-editor-reorder h2 { font-size: 13px; margin: 0 0 8px; }
        .maliang-deck-editor-reorder ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .maliang-deck-editor-reorder li { display: grid; grid-template-columns: 82px 1fr auto; align-items: center; gap: 7px; padding: 6px; border: 1px solid rgba(255,255,255,.12); border-radius: 9px; background: rgba(255,255,255,.06); }
        .maliang-deck-editor-page-thumb { width: 78px; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 5px; background: #111827; pointer-events: none; }
        .maliang-deck-editor-page-thumb .slide { position: relative !important; visibility: visible !important; opacity: 1 !important; transform-origin: top left !important; pointer-events: none !important; }
        .maliang-deck-editor-page-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .maliang-deck-editor-reorder button { border: 1px solid rgba(255,255,255,.16); border-radius: 8px; background: rgba(255,255,255,.08); color: #f8fafc; padding: 3px 7px; cursor: pointer; }
        .maliang-deck-editor-reorder button:disabled { opacity: .42; cursor: not-allowed; }
        .maliang-deck-editor-selection {
          position: fixed; z-index: 3390; pointer-events: none;
          border: 2px solid #2563eb; border-radius: 4px;
          box-shadow: 0 0 0 1px rgba(255,255,255,.9), 0 0 0 9999px rgba(37,99,235,.025);
        }
        .maliang-deck-editor-selection[hidden] { display: none !important; }
        .maliang-deck-editor-resize-handle {
          position: absolute; right: -7px; bottom: -7px; width: 12px; height: 12px;
          border: 2px solid #fff; border-radius: 999px; background: #2563eb;
          pointer-events: auto; cursor: nwse-resize;
        }
        .maliang-deck-editor-move-handle {
          position: absolute; left: -9px; top: -9px; width: 16px; height: 16px;
          border: 2px solid #fff; border-radius: 4px; background: #1d4ed8;
          pointer-events: auto; cursor: move;
        }
        body.maliang-deck-editor-active [data-maliang-deck-editable] { cursor: move; }
        body.maliang-deck-editor-active [data-maliang-deck-editable][contenteditable="true"] { cursor: text; outline: none; overflow-wrap: anywhere; }
        body.maliang-deck-editor-active .maliang-deck-editor-selected { outline: 2px solid #2563eb; outline-offset: 2px; }
      `;
      document.head.appendChild(style);
    }

    function ensureEditorToolbar() {
      if (editorState.toolbar) return;
      ensureEditorStyles();
      const toolbar = document.createElement('div');
      toolbar.className = 'maliang-deck-editor-toolbar';
      toolbar.setAttribute('role', 'toolbar');
      toolbar.setAttribute('aria-label', 'Slide editor');
      toolbar.innerHTML = [
        '<button type="button" data-role="toggle" aria-pressed="false">Edit</button>',
        '<button type="button" data-role="slides">Pages</button>',
        '<button type="button" data-role="save" disabled>Save</button>',
        '<button type="button" data-role="undo" disabled>Undo</button>',
        '<button type="button" data-role="redo" disabled>Redo</button>',
        '<button type="button" data-role="done">Done</button>',
        '<label class="maliang-deck-editor-fill" hidden>Fill <input data-role="fill" type="color"></label>',
        '<label class="maliang-deck-editor-stroke" hidden>Stroke <input data-role="stroke" type="color"></label>',
        '<label class="maliang-deck-editor-stroke-width" hidden>Stroke W <input data-role="stroke-width" type="number" min="0" max="100" step="1"></label>',
        '<label class="maliang-deck-editor-radius" hidden>Radius <input data-role="radius" type="number" min="0" max="300" step="1"></label>',
        '<span class="maliang-deck-editor-status" data-role="status">Checking editor…</span>',
      ].join('');
      document.body.appendChild(toolbar);
      editorState.toolbar = toolbar;
      editorState.status = toolbar.querySelector('[data-role="status"]');
      toolbar.querySelector('[data-role="toggle"]').addEventListener('click', function(){ toggleEditorMode(); });
      toolbar.querySelector('[data-role="undo"]').addEventListener('click', undoEditor);
      toolbar.querySelector('[data-role="redo"]').addEventListener('click', redoEditor);
      toolbar.querySelector('[data-role="done"]').addEventListener('click', function(){ toggleEditorMode(false); });
      toolbar.querySelector('[data-role="slides"]').addEventListener('click', toggleEditorReorderDrawer);
      toolbar.querySelector('[data-role="save"]').addEventListener('click', saveEditorOps);
      toolbar.querySelector('[data-role="fill"]').addEventListener('input', function(e){ applyEditorRectStyle('fill', e.target.value); });
      toolbar.querySelector('[data-role="stroke"]').addEventListener('input', function(e){ applyEditorRectStyle('stroke', e.target.value); });
      toolbar.querySelector('[data-role="stroke-width"]').addEventListener('change', function(e){ applyEditorRectNumberStyle('strokeWidth', e.target.value); });
      toolbar.querySelector('[data-role="radius"]').addEventListener('change', function(e){ applyEditorRectNumberStyle('radius', e.target.value); });

      const textToolbar = document.createElement('div');
      textToolbar.className = 'maliang-deck-editor-textbar';
      textToolbar.setAttribute('role', 'toolbar');
      textToolbar.setAttribute('aria-label', 'Text formatting');
      textToolbar.innerHTML = [
        '<button type="button" data-role="bold" aria-pressed="false">B</button>',
        '<button type="button" data-role="italic" aria-pressed="false"><i>I</i></button>',
        '<button type="button" data-role="underline" aria-pressed="false"><u>U</u></button>',
        '<select data-role="font-family" aria-label="Font family">',
        '  <option value="sans-serif">Sans</option>',
        '  <option value="serif">Serif</option>',
        '  <option value="monospace">Mono</option>',
        '  <option value="Inter, sans-serif">Inter</option>',
        '</select>',
        '<label>Size <input data-role="font-size" type="number" min="1" max="300" step="1"></label>',
      ].join('');
      document.body.appendChild(textToolbar);
      editorState.textToolbar = textToolbar;
      textToolbar.querySelector('[data-role="bold"]').addEventListener('click', function(){ toggleEditorTextStyle('fontWeight', 'bold', 'normal'); });
      textToolbar.querySelector('[data-role="italic"]').addEventListener('click', function(){ toggleEditorTextStyle('fontStyle', 'italic', 'normal'); });
      textToolbar.querySelector('[data-role="underline"]').addEventListener('click', function(){ toggleEditorTextStyle('textDecoration', 'underline', 'none'); });
      textToolbar.querySelector('[data-role="font-family"]').addEventListener('change', function(e){ applyEditorFontFamily(e.target.value); });
      textToolbar.querySelector('[data-role="font-size"]').addEventListener('change', function(e){ applyEditorFontSize(e.target.value); });

      const selection = document.createElement('div');
      selection.className = 'maliang-deck-editor-selection';
      selection.hidden = true;
      selection.innerHTML = '<div class="maliang-deck-editor-move-handle" data-role="move" title="Move"></div><div class="maliang-deck-editor-resize-handle" data-role="resize" title="Resize"></div>';
      document.body.appendChild(selection);
      editorState.selection = selection;
      editorState.resizeHandle = selection.querySelector('[data-role="resize"]');
      editorState.resizeHandle.addEventListener('pointerdown', startEditorResize);
      selection.querySelector('[data-role="move"]').addEventListener('pointerdown', function(e) {
        if (editorState.selected) startEditorMove(e, editorState.selected);
      });
      ensureEditorReorderDrawer();
    }

    function ensureEditorReorderDrawer() {
      if (editorState.reorderDrawer) return;
      const drawer = document.createElement('div');
      drawer.className = 'maliang-deck-editor-reorder';
      drawer.hidden = true;
      drawer.setAttribute('aria-label', 'Slide reorder');
      document.body.appendChild(drawer);
      editorState.reorderDrawer = drawer;
      renderEditorReorderDrawer();
    }

    function toggleEditorReorderDrawer() {
      ensureEditorReorderDrawer();
      editorState.reorderDrawer.hidden = !editorState.reorderDrawer.hidden;
      if (!editorState.reorderDrawer.hidden) renderEditorReorderDrawer();
    }

    function slideTitleForReorder(slideId) {
      const slide = slides.find(function(candidate){ return editorSlideId(candidate) === slideId; });
      return (slide && (slide.getAttribute('data-title') || slideId)) || slideId;
    }

    function escapeEditorHtml(value) {
      return String(value).replace(/[&<>"]/g, function(ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
      });
    }

    function renderEditorReorderDrawer() {
      const drawer = editorState.reorderDrawer;
      if (!drawer) return;
      const items = editorState.slideOrder.map(function(slideId, index) {
        return '<li draggable="true" data-slide-id="' + escapeEditorHtml(slideId) + '" data-index="' + index + '">'
          + '<div class="maliang-deck-editor-page-thumb" data-role="thumb" data-slide-id="' + escapeEditorHtml(slideId) + '"></div>'
          + '<span class="maliang-deck-editor-page-title">' + (index + 1) + '. ' + escapeEditorHtml(slideTitleForReorder(slideId)) + '</span>'
          + '<button type="button" data-role="slide-delete" data-index="' + index + '"' + (editorState.slideOrder.length <= 1 ? ' disabled' : '') + '>Delete</button></li>';
      }).join('');
      drawer.innerHTML = '<h2>Pages</h2><ol>' + items + '</ol>';
      drawer.querySelectorAll('[data-role="thumb"]').forEach(function(host) {
        renderEditorPageThumb(host, host.getAttribute('data-slide-id'));
      });
      drawer.querySelectorAll('[data-role="slide-delete"]').forEach(function(button) {
        button.addEventListener('click', function(e){ deleteEditorSlide(parseInt(e.currentTarget.getAttribute('data-index'), 10)); });
      });
      drawer.querySelectorAll('li[draggable="true"]').forEach(function(item) {
        item.addEventListener('dragstart', function(e) {
          e.dataTransfer.setData('text/plain', item.getAttribute('data-index') || '0');
          e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });
        item.addEventListener('drop', function(e) {
          e.preventDefault();
          reorderEditorSlide(parseInt(e.dataTransfer.getData('text/plain'), 10), parseInt(item.getAttribute('data-index'), 10));
        });
      });
    }

    function renderEditorPageThumb(host, slideId) {
      const slide = slides.find(function(candidate){ return editorSlideId(candidate) === slideId; });
      if (!host || !slide) return;
      const clone = slide.cloneNode(true);
      clone.classList.add('is-active');
      clone.removeAttribute('data-anim-state');
      clone.querySelectorAll('.notes, aside.notes').forEach(function(note){ note.remove(); });
      host.replaceChildren(clone);
      const scale = Math.min(host.clientWidth / slideW, host.clientHeight / slideH);
      clone.style.width = slideW + 'px';
      clone.style.height = slideH + 'px';
      clone.style.transform = 'scale(' + scale + ')';
    }

    function recordEditorSlideOrder() {
      editorState.pendingOps = editorState.pendingOps.filter(function(op){ return op.op !== 'reorderSlides'; });
      editorState.pendingOps.push({ op: 'reorderSlides', slideIds: editorState.slideOrder.slice() });
      editorState.redoStack = [];
    }

    function reorderEditorSlide(index, nextIndex) {
      if (index === nextIndex || index < 0 || nextIndex < 0 || index >= editorState.slideOrder.length || nextIndex >= editorState.slideOrder.length) return;
      const order = editorState.slideOrder.slice();
      const moved = order.splice(index, 1)[0];
      order.splice(nextIndex, 0, moved);
      editorState.slideOrder = order;
      recordEditorSlideOrder();
      renderEditorReorderDrawer();
      setEditorStatus('Slide reorder pending. Save to persist.');
      updateEditorToolbar();
    }

    function moveEditorSlide(index, direction) {
      reorderEditorSlide(index, index + direction);
    }

    function deleteEditorSlide(index) {
      if (editorState.slideOrder.length <= 1) {
        setEditorStatus('Cannot delete the final slide.');
        return;
      }
      if (index < 0 || index >= editorState.slideOrder.length) return;
      const slideId = editorState.slideOrder[index];
      editorState.slideOrder.splice(index, 1);
      editorState.deletedSlides.push(slideId);
      editorState.pendingOps.push({ op: 'deleteSlide', slideId: slideId });
      recordEditorSlideOrder();
      const slide = slides.find(function(candidate){ return editorSlideId(candidate) === slideId; });
      if (slide) slide.style.display = 'none';
      renderEditorReorderDrawer();
      setEditorStatus('Slide delete pending. Save to persist.');
      updateEditorToolbar();
    }

    function setEditorStatus(message) {
      ensureEditorToolbar();
      if (editorState.status) editorState.status.textContent = message;
    }

    function updateEditorToolbar() {
      if (!editorState.toolbar) return;
      const selected = editorState.selected;
      const type = selected ? editorElementType(selected) : 'unknown';
      const toggle = editorState.toolbar.querySelector('[data-role="toggle"]');
      const undo = editorState.toolbar.querySelector('[data-role="undo"]');
      const redo = editorState.toolbar.querySelector('[data-role="redo"]');
      const done = editorState.toolbar.querySelector('[data-role="done"]');
      const save = editorState.toolbar.querySelector('[data-role="save"]');
      if (toggle) toggle.setAttribute('aria-pressed', String(editorState.enabled));
      if (undo) undo.disabled = editorState.undoStack.length === 0;
      if (redo) redo.disabled = editorState.redoStack.length === 0;
      if (done) done.hidden = !editorState.enabled;
      if (save) save.disabled = !editorState.canPersist || editorState.pendingOps.length === 0 || editorState.saving;
      const showRect = !!(editorState.enabled && selected && type === 'rect');
      ['fill', 'stroke', 'stroke-width', 'radius'].forEach(function(role) {
        const label = editorState.toolbar.querySelector('.maliang-deck-editor-' + role);
        if (label) label.hidden = !showRect;
      });
      if (selected) syncEditorControls(selected);
      if (editorState.textToolbar) {
        editorState.textToolbar.classList.toggle('show', !!(editorState.enabled && selected && type === 'text'));
      }
    }

    function syncEditorControls(el) {
      if (!editorState.toolbar || !el) return;
      const type = editorElementType(el);
      if (type === 'text') {
        const textbar = editorState.textToolbar;
        if (!textbar) return;
        const font = textbar.querySelector('[data-role="font-size"]');
        const family = textbar.querySelector('[data-role="font-family"]');
        const bold = textbar.querySelector('[data-role="bold"]');
        const italic = textbar.querySelector('[data-role="italic"]');
        const underline = textbar.querySelector('[data-role="underline"]');
        const computed = getComputedStyle(el);
        if (font) font.value = String(Math.round(numberFromStyle(el, 'fontSize', 16)));
        if (family) family.value = family.querySelector('option[value="' + cssEscapeSimple(el.style.fontFamily || computed.fontFamily) + '"]') ? (el.style.fontFamily || computed.fontFamily) : 'sans-serif';
        if (bold) bold.setAttribute('aria-pressed', String((computed.fontWeight === '700' || computed.fontWeight === 'bold') || el.style.fontWeight === 'bold'));
        if (italic) italic.setAttribute('aria-pressed', String(computed.fontStyle === 'italic' || el.style.fontStyle === 'italic'));
        if (underline) underline.setAttribute('aria-pressed', String(computed.textDecorationLine === 'underline' || el.style.textDecoration === 'underline'));
      } else if (type === 'rect') {
        const fill = editorState.toolbar.querySelector('[data-role="fill"]');
        const stroke = editorState.toolbar.querySelector('[data-role="stroke"]');
        const strokeWidth = editorState.toolbar.querySelector('[data-role="stroke-width"]');
        const radius = editorState.toolbar.querySelector('[data-role="radius"]');
        const computed = getComputedStyle(el);
        if (fill) fill.value = rgbToHex(computed.backgroundColor) || '#ffffff';
        if (stroke) stroke.value = rgbToHex(computed.borderTopColor) || '#000000';
        if (strokeWidth) strokeWidth.value = String(Math.round(parseFloat(computed.borderTopWidth) || 0));
        if (radius) radius.value = String(Math.round(parseFloat(computed.borderTopLeftRadius) || 0));
      }
    }

    function rgbToHex(value) {
      const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value || '');
      if (!m) return /^#[0-9a-f]{6}$/i.test(value || '') ? value : '';
      return '#' + [m[1], m[2], m[3]].map(function(part) {
        return Math.max(0, Math.min(255, parseInt(part, 10) || 0)).toString(16).padStart(2, '0');
      }).join('');
    }

    function cssEscapeSimple(value) {
      return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function initEditorLane() {
      ensureEditorToolbar();
      setEditorStatus('Checking editor…');
      fetchEditorCapabilities();
      document.addEventListener('click', onEditorDocumentClick, true);
      document.addEventListener('pointerdown', onEditorPointerDown, true);
      document.addEventListener('keydown', onEditorKeydown, true);
      window.addEventListener('resize', positionEditorSelection);
      window.addEventListener('scroll', positionEditorSelection, true);
    }

    function fetchEditorCapabilities() {
      if (typeof fetch !== 'function') {
        enterTemporaryEditorMode('Temporary edits only: fetch unavailable.');
        return;
      }
      fetch(EDITOR_ENDPOINT, { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function(response) {
          if (!response || !response.ok) throw new Error('Editor endpoint unavailable');
          return response.json();
        })
        .then(function(capabilities) {
          editorState.initialized = true;
          editorState.capabilities = capabilities || {};
          editorState.canPersist = !!capabilities.canPersist;
          editorState.temporaryOnly = !editorState.canPersist;
          editorState.baseRevision = capabilities.revision || null;
          const warningText = Array.isArray(capabilities.warnings) && capabilities.warnings.length
            ? capabilities.warnings.join(' ')
            : (typeof capabilities.mjsDivergenceWarning === 'string' ? capabilities.mjsDivergenceWarning : '');
          const warning = warningText ? ' · ' + warningText : '';
          setEditorStatus(editorState.canPersist ? ('Editor ready' + warning) : ('Temporary edits only' + warning));
          updateEditorToolbar();
        })
        .catch(function() {
          enterTemporaryEditorMode('Temporary edits only: save endpoint unavailable.');
        });
    }

    function enterTemporaryEditorMode(message) {
      editorState.initialized = true;
      editorState.canPersist = false;
      editorState.temporaryOnly = true;
      editorState.baseRevision = null;
      setEditorStatus(message || 'Temporary edits only.');
      updateEditorToolbar();
    }

    function toggleEditorMode(force) {
      const enabled = force !== undefined ? !!force : !editorState.enabled;
      editorState.enabled = enabled;
      document.body.classList.toggle('maliang-deck-editor-active', enabled);
      if (!enabled) clearEditorSelection();
      setEditorStatus(enabled
        ? (editorState.canPersist ? 'Editor on. Select text or rectangles.' : 'Editor on · temporary edits only.')
        : (editorState.canPersist ? 'Editor off.' : 'Temporary edits only.'));
      updateEditorToolbar();
    }

    function onEditorDocumentClick(e) {
      if (!editorState.enabled) return;
      if (e.target.closest && e.target.closest('.maliang-deck-editor-toolbar, .maliang-deck-editor-textbar, .maliang-deck-editor-selection, .maliang-deck-editor-reorder')) return;
      const target = e.target.closest && e.target.closest('[data-maliang-deck-editable]');
      if (editorCanSelect(target)) {
        e.preventDefault();
        e.stopPropagation();
        selectEditorElement(target, !!e.ctrlKey);
      } else if (!(e.target.closest && e.target.closest('[data-maliang-deck-editable]'))) {
        clearEditorSelection();
      }
    }

    function onEditorPointerDown(e) {
      if (!editorState.enabled || e.button !== 0) return;
      if (e.target.closest && e.target.closest('.maliang-deck-editor-toolbar, .maliang-deck-editor-textbar, .maliang-deck-editor-selection, .maliang-deck-editor-reorder')) return;
      const target = e.target.closest && e.target.closest('[data-maliang-deck-editable]');
      if (!editorCanSelect(target)) return;
      selectEditorElement(target, !!e.ctrlKey);
      if (editorElementType(target) === 'text' && target.isContentEditable) return;
      startEditorMove(e, target);
    }

    function onEditorKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        if (editorState.enabled) {
          e.preventDefault();
          e.stopPropagation();
          saveEditorOps();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        if (editorState.enabled) {
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) redoEditor();
          else undoEditor();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        if (editorState.enabled) {
          e.preventDefault();
          e.stopPropagation();
          redoEditor();
        }
        return;
      }
      if (e.key === 'Escape' && editorState.enabled) {
        clearEditorSelection();
        toggleEditorMode(false);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if ((e.key === 'e' || e.key === 'E') && !e.metaKey && !e.ctrlKey && !e.altKey && !shouldIgnoreShortcut(e)) {
        toggleEditorMode();
        e.preventDefault();
        e.stopPropagation();
      }
    }

    function setEditorSelection(items, additive) {
      if (!additive) {
        editorState.selectedItems.forEach(function(item) {
          if (items.indexOf(item) < 0) {
            finishTextEdit(item);
            item.classList.remove('maliang-deck-editor-selected');
          }
        });
      }
      editorState.selectedItems = items.filter(function(item, index, list) {
        return item && list.indexOf(item) === index;
      });
      editorState.selectedItems.forEach(function(item) {
        item.classList.add('maliang-deck-editor-selected');
        if (editorElementType(item) === 'text') enableTextEditing(item);
      });
      editorState.selected = editorState.selectedItems[editorState.selectedItems.length - 1] || null;
      positionEditorSelection();
      updateEditorToolbar();
    }

    function selectEditorElement(el, additive) {
      if (!editorCanSelect(el)) return;
      if (additive) {
        const items = editorState.selectedItems.slice();
        const existing = items.indexOf(el);
        if (existing >= 0) {
          finishTextEdit(el);
          el.classList.remove('maliang-deck-editor-selected');
          items.splice(existing, 1);
        } else {
          items.push(el);
        }
        setEditorSelection(items, true);
        return;
      }
      setEditorSelection([el], false);
    }

    function clearEditorSelection() {
      editorState.selectedItems.forEach(function(item) {
        finishTextEdit(item);
        item.classList.remove('maliang-deck-editor-selected');
      });
      editorState.selectedItems = [];
      editorState.selected = null;
      if (editorState.selection) editorState.selection.hidden = true;
      updateEditorToolbar();
    }

    function positionEditorSelection() {
      if (!editorState.selection || !editorState.selectedItems.length || !editorState.enabled) return;
      const rects = editorState.selectedItems.map(function(item){ return item.getBoundingClientRect(); });
      const left = Math.min.apply(null, rects.map(function(rect){ return rect.left; }));
      const top = Math.min.apply(null, rects.map(function(rect){ return rect.top; }));
      const right = Math.max.apply(null, rects.map(function(rect){ return rect.right; }));
      const bottom = Math.max.apply(null, rects.map(function(rect){ return rect.bottom; }));
      editorState.selection.hidden = false;
      editorState.selection.style.left = left + 'px';
      editorState.selection.style.top = top + 'px';
      editorState.selection.style.width = (right - left) + 'px';
      editorState.selection.style.height = (bottom - top) + 'px';
    }

    function startEditorMove(e, el) {
      const slide = el.closest('.slide') || activeSlide();
      if (editorState.selectedItems.indexOf(el) < 0) setEditorSelection([el], false);
      const items = editorState.selectedItems.length ? editorState.selectedItems.slice() : [el];
      const starts = items.map(function(item) {
        return {
          el: item,
          left: numberFromStyle(item, 'left', viewportToSlidePoint(slide, e.clientX, e.clientY).x),
          top: numberFromStyle(item, 'top', viewportToSlidePoint(slide, e.clientX, e.clientY).y),
        };
      });
      editorState.drag = { type: 'move', el: el, items: starts, slide: slide, clientX: e.clientX, clientY: e.clientY, undo: editorGroupSnapshot(items) };
      e.preventDefault();
      e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch(err) {}
      window.addEventListener('pointermove', continueEditorDrag, true);
      window.addEventListener('pointerup', endEditorDrag, true);
      window.addEventListener('pointercancel', cancelEditorDrag, true);
    }

    function startEditorResize(e) {
      if (!editorState.selected) return;
      const el = editorState.selected;
      const slide = el.closest('.slide') || activeSlide();
      editorState.drag = {
        type: 'resize', el: el, slide: slide, clientX: e.clientX, clientY: e.clientY,
        startWidth: numberFromStyle(el, 'width', el.getBoundingClientRect().width),
        startHeight: numberFromStyle(el, 'height', el.getBoundingClientRect().height),
        undo: editorSnapshot(el),
      };
      e.preventDefault();
      e.stopPropagation();
      try { editorState.resizeHandle.setPointerCapture(e.pointerId); } catch(err) {}
      window.addEventListener('pointermove', continueEditorDrag, true);
      window.addEventListener('pointerup', endEditorDrag, true);
      window.addEventListener('pointercancel', cancelEditorDrag, true);
    }

    function continueEditorDrag(e) {
      const drag = editorState.drag;
      if (!drag) return;
      const delta = viewportToSlideDelta(drag.slide, e.clientX - drag.clientX, e.clientY - drag.clientY);
      if (drag.type === 'move') {
        drag.items.forEach(function(item) {
          item.el.style.left = Math.round((item.left + delta.dx) * 100) / 100 + 'px';
          item.el.style.top = Math.round((item.top + delta.dy) * 100) / 100 + 'px';
        });
      } else if (drag.type === 'resize') {
        drag.el.style.width = Math.max(1, Math.round((drag.startWidth + delta.dx) * 100) / 100) + 'px';
        drag.el.style.height = Math.max(1, Math.round((drag.startHeight + delta.dy) * 100) / 100) + 'px';
      }
      positionEditorSelection();
      e.preventDefault();
      e.stopPropagation();
    }

    function endEditorDrag(e) {
      const drag = editorState.drag;
      if (!drag) return;
      editorState.drag = null;
      editorState.undoStack.push(drag.undo);
      editorState.redoStack = [];
      if (drag.type === 'move') {
        drag.items.forEach(function(item) {
          addEditorOp(item.el, { x: numberFromStyle(item.el, 'left', item.left), y: numberFromStyle(item.el, 'top', item.top) });
        });
      } else if (drag.type === 'resize') {
        addEditorOp(drag.el, { width: numberFromStyle(drag.el, 'width', drag.startWidth), height: numberFromStyle(drag.el, 'height', drag.startHeight) });
      }
      removeEditorDragListeners();
      updateEditorToolbar();
      e.preventDefault();
      e.stopPropagation();
    }

    function cancelEditorDrag() {
      const drag = editorState.drag;
      editorState.drag = null;
      if (drag && drag.undo) restoreEditorHistoryEntry(drag.undo);
      removeEditorDragListeners();
    }

    function removeEditorDragListeners() {
      window.removeEventListener('pointermove', continueEditorDrag, true);
      window.removeEventListener('pointerup', endEditorDrag, true);
      window.removeEventListener('pointercancel', cancelEditorDrag, true);
    }

    function enableTextEditing(el) {
      if (el.getAttribute('contenteditable') !== 'true') {
        el.setAttribute('contenteditable', 'true');
      }
      if (el.__maliangDeckEditorTextBefore === undefined) {
        el.__maliangDeckEditorTextBefore = el.textContent || '';
        el.__maliangDeckEditorSnapshotBefore = editorSnapshot(el);
        el.addEventListener('focus', beginTextEdit);
        el.addEventListener('blur', onTextEditBlur);
        el.addEventListener('input', positionEditorSelection);
      }
    }

    function beginTextEdit(e) {
      e.currentTarget.__maliangDeckEditorTextBefore = e.currentTarget.textContent || '';
      e.currentTarget.__maliangDeckEditorSnapshotBefore = editorSnapshot(e.currentTarget);
    }

    function onTextEditBlur(e) {
      finishTextEdit(e.currentTarget);
    }

    function finishTextEdit(el) {
      if (!el || editorElementType(el) !== 'text') return;
      const before = el.__maliangDeckEditorTextBefore;
      const after = el.textContent || '';
      if (before !== undefined && before !== after) {
        editorState.undoStack.push(el.__maliangDeckEditorSnapshotBefore || editorSnapshot(el));
        addEditorOp(el, { content: after });
        el.__maliangDeckEditorTextBefore = after;
        el.__maliangDeckEditorSnapshotBefore = editorSnapshot(el);
        updateEditorToolbar();
      }
    }

    function applyEditorFontSize(value) {
      const el = editorState.selected;
      if (!el || editorElementType(el) !== 'text') return;
      const fontSize = Math.max(1, parseFloat(value) || numberFromStyle(el, 'fontSize', 16));
      pushEditorUndo(el);
      el.style.fontSize = fontSize + 'px';
      addEditorOp(el, { fontSize: fontSize });
      positionEditorSelection();
    }

    function toggleEditorTextStyle(key, onValue, offValue) {
      const el = editorState.selected;
      if (!el || editorElementType(el) !== 'text') return;
      const computed = getComputedStyle(el);
      const current = key === 'fontWeight'
        ? ((computed.fontWeight === '700' || computed.fontWeight === 'bold') ? 'bold' : 'normal')
        : key === 'textDecoration'
        ? (computed.textDecorationLine === 'underline' ? 'underline' : 'none')
        : (computed.fontStyle === 'italic' ? 'italic' : 'normal');
      const next = current === onValue ? offValue : onValue;
      pushEditorUndo(el);
      el.style[key] = next;
      const patch = {};
      patch[key] = next;
      addEditorOp(el, patch);
      syncEditorControls(el);
    }

    function applyEditorFontFamily(value) {
      const el = editorState.selected;
      if (!el || editorElementType(el) !== 'text' || !value) return;
      pushEditorUndo(el);
      el.style.fontFamily = value;
      addEditorOp(el, { fontFamily: value });
      syncEditorControls(el);
    }

    function applyEditorRectStyle(key, value) {
      const el = editorState.selected;
      if (!el || editorElementType(el) !== 'rect' || !value) return;
      pushEditorUndo(el);
      if (key === 'fill') el.style.backgroundColor = value;
      if (key === 'stroke') {
        const width = numberFromStyle(el, 'borderTopWidth', 1);
        el.style.border = Math.max(1, width) + 'px solid ' + value;
      }
      const patch = {};
      patch[key] = value;
      addEditorOp(el, patch);
    }

    function applyEditorRectNumberStyle(key, value) {
      const el = editorState.selected;
      if (!el || editorElementType(el) !== 'rect') return;
      const num = Math.max(0, parseFloat(value) || 0);
      pushEditorUndo(el);
      if (key === 'strokeWidth') {
        const color = rgbToHex(getComputedStyle(el).borderTopColor) || '#000000';
        el.style.border = num + 'px solid ' + color;
      }
      if (key === 'radius') el.style.borderRadius = num + 'px';
      const patch = {};
      patch[key] = num;
      addEditorOp(el, patch);
      positionEditorSelection();
    }

    function saveEditorOps() {
      if (editorState.saving) return;
      if (!editorState.canPersist) {
        setEditorStatus('Temporary edit mode: this preview cannot save.');
        return;
      }
      if (!editorState.pendingOps.length) {
        setEditorStatus('No pending edits.');
        return;
      }
      editorState.saving = true;
      updateEditorToolbar();
      const payload = { baseRevision: editorState.baseRevision, ops: editorState.pendingOps.slice() };
      fetch(EDITOR_SAVE_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      }).then(function(response) {
        return response.json().catch(function(){ return {}; }).then(function(body) {
          if (!response.ok || body.ok === false) {
            const serverError = body.error || {};
            const message = typeof serverError === 'string'
              ? serverError
              : (serverError.message || body.message || ('Save failed (' + response.status + ')'));
            const err = new Error(message);
            err.body = body;
            err.status = response.status;
            throw err;
          }
          return body;
        });
      }).then(function(body) {
        editorState.pendingOps = [];
        editorState.undoStack = [];
        editorState.baseRevision = body.revision || editorState.baseRevision;
        setEditorStatus(body.reload === false ? 'Saved.' : 'Saved. Reloading…');
        updateEditorToolbar();
        if (body.reload !== false) setTimeout(function(){ location.reload(); }, 80);
      }).catch(function(err) {
        const serverError = err && err.body && err.body.error;
        const detail = serverError && typeof serverError === 'object'
          ? [serverError.code, serverError.message, Array.isArray(serverError.path) ? serverError.path.join('.') : ''].filter(Boolean).join(': ')
          : (err && err.message ? err.message : 'Save failed');
        setEditorStatus((err && err.status === 409 ? 'Stale revision: ' : 'Save error: ') + detail);
      }).finally(function() {
        editorState.saving = false;
        updateEditorToolbar();
      });
    }

    initEditorLane();

    /* ===== step indicator (down arrow when more animation steps remain) ===== */
    var stepIndicator = document.querySelector('.step-indicator');
    if (window.__vsliTimeline && stepIndicator) {
      window.__vsliTimeline.onStepChange(function(step, total) {
        stepIndicator.classList.toggle('is-visible', total > 0 && step < total);
      });
    }

    /* ========== PRESENTER MODE — Magnetic-card popup window ========== */
    /* Opens a new window with 4 draggable, resizable cards:
     *   CURRENT  — iframe(?preview=N)   pixel-perfect preview of current slide
     *   NEXT     — iframe(?preview=N+1) pixel-perfect preview of next slide
     *   SCRIPT   — large speaker notes (逐字稿)
     *   TIMER    — elapsed timer + page counter + controls
     * Cards remember position/size in localStorage.
     * Two windows sync via BroadcastChannel.
     */
    let presenterWin = null;

    function openPresenterWindow() {
      if (presenterWin && !presenterWin.closed) {
        presenterWin.focus();
        return;
      }

      // Build absolute URL of THIS deck file (without hash/query)
      const deckUrl = location.protocol + '//' + location.host + location.pathname;

      // Collect slide titles + notes (HTML strings)
      const slideMeta = slides.map((s, i) => {
        const note = s.querySelector('.notes, aside.notes, .speaker-notes');
        return {
          title: s.getAttribute('data-title') ||
            (s.querySelector('h1,h2,h3')||{}).textContent || ('Slide '+(i+1)),
          notes: note ? note.innerHTML : ''
        };
      });

      /* Capture current theme so presenter previews match the audience */
      const currentTheme = root.getAttribute('data-theme') || (themes[themeIdx] || '');
      const presenterHTML = buildPresenterHTML(deckUrl, slideMeta, total, idx, CHANNEL_NAME, currentTheme, slideW, slideH);

      presenterWin = window.open('', 'html-ppt-presenter', 'width=1280,height=820,menubar=no,toolbar=no');
      if (!presenterWin) {
        alert('请允许弹出窗口以使用演讲者视图');
        return;
      }
      presenterWin.document.open();
      presenterWin.document.write(presenterHTML);
      presenterWin.document.close();
    }

    function buildPresenterHTML(deckUrl, slideMeta, total, startIdx, channelName, currentTheme, slideW, slideH) {
      const metaJSON = JSON.stringify(slideMeta);
      const deckUrlJSON = JSON.stringify(deckUrl);
      const channelJSON = JSON.stringify(channelName);
      const themeJSON = JSON.stringify(currentTheme || '');
      const storageKey = 'html-ppt-presenter:' + location.pathname;

      // Build the document as a single template string for clarity
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Presenter View</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%; height: 100%; overflow: hidden;
    background: #1a1d24;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(88,166,255,.04), transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(188,140,255,.04), transparent 50%);
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif;
  }
  /* Stage: positioned area where cards live */
  #stage { position: absolute; inset: 0; overflow: hidden; }

  /* Magnetic card */
  .pcard {
    position: absolute;
    background: #0d1117;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.02);
    display: flex; flex-direction: column;
    overflow: hidden;
    min-width: 180px; min-height: 100px;
    transition: box-shadow .2s, border-color .2s;
  }
  .pcard.dragging { box-shadow: 0 16px 48px rgba(0,0,0,.6), 0 0 0 2px rgba(88,166,255,.5); border-color: #58a6ff; transition: none; z-index: 9999; }
  .pcard.resizing { box-shadow: 0 16px 48px rgba(0,0,0,.6), 0 0 0 2px rgba(63,185,80,.5); border-color: #3fb950; transition: none; z-index: 9999; }
  .pcard:hover { border-color: rgba(88,166,255,.3); }

  /* Card header (drag handle) */
  .pcard-head {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px;
    background: rgba(255,255,255,.04);
    border-bottom: 1px solid rgba(255,255,255,.06);
    cursor: move;
    user-select: none;
    flex-shrink: 0;
  }
  .pcard-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dot-color, #58a6ff); flex-shrink: 0; }
  .pcard-title {
    font-size: 11px; letter-spacing: .15em; text-transform: uppercase;
    font-weight: 700; color: #8b949e; flex: 1;
  }
  /* Card body */
  .pcard-body { flex: 1; position: relative; overflow: hidden; min-height: 0; }

  /* Preview cards (CURRENT/NEXT) — iframe-based pixel-perfect render */
  .pcard-preview .pcard-body { background: #000; }
  .pcard-preview iframe {
    position: absolute; top: 0; left: 0;
    width: ${slideW || 1920}px; height: ${slideH || 1080}px;
    border: none;
    transform-origin: top left;
    pointer-events: none;
    background: transparent;
  }
  .pcard-preview .preview-end {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    color: #484f58; font-size: 14px; letter-spacing: .12em;
  }

  /* Notes card */
  .pcard-notes .pcard-body {
    padding: 14px 18px;
    overflow-y: auto;
    font-size: 18px; line-height: 1.75;
    color: #d0d7de;
    font-family: "Noto Sans SC", -apple-system, sans-serif;
  }
  .pcard-notes .pcard-body p { margin: 0 0 .7em 0; }
  .pcard-notes .pcard-body strong { color: #f0883e; }
  .pcard-notes .pcard-body em { color: #58a6ff; font-style: normal; }
  .pcard-notes .pcard-body code {
    font-family: "SF Mono", monospace; font-size: .9em;
    background: rgba(255,255,255,.08); padding: 1px 6px; border-radius: 4px;
  }
  .pcard-notes .empty { color: #484f58; font-style: italic; }

  /* Timer card */
  .pcard-timer .pcard-body {
    display: flex; flex-direction: column; gap: 14px;
    padding: 18px 20px; justify-content: center;
  }
  .timer-display {
    font-family: "SF Mono", "JetBrains Mono", monospace;
    font-size: 42px; font-weight: 700;
    color: #3fb950;
    letter-spacing: .04em;
    line-height: 1;
  }
  .timer-row {
    display: flex; align-items: center; gap: 12px;
    font-size: 14px; color: #8b949e;
  }
  .timer-row .label { font-size: 10px; letter-spacing: .15em; text-transform: uppercase; color: #6e7681; }
  .timer-row .val { color: #e6edf3; font-weight: 600; font-family: "SF Mono", monospace; }
  .timer-controls { display: flex; gap: 8px; flex-wrap: wrap; }
  .timer-btn {
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.1);
    color: #e6edf3;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }
  .timer-btn:hover { background: rgba(88,166,255,.15); border-color: #58a6ff; }
  .timer-btn:active { transform: translateY(1px); }

  /* Resize handle */
  .pcard-resize {
    position: absolute; right: 0; bottom: 0;
    width: 18px; height: 18px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,.25) 50%, rgba(255,255,255,.25) 60%, transparent 60%, transparent 70%, rgba(255,255,255,.25) 70%, rgba(255,255,255,.25) 80%, transparent 80%);
    z-index: 5;
  }
  .pcard-resize:hover { background: linear-gradient(135deg, transparent 50%, #58a6ff 50%, #58a6ff 60%, transparent 60%, transparent 70%, #58a6ff 70%, #58a6ff 80%, transparent 80%); }

  /* Bottom hint bar */
  .hint-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,.6);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255,255,255,.08);
    padding: 6px 16px;
    font-size: 11px; color: #8b949e;
    display: flex; gap: 18px; align-items: center;
    z-index: 1000;
  }
  .hint-bar kbd {
    background: rgba(255,255,255,.08);
    padding: 1px 6px; border-radius: 3px;
    font-family: "SF Mono", monospace;
    font-size: 10px;
    border: 1px solid rgba(255,255,255,.1);
    color: #e6edf3;
  }
  .hint-bar .reset-layout {
    margin-left: auto;
    background: transparent; border: 1px solid rgba(255,255,255,.15);
    color: #8b949e; padding: 3px 10px; border-radius: 4px;
    font-size: 11px; cursor: pointer; font-family: inherit;
  }
  .hint-bar .reset-layout:hover { background: rgba(248,81,73,.15); border-color: #f85149; color: #f85149; }

  body.is-dragging-card * { user-select: none !important; }
  body.is-dragging-card iframe { pointer-events: none !important; }
</style>
</head>
<body>

<div id="stage">
  <div class="pcard pcard-preview" id="card-cur" style="--dot-color:#58a6ff">
    <div class="pcard-head" data-drag>
      <span class="pcard-dot"></span>
      <span class="pcard-title">CURRENT</span>
    </div>
    <div class="pcard-body"><iframe id="iframe-cur"></iframe></div>
    <div class="pcard-resize" data-resize></div>
  </div>

  <div class="pcard pcard-preview" id="card-nxt" style="--dot-color:#bc8cff">
    <div class="pcard-head" data-drag>
      <span class="pcard-dot"></span>
      <span class="pcard-title">NEXT</span>
    </div>
    <div class="pcard-body"><iframe id="iframe-nxt"></iframe></div>
    <div class="pcard-resize" data-resize></div>
  </div>

  <div class="pcard pcard-notes" id="card-notes" style="--dot-color:#f0883e">
    <div class="pcard-head" data-drag>
      <span class="pcard-dot"></span>
      <span class="pcard-title">SPEAKER SCRIPT · 逐字稿</span>
    </div>
    <div class="pcard-body" id="notes-body"></div>
    <div class="pcard-resize" data-resize></div>
  </div>

  <div class="pcard pcard-timer" id="card-timer" style="--dot-color:#3fb950">
    <div class="pcard-head" data-drag>
      <span class="pcard-dot"></span>
      <span class="pcard-title">TIMER</span>
    </div>
    <div class="pcard-body">
      <div class="timer-display" id="timer-display">00:00</div>
      <div class="timer-row">
        <span class="label">Slide</span>
        <span class="val" id="timer-count" style="font-size:18px">${startIdx + 1} / ${total}</span>
      </div>
      <div style="height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin:2px 0 6px">
        <div id="presenter-progress" style="height:100%;background:#58a6ff;border-radius:2px;transition:width .3s;width:${((startIdx+1)/total*100)}%"></div>
      </div>
      <div class="timer-row" id="step-indicator-row" style="display:none">
        <span class="label">Step</span>
        <span class="val" id="step-indicator">—/—</span>
      </div>
      <div class="timer-controls">
        <button class="timer-btn" id="btn-prev">← Prev</button>
        <button class="timer-btn" id="btn-next">Next →</button>
        <button class="timer-btn" id="btn-reset">⏱ Reset</button>
      </div>
    </div>
    <div class="pcard-resize" data-resize></div>
  </div>
</div>

<div class="hint-bar">
  <span><kbd>← →</kbd> 翻页</span>
  <span><kbd>↑ ↓</kbd> 动画步骤</span>
  <span><kbd>R</kbd> 重置计时</span>
  <span><kbd>Esc</kbd> 关闭</span>
  <span style="color:#6e7681">拖动卡片头部移动 · 拖动右下角调整大小</span>
  <button class="reset-layout" id="reset-layout">重置布局</button>
</div>

<script>
(function(){
  var slideMeta = ${metaJSON};
  var total = ${total};
  var idx = ${startIdx};
  var deckUrl = ${deckUrlJSON};
  var STORAGE_KEY = ${JSON.stringify(storageKey)};
  var bc;
  try { bc = new BroadcastChannel(${channelJSON}); } catch(e) {}

  var iframeCur = document.getElementById('iframe-cur');
  var iframeNxt = document.getElementById('iframe-nxt');
  var notesBody = document.getElementById('notes-body');
  var timerDisplay = document.getElementById('timer-display');
  var timerCount = document.getElementById('timer-count');

  /* ===== Default card layout ===== */
  function defaultLayout() {
    var w = window.innerWidth;
    var h = window.innerHeight - 36; /* leave room for hint bar */
    return {
      'card-cur':   { x: 16,        y: 16,            w: Math.round(w*0.55) - 24, h: Math.round(h*0.62) - 16 },
      'card-nxt':   { x: Math.round(w*0.55) + 8, y: 16, w: w - Math.round(w*0.55) - 24, h: Math.round(h*0.42) - 16 },
      'card-notes': { x: Math.round(w*0.55) + 8, y: Math.round(h*0.42) + 8, w: w - Math.round(w*0.55) - 24, h: h - Math.round(h*0.42) - 16 },
      'card-timer': { x: 16,        y: Math.round(h*0.62) + 8, w: Math.round(w*0.55) - 24, h: h - Math.round(h*0.62) - 16 }
    };
  }

  /* ===== Apply / save / restore layout ===== */
  function applyLayout(layout) {
    Object.keys(layout).forEach(function(id){
      var el = document.getElementById(id);
      var l = layout[id];
      if (el && l) {
        el.style.left = l.x + 'px';
        el.style.top = l.y + 'px';
        el.style.width = l.w + 'px';
        el.style.height = l.h + 'px';
      }
    });
    rescaleAll();
  }
  function readLayout() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return defaultLayout();
  }
  function saveLayout() {
    var layout = {};
    ['card-cur','card-nxt','card-notes','card-timer'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) {
        layout[id] = {
          x: parseInt(el.style.left,10) || 0,
          y: parseInt(el.style.top,10) || 0,
          w: parseInt(el.style.width,10) || 300,
          h: parseInt(el.style.height,10) || 200
        };
      }
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch(e) {}
  }

  /* ===== iframe rescale to fit card body ===== */
  function rescaleIframe(iframe) {
    if (!iframe || iframe.style.display === 'none') return;
    var body = iframe.parentElement;
    var cw = body.clientWidth, ch = body.clientHeight;
    if (!cw || !ch) return;
    var s = Math.min(cw / ${slideW || 1920}, ch / ${slideH || 1080});
    iframe.style.transform = 'scale(' + s + ')';
    /* Center the scaled iframe in the body */
    var sw = ${slideW || 1920} * s, sh = ${slideH || 1080} * s;
    iframe.style.left = Math.max(0, (cw - sw) / 2) + 'px';
    iframe.style.top = Math.max(0, (ch - sh) / 2) + 'px';
  }
  function rescaleAll() {
    rescaleIframe(iframeCur);
    rescaleIframe(iframeNxt);
  }

  /* Track whether user has manually repositioned cards */
  var userDragged = false;
  var resizeTimer = null;

  function handlePresenterResize() {
    rescaleAll();
    /* If user hasn't manually dragged cards, reflow to fit new viewport */
    if (!userDragged) {
      applyLayout(defaultLayout());
    } else {
      /* Clamp cards so they don't go off-screen */
      var maxW = window.innerWidth, maxH = window.innerHeight - 36;
      ['card-cur','card-nxt','card-notes','card-timer'].forEach(function(id){
        var el = document.getElementById(id);
        if (!el) return;
        var l = parseInt(el.style.left,10) || 0;
        var t = parseInt(el.style.top,10)  || 0;
        var w = parseInt(el.style.width,10) || 300;
        var h = parseInt(el.style.height,10) || 200;
        if (l + w > maxW) el.style.left = Math.max(0, maxW - w) + 'px';
        if (t + h > maxH) el.style.top = Math.max(0, maxH - h) + 'px';
      });
      rescaleAll();
    }
  }

  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handlePresenterResize, 100);
  });

  /* ===== Drag (move card by header) ===== */
  document.querySelectorAll('[data-drag]').forEach(function(handle){
    handle.addEventListener('mousedown', function(e){
      if (e.button !== 0) return;
      var card = handle.closest('.pcard');
      if (!card) return;
      e.preventDefault();
      userDragged = true;
      card.classList.add('dragging');
      document.body.classList.add('is-dragging-card');
      var startX = e.clientX, startY = e.clientY;
      var startL = parseInt(card.style.left,10) || 0;
      var startT = parseInt(card.style.top,10)  || 0;
      function onMove(ev){
        var nx = Math.max(0, Math.min(window.innerWidth - 100, startL + ev.clientX - startX));
        var ny = Math.max(0, Math.min(window.innerHeight - 50, startT + ev.clientY - startY));
        card.style.left = nx + 'px';
        card.style.top = ny + 'px';
      }
      function onUp(){
        card.classList.remove('dragging');
        document.body.classList.remove('is-dragging-card');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveLayout();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });

  /* ===== Resize (drag bottom-right corner) ===== */
  document.querySelectorAll('[data-resize]').forEach(function(handle){
    handle.addEventListener('mousedown', function(e){
      if (e.button !== 0) return;
      var card = handle.closest('.pcard');
      if (!card) return;
      e.preventDefault(); e.stopPropagation();
      card.classList.add('resizing');
      document.body.classList.add('is-dragging-card');
      var startX = e.clientX, startY = e.clientY;
      var startW = parseInt(card.style.width,10)  || card.offsetWidth;
      var startH = parseInt(card.style.height,10) || card.offsetHeight;
      function onMove(ev){
        var nw = Math.max(180, startW + ev.clientX - startX);
        var nh = Math.max(100, startH + ev.clientY - startY);
        card.style.width = nw + 'px';
        card.style.height = nh + 'px';
        if (card.querySelector('iframe')) rescaleIframe(card.querySelector('iframe'));
      }
      function onUp(){
        card.classList.remove('resizing');
        document.body.classList.remove('is-dragging-card');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        rescaleAll();
        saveLayout();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });

  /* ===== Preview iframe ready tracking =====
   * Each iframe loads the deck ONCE with ?preview=1 on init. Subsequent
   * slide changes are sent via postMessage('preview-goto') so the iframe
   * just toggles visibility of a different .slide — no reload, no flicker.
   */
  var iframeReady = { cur: false, nxt: false };
  var currentTheme = ${themeJSON};
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'preview-ready') return;
    var iframe = null;
    if (e.source === iframeCur.contentWindow) {
      iframeReady.cur = true;
      iframe = iframeCur;
      postPreviewGoto(iframeCur, idx);
    } else if (e.source === iframeNxt.contentWindow) {
      iframeReady.nxt = true;
      iframe = iframeNxt;
      postPreviewGoto(iframeNxt, idx + 1 < total ? idx + 1 : idx);
    }
    /* Sync current theme to the iframe */
    if (iframe && currentTheme) {
      try { iframe.contentWindow.postMessage({ type: 'preview-theme', name: currentTheme }, '*'); } catch(err) {}
    }
    if (iframe) rescaleIframe(iframe);
  });

  function postPreviewGoto(iframe, n) {
    try {
      iframe.contentWindow.postMessage({ type: 'preview-goto', idx: n }, '*');
    } catch(e) {}
  }

  /* ===== Update content =====
   * Smooth (no-reload) navigation: send postMessage to iframes instead of
   * resetting src. Iframes stay loaded, just switch visible .slide.
   */
  function update(n) {
    n = Math.max(0, Math.min(total - 1, n));
    idx = n;

    /* Current preview — postMessage (smooth) */
    if (iframeReady.cur) postPreviewGoto(iframeCur, n);

    /* Next preview */
    if (n + 1 < total) {
      iframeNxt.style.display = '';
      var endEl = document.querySelector('#card-nxt .preview-end');
      if (endEl) endEl.remove();
      if (iframeReady.nxt) postPreviewGoto(iframeNxt, n + 1);
    } else {
      iframeNxt.style.display = 'none';
      var body = document.querySelector('#card-nxt .pcard-body');
      if (body && !body.querySelector('.preview-end')) {
        var end = document.createElement('div');
        end.className = 'preview-end';
        end.textContent = '— END OF DECK —';
        body.appendChild(end);
      }
    }

    /* Notes */
    var note = slideMeta[n].notes;
    notesBody.innerHTML = note || '<span class="empty">（这一页还没有逐字稿）</span>';

    /* Timer count + progress */
    timerCount.textContent = (n + 1) + ' / ' + total;
    var presProgress = document.getElementById('presenter-progress');
    if (presProgress) presProgress.style.width = ((n + 1) / total * 100) + '%';
  }

  /* ===== Timer ===== */
  var tStart = Date.now();
  setInterval(function(){
    var s = Math.floor((Date.now() - tStart) / 1000);
    var mm = String(Math.floor(s/60)).padStart(2,'0');
    var ss = String(s%60).padStart(2,'0');
    timerDisplay.textContent = mm + ':' + ss;
  }, 1000);
  function resetTimer(){ tStart = Date.now(); timerDisplay.textContent = '00:00'; }

  /* ===== BroadcastChannel sync ===== */
  if (bc) {
    bc.onmessage = function(e){
      if (!e.data) return;
      if (e.data.type === 'go') update(e.data.idx);
      else if (e.data.type === 'theme' && e.data.name) {
        currentTheme = e.data.name;
        /* Forward theme change to preview iframes */
        [iframeCur, iframeNxt].forEach(function(iframe){
          try {
            iframe.contentWindow.postMessage({ type: 'preview-theme', name: e.data.name }, '*');
          } catch(err) {}
        });
      }
    };
  }
  function go(n) {
    update(n);
    if (bc) bc.postMessage({ type: 'go', idx: idx });
  }
  function step(direction) {
    if (bc) bc.postMessage({ type: 'timeline-step', direction: direction });
  }

  /* ===== Timeline step indicator ===== */
  var stepRow = document.getElementById('step-indicator-row');
  var stepEl = document.getElementById('step-indicator');
  try {
    var tlBc = new BroadcastChannel('maliang-deck-timeline');
    tlBc.onmessage = function(e) {
      if (!e.data || e.data.type !== 'step') return;
      if (e.data.total > 0) {
        stepRow.style.display = '';
        stepEl.textContent = e.data.step + '/' + e.data.total;
      } else {
        stepRow.style.display = 'none';
      }
    };
  } catch(e) {}

  /* ===== Buttons ===== */
  document.getElementById('btn-prev').addEventListener('click', function(){ go(idx - 1); });
  document.getElementById('btn-next').addEventListener('click', function(){ go(idx + 1); });
  document.getElementById('btn-reset').addEventListener('click', resetTimer);
  document.getElementById('reset-layout').addEventListener('click', function(){
    if (confirm('恢复默认卡片布局？')) {
      try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
      userDragged = false;
      applyLayout(defaultLayout());
    }
  });

  /* ===== Keyboard ===== */
  document.addEventListener('keydown', function(e){
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch(e.key) {
      case 'ArrowRight': case ' ': case 'PageDown': go(idx + 1); e.preventDefault(); break;
      case 'ArrowLeft':  case 'PageUp':   go(idx - 1); e.preventDefault(); break;
      case 'ArrowDown': step('forward'); e.preventDefault(); break;
      case 'ArrowUp': step('backward'); e.preventDefault(); break;
      case 'Home': go(0); break;
      case 'End':  go(total - 1); break;
      case 'r': case 'R': resetTimer(); break;
      case 'Escape': window.close(); break;
    }
  });

  /* ===== Iframe load → rescale (catches initial size) ===== */
  iframeCur.addEventListener('load', function(){ rescaleIframe(iframeCur); });
  iframeNxt.addEventListener('load', function(){ rescaleIframe(iframeNxt); });

  /* ===== Init =====
   * Load each iframe ONCE with the deck file. After they post
   * 'preview-ready', all subsequent navigation is via postMessage
   * (smooth, no reload, no flicker).
   */
  applyLayout(readLayout());
  iframeCur.src = deckUrl + '?preview=' + (idx + 1);
  if (idx + 1 < total) iframeNxt.src = deckUrl + '?preview=' + (idx + 2);
  /* Initialize notes/timer/count without touching iframes */
  notesBody.innerHTML = slideMeta[idx].notes || '<span class="empty">（这一页还没有逐字稿）</span>';
  timerCount.textContent = (idx + 1) + ' / ' + total;
})();
</` + `script>
</body></html>`;
    }
    function fullscreen(){ const el=document.documentElement;
      if (!document.fullscreenElement) el.requestFullscreen&&el.requestFullscreen();
      else document.exitFullscreen&&document.exitFullscreen();
    }

    // theme cycling
    const root = document.documentElement;
    const themesAttr = root.getAttribute('data-themes') || document.body.getAttribute('data-themes');
    const themes = themesAttr ? themesAttr.split(',').map(s=>s.trim()).filter(Boolean) : [];
    let themeIdx = 0;

    // Auto-detect theme base path from existing <link id="theme-link">
    let themeBase = root.getAttribute('data-theme-base');
    if (!themeBase) {
      const existingLink = document.getElementById('theme-link');
      if (existingLink) {
        // el.getAttribute('href') gives the raw relative path written in HTML
        const rawHref = existingLink.getAttribute('href') || '';
        const lastSlash = rawHref.lastIndexOf('/');
        themeBase = lastSlash >= 0 ? rawHref.substring(0, lastSlash + 1) : 'assets/themes/';
      } else {
        themeBase = 'assets/themes/';
      }
    }

    function applyTheme(name) {
      let link = document.getElementById('theme-link');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.id = 'theme-link';
        document.head.appendChild(link);
      }
      link.href = themeBase + name + '.css';
      root.setAttribute('data-theme', name);
      const ind = document.querySelector('.theme-indicator');
      if (ind) ind.textContent = name;
    }
    function cycleTheme(fromRemote){
      if (!themes.length) return;
      themeIdx = (themeIdx+1) % themes.length;
      const name = themes[themeIdx];
      applyTheme(name);
      /* Broadcast to other window (audience ↔ presenter) */
      if (!fromRemote && bc) bc.postMessage({ type: 'theme', name: name });
    }

    // animation cycling on current slide
    let animIdx = 0;
    function cycleAnim(){
      // Skip A-key cycling on slides with timeline-managed elements
      if (window.__vsliTimeline && window.__vsliTimeline.hasTimelineElements()) return;
      animIdx = (animIdx+1) % ANIMS.length;
      const a = ANIMS[animIdx];
      const target = slides[idx].querySelector('[data-anim-target]') || slides[idx];
      ANIMS.forEach(x => target.classList.remove('anim-'+x));
      void target.offsetWidth;
      target.classList.add('anim-'+a);
      target.setAttribute('data-anim', a);
      const ind = document.querySelector('.anim-indicator');
      if (ind) ind.textContent = a;
    }

    document.addEventListener('keydown', function (e) {
      if (e.metaKey||e.ctrlKey||e.altKey) return;
      if (shouldIgnoreShortcut(e)) return;
      switch (e.key) {
        case 'ArrowRight': case 'PageDown': go(idx+1, false, { skipTimeline: true }); e.preventDefault(); break;
        case 'ArrowLeft': case 'PageUp': go(idx-1, false, { skipTimeline: true }); e.preventDefault(); break;
        case 'ArrowDown': advanceTimelineStep('forward'); e.preventDefault(); break;
        case 'ArrowUp': advanceTimelineStep('backward'); e.preventDefault(); break;
        case ' ': case 'Enter': if (!advanceTimelineStep('forward')) go(idx+1, false, { skipTimeline: true }); e.preventDefault(); break;
        case 'Backspace': if (!advanceTimelineStep('backward')) go(idx-1, false, { skipTimeline: true }); e.preventDefault(); break;
        case 'Home': go(0, false, { skipTimeline: true }); break;
        case 'End': go(total-1, false, { skipTimeline: true }); break;
        case 'f': case 'F': fullscreen(); break;
        case 's': case 'S': openPresenterWindow(); break;
        case 'n': case 'N': toggleNotes(); break;
        case 'o': case 'O': toggleOverview(); break;
        case 't': case 'T': cycleTheme(); break;
        case 'a': case 'A': cycleAnim(); break;
        case 'l': case 'L': toggleLaserPointer(); e.preventDefault(); break;
        case 'w': case 'W': toggleWhiteboard(); e.preventDefault(); break;
        case 'e': case 'E': toggleEditorMode(); e.preventDefault(); break;
        case 'Escape': toggleOverview(false); toggleNotes(false); toggleWhiteboard(false); clearEditorSelection(); break;
      }
    });

    // hash deep-link
    function fromHash(){
      const m = /^#\/(\d+)/.exec(location.hash||'');
      if (m) go(Math.max(0, parseInt(m[1],10)-1), false, { skipTimeline: true });
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
    go(idx);
  });
})();
