(function(){
  window.HPX = window.HPX || {};
  window.HPX['aurora-wave'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;

    /* Aurora palette: lavender, rose, soft blue, gold */
    const COLORS = ['#c4b5fd','#f9a8d4','#93c5fd','#fbbf24'];

    /* 4 horizontal sinusoidal bands */
    const bands = [
      { baseY: 0.18, amplitude: 0.08, speed: 0.28, frequency: 0.55, color: COLORS[0], alpha: 0.13 },
      { baseY: 0.38, amplitude: 0.10, speed: 0.20, frequency: 0.42, color: COLORS[1], alpha: 0.11 },
      { baseY: 0.58, amplitude: 0.09, speed: 0.34, frequency: 0.60, color: COLORS[2], alpha: 0.10 },
      { baseY: 0.76, amplitude: 0.07, speed: 0.16, frequency: 0.35, color: COLORS[3], alpha: 0.09 }
    ];

    const hex2rgb = (h) => {
      const m = h.replace('#','').match(/.{2}/g);
      if (!m) return [124,92,255];
      return m.map(x => parseInt(x,16));
    };

    const stop = U.loop((t) => {
      ctx.clearRect(0, 0, k.w, k.h);

      for (const band of bands) {
        const [R,G,B] = hex2rgb(band.color);
        const pts = 9; /* 9 control-point columns */

        /* Build Y values for each column */
        const ys = [];
        for (let i = 0; i <= pts; i++) {
          const xn = i / pts;
          const y = (band.baseY + Math.sin(t * band.speed + xn * Math.PI * 2 * band.frequency) * band.amplitude) * k.h;
          ys.push(y);
        }

        /* Upper edge path (sinusoidal) */
        const bandHeight = band.amplitude * k.h * 2.2;

        /* Horizontal gradient for color shimmer */
        const grad = ctx.createLinearGradient(0, 0, k.w, 0);
        grad.addColorStop(0,   `rgba(${R},${G},${B},0)`);
        grad.addColorStop(0.2, `rgba(${R},${G},${B},${band.alpha * 1.4})`);
        grad.addColorStop(0.5, `rgba(${R},${G},${B},${band.alpha})`);
        grad.addColorStop(0.8, `rgba(${R},${G},${B},${band.alpha * 1.3})`);
        grad.addColorStop(1,   `rgba(${R},${G},${B},0)`);

        ctx.beginPath();
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;

        /* Move to bottom-left corner then trace sinusoidal top edge */
        ctx.moveTo(0, k.h);
        ctx.lineTo(0, ys[0]);

        for (let i = 0; i < pts; i++) {
          const x1 = (i / pts) * k.w;
          const x2 = ((i + 1) / pts) * k.w;
          const xMid = (x1 + x2) / 2;
          ctx.bezierCurveTo(xMid, ys[i], xMid, ys[i+1], x2, ys[i+1]);
        }

        /* Close at bottom-right then bottom */
        ctx.lineTo(k.w, k.h);
        ctx.closePath();
        ctx.fill();

        /* Second pass: brighter narrow ribbon at the crest */
        ctx.beginPath();
        ctx.globalAlpha = band.alpha * 0.6;

        const ribbonGrad = ctx.createLinearGradient(0, 0, k.w, 0);
        ribbonGrad.addColorStop(0,   `rgba(${R},${G},${B},0)`);
        ribbonGrad.addColorStop(0.35, `rgba(255,255,255,0.55)`);
        ribbonGrad.addColorStop(0.65, `rgba(${R},${G},${B},0.80)`);
        ribbonGrad.addColorStop(1,   `rgba(${R},${G},${B},0)`);
        ctx.fillStyle = ribbonGrad;

        ctx.moveTo(0, ys[0]);
        for (let i = 0; i < pts; i++) {
          const x1 = (i / pts) * k.w;
          const x2 = ((i + 1) / pts) * k.w;
          const xMid = (x1 + x2) / 2;
          ctx.bezierCurveTo(xMid, ys[i], xMid, ys[i+1], x2, ys[i+1]);
        }
        /* Trace back slightly below for thin ribbon */
        for (let i = pts; i >= 0; i--) {
          const x = (i / pts) * k.w;
          const y = ys[i] + bandHeight * 0.08;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    return { stop(){ stop(); k.destroy(); } };
  };
})();
