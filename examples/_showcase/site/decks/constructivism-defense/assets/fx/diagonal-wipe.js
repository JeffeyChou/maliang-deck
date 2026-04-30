(function(){
  window.HPX = window.HPX || {};
  window.HPX['diagonal-wipe'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;

    const ANGLE_RAD = Math.PI / 6;  // 30 degrees
    const PERIOD    = 5.0;           // seconds per sweep cycle
    const LINES     = 3;
    const OFFSETS   = [0, PERIOD / LINES, (PERIOD * 2) / LINES]; // stagger ~1.67s each

    const stop = U.loop((t) => {
      // Semi-transparent overlay to leave faint trail (don't fully clear)
      ctx.fillStyle = 'rgba(245, 240, 232, 0.18)';
      ctx.fillRect(0, 0, k.w, k.h);

      const tan = Math.tan(ANGLE_RAD);

      for (let i = 0; i < LINES; i++) {
        // Phase position 0..1 within the cycle, offset per line
        const phase = ((t - OFFSETS[i]) % PERIOD + PERIOD) % PERIOD / PERIOD;

        // x-center of the diagonal line sweeps from -k.w*0.1 to k.w*1.1
        const xCenter = k.w * (phase * 1.2 - 0.1);

        // The diagonal line spans full height at 30 degrees
        // At top (y=0): x = xCenter - (k.h/2) * tan
        // At bottom (y=k.h): x = xCenter + (k.h/2) * tan
        const xTop    = xCenter - (k.h / 2) * tan;
        const xBottom = xCenter + (k.h / 2) * tan;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xTop,    0);
        ctx.lineTo(xBottom, k.h);
        ctx.strokeStyle  = '#c1272d';
        ctx.lineWidth    = 3;
        ctx.globalAlpha  = 0.20;
        ctx.stroke();
        ctx.restore();
      }
    });

    return { stop(){ stop(); k.destroy(); } };
  };
})();
