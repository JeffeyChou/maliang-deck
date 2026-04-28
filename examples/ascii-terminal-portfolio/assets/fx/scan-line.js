(function(){
  window.HPX = window.HPX || {};
  window.HPX['scan-line'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const green = U.accent(el, '#00ff41');

    // Scanline sweep state — one bright line scrolling top to bottom
    const SWEEP_DURATION = 4; // seconds per full pass
    let lw = k.w, lh = k.h;

    const stop = U.loop((t) => {
      if (k.w !== lw || k.h !== lh) { lw = k.w; lh = k.h; }

      // Clear canvas each frame
      ctx.clearRect(0, 0, k.w, k.h);

      // ── Faint horizontal stripe overlay (every 3px) ──────────────────
      ctx.fillStyle = 'rgba(0,255,65,0.03)';
      for (let y = 0; y < k.h; y += 3) {
        ctx.fillRect(0, y, k.w, 1);
      }

      // ── Bright sweep line ─────────────────────────────────────────────
      const progress = (t % SWEEP_DURATION) / SWEEP_DURATION;
      const sweepY = progress * k.h;

      // Soft glow gradient above the bright line
      const grad = ctx.createLinearGradient(0, sweepY - 40, 0, sweepY + 6);
      grad.addColorStop(0, 'rgba(0,255,65,0)');
      grad.addColorStop(0.6, 'rgba(0,255,65,0.06)');
      grad.addColorStop(1, 'rgba(0,255,65,0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, Math.max(0, sweepY - 40), k.w, 46);

      // The bright line itself
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = green;
      ctx.fillRect(0, sweepY, k.w, 2);

      // Hard leading edge highlight
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, sweepY, k.w, 1);

      ctx.globalAlpha = 1;
    });

    return { stop(){ stop(); k.destroy(); } };
  };
})();
