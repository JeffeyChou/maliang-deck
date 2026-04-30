(function(){
  window.HPX = window.HPX || {};
  window.HPX['bokeh-float'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;

    /* Bokeh palette: lavender, rose, gold, soft blue, frost */
    const PALETTE = [
      [196,181,253], /* lavender */
      [249,168,212], /* rose     */
      [251,191, 36], /* gold     */
      [147,197,253], /* soft blue*/
      [241,245,249]  /* frost    */
    ];

    /* 25 bokeh circles */
    const circles = Array.from({length: 25}, (_, i) => {
      const r = U.rand(20, 80);
      /* Larger circles drift slower — slight parallax */
      const speed = U.rand(0.10, 0.30) * (1 - (r - 20) / 100 * 0.55);
      const col = PALETTE[i % PALETTE.length];
      return {
        x:  U.rand(0, 1),
        y:  U.rand(0, 1),
        vx: (Math.random() < 0.5 ? 1 : -1) * speed,
        vy: (Math.random() < 0.5 ? 1 : -1) * speed * U.rand(0.6, 1.0),
        r,
        col,
        alpha: U.rand(0.10, 0.22)
      };
    });

    const stop = U.loop((_t) => {
      ctx.clearRect(0, 0, k.w, k.h);

      for (const c of circles) {
        /* Move */
        c.x += c.vx * 0.0012;
        c.y += c.vy * 0.0012;

        /* Soft bounce off edges (allow partial overlap for bleed) */
        if (c.x < -0.05 || c.x > 1.05) c.vx *= -1;
        if (c.y < -0.05 || c.y > 1.05) c.vy *= -1;

        const px = c.x * k.w;
        const py = c.y * k.h;
        const [R,G,B] = c.col;

        /* Radial gradient: colored center → transparent edge */
        const grad = ctx.createRadialGradient(px, py, 0, px, py, c.r);
        grad.addColorStop(0,   `rgba(${R},${G},${B},${c.alpha})`);
        grad.addColorStop(0.45,`rgba(${R},${G},${B},${c.alpha * 0.55})`);
        grad.addColorStop(1,   `rgba(${R},${G},${B},0)`);

        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(px, py, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    return { stop(){ stop(); k.destroy(); } };
  };
})();
