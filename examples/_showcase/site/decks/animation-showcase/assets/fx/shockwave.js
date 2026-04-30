/* html-ppt fx :: shockwave */
(function(){
  window.HPX = window.HPX || {};
  window.HPX['shockwave'] = function(el){
    const U = window.HPX._u;
    const cvs = U.canvas(el);
    const ctx = cvs.ctx;
    const palette = U.palette(el);
    const rings = Array.from({ length: 9 }, (_, i) => ({
      t: i * .42,
      x: U.rand(.22, .78),
      y: U.rand(.20, .80),
      hue: palette[i % palette.length],
      amp: U.rand(.55, 1)
    }));

    const stop = U.loop((time) => {
      ctx.clearRect(0, 0, cvs.w, cvs.h);
      ctx.globalCompositeOperation = 'lighter';
      rings.forEach((ring) => {
        const phase = (time * .48 + ring.t) % 3.2;
        const r = phase * Math.max(cvs.w, cvs.h) * .32;
        const alpha = Math.max(0, 1 - phase / 3.2) * .30 * ring.amp;
        ctx.beginPath();
        ctx.arc(ring.x * cvs.w, ring.y * cvs.h, r, 0, Math.PI * 2);
        ctx.strokeStyle = ring.hue;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1 + 7 * Math.max(0, 1 - phase / 3.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ring.x * cvs.w, ring.y * cvs.h, r * .58, 0, Math.PI * 2);
        ctx.globalAlpha = alpha * .35;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    });

    return { stop(){ stop(); cvs.destroy(); } };
  };
})();
