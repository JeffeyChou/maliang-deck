/* Maliang Deck 3D Graph Renderer
 * Uses Three.js (lazy-loaded from CDN) for WebGL surface rendering.
 * Supports f(x,y) surface plotting, wireframe, color maps, orbit camera.
 */
(function () {
  'use strict';

  var threeLoaded = false;
  var threeLoading = false;
  var threeCallbacks = [];

  function loadThree(cb) {
    if (threeLoaded) { cb(); return; }
    threeCallbacks.push(cb);
    if (threeLoading) return;
    threeLoading = true;

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js';
    script.onload = function () {
      // Also load OrbitControls
      var ctrlScript = document.createElement('script');
      ctrlScript.src = 'https://cdn.jsdelivr.net/npm/three@0.150.0/examples/js/controls/OrbitControls.js';
      ctrlScript.onload = function () {
        threeLoaded = true;
        threeCallbacks.forEach(function (fn) { fn(); });
        threeCallbacks = [];
      };
      ctrlScript.onerror = function () {
        // OrbitControls failed — still usable without orbit
        threeLoaded = true;
        threeCallbacks.forEach(function (fn) { fn(); });
        threeCallbacks = [];
      };
      document.head.appendChild(ctrlScript);
    };
    script.onerror = function () {
      console.error('[graph3d] Failed to load Three.js from CDN');
    };
    document.head.appendChild(script);
  }

  // Color map implementations
  var colorMaps = {
    viridis: function (t) { return hsl2rgb(260 - t * 200, 0.7 + t * 0.3, 0.3 + t * 0.4); },
    plasma: function (t) { return hsl2rgb(300 - t * 240, 0.9, 0.3 + t * 0.4); },
    inferno: function (t) { return hsl2rgb(280 - t * 280, 0.8, t * 0.6); },
    coolwarm: function (t) { return hsl2rgb(t < 0.5 ? 240 : 0, 0.7, 0.4 + Math.abs(t - 0.5) * 0.4); },
    rainbow: function (t) { return hsl2rgb(t * 300, 0.8, 0.5); },
    monochrome: function (t) { return hsl2rgb(210, 0.6, 0.3 + t * 0.5); },
  };

  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return { r: (r + m), g: (g + m), b: (b + m) };
  }

  // Safe 2-variable expression compiler
  var mathFns = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
    sqrt: Math.sqrt, abs: Math.abs, log: Math.log,
    exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
    round: Math.round, sign: Math.sign, pow: Math.pow,
    pi: Math.PI, e: Math.E, PI: Math.PI, E: Math.E,
  };

  function compileExpr2d(expr) {
    var prepared = expr
      .replace(/\^/g, '**')
      .replace(/(\d)([a-zA-Z])/g, '$1*$2')
      .replace(/\)(\w)/g, ')*$1');

    if (/[^0-9xy+\-*/().,%\s*a-zA-Z_]/.test(prepared)) {
      return function () { return 0; };
    }

    try {
      var fnBody = 'with(m){return ' + prepared + '}';
      var fn = new Function('x', 'y', 'm', fnBody);
      return function (x, y) {
        try {
          var result = fn(x, y, mathFns);
          return typeof result === 'number' && isFinite(result) ? result : 0;
        } catch (e) { return 0; }
      };
    } catch (e) {
      return function () { return 0; };
    }
  }

  /**
   * Initialize a 3D graph.
   */
  function initGraph3d(el, config) {
    loadThree(function () {
      renderGraph3d(el, config);
    });
    return { config: config };
  }

  function renderGraph3d(el, config) {
    var THREE = window.THREE;
    if (!THREE) { el.textContent = '[3D Graph: Three.js not loaded]'; return; }

    var w = parseInt(el.style.width) || el.offsetWidth || 600;
    var h = parseInt(el.style.height) || el.offsetHeight || 400;
    var surface = config.surface;
    var axes = config.axes;
    var zAxis = config.zAxis || [-5, 5];
    var cam = config.camera || {};

    // Create scene
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Camera
    var fov = cam.fov || 50;
    var camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 1000);
    var dist = cam.distance || 12;
    var phi = cam.phi != null ? cam.phi : Math.PI / 4;
    var theta = cam.theta != null ? cam.theta : Math.PI / 4;
    camera.position.set(
      dist * Math.sin(phi) * Math.cos(theta),
      dist * Math.cos(phi),
      dist * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(0, 0, 0);

    // Renderer
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.innerHTML = '';
    el.appendChild(renderer.domElement);
    renderer.domElement.style.borderRadius = '4px';

    // Orbit controls
    var controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = cam.orbit !== false;
      controls.autoRotateSpeed = cam.orbitSpeed || 1;
    }

    // Axes helper
    var xMin = axes.x[0], xMax = axes.x[1];
    var yMin = axes.y[0], yMax = axes.y[1];
    var zMin = zAxis[0], zMax = zAxis[1];
    var xRange = xMax - xMin;
    var yRange = yMax - yMin;
    var zRange = zMax - zMin;
    var scale = 5 / Math.max(xRange, yRange, zRange);

    // Draw axes lines
    var axesMat = new THREE.LineBasicMaterial({ color: 0x333333 });
    var axesGeo = new THREE.BufferGeometry();
    var axesVerts = new Float32Array([
      xMin * scale, 0, 0, xMax * scale, 0, 0,  // X axis
      0, zMin * scale, 0, 0, zMax * scale, 0,  // Z (vertical) axis
      0, 0, yMin * scale, 0, 0, yMax * scale,  // Y (depth) axis
    ]);
    axesGeo.setAttribute('position', new THREE.BufferAttribute(axesVerts, 3));
    var axesLine = new THREE.LineSegments(axesGeo, axesMat);
    scene.add(axesLine);

    // Grid on XY plane (z=0)
    var gridHelper = new THREE.GridHelper(Math.max(xRange, yRange) * scale, 10, 0xcccccc, 0xe8e8e8);
    gridHelper.rotation.x = 0;
    scene.add(gridHelper);

    // Surface mesh
    if (surface && surface.expr) {
      var evalFn = compileExpr2d(surface.expr);
      var res = surface.resolution || 64;
      var colorMapName = surface.colorMap || 'viridis';
      var colorMapFn = colorMaps[colorMapName] || colorMaps.viridis;
      var isWireframe = surface.wireframe || false;
      var surfaceOpacity = surface.opacity != null ? surface.opacity : 1;

      var geometry = new THREE.BufferGeometry();
      var vertices = [];
      var colors = [];
      var indices = [];

      // Generate vertices
      for (var iy = 0; iy <= res; iy++) {
        for (var ix = 0; ix <= res; ix++) {
          var x = xMin + (xMax - xMin) * ix / res;
          var y = yMin + (yMax - yMin) * iy / res;
          var z = evalFn(x, y);
          z = Math.max(zMin, Math.min(zMax, z)); // Clamp to z range

          vertices.push(x * scale, z * scale, y * scale); // Y-up convention: swap y/z

          // Color based on height
          var t = (z - zMin) / (zRange || 1);
          var col = colorMapFn(Math.max(0, Math.min(1, t)));
          colors.push(col.r, col.g, col.b);
        }
      }

      // Generate indices (triangle strip)
      for (var iy = 0; iy < res; iy++) {
        for (var ix = 0; ix < res; ix++) {
          var a = iy * (res + 1) + ix;
          var b = a + 1;
          var c = a + (res + 1);
          var d = c + 1;
          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      var material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        wireframe: isWireframe,
        transparent: surfaceOpacity < 1,
        opacity: surfaceOpacity,
        side: THREE.DoubleSide,
        shininess: 30,
      });

      var mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
    }

    // Lighting
    var ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    var directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    scene.add(directional);
    var directional2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directional2.position.set(-5, -5, -5);
    scene.add(directional2);

    // Animation loop
    var animId = null;
    var stopped = false;

    function animate() {
      if (stopped) return;
      animId = requestAnimationFrame(animate);
      if (controls) controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Store cleanup handle
    el._graph3dCleanup = function () {
      stopped = true;
      if (animId) cancelAnimationFrame(animId);
      if (controls) controls.dispose();
      renderer.dispose();
      geometry && geometry.dispose();
    };
  }

  function stopGraph3d(el) {
    if (el._graph3dCleanup) {
      el._graph3dCleanup();
      el._graph3dCleanup = null;
    }
  }

  // Export for use by math-viz/index.js
  window.__graph3d = {
    init: initGraph3d,
    stop: stopGraph3d,
  };
})();
