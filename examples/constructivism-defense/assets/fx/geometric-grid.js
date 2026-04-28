(function(){
  window.HPX = window.HPX || {};
  window.HPX['geometric-grid'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;

    const COLS = 6, ROWS = 4;
    // Shape types: 0=triangle, 1=square, 2=circle
    const SHAPE_TYPES = [0, 1, 2];
    const RED   = '#c1272d';
    const BLACK = '#1a1a1a';
    const SIZE  = 40;

    // Build grid cells once; reseed on resize
    let cells = [];
    const seed = () => {
      cells = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          cells.push({
            type:  SHAPE_TYPES[Math.floor(Math.random() * 3)],
            color: (r * COLS + c) % 2 === 0 ? RED : BLACK,
            speed: U.rand(0.12, 0.38) * (Math.random() > 0.5 ? 1 : -1),
            angle: Math.random() * Math.PI * 2
          });
        }
      }
    };
    seed();

    let lw = k.w, lh = k.h;

    const drawTriangle = (ctx, s) => {
      const h = s * Math.sqrt(3) / 2;
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.667);
      ctx.lineTo( s / 2,  h * 0.333);
      ctx.lineTo(-s / 2,  h * 0.333);
      ctx.closePath();
      ctx.stroke();
    };

    const drawSquare = (ctx, s) => {
      const half = s / 2;
      ctx.beginPath();
      ctx.rect(-half, -half, s, s);
      ctx.stroke();
    };

    const drawCircle = (ctx, s) => {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.stroke();
    };

    const stop = U.loop((t) => {
      if (k.w !== lw || k.h !== lh) { seed(); lw = k.w; lh = k.h; }

      ctx.clearRect(0, 0, k.w, k.h);

      const cellW = k.w / COLS;
      const cellH = k.h / ROWS;

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const col  = i % COLS;
        const row  = Math.floor(i / COLS);

        const cx = cellW * col + cellW / 2;
        const cy = cellH * row + cellH / 2;

        cell.angle += cell.speed * 0.016; // approx per frame at 60fps; t-based

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(cell.angle + t * cell.speed);
        ctx.strokeStyle  = cell.color;
        ctx.lineWidth    = 1.5;
        ctx.globalAlpha  = 0.08;

        switch (cell.type) {
          case 0: drawTriangle(ctx, SIZE); break;
          case 1: drawSquare(ctx, SIZE);   break;
          case 2: drawCircle(ctx, SIZE);   break;
        }

        ctx.restore();
      }

      ctx.globalAlpha = 1;
    });

    return { stop(){ stop(); k.destroy(); } };
  };
})();
