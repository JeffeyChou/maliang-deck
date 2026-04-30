/* Maliang Deck Interpolation Utilities
 * Shared math/easing/color/path interpolation for text-anim and math-viz extensions.
 * Zero dependencies. Used by continuous timeline tracks.
 */
(function () {
  'use strict';

  // ─── Basic Math ─────���────────────────────────���──────────────────────────────

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
  function mapRange(v, inMin, inMax, outMin, outMax) {
    return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
  }

  // ─── Easing Functions ────────────────────��──────────────────────────────────
  // All take t in [0,1] and return value in [0,1] (or beyond for spring/elastic)

  var PI = Math.PI;
  var sin = Math.sin;
  var cos = Math.cos;
  var pow = Math.pow;
  var sqrt = Math.sqrt;
  var abs = Math.abs;

  var easings = {
    linear: function (t) { return t; },
    easeInQuad: function (t) { return t * t; },
    easeOutQuad: function (t) { return 1 - (1 - t) * (1 - t); },
    easeInOutQuad: function (t) { return t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2; },
    easeInCubic: function (t) { return t * t * t; },
    easeOutCubic: function (t) { return 1 - pow(1 - t, 3); },
    easeInOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2; },
    easeInQuart: function (t) { return t * t * t * t; },
    easeOutQuart: function (t) { return 1 - pow(1 - t, 4); },
    easeInOutQuart: function (t) { return t < 0.5 ? 8 * t * t * t * t : 1 - pow(-2 * t + 2, 4) / 2; },
    easeInExpo: function (t) { return t === 0 ? 0 : pow(2, 10 * t - 10); },
    easeOutExpo: function (t) { return t === 1 ? 1 : 1 - pow(2, -10 * t); },
    easeInOutExpo: function (t) {
      if (t === 0) return 0;
      if (t === 1) return 1;
      return t < 0.5 ? pow(2, 20 * t - 10) / 2 : (2 - pow(2, -20 * t + 10)) / 2;
    },
    easeInElastic: function (t) {
      if (t === 0 || t === 1) return t;
      return -pow(2, 10 * t - 10) * sin((t * 10 - 10.75) * (2 * PI / 3));
    },
    easeOutElastic: function (t) {
      if (t === 0 || t === 1) return t;
      return pow(2, -10 * t) * sin((t * 10 - 0.75) * (2 * PI / 3)) + 1;
    },
    easeInOutElastic: function (t) {
      if (t === 0 || t === 1) return t;
      return t < 0.5
        ? -(pow(2, 20 * t - 10) * sin((20 * t - 11.125) * (2 * PI / 4.5))) / 2
        : (pow(2, -20 * t + 10) * sin((20 * t - 11.125) * (2 * PI / 4.5))) / 2 + 1;
    },
    easeInBounce: function (t) { return 1 - easings.easeOutBounce(1 - t); },
    easeOutBounce: function (t) {
      var n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    easeInOutBounce: function (t) {
      return t < 0.5
        ? (1 - easings.easeOutBounce(1 - 2 * t)) / 2
        : (1 + easings.easeOutBounce(2 * t - 1)) / 2;
    },
  };

  /**
   * Spring physics easing.
   * @param {number} t - Progress [0,1]
   * @param {object} [opts] - { stiffness, damping, mass }
   */
  function spring(t, opts) {
    opts = opts || {};
    var stiffness = opts.stiffness || 100;
    var damping = opts.damping || 10;
    var mass = opts.mass || 1;
    var w0 = sqrt(stiffness / mass);
    var zeta = damping / (2 * sqrt(stiffness * mass));
    var wd = zeta < 1 ? w0 * sqrt(1 - zeta * zeta) : 0;
    var A = 1;

    if (zeta < 1) {
      // Underdamped
      return 1 - Math.exp(-zeta * w0 * t) * (A * cos(wd * t) + ((zeta * w0 * A) / wd) * sin(wd * t));
    } else {
      // Critically damped or overdamped
      return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
    }
  }

  /**
   * Get an easing function by name.
   * Supports: named easings, 'spring', 'steps(N)', CSS cubic-bezier(a,b,c,d).
   */
  function getEasing(name) {
    if (!name || name === 'ease') return easings.easeInOutCubic;
    if (name === 'linear') return easings.linear;
    if (name === 'ease-in') return easings.easeInCubic;
    if (name === 'ease-out') return easings.easeOutCubic;
    if (name === 'ease-in-out') return easings.easeInOutCubic;
    if (name === 'spring') return function (t) { return spring(t); };
    if (easings[name]) return easings[name];

    // steps(N)
    var stepsMatch = name.match(/^steps\((\d+)\)$/);
    if (stepsMatch) {
      var n = parseInt(stepsMatch[1], 10);
      return function (t) { return Math.floor(t * n) / n; };
    }

    // cubic-bezier(x1,y1,x2,y2)
    var bezierMatch = name.match(/^cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
    if (bezierMatch) {
      return cubicBezier(
        parseFloat(bezierMatch[1]), parseFloat(bezierMatch[2]),
        parseFloat(bezierMatch[3]), parseFloat(bezierMatch[4])
      );
    }

    return easings.easeInOutCubic; // fallback
  }

  /**
   * Attempt to create a cubic-bezier easing function.
   * Uses Newton-Raphson iteration to solve for t given x.
   */
  function cubicBezier(x1, y1, x2, y2) {
    // Attempt up to 8 iterations
    return function (t) {
      if (t === 0 || t === 1) return t;
      var ax = 3 * x1 - 3 * x2 + 1;
      var bx = 3 * x2 - 6 * x1;
      var cx = 3 * x1;
      var ay = 3 * y1 - 3 * y2 + 1;
      var by = 3 * y2 - 6 * y1;
      var cy = 3 * y1;

      // Solve for parameter s where bezierX(s) = t
      var s = t;
      for (var i = 0; i < 8; i++) {
        var xs = ((ax * s + bx) * s + cx) * s - t;
        var dxs = (3 * ax * s + 2 * bx) * s + cx;
        if (abs(dxs) < 1e-7) break;
        s -= xs / dxs;
      }
      s = clamp(s, 0, 1);
      return ((ay * s + by) * s + cy) * s;
    };
  }

  // ─── Color Interpolation ────────────────────────────────────────────────────

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      var hex = clamp(Math.round(v), 0, 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Interpolate between two hex colors.
   * @param {string} colorA - Start color (#rgb or #rrggbb)
   * @param {string} colorB - End color
   * @param {number} t - Progress [0,1]
   * @returns {string} Interpolated hex color
   */
  function lerpColor(colorA, colorB, t) {
    var a = hexToRgb(colorA);
    var b = hexToRgb(colorB);
    return rgbToHex(
      lerp(a.r, b.r, t),
      lerp(a.g, b.g, t),
      lerp(a.b, b.b, t)
    );
  }

  // ─── Transform Decomposition ────────────���───────────────────────────────────

  /**
   * Decompose a 2D transform into { x, y, scaleX, scaleY, rotation }.
   * @param {DOMMatrix|CSSStyleDeclaration} source
   * @returns {object}
   */
  function decomposeTransform(matrix) {
    if (!(matrix instanceof DOMMatrix)) {
      matrix = new DOMMatrix(matrix || 'none');
    }
    var a = matrix.a, b = matrix.b, c = matrix.c, d = matrix.d, e = matrix.e, f = matrix.f;
    var scaleX = sqrt(a * a + b * b);
    var scaleY = sqrt(c * c + d * d);
    var rotation = Math.atan2(b, a) * (180 / PI);
    return { x: e, y: f, scaleX: scaleX, scaleY: scaleY, rotation: rotation };
  }

  /**
   * Interpolate between two decomposed transforms.
   */
  function lerpTransform(from, to, t) {
    return {
      x: lerp(from.x, to.x, t),
      y: lerp(from.y, to.y, t),
      scaleX: lerp(from.scaleX, to.scaleX, t),
      scaleY: lerp(from.scaleY, to.scaleY, t),
      rotation: lerp(from.rotation, to.rotation, t),
    };
  }

  /**
   * Compose a decomposed transform back into a CSS transform string.
   */
  function composeTransform(decomposed) {
    var parts = [];
    if (decomposed.x !== 0 || decomposed.y !== 0) {
      parts.push('translate(' + decomposed.x + 'px, ' + decomposed.y + 'px)');
    }
    if (decomposed.rotation !== 0) {
      parts.push('rotate(' + decomposed.rotation + 'deg)');
    }
    if (decomposed.scaleX !== 1 || decomposed.scaleY !== 1) {
      parts.push('scale(' + decomposed.scaleX + ', ' + decomposed.scaleY + ')');
    }
    return parts.join(' ') || 'none';
  }

  // ─── SVG Path Interpolation ─────��───────────────────────────────────────────

  /**
   * Parse an SVG path 'd' string into an array of commands.
   * Each command: { type: 'M'|'L'|'C'|'Z', values: number[] }
   * Normalizes relative commands to absolute.
   */
  function parsePath(d) {
    var commands = [];
    // Simple path parser — handles M, L, C, Q, Z and lowercase variants
    var re = /([MLCQZmlcqz])\s*([-\d.,e\s]*)/g;
    var match;
    var cx = 0, cy = 0;

    while ((match = re.exec(d)) !== null) {
      var type = match[1];
      var values = match[2].trim()
        ? match[2].trim().split(/[\s,]+/).map(Number)
        : [];
      var upper = type.toUpperCase();

      if (upper === 'Z') {
        commands.push({ type: 'Z', values: [] });
        continue;
      }

      // Convert relative to absolute
      if (type === type.toLowerCase() && values.length >= 2) {
        for (var i = 0; i < values.length; i += 2) {
          values[i] += cx;
          if (i + 1 < values.length) values[i + 1] += cy;
        }
      }

      commands.push({ type: upper, values: values });

      // Update current position
      if (values.length >= 2) {
        cx = values[values.length - 2];
        cy = values[values.length - 1];
      }
    }
    return commands;
  }

  /**
   * Interpolate between two parsed paths of the same structure.
   * Paths must have the same number and types of commands.
   */
  function lerpPath(pathA, pathB, t) {
    if (pathA.length !== pathB.length) return pathB; // Can't interpolate different structures

    return pathA.map(function (cmdA, i) {
      var cmdB = pathB[i];
      if (cmdA.type !== cmdB.type) return cmdB;
      if (cmdA.type === 'Z') return { type: 'Z', values: [] };

      var values = cmdA.values.map(function (v, j) {
        return lerp(v, cmdB.values[j] || v, t);
      });
      return { type: cmdA.type, values: values };
    });
  }

  /**
   * Serialize parsed path commands back to a 'd' string.
   */
  function serializePath(commands) {
    return commands.map(function (cmd) {
      if (cmd.type === 'Z') return 'Z';
      return cmd.type + ' ' + cmd.values.join(' ');
    }).join(' ');
  }

  /**
   * Interpolate between two SVG path 'd' strings.
   * @param {string} dA - Start path
   * @param {string} dB - End path
   * @param {number} t - Progress [0,1]
   * @returns {string} Interpolated path 'd' string
   */
  function lerpPathString(dA, dB, t) {
    var a = parsePath(dA);
    var b = parsePath(dB);
    return serializePath(lerpPath(a, b, t));
  }

  // ─── Public API ───────────────────���─────────────────────────��───────────────

  window.MaliangInterpolate = {
    // Basic math
    lerp: lerp,
    clamp: clamp,
    mapRange: mapRange,

    // Easing
    easings: easings,
    spring: spring,
    getEasing: getEasing,

    // Color
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    lerpColor: lerpColor,

    // Transform
    decomposeTransform: decomposeTransform,
    lerpTransform: lerpTransform,
    composeTransform: composeTransform,

    // SVG Path
    parsePath: parsePath,
    lerpPath: lerpPath,
    serializePath: serializePath,
    lerpPathString: lerpPathString,
  };
})();
