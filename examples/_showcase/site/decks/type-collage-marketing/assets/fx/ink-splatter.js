(function(){
  window.HPX = window.HPX || {};
  window.HPX['ink-splatter'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;

    const accent = U.accent(el, '#e63946');

    const hex2rgb = (h) => {
      const m = (h||'').replace('#','').match(/.{2}/g);
      if (!m || m.length < 3) return [230, 57, 70];
      return m.slice(0,3).map(x => parseInt(x, 16));
    };

    const MAX_SPLATS = 4;

    const makeSplat = () => ({
      x:       U.rand(0.05, 0.95),
      y:       U.rand(0.05, 0.95),
      radius:  U.rand(4, 12),
      maxR:    U.rand(40, 120),
      growRate: U.rand(0.8, 1.8),
      opacity: U.rand(0.42, 0.62),
      decayRate: U.rand(0.004, 0.009),
      offsets: Array.from({length: 3}, () => ({
        dx: U.rand(-8, 8),
        dy: U.rand(-8, 8),
        rMult: U.rand(0.55, 0.90)
      }))
    });

    const splats = Array.from({length: MAX_SPLATS}, makeSplat);
    // Stagger initial phases so they don't all appear at once
    splats.forEach((s, i) => {
      s.radius = s.maxR * (i / MAX_SPLATS);
      s.opacity = Math.max(0, 0.55 - s.decayRate * s.radius * 8);
    });

    const [R, G, B] = hex2rgb(accent);

    const drawSplat = (s) => {
      if (s.opacity <= 0) return;
      const px = s.x * k.w;
      const py = s.y * k.h;

      // Main blob
      ctx.save();
      ctx.globalAlpha = s.opacity;
      ctx.fillStyle = `rgb(${R},${G},${B})`;
      ctx.beginPath();
      ctx.arc(px, py, s.radius, 0, Math.PI * 2);
      ctx.fill();

      // Organic overlapping blobs at slight offsets
      for (const o of s.offsets) {
        ctx.globalAlpha = s.opacity * 0.55;
        ctx.beginPath();
        ctx.arc(px + o.dx, py + o.dy, s.radius * o.rMult, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const stop = U.loop(() => {
      ctx.clearRect(0, 0, k.w, k.h);

      for (let i = 0; i < splats.length; i++) {
        const s = splats[i];

        // Grow radius toward max
        if (s.radius < s.maxR) {
          s.radius += s.growRate;
        }

        // Decay opacity
        s.opacity -= s.decayRate;

        // Respawn when fully faded
        if (s.opacity <= 0) {
          splats[i] = makeSplat();
        } else {
          drawSplat(s);
        }
      }
    });

    return { stop(){ stop(); k.destroy(); } };
  };
})();
