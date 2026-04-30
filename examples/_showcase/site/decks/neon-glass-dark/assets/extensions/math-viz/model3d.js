/* Maliang Deck 3D Model Renderer
 * Loads GLTF/GLB/OBJ models via Three.js for display in slides.
 * Supports auto-rotate, zoom, morph targets, and timeline-driven animation.
 * Lazy-loads Three.js + loaders; self-registers with ext-runtime.
 */
(function () {
  'use strict';

  // ─── Three.js + Loader lazy-loading ────────────────────────────────────────

  var loadersReady = false;
  var loadersLoading = false;
  var loaderCallbacks = [];

  function ensureThree(cb) {
    // Reuse Three.js if already loaded by graph3d.js
    if (window.THREE) { cb(); return; }
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
    script.onload = function () {
      // Also load OrbitControls
      var ctrlScript = document.createElement('script');
      ctrlScript.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/examples/js/controls/OrbitControls.js';
      ctrlScript.onload = cb;
      ctrlScript.onerror = cb; // Continue without orbit controls
      document.head.appendChild(ctrlScript);
    };
    script.onerror = function () {
      console.error('[model3d] Failed to load Three.js');
    };
    document.head.appendChild(script);
  }

  function loadLoaders(cb) {
    if (loadersReady) { cb(); return; }
    loaderCallbacks.push(cb);
    if (loadersLoading) return;
    loadersLoading = true;

    ensureThree(function () {
      // Load GLTFLoader from CDN
      var gltfScript = document.createElement('script');
      gltfScript.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/examples/js/loaders/GLTFLoader.js';
      gltfScript.onload = function () {
        loadOBJLoader();
      };
      gltfScript.onerror = function () {
        console.warn('[model3d] GLTFLoader unavailable, trying local fallback');
        loadOBJLoader();
      };
      document.head.appendChild(gltfScript);
    });

    function loadOBJLoader() {
      var objScript = document.createElement('script');
      objScript.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/examples/js/loaders/OBJLoader.js';
      objScript.onload = finish;
      objScript.onerror = finish; // Proceed without OBJ support
      document.head.appendChild(objScript);
    }

    function finish() {
      loadersReady = true;
      loaderCallbacks.forEach(function (fn) { fn(); });
      loaderCallbacks = [];
    }
  }

  // ─── Format Detection ─────────────────────────────────────────────────────

  function detectFormat(src) {
    if (!src) return 'glb';
    var lower = src.toLowerCase();
    if (lower.indexOf('.gltf') !== -1) return 'gltf';
    if (lower.indexOf('.glb') !== -1) return 'glb';
    if (lower.indexOf('.obj') !== -1) return 'obj';
    return 'glb';
  }

  // ─── Scene Builder ─────────────────────────────────────────────────────────

  function buildModelScene(el, config) {
    var THREE = window.THREE;
    var w = parseInt(el.style.width) || el.offsetWidth || 600;
    var h = parseInt(el.style.height) || el.offsetHeight || 400;
    var cam = config.camera || {};

    var scene = new THREE.Scene();
    var bgColor = config.background || '#ffffff';
    scene.background = new THREE.Color(bgColor);

    var fov = cam.fov || 50;
    var camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 1000);
    var dist = cam.distance || 5;
    var phi = cam.phi != null ? cam.phi : Math.PI / 4;
    var theta = cam.theta != null ? cam.theta : Math.PI / 4;
    camera.position.set(
      dist * Math.sin(phi) * Math.cos(theta),
      dist * Math.cos(phi),
      dist * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(0, 0, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.innerHTML = '';
    el.appendChild(renderer.domElement);
    renderer.domElement.style.borderRadius = '4px';

    var controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = cam.orbit !== false;
      controls.autoRotateSpeed = cam.orbitSpeed || 1;
    }

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(5, 10, 7.5);
    scene.add(dir1);
    var dir2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dir2.position.set(-3, -5, -5);
    scene.add(dir2);

    var animId = null;
    var stopped = false;
    var animationMixers = [];
    var clock = new THREE.Clock();

    var ctx = {
      THREE: THREE,
      scene: scene,
      camera: camera,
      renderer: renderer,
      controls: controls,
      clock: clock,
      animationMixers: animationMixers,
    };

    ctx.startAnimLoop = function () {
      function animate() {
        if (stopped) return;
        animId = requestAnimationFrame(animate);
        var delta = clock.getDelta();
        if (controls) controls.update();
        for (var i = 0; i < animationMixers.length; i++) {
          animationMixers[i].update(delta);
        }
        renderer.render(scene, camera);
      }
      animate();
    };

    ctx.cleanup = function () {
      stopped = true;
      if (animId) cancelAnimationFrame(animId);
      if (controls) controls.dispose();
      renderer.dispose();
      for (var i = 0; i < animationMixers.length; i++) {
        animationMixers[i].stopAllAction();
      }
    };

    return ctx;
  }

  // ─── Apply Animations ─────────────────────────────────────────────────────

  function applyAnimations(ctx, obj, config) {
    var THREE = ctx.THREE;
    var anims = config.animations || [];

    for (var i = 0; i < anims.length; i++) {
      var anim = anims[i];
      if (anim.type === 'rotate') {
        // Continuous rotation via RAF (handled in animation loop)
        var axis = anim.axis || 'y';
        var speed = anim.speed || 1;
        (function (a, s) {
          var origUpdate = ctx.startAnimLoop;
          var rotObj = obj;
          // Add rotation to the render loop via mixin
          var prevRender = ctx.renderer.render.bind(ctx.renderer);
          var rate = s * 0.01;
          ctx.renderer.render = function (scene, camera) {
            if (a === 'x') rotObj.rotation.x += rate;
            else if (a === 'z') rotObj.rotation.z += rate;
            else rotObj.rotation.y += rate;
            prevRender(scene, camera);
          };
        })(axis, speed);
      }
    }
  }

  // ─── Model Loading ─────────────────────────────────────────────────────────

  function loadModel(ctx, config) {
    var THREE = ctx.THREE;
    var fmt = config.format || detectFormat(config.src);

    function onModelLoaded(obj) {
      var scale = config.scale || 1;
      obj.scale.setScalar(scale);

      if (config.position) {
        obj.position.set(config.position[0], config.position[1], config.position[2]);
      }
      if (config.modelRotation) {
        obj.rotation.set(config.modelRotation[0], config.modelRotation[1], config.modelRotation[2]);
      }

      ctx.scene.add(obj);
      ctx.loadedModel = obj;

      // Center camera on model
      var box = new THREE.Box3().setFromObject(obj);
      var center = box.getCenter(new THREE.Vector3());
      if (ctx.controls) ctx.controls.target.copy(center);
      ctx.camera.lookAt(center);

      applyAnimations(ctx, obj, config);
      ctx.startAnimLoop();
    }

    function onError(err) {
      console.error('[model3d] Failed to load model:', config.src, err);
      var el = ctx.renderer.domElement.parentElement;
      if (el) el.textContent = '[3D Model: failed to load]';
    }

    if (fmt === 'obj' && THREE.OBJLoader) {
      new THREE.OBJLoader().load(config.src, onModelLoaded, undefined, onError);
    } else if (THREE.GLTFLoader) {
      new THREE.GLTFLoader().load(config.src, function (gltf) {
        // Play embedded GLTF animations if present
        if (gltf.animations && gltf.animations.length > 0) {
          var mixer = new THREE.AnimationMixer(gltf.scene);
          ctx.animationMixers.push(mixer);
          for (var i = 0; i < gltf.animations.length; i++) {
            mixer.clipAction(gltf.animations[i]).play();
          }
        }
        onModelLoaded(gltf.scene);
      }, undefined, onError);
    } else {
      console.error('[model3d] No suitable loader available for format:', fmt);
    }
  }

  // ─── Entry Points ─────────────────────────────────────────────────────────

  function initModel3d(el, config) {
    if (!config || !config.src) {
      el.textContent = '[3D Model: no src specified]';
      return {};
    }

    loadLoaders(function () {
      var THREE = window.THREE;
      if (!THREE) { el.textContent = '[3D Model: Three.js not loaded]'; return; }

      var ctx = buildModelScene(el, config);
      el._model3dCtx = ctx;
      el._model3dConfig = config;
      el._model3dCleanup = ctx.cleanup;

      loadModel(ctx, config);
    });
    return { config: config };
  }

  function stopModel3d(el) {
    if (el._model3dCleanup) {
      el._model3dCleanup();
      el._model3dCleanup = null;
      el._model3dCtx = null;
      el._model3dConfig = null;
    }
  }

  function seekModel3d(el, handle, timeMs) {
    var ctx = el._model3dCtx;
    var config = el._model3dConfig;
    if (!ctx || !config) return;

    // Drive morph steps based on timeline position
    var steps = config.morphSteps;
    if (!steps || steps.length === 0) return;

    var model = ctx.loadedModel;
    if (!model) return;

    // Find the active step based on timeMs
    var stepDuration = 1000; // 1s per step default
    var stepIndex = Math.min(Math.floor(timeMs / stepDuration), steps.length - 1);
    var step = steps[stepIndex];

    if (step.type === 'zoom' && step.targetMorph != null) {
      var targetScale = (config.scale || 1) * (0.5 + step.targetMorph * 1.5);
      model.scale.setScalar(targetScale);
    }
  }

  function prewarmModel3d(el, config) {
    loadLoaders(function () {}); // prime CDN fetch
  }

  window.__model3d = {
    init: initModel3d,
    stop: stopModel3d,
    seek: seekModel3d,
    prewarm: prewarmModel3d,
  };

  // Self-register with ext-runtime
  function tryRegister() {
    if (window.__vsliExtensions) {
      window.__vsliExtensions.register({
        selector: '[data-model3d]',
        init: function (el, config) { return initModel3d(el, config); },
        stop: stopModel3d,
        seek: seekModel3d,
        prewarm: prewarmModel3d,
      });
    }
  }

  if (document.readyState !== 'loading') {
    tryRegister();
  } else {
    document.addEventListener('DOMContentLoaded', tryRegister);
  }
})();
