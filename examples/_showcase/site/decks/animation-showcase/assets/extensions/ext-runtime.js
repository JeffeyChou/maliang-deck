/* Maliang Deck Extension Runtime
 * Central lifecycle manager for slide extensions (text-anim, math-viz, etc.).
 * Avoids per-extension MutationObservers — runtime.js calls into this on slide transitions.
 *
 * Extensions register via: window.__vsliExtensions.register({ selector, init, stop, seek })
 * Runtime calls lifecycle hooks on slide activation/deactivation.
 */
(function () {
  'use strict';

  var extensions = []; // Array<{ selector, init, stop, seek }>
  var activeHandles = new Map(); // Map<element, { ext, handle }>

  /**
   * Register a slide extension.
   * @param {object} ext
   * @param {string} ext.selector - CSS selector to match elements (e.g., '[data-text-anim]')
   * @param {function} ext.init - Called with (element, config) when slide activates. Returns a handle or void.
   * @param {function} ext.stop - Called with (element, handle) when slide deactivates.
   * @param {function} [ext.seek] - Called with (element, handle, timeMs) on timeline seek/scrub.
   */
  function register(ext) {
    if (!ext || !ext.selector || !ext.init || !ext.stop) {
      console.warn('[ext-runtime] Invalid extension registration:', ext);
      return;
    }
    extensions.push(ext);

    // If a slide is already active, initialize for matching elements on it
    var activeSlide = document.querySelector('.slide.is-active');
    if (activeSlide) {
      initExtensionOnSlide(ext, activeSlide);
    }
  }

  /**
   * Read JSON config for an element from its companion <script> block.
   * Pattern: <script type="application/json" data-for="element-id">...</script>
   */
  function readConfig(element) {
    // data-for is written with the raw DSL element id (el.id from schema).
    // The DOM id attribute is scoped (slideId__elemId) and will NOT match.
    // Always prefer data-maliang-deck-id (raw DSL id) for the lookup; fall
    // back to element.id only when the deck attribute is absent.
    var rawId = element.getAttribute('data-maliang-deck-id') || element.id;
    if (!rawId) return null;
    var script = document.querySelector('script[type="application/json"][data-for="' + rawId + '"]');
    if (!script) return null;
    try {
      return JSON.parse(script.textContent);
    } catch (e) {
      console.warn('[ext-runtime] Failed to parse config for', rawId, e);
      return null;
    }
  }

  /**
   * Initialize a single extension on a slide.
   */
  function initExtensionOnSlide(ext, slide) {
    var elements = slide.querySelectorAll(ext.selector);
    elements.forEach(function (el) {
      // Don't double-initialize
      if (activeHandles.has(el)) return;
      var config = readConfig(el);
      try {
        var handle = ext.init(el, config);
        activeHandles.set(el, { ext: ext, handle: handle });
      } catch (e) {
        console.error('[ext-runtime] Extension init failed:', ext.selector, e);
      }
    });
  }

  /**
   * Called by runtime.js when a slide becomes active.
   * Initializes all registered extensions for matching elements on the slide.
   */
  function activateSlide(slide) {
    extensions.forEach(function (ext) {
      initExtensionOnSlide(ext, slide);
    });
  }

  /**
   * Called by runtime.js when a slide is deactivated (leaving).
   * Stops all active extension handles on the slide.
   */
  function deactivateSlide(slide) {
    // Clear step consumers so they re-register fresh on next activation
    if (window.__vsliTimeline && window.__vsliTimeline.clearStepConsumers) {
      window.__vsliTimeline.clearStepConsumers(slide);
    }
    var elements = slide.querySelectorAll('*');
    elements.forEach(function (el) {
      var entry = activeHandles.get(el);
      if (entry) {
        try {
          entry.ext.stop(el, entry.handle);
        } catch (e) {
          console.error('[ext-runtime] Extension stop failed:', e);
        }
        activeHandles.delete(el);
      }
    });
  }

  /**
   * Called by runtime.js when a slide is about to become active (pre-warm).
   * Used for extensions that need setup before visibility (like canvas FX).
   */
  function prewarmSlide(slide) {
    extensions.forEach(function (ext) {
      if (ext.prewarm) {
        var elements = slide.querySelectorAll(ext.selector);
        elements.forEach(function (el) {
          try {
            ext.prewarm(el, readConfig(el));
          } catch (e) { /* ignore prewarm failures */ }
        });
      }
    });
  }

  /**
   * Called by continuous timeline on seek/scrub.
   * Forwards seek to all active handles that support it.
   */
  function seekAll(timeMs) {
    activeHandles.forEach(function (entry, el) {
      if (entry.ext.seek) {
        try {
          entry.ext.seek(el, entry.handle, timeMs);
        } catch (e) { /* ignore seek failures */ }
      }
    });
  }

  /**
   * Check if any registered extension has elements on the given slide.
   */
  function hasExtensionElements(slide) {
    for (var i = 0; i < extensions.length; i++) {
      if (slide.querySelector(extensions[i].selector)) return true;
    }
    return false;
  }

  // ─── PRESENTER SYNC ──────────────────────────────────────────────────────────
  // BroadcastChannel for syncing extension state between presenter ↔ audience

  var extBc = null;
  try { extBc = new BroadcastChannel('maliang-deck-extensions'); } catch (e) { /* unsupported */ }

  /**
   * Broadcast an extension state change to the other window.
   * @param {string} type - Event type (e.g., 'formula-step', 'graph-param')
   * @param {object} data - Serializable state data
   */
  function broadcast(type, data) {
    if (extBc) extBc.postMessage({ type: type, data: data });
  }

  // Listen for remote extension state changes
  if (extBc) {
    extBc.addEventListener('message', function (e) {
      var msg = e.data;
      if (!msg || !msg.type) return;
      // Dispatch to registered handlers
      extensionMessageHandlers.forEach(function (handler) {
        try { handler(msg); } catch (err) { /* ignore */ }
      });
    });
  }

  var extensionMessageHandlers = [];

  /**
   * Register a handler for incoming extension sync messages.
   */
  function onExtensionMessage(handler) {
    extensionMessageHandlers.push(handler);
    return function () {
      var idx = extensionMessageHandlers.indexOf(handler);
      if (idx !== -1) extensionMessageHandlers.splice(idx, 1);
    };
  }

  // Public API
  window.__vsliExtensions = {
    register: register,
    activateSlide: activateSlide,
    deactivateSlide: deactivateSlide,
    prewarmSlide: prewarmSlide,
    seekAll: seekAll,
    hasExtensionElements: hasExtensionElements,
    readConfig: readConfig,
    broadcast: broadcast,
    onExtensionMessage: onExtensionMessage,
  };
})();
