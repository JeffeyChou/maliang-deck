/* Maliang Deck 3D Graph Renderer
 * Uses Three.js (lazy-loaded from CDN) for WebGL surface rendering.
 * Supports: surface f(x,y), parametric f(u,v), 3D scatter, curves, vector fields.
 * ASCII art fallback mode for terminal-aesthetic slides.
 */
(function () {
  'use strict';

  var threeLoaded = false;
  var threeLoading = false;
  var threeCallbacks = [];
  var THREE_VERSION = '0.149.0';

  function loadThree(cb) {
    if (threeLoaded) { cb(); return; }
    threeCallbacks.push(cb);
    if (threeLoading) return;
    threeLoading = true;

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VERSION + '/build/three.min.js';
    script.onload = function () {
      var ctrlScript = document.createElement('script');
      ctrlScript.src = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VERSION + '/examples/js/controls/OrbitControls.js';
      ctrlScript.onload = function () {
        threeLoaded = true;
        threeCallbacks.forEach(function (fn) { fn(); });
        threeCallbacks = [];
      };
      ctrlScript.onerror = function () {
        console.error('[graph3d] Failed to load Three.js OrbitControls from CDN');
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

  // ─── Color Maps ────────────────────────────────────────────────────────────

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

  function getColorMapFn(name) {
    return colorMaps[name] || colorMaps.viridis;
  }

  // ─── Expression Compiler ───────────────────────────────────────────────────

  var mathFns = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
    sqrt: Math.sqrt, abs: Math.abs, log: Math.log,
    exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
    round: Math.round, sign: Math.sign, pow: Math.pow,
    pi: Math.PI, e: Math.E, PI: Math.PI, E: Math.E,
  };

  function prepareExpr(expr) {
    return expr
      .replace(/\^/g, '**')
      .replace(/(\d)([a-zA-Z])/g, '$1*$2')
      .replace(/\)(\w)/g, ')*$1');
  }

  function compileExpr2d(expr) {
    var prepared = prepareExpr(expr);
    if (/[^0-9xy+\-*/().,%\s*a-zA-Z_]/.test(prepared)) {
      return function () { return 0; };
    }
    try {
      var fn = new Function('x', 'y', 'm', 'with(m){return ' + prepared + '}');
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

  function compileExpr1d(expr) {
    var prepared = prepareExpr(expr);
    if (/[^0-9tuvxy+\-*/().,%\s*a-zA-Z_]/.test(prepared)) {
      return function () { return 0; };
    }
    try {
      var fn = new Function('t', 'u', 'v', 'm', 'with(m){return ' + prepared + '}');
      return function (t, u, v) {
        try {
          var result = fn(t, u || 0, v || 0, mathFns);
          return typeof result === 'number' && isFinite(result) ? result : 0;
        } catch (e) { return 0; }
      };
    } catch (e) {
      return function () { return 0; };
    }
  }

  // ─── Camera Controls ───────────────────────────────────────────────────────

  function stopDeckPointerEvent(e) {
    e.stopPropagation();
  }

  function createFallbackOrbitControls(THREE, camera, domElement, cam) {
    var target = new THREE.Vector3(0, 0, 0);
    var offset = new THREE.Vector3().subVectors(camera.position, target);
    var radius = Math.max(0.1, offset.length());
    var theta = Math.atan2(offset.z, offset.x);
    var phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
    var minPhi = 0.05;
    var maxPhi = Math.PI - 0.05;
    var minDistance = cam.minDistance || 2;
    var maxDistance = cam.maxDistance || 80;
    var rotateSpeed = cam.rotateSpeed || 0.006;
    var zoomSpeed = cam.zoomSpeed || 0.0015;
    var dragging = false;
    var lastX = 0;
    var lastY = 0;

    var controls = {
      enabled: true,
      enableDamping: true,
      enableZoom: true,
      enableRotate: true,
      autoRotate: cam.orbit !== false,
      autoRotateSpeed: cam.orbitSpeed || 1,
      userInteracted: false,
      update: update,
      dispose: dispose,
    };

    function applyCamera() {
      camera.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(target);
    }

    function update() {
      if (controls.enabled && controls.autoRotate && !dragging) {
        theta += (2 * Math.PI / 60 / 60) * controls.autoRotateSpeed;
        applyCamera();
      }
    }

    function onPointerDown(e) {
      if (!controls.enabled || !controls.enableRotate || e.button !== 0) return;
      controls.userInteracted = true;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      domElement.style.cursor = 'grabbing';
      try { domElement.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
      e.stopPropagation();
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      theta += dx * rotateSpeed;
      phi = Math.max(minPhi, Math.min(maxPhi, phi - dy * rotateSpeed));
      applyCamera();
      e.preventDefault();
      e.stopPropagation();
    }

    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      domElement.style.cursor = 'grab';
      if (e && e.pointerId !== undefined) {
        try { domElement.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      if (e) e.stopPropagation();
    }

    function onWheel(e) {
      if (!controls.enabled || !controls.enableZoom) return;
      controls.userInteracted = true;
      radius = Math.max(minDistance, Math.min(maxDistance, radius * Math.exp(e.deltaY * zoomSpeed)));
      applyCamera();
      e.preventDefault();
      e.stopPropagation();
    }

    function onContextMenu(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    function dispose() {
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      domElement.removeEventListener('wheel', onWheel);
      domElement.removeEventListener('contextmenu', onContextMenu);
    }

    applyCamera();
    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    domElement.addEventListener('contextmenu', onContextMenu);
    domElement.style.cursor = 'grab';

    return controls;
  }

  function createGraphControls(THREE, camera, domElement, cam) {
    var controls = createFallbackOrbitControls(THREE, camera, domElement, cam);

    domElement.addEventListener('wheel', function(e) {
      e.stopPropagation();
    }, { passive: false });
    domElement.addEventListener('pointerdown', stopDeckPointerEvent);
    domElement.addEventListener('pointermove', stopDeckPointerEvent);
    domElement.addEventListener('pointerup', stopDeckPointerEvent);
    domElement.addEventListener('pointercancel', stopDeckPointerEvent);

    return controls;
  }

  // ─── Scene Context Builder ─────────────────────────────────────────────────

  function buildSceneContext(el, config) {
    var THREE = window.THREE;
    var w = parseInt(el.style.width) || el.offsetWidth || 600;
    var h = parseInt(el.style.height) || el.offsetHeight || 400;
    var cam = config.camera || {};

    var scene = new THREE.Scene();
    // Transparent background — lets slide background show through
    scene.background = null;

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

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0); // fully transparent clear
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.innerHTML = '';
    el.style.zIndex = '10';
    el.style.pointerEvents = 'auto';
    el.appendChild(renderer.domElement);
    renderer.domElement.style.borderRadius = '4px';
    renderer.domElement.style.pointerEvents = 'auto';
    renderer.domElement.style.touchAction = 'none';

    var controls = createGraphControls(THREE, camera, renderer.domElement, cam);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    var dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(5, 10, 5);
    scene.add(dir1);
    var dir2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dir2.position.set(-5, -5, -5);
    scene.add(dir2);

    var disposables = [];
    var animId = null;
    var stopped = false;

    var ctx = {
      THREE: THREE,
      scene: scene,
      camera: camera,
      renderer: renderer,
      controls: controls,
      disposables: disposables,
      addDisposable: function (d) { disposables.push(d); },
    };

    ctx.startAnimLoop = function () {
      function animate() {
        if (stopped) return;
        animId = requestAnimationFrame(animate);
        if (controls) controls.update();
        renderer.render(scene, camera);
      }
      animate();
    };

    ctx.cleanup = function () {
      stopped = true;
      if (animId) cancelAnimationFrame(animId);
      if (controls) controls.dispose();
      renderer.dispose();
      disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
    };

    return ctx;
  }

  // ─── Axes Helper ───────────────────────────────────────────────────────────

  function addAxes(ctx, axes, zAxis) {
    if (!axes) return 1;
    var THREE = ctx.THREE;
    var xMin = axes.x[0], xMax = axes.x[1];
    var yMin = axes.y[0], yMax = axes.y[1];
    var zMin = (zAxis || [-5, 5])[0], zMax = (zAxis || [-5, 5])[1];
    var xRange = xMax - xMin;
    var yRange = yMax - yMin;
    var zRange = zMax - zMin;
    var scale = 5 / Math.max(xRange, yRange, zRange);

    var axesMat = new THREE.LineBasicMaterial({ color: 0x888888 });
    var axesGeo = new THREE.BufferGeometry();
    var axesVerts = new Float32Array([
      xMin * scale, 0, 0, xMax * scale, 0, 0,
      0, zMin * scale, 0, 0, zMax * scale, 0,
      0, 0, yMin * scale, 0, 0, yMax * scale,
    ]);
    axesGeo.setAttribute('position', new THREE.BufferAttribute(axesVerts, 3));
    ctx.scene.add(new THREE.LineSegments(axesGeo, axesMat));
    ctx.addDisposable(axesGeo);
    ctx.addDisposable(axesMat);

    var gridSize = Math.max(xRange, yRange) * scale;
    var gridHelper = new THREE.GridHelper(gridSize, 10, 0x555555, 0x333333);
    ctx.scene.add(gridHelper);

    return scale;
  }

  // ─── Surface Renderer (existing logic, extracted) ──────────────────────────

  function renderSurface(ctx, surface, axes, zAxis) {
    var THREE = ctx.THREE;
    var zRange = zAxis || [-5, 5];
    var xMin = axes.x[0], xMax = axes.x[1];
    var yMin = axes.y[0], yMax = axes.y[1];
    var zMin = zRange[0], zMax = zRange[1];
    var scale = addAxes(ctx, axes, zAxis);

    var evalFn = compileExpr2d(surface.expr);
    var res = surface.resolution || 64;
    var colorMapFn = getColorMapFn(surface.colorMap);
    var isWireframe = surface.wireframe || false;
    var surfaceOpacity = surface.opacity != null ? surface.opacity : 1;

    var geometry = new THREE.BufferGeometry();
    var vertices = [];
    var colors = [];
    var indices = [];

    for (var iy = 0; iy <= res; iy++) {
      for (var ix = 0; ix <= res; ix++) {
        var x = xMin + (xMax - xMin) * ix / res;
        var y = yMin + (yMax - yMin) * iy / res;
        var z = evalFn(x, y);
        z = Math.max(zMin, Math.min(zMax, z));
        vertices.push(x * scale, z * scale, y * scale);
        var t = (z - zMin) / ((zMax - zMin) || 1);
        var col = colorMapFn(Math.max(0, Math.min(1, t)));
        colors.push(col.r, col.g, col.b);
      }
    }

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

    ctx.scene.add(new THREE.Mesh(geometry, material));
    ctx.addDisposable(geometry);
    ctx.addDisposable(material);
  }

  // ─── Parametric Surface f(u,v) → (x,y,z) ─────────────────────────────────

  function renderParametric(ctx, parametric) {
    var THREE = ctx.THREE;
    var xFn = compileExpr1d(parametric.xExpr);
    var yFn = compileExpr1d(parametric.yExpr);
    var zFn = compileExpr1d(parametric.zExpr);
    var uMin = parametric.uRange[0], uMax = parametric.uRange[1];
    var vMin = parametric.vRange[0], vMax = parametric.vRange[1];
    var res = parametric.resolution || 64;
    var colorMapFn = getColorMapFn(parametric.colorMap);
    var isWireframe = parametric.wireframe || false;
    var surfaceOpacity = parametric.opacity != null ? parametric.opacity : 1;

    var vertices = [];
    var colors = [];
    var indices = [];
    var zValues = [];

    for (var iv = 0; iv <= res; iv++) {
      for (var iu = 0; iu <= res; iu++) {
        var u = uMin + (uMax - uMin) * iu / res;
        var v = vMin + (vMax - vMin) * iv / res;
        var px = xFn(0, u, v);
        var py = yFn(0, u, v);
        var pz = zFn(0, u, v);
        vertices.push(px, pz, py); // Y-up convention
        zValues.push(pz);
      }
    }

    // Normalize z for color
    var zMin = Infinity, zMax = -Infinity;
    for (var i = 0; i < zValues.length; i++) {
      if (zValues[i] < zMin) zMin = zValues[i];
      if (zValues[i] > zMax) zMax = zValues[i];
    }
    var zRange = zMax - zMin || 1;
    for (var i = 0; i < zValues.length; i++) {
      var t = (zValues[i] - zMin) / zRange;
      var col = colorMapFn(Math.max(0, Math.min(1, t)));
      colors.push(col.r, col.g, col.b);
    }

    for (var iv = 0; iv < res; iv++) {
      for (var iu = 0; iu < res; iu++) {
        var a = iv * (res + 1) + iu;
        var b = a + 1;
        var c = a + (res + 1);
        var d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    var geometry = new THREE.BufferGeometry();
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

    ctx.scene.add(new THREE.Mesh(geometry, material));
    ctx.addDisposable(geometry);
    ctx.addDisposable(material);

    // Add simple axes
    var axesHelper = new THREE.AxesHelper(5);
    ctx.scene.add(axesHelper);
  }

  // ─── 3D Scatter ────────────────────────────────────────────────────────────

  function renderScatter3d(ctx, scatter) {
    var THREE = ctx.THREE;
    var pts = scatter.points;
    var size = scatter.size || 0.15;
    var colorMapFn = getColorMapFn(scatter.colorMap);

    // Find z range for color mapping
    var zMin = Infinity, zMax = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].z < zMin) zMin = pts[i].z;
      if (pts[i].z > zMax) zMax = pts[i].z;
    }
    var zRange = zMax - zMin || 1;

    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(pts.length * 3);
    var pointColors = new Float32Array(pts.length * 3);

    for (var i = 0; i < pts.length; i++) {
      positions[i * 3] = pts[i].x;
      positions[i * 3 + 1] = pts[i].z; // Y-up
      positions[i * 3 + 2] = pts[i].y;

      if (pts[i].color) {
        var hex = parseInt(pts[i].color.replace('#', ''), 16);
        pointColors[i * 3] = ((hex >> 16) & 255) / 255;
        pointColors[i * 3 + 1] = ((hex >> 8) & 255) / 255;
        pointColors[i * 3 + 2] = (hex & 255) / 255;
      } else {
        var t = (pts[i].z - zMin) / zRange;
        var col = colorMapFn(Math.max(0, Math.min(1, t)));
        pointColors[i * 3] = col.r;
        pointColors[i * 3 + 1] = col.g;
        pointColors[i * 3 + 2] = col.b;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));

    var material = new THREE.PointsMaterial({
      size: size,
      vertexColors: true,
      sizeAttenuation: true,
    });

    ctx.scene.add(new THREE.Points(geometry, material));
    ctx.addDisposable(geometry);
    ctx.addDisposable(material);

    var axesHelper = new THREE.AxesHelper(5);
    ctx.scene.add(axesHelper);
  }

  // ─── 3D Curves ─────────────────────────────────────────────────────────────

  function renderCurves3d(ctx, curves) {
    var THREE = ctx.THREE;

    for (var c = 0; c < curves.length; c++) {
      var curve = curves[c];
      var exprParts = curve.expr.split(',');
      if (exprParts.length < 3) continue;

      var xFn = compileExpr1d(exprParts[0].trim());
      var yFn = compileExpr1d(exprParts[1].trim());
      var zFn = compileExpr1d(exprParts[2].trim());
      var tMin = curve.tRange[0], tMax = curve.tRange[1];
      var res = curve.resolution || 200;

      var points = [];
      for (var i = 0; i <= res; i++) {
        var t = tMin + (tMax - tMin) * i / res;
        points.push(new THREE.Vector3(xFn(t), zFn(t), yFn(t))); // Y-up
      }

      var geometry = new THREE.BufferGeometry().setFromPoints(points);
      var color = curve.color ? new THREE.Color(curve.color) : new THREE.Color(0x2196f3);
      var material = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });

      ctx.scene.add(new THREE.Line(geometry, material));
      ctx.addDisposable(geometry);
      ctx.addDisposable(material);
    }

    var axesHelper = new THREE.AxesHelper(5);
    ctx.scene.add(axesHelper);
  }

  // ─── Vector Field ──────────────────────────────────────────────────────────

  function renderVectorField(ctx, vf) {
    var THREE = ctx.THREE;
    var grid = vf.gridSize || 5;
    var vScale = vf.scale || 1;
    var xFn = compileExpr1d(vf.xComp);
    var yFn = compileExpr1d(vf.yComp);
    var zFn = compileExpr1d(vf.zComp);

    var span = grid - 1;
    for (var ix = 0; ix < grid; ix++) {
      for (var iy = 0; iy < grid; iy++) {
        for (var iz = 0; iz < grid; iz++) {
          var px = (ix / span - 0.5) * 4;
          var py = (iy / span - 0.5) * 4;
          var pz = (iz / span - 0.5) * 4;

          // Evaluate components — pass x,y,z as t,u,v
          var vx = xFn(px, py, pz) * vScale;
          var vy = yFn(px, py, pz) * vScale;
          var vz = zFn(px, py, pz) * vScale;
          var len = Math.sqrt(vx * vx + vy * vy + vz * vz);
          if (len < 0.001) continue;

          var dir = new THREE.Vector3(vx, vz, vy).normalize(); // Y-up
          var origin = new THREE.Vector3(px, pz, py);
          var arrowLen = Math.min(len * 0.5, 1);
          var color = new THREE.Color().setHSL(len / 5, 0.8, 0.5);

          var arrow = new THREE.ArrowHelper(dir, origin, arrowLen, color.getHex(), arrowLen * 0.3, arrowLen * 0.15);
          ctx.scene.add(arrow);
        }
      }
    }

    var axesHelper = new THREE.AxesHelper(5);
    ctx.scene.add(axesHelper);
  }

  // ─── ASCII Art Fallback ────────────────────────────────────────────────────

  function renderAsciiSurface(el, config) {
    var surface = config.surface;
    if (!surface || !surface.expr) {
      el.textContent = '[ASCII 3D: no surface expression]';
      return;
    }

    var axes = config.axes || { x: [-5, 5], y: [-5, 5] };
    var xMin = axes.x[0], xMax = axes.x[1];
    var yMin = axes.y[0], yMax = axes.y[1];
    var cols = 72, rows = 28;
    var chars = ' .:-=+*#%@';
    var evalFn = compileExpr2d(surface.expr);

    // Sample the surface
    var sampleRes = 40;
    var samples = [];
    var zMin = Infinity, zMax = -Infinity;

    for (var iy = 0; iy < sampleRes; iy++) {
      for (var ix = 0; ix < sampleRes; ix++) {
        var x = xMin + (xMax - xMin) * ix / (sampleRes - 1);
        var y = yMin + (yMax - yMin) * iy / (sampleRes - 1);
        var z = evalFn(x, y);
        if (!isFinite(z)) z = 0;
        samples.push({ ix: ix, iy: iy, z: z });
        if (z < zMin) zMin = z;
        if (z > zMax) zMax = z;
      }
    }

    var zRange = zMax - zMin || 1;
    // Aspect ratio correction: terminal chars are ~2x taller than wide
    var aspectX = 0.6;
    var aspectY = 0.3;
    var heightScale = 8;

    // Z-buffer: screen cells, keyed by row*cols+col
    var screenBuf = new Array(rows * cols);
    var depthBuf = new Float32Array(rows * cols);
    for (var i = 0; i < rows * cols; i++) {
      screenBuf[i] = ' ';
      depthBuf[i] = -Infinity;
    }

    for (var i = 0; i < samples.length; i++) {
      var s = samples[i];
      var normZ = (s.z - zMin) / zRange;
      // Isometric projection
      var sx = (s.ix - s.iy) * aspectX + cols / 2;
      var sy = (s.ix + s.iy) * aspectY - normZ * heightScale + rows / 2;
      var col = Math.round(sx);
      var row = Math.round(sy);

      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        var idx = row * cols + col;
        // Z-buffer: keep front-most point (highest original z)
        if (s.z > depthBuf[idx]) {
          depthBuf[idx] = s.z;
          var charIdx = Math.floor(normZ * (chars.length - 1));
          screenBuf[idx] = chars[Math.max(0, Math.min(chars.length - 1, charIdx))];
        }
      }
    }

    // Build output string
    var lines = [];
    for (var r = 0; r < rows; r++) {
      var line = '';
      for (var c = 0; c < cols; c++) {
        line += screenBuf[r * cols + c];
      }
      lines.push(line.replace(/\s+$/, ''));
    }

    var pre = document.createElement('pre');
    pre.className = 'ascii3d';
    pre.style.cssText = 'font-family:monospace;font-size:12px;line-height:1.2;color:#00ff41;' +
      'background:#0a0a0a;padding:16px;border-radius:4px;overflow:hidden;margin:0;' +
      'width:100%;height:100%;box-sizing:border-box;';
    pre.textContent = lines.join('\n');
    el.innerHTML = '';
    el.appendChild(pre);
  }

  // ─── Camera Keyframe Interpolation ─────────────────────────────────────────

  function interpolateCameraKeyframes(keyframes, timeMs) {
    if (!keyframes || keyframes.length === 0) return null;
    var t = timeMs / 1000; // keyframe t is in seconds

    // Find bounding keyframes
    if (t <= keyframes[0].t) return keyframes[0];
    if (t >= keyframes[keyframes.length - 1].t) return keyframes[keyframes.length - 1];

    for (var i = 0; i < keyframes.length - 1; i++) {
      if (t >= keyframes[i].t && t <= keyframes[i + 1].t) {
        var k0 = keyframes[i], k1 = keyframes[i + 1];
        var frac = (t - k0.t) / (k1.t - k0.t);
        return {
          phi: k0.phi + (k1.phi - k0.phi) * frac,
          theta: k0.theta + (k1.theta - k0.theta) * frac,
          distance: (k0.distance || 12) + ((k1.distance || 12) - (k0.distance || 12)) * frac,
        };
      }
    }
    return keyframes[keyframes.length - 1];
  }

  // ─── Main Entry Points ─────────────────────────────────────────────────────

  function initGraph3d(el, config) {
    if (config.asciiMode) {
      renderAsciiSurface(el, config);
      return { config: config, ascii: true };
    }

    loadThree(function () {
      var THREE = window.THREE;
      if (!THREE) { el.textContent = '[3D Graph: Three.js not loaded]'; return; }

      var ctx = buildSceneContext(el, config);

      // Render all applicable modes
      if (config.surface && config.surface.expr && config.axes) {
        renderSurface(ctx, config.surface, config.axes, config.zAxis);
      }
      if (config.parametric) {
        renderParametric(ctx, config.parametric);
      }
      if (config.scatter3d) {
        renderScatter3d(ctx, config.scatter3d);
      }
      if (config.curves3d && config.curves3d.length > 0) {
        renderCurves3d(ctx, config.curves3d);
      }
      if (config.vectorField) {
        renderVectorField(ctx, config.vectorField);
      }

      ctx.startAnimLoop();
      el._graph3dCtx = ctx;
      el._graph3dConfig = config;
      el._graph3dCleanup = ctx.cleanup;
    });
    return { config: config };
  }

  function stopGraph3d(el) {
    if (el._graph3dCleanup) {
      el._graph3dCleanup();
      el._graph3dCleanup = null;
      el._graph3dCtx = null;
      el._graph3dConfig = null;
    }
  }

  function seekGraph3d(el, handle, timeMs) {
    var ctx = el._graph3dCtx;
    var config = el._graph3dConfig;
    if (!ctx || !config || !config.cameraKeyframes) return;
    if (ctx.controls && ctx.controls.userInteracted) return;

    var kf = interpolateCameraKeyframes(config.cameraKeyframes, timeMs);
    if (!kf) return;

    var dist = kf.distance || 12;
    ctx.camera.position.set(
      dist * Math.sin(kf.phi) * Math.cos(kf.theta),
      dist * Math.cos(kf.phi),
      dist * Math.sin(kf.phi) * Math.sin(kf.theta)
    );
    ctx.camera.lookAt(0, 0, 0);
  }

  function prewarmGraph3d(el, config) {
    loadThree(function () {}); // prime CDN fetch
  }

  // Export
  window.__graph3d = {
    init: initGraph3d,
    stop: stopGraph3d,
    seek: seekGraph3d,
    prewarm: prewarmGraph3d,
  };
})();
