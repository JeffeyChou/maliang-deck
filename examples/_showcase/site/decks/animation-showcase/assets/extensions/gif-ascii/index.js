(function () {
  'use strict';

  var THREE_VERSION = '0.149.0';
  var threeLoading = false;
  var threeCallbacks = [];

  function loadThree(cb) {
    if (window.THREE) {
      cb();
      return;
    }
    threeCallbacks.push(cb);
    if (threeLoading) return;
    threeLoading = true;

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VERSION + '/build/three.min.js';
    script.onload = function () {
      threeCallbacks.splice(0).forEach(function (fn) { fn(); });
    };
    script.onerror = function () {
      threeCallbacks.splice(0);
      document.querySelectorAll('[data-gif-ascii]').forEach(function (el) {
        el.textContent = '[ascii-gif] failed to load three.js';
      });
    };
    document.head.appendChild(script);
  }

  function ensureStyles() {
    if (document.getElementById('gif-ascii-style')) return;
    var style = document.createElement('style');
    style.id = 'gif-ascii-style';
    style.textContent = [
      '[data-gif-ascii]{width:100%;height:100%;}',
      '.gif-ascii-shell{position:relative;width:100%;height:100%;overflow:hidden;background:var(--gif-ascii-bg,#020804);border:1px solid var(--gif-ascii-border,rgba(0,255,65,.28));box-shadow:0 0 20px rgba(0,255,65,.10),inset 0 0 55px rgba(0,255,65,.035);}',
      '.gif-ascii-shell::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,255,65,.055) 0 1px,transparent 1px 4px);mix-blend-mode:screen;pointer-events:none;}',
      '.gif-ascii-top{position:absolute;left:14px;right:14px;top:10px;display:flex;justify-content:space-between;font:11px JetBrains Mono,Fira Code,Courier New,monospace;color:rgba(0,255,65,.56);}',
      '.gif-ascii-pre{position:absolute;left:18px;right:18px;top:34px;bottom:34px;margin:0;color:var(--gif-ascii-color,#00ff41);text-shadow:0 0 8px rgba(0,255,65,.54);font:var(--gif-ascii-font,7.2px/.82 JetBrains Mono,Fira Code,Courier New,monospace);letter-spacing:0;white-space:pre;overflow:hidden;}',
      '.gif-ascii-status{position:absolute;left:18px;right:18px;bottom:14px;font:12px JetBrains Mono,Fira Code,Courier New,monospace;color:rgba(139,148,158,.78);}',
      '.gif-ascii-loading{position:absolute;left:18px;top:58px;font:13px JetBrains Mono,Fira Code,Courier New,monospace;color:rgba(0,255,65,.75);}'
    ].join('');
    document.head.appendChild(style);
  }

  function readU16(bytes, pos) {
    return bytes[pos] | (bytes[pos + 1] << 8);
  }

  function readColorTable(bytes, pos, size) {
    var table = new Array(size);
    for (var i = 0; i < size; i++) {
      table[i] = [bytes[pos++], bytes[pos++], bytes[pos++]];
    }
    return { table: table, pos: pos };
  }

  function readSubBlocks(bytes, pos) {
    var chunks = [];
    var total = 0;
    while (pos < bytes.length) {
      var size = bytes[pos++];
      if (size === 0) break;
      chunks.push(bytes.slice(pos, pos + size));
      total += size;
      pos += size;
    }
    var data = new Uint8Array(total);
    var offset = 0;
    chunks.forEach(function (chunk) {
      data.set(chunk, offset);
      offset += chunk.length;
    });
    return { data: data, pos: pos };
  }

  function lzwDecode(minCodeSize, data, expectedSize) {
    var clearCode = 1 << minCodeSize;
    var endCode = clearCode + 1;
    var codeSize = minCodeSize + 1;
    var dict = [];
    var bitPos = 0;
    var output = [];
    var prev = null;

    function resetDict() {
      dict = [];
      for (var i = 0; i < clearCode; i++) dict[i] = [i];
      dict[clearCode] = null;
      dict[endCode] = null;
      codeSize = minCodeSize + 1;
      prev = null;
    }

    function readCode() {
      var code = 0;
      for (var i = 0; i < codeSize; i++) {
        var byte = data[bitPos >> 3];
        var bit = (byte >> (bitPos & 7)) & 1;
        code |= bit << i;
        bitPos++;
      }
      return code;
    }

    resetDict();

    while (bitPos + codeSize <= data.length * 8) {
      var code = readCode();
      if (code === clearCode) {
        resetDict();
        continue;
      }
      if (code === endCode) break;

      var entry;
      if (dict[code]) {
        entry = dict[code].slice();
      } else if (prev) {
        entry = prev.concat(prev[0]);
      } else {
        break;
      }

      for (var j = 0; j < entry.length; j++) output.push(entry[j]);

      if (prev) {
        dict.push(prev.concat(entry[0]));
        if (dict.length === (1 << codeSize) && codeSize < 12) codeSize++;
      }
      prev = entry;

      if (expectedSize && output.length >= expectedSize) break;
    }

    return output;
  }

  function deinterlace(indexes, width, height) {
    var out = new Array(indexes.length);
    var offsets = [0, 4, 2, 1];
    var steps = [8, 8, 4, 2];
    var src = 0;
    for (var pass = 0; pass < 4; pass++) {
      for (var y = offsets[pass]; y < height; y += steps[pass]) {
        for (var x = 0; x < width; x++) {
          out[y * width + x] = indexes[src++];
        }
      }
    }
    return out;
  }

  function copyPatch(buffer, gifW, left, top, width, height) {
    var patch = new Uint8ClampedArray(width * height * 4);
    for (var y = 0; y < height; y++) {
      var srcStart = ((top + y) * gifW + left) * 4;
      var dstStart = y * width * 4;
      patch.set(buffer.slice(srcStart, srcStart + width * 4), dstStart);
    }
    return patch;
  }

  function restorePatch(buffer, gifW, left, top, width, height, patch) {
    if (!patch) return;
    for (var y = 0; y < height; y++) {
      var dstStart = ((top + y) * gifW + left) * 4;
      var srcStart = y * width * 4;
      buffer.set(patch.slice(srcStart, srcStart + width * 4), dstStart);
    }
  }

  function clearPatch(buffer, gifW, left, top, width, height) {
    for (var y = 0; y < height; y++) {
      var start = ((top + y) * gifW + left) * 4;
      buffer.fill(0, start, start + width * 4);
    }
  }

  function decodeGif(bytes) {
    var pos = 0;
    var header = String.fromCharCode.apply(null, bytes.slice(0, 6));
    if (header !== 'GIF87a' && header !== 'GIF89a') throw new Error('not a GIF');
    pos = 6;

    var gifW = readU16(bytes, pos); pos += 2;
    var gifH = readU16(bytes, pos); pos += 2;
    var packed = bytes[pos++];
    var hasGct = (packed & 0x80) !== 0;
    var gctSize = 1 << ((packed & 7) + 1);
    pos += 2; // background + pixel aspect

    var gct = null;
    if (hasGct) {
      var gctRead = readColorTable(bytes, pos, gctSize);
      gct = gctRead.table;
      pos = gctRead.pos;
    }

    var gce = { disposal: 0, delay: 80, transparentIndex: null };
    var canvas = new Uint8ClampedArray(gifW * gifH * 4);
    var frames = [];
    var previous = null;
    var previousRect = null;
    var previousDisposal = 0;
    var previousPatch = null;

    while (pos < bytes.length) {
      var block = bytes[pos++];
      if (block === 0x3b) break;

      if (block === 0x21) {
        var label = bytes[pos++];
        if (label === 0xf9) {
          pos++; // block size
          var gcePacked = bytes[pos++];
          var delay = readU16(bytes, pos) * 10; pos += 2;
          var transparentIndex = bytes[pos++];
          pos++; // terminator
          gce = {
            disposal: (gcePacked >> 2) & 7,
            delay: delay || 80,
            transparentIndex: (gcePacked & 1) ? transparentIndex : null
          };
        } else {
          var skipped = readSubBlocks(bytes, pos);
          pos = skipped.pos;
        }
        continue;
      }

      if (block !== 0x2c) continue;

      if (previous) {
        if (previousDisposal === 2) {
          clearPatch(canvas, gifW, previousRect.left, previousRect.top, previousRect.width, previousRect.height);
        } else if (previousDisposal === 3) {
          restorePatch(canvas, gifW, previousRect.left, previousRect.top, previousRect.width, previousRect.height, previousPatch);
        }
      }

      var left = readU16(bytes, pos); pos += 2;
      var top = readU16(bytes, pos); pos += 2;
      var width = readU16(bytes, pos); pos += 2;
      var height = readU16(bytes, pos); pos += 2;
      var imgPacked = bytes[pos++];
      var hasLct = (imgPacked & 0x80) !== 0;
      var interlaced = (imgPacked & 0x40) !== 0;
      var lctSize = 1 << ((imgPacked & 7) + 1);
      var colorTable = gct;
      if (hasLct) {
        var lctRead = readColorTable(bytes, pos, lctSize);
        colorTable = lctRead.table;
        pos = lctRead.pos;
      }

      var lzwMin = bytes[pos++];
      var sub = readSubBlocks(bytes, pos);
      pos = sub.pos;

      var indexes = lzwDecode(lzwMin, sub.data, width * height);
      if (interlaced) indexes = deinterlace(indexes, width, height);

      var restoreBefore = gce.disposal === 3 ? copyPatch(canvas, gifW, left, top, width, height) : null;
      for (var py = 0; py < height; py++) {
        for (var px = 0; px < width; px++) {
          var colorIndex = indexes[py * width + px];
          if (colorIndex == null || colorIndex === gce.transparentIndex) continue;
          var color = colorTable[colorIndex] || [255, 255, 255];
          var dst = ((top + py) * gifW + left + px) * 4;
          canvas[dst] = color[0];
          canvas[dst + 1] = color[1];
          canvas[dst + 2] = color[2];
          canvas[dst + 3] = 255;
        }
      }

      frames.push({
        data: new Uint8ClampedArray(canvas),
        delay: Math.max(32, gce.delay || 80)
      });

      previous = true;
      previousRect = { left: left, top: top, width: width, height: height };
      previousDisposal = gce.disposal;
      previousPatch = restoreBefore;
      gce = { disposal: 0, delay: 80, transparentIndex: null };
    }

    return { width: gifW, height: gifH, frames: frames };
  }

  function findInkBounds(decoded) {
    var bounds = { minX: decoded.width, minY: decoded.height, maxX: 0, maxY: 0 };
    decoded.frames.forEach(function (frame) {
      var d = frame.data;
      for (var y = 0; y < decoded.height; y++) {
        for (var x = 0; x < decoded.width; x++) {
          var i = (y * decoded.width + x) * 4;
          var a = d[i + 3];
          var lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          if (a > 30 && lum < 215) {
            if (x < bounds.minX) bounds.minX = x;
            if (x > bounds.maxX) bounds.maxX = x;
            if (y < bounds.minY) bounds.minY = y;
            if (y > bounds.maxY) bounds.maxY = y;
          }
        }
      }
    });
    if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
      return { minX: 0, minY: 0, maxX: decoded.width - 1, maxY: decoded.height - 1 };
    }
    return bounds;
  }

  function frameToPoints(decoded, frame, bounds, cols, rows, options) {
    var THREE = window.THREE;
    var points = [];
    options = options || {};
    var chars = options.chars && options.chars.length ? options.chars : ['.', ':', '+', '*', '#', '@'];
    var threshold = Number.isFinite(options.threshold) ? options.threshold : 220;
    var densityThreshold = Number.isFinite(options.densityThreshold) ? options.densityThreshold : 0.12;
    var bw = Math.max(1, bounds.maxX - bounds.minX + 1);
    var bh = Math.max(1, bounds.maxY - bounds.minY + 1);
    var charAspect = 1.85;
    var targetRows = Math.min(rows - 7, Math.round(cols * (bh / bw) / charAspect));
    var targetCols = Math.min(cols - 8, Math.round(targetRows * (bw / bh) * charAspect));
    var startCol = Math.floor((cols - targetCols) / 2);
    var startRow = Math.floor((rows - targetRows) / 2) + 1;
    var sx = bw / targetCols;
    var sy = bh / targetRows;
    var d = frame.data;

    for (var gy = 0; gy < targetRows; gy++) {
      for (var gx = 0; gx < targetCols; gx++) {
        var x0 = Math.floor(bounds.minX + gx * sx);
        var y0 = Math.floor(bounds.minY + gy * sy);
        var x1 = Math.min(bounds.maxX, Math.floor(bounds.minX + (gx + 1) * sx));
        var y1 = Math.min(bounds.maxY, Math.floor(bounds.minY + (gy + 1) * sy));
        var ink = 0;
        var darkness = 0;
        var samples = 0;

        for (var y = y0; y <= y1; y++) {
          for (var x = x0; x <= x1; x++) {
            var i = (y * decoded.width + x) * 4;
            var a = d[i + 3] / 255;
            var lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
            if (a > 0.1 && lum < threshold) {
              ink += 1;
              darkness += (1 - lum / 255) * a;
            }
            samples += 1;
          }
        }

        var density = samples ? ink / samples : 0;
        if (density < densityThreshold) continue;
        var value = Math.min(1, darkness / Math.max(1, ink) + density * 0.45);
        var ch = chars[Math.min(chars.length - 1, Math.floor(value * chars.length))];
        points.push({
          p: new THREE.Vector3(startCol + gx - cols / 2, rows / 2 - (startRow + gy), value * 0.25),
          ch: ch
        });
      }
    }
    return points;
  }

  function renderAsciiPoints(pre, camera, cols, rows, points) {
    var buffer = new Array(cols * rows).fill(' ');
    var depth = new Float32Array(cols * rows);
    for (var i = 0; i < depth.length; i++) depth[i] = -Infinity;

    points.forEach(function (item) {
      var v = item.p.clone();
      v.project(camera);
      var col = Math.round((v.x * 0.5 + 0.5) * (cols - 1));
      var row = Math.round((-v.y * 0.5 + 0.5) * (rows - 1));
      if (col < 0 || col >= cols || row < 0 || row >= rows) return;
      var idx = row * cols + col;
      if (v.z > depth[idx]) {
        depth[idx] = v.z;
        buffer[idx] = item.ch;
      }
    });

    var lines = [];
    for (var r = 0; r < rows; r++) {
      lines.push(buffer.slice(r * cols, (r + 1) * cols).join('').replace(/\s+$/, ''));
    }
    pre.textContent = lines.join('\n');
  }

  function renderFallback(pre, camera, cols, rows, time) {
    var points = [];
    var frame = Math.floor(time / 80) % 8;
    var body = '       @@@@####*******************++++\n'
      + '    @@@@######*********************++++++\n'
      + '  @@@#######*************************+++++++\n'
      + '    #######***********************+++++++\n'
      + '      #####********************+++++\n'
      + '       //    \\\\      //    \\\\\n';
    body.split('\n').forEach(function (line, y) {
      for (var x = 0; x < line.length; x++) {
        var ch = line[x];
        if (ch !== ' ') points.push({ p: new window.THREE.Vector3(x - 28, 8 - y, 0), ch: ch });
      }
    });
    var phase = frame % 4;
    var legs = phase === 0 ? [[12, 3, 8], [18, 3, 10], [36, 3, 39], [42, 3, 38]]
      : phase === 1 ? [[12, 3, 16], [18, 3, 13], [36, 3, 32], [42, 3, 47]]
      : phase === 2 ? [[12, 3, 16], [18, 3, 22], [36, 3, 29], [42, 3, 36]]
      : [[12, 3, 6], [18, 3, 20], [36, 3, 42], [42, 3, 34]];
    legs.forEach(function (leg) {
      var x0 = leg[0] - 28;
      var x1 = leg[2] - 28;
      for (var i = 0; i < 7; i++) {
        var t = i / 6;
        points.push({ p: new window.THREE.Vector3(x0 + (x1 - x0) * t, 2 - i, 0), ch: '/' });
      }
    });
    renderAsciiPoints(pre, camera, cols, rows, points);
  }

  function initGifAscii(el) {
    if (el.__gifAsciiInit) return;
    el.__gifAsciiInit = true;
    ensureStyles();

    var cols = parseInt(el.getAttribute('data-cols') || '150', 10);
    var rows = parseInt(el.getAttribute('data-rows') || '52', 10);
    var threshold = parseFloat(el.getAttribute('data-threshold') || '220');
    var densityThreshold = parseFloat(el.getAttribute('data-density-threshold') || '0.12');
    var chars = (el.getAttribute('data-chars') || '.:+*#@').split('');
    var title = el.getAttribute('data-title') || 'three.ascii.gif :: decoded GIF frames';
    var meta = el.getAttribute('data-meta') || 'threshold=ink frame-playback=gif-delay';
    var label = el.getAttribute('data-label') || 'GIF';
    var shell = document.createElement('div');
    shell.className = 'gif-ascii-shell';
    shell.innerHTML = [
      '<div class="gif-ascii-top"><span></span><span></span></div>',
      '<pre class="gif-ascii-pre" aria-label="animated gif ascii filter"></pre>',
      '<div class="gif-ascii-status"></div>',
      '<div class="gif-ascii-loading"></div>'
    ].join('');
    shell.querySelector('.gif-ascii-top span:first-child').textContent = title;
    shell.querySelector('.gif-ascii-top span:last-child').textContent = meta;
    shell.querySelector('.gif-ascii-status').textContent = 'source: ' + label + ' -> GIF frame decoder -> black/white threshold -> THREE.Vector3 ASCII projection';
    shell.querySelector('.gif-ascii-loading').textContent = 'decoding ' + label + '...';
    el.replaceChildren(shell);

    var pre = shell.querySelector('.gif-ascii-pre');
    var loading = shell.querySelector('.gif-ascii-loading');
    var camera = new window.THREE.OrthographicCamera(-cols / 2, cols / 2, rows / 2, -rows / 2, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    var state = {
      decoded: null,
      bounds: null,
      frameIndex: 0,
      frameStart: performance.now(),
      failed: false
    };

    var source = el.getAttribute('data-src');
    if (source) {
      fetch(source)
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.arrayBuffer();
        })
        .then(function (buffer) {
          var decoded = decodeGif(new Uint8Array(buffer));
          if (!decoded.frames.length) throw new Error('no GIF frames');
          state.decoded = decoded;
          state.bounds = findInkBounds(decoded);
          if (loading) loading.remove();
        })
        .catch(function (err) {
          state.failed = true;
          if (loading) loading.textContent = 'gif decode failed; using fallback rig: ' + err.message;
        });
    } else {
      state.failed = true;
      if (loading) loading.textContent = 'missing data-src; using fallback rig';
    }

    function tick(now) {
      if (!document.body.contains(el)) return;
      if (state.decoded) {
        var frame = state.decoded.frames[state.frameIndex];
        if (now - state.frameStart >= frame.delay) {
          state.frameIndex = (state.frameIndex + 1) % state.decoded.frames.length;
          state.frameStart = now;
          frame = state.decoded.frames[state.frameIndex];
        }
        renderAsciiPoints(pre, camera, cols, rows, frameToPoints(state.decoded, frame, state.bounds, cols, rows, {
          threshold: threshold,
          densityThreshold: densityThreshold,
          chars: chars
        }));
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function boot() {
    loadThree(function () {
      document.querySelectorAll('[data-gif-ascii]').forEach(initGifAscii);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
