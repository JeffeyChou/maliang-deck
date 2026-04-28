(function(){
  window.HPX = window.HPX || {};
  window.HPX['kinetic-type'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);

    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&!?@#%';

    const letters = Array.from({length: 42}, () => ({
      ch:  CHARS[Math.floor(Math.random() * CHARS.length)],
      x:   U.rand(0, 1),
      y:   U.rand(0, 1),
      vx:  U.rand(-0.28, 0.28) * (Math.random() < 0.5 ? 1 : -1),
      vy:  U.rand(-0.28, 0.28) * (Math.random() < 0.5 ? 1 : -1),
      rot: U.rand(0, Math.PI * 2),
      rotSpeed: U.rand(-0.008, 0.008),
      fontSize: U.rand(20, 80)|0,
      opacity:  U.rand(0.03, 0.12),
      color: pal[Math.floor(Math.random() * pal.length)]
    }));

    // Ensure velocities are at least minimally non-zero
    letters.forEach(l => {
      if (Math.abs(l.vx) < 0.05) l.vx = 0.08 * Math.sign(l.vx || 1);
      if (Math.abs(l.vy) < 0.05) l.vy = 0.06 * Math.sign(l.vy || 1);
    });

    const hex2rgb = (h) => {
      const m = (h||'').replace('#','').match(/.{2}/g);
      if (!m || m.length < 3) return [245, 240, 235];
      return m.slice(0,3).map(x => parseInt(x, 16));
    };

    const stop = U.loop(() => {
      // Semi-transparent clear for trail effect
      ctx.fillStyle = 'rgba(10,10,10,0.18)';
      ctx.fillRect(0, 0, k.w, k.h);

      for (const l of letters) {
        // Update position (velocity is fraction of canvas per second * dt)
        l.x += l.vx * 0.006;
        l.y += l.vy * 0.006;
        l.rot += l.rotSpeed;

        // Bounce off edges
        if (l.x < 0)  { l.x = 0;  l.vx = Math.abs(l.vx); }
        if (l.x > 1)  { l.x = 1;  l.vx = -Math.abs(l.vx); }
        if (l.y < 0)  { l.y = 0;  l.vy = Math.abs(l.vy); }
        if (l.y > 1)  { l.y = 1;  l.vy = -Math.abs(l.vy); }

        const px = l.x * k.w;
        const py = l.y * k.h;
        const [R, G, B] = hex2rgb(l.color);

        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.font = `bold ${l.fontSize}px Georgia, serif`;
        ctx.fillStyle = `rgb(${R},${G},${B})`;
        ctx.translate(px, py);
        ctx.rotate(l.rot);
        ctx.fillText(l.ch, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    });

    return { stop(){ stop(); k.destroy(); } };
  };
})();
