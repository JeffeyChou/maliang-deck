(function(){
  window.HPX = window.HPX || {};
  window.HPX['ascii-morph'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const color = U.text(el, '#00ff41');

    const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789@#$%&*+-=[]{}|<>/\\~^_';
    const CELL_W = 10;
    const CELL_H = 16;
    const FONT_SIZE = 14;
    const MUTATE_RATE = 0.10; // 10% of cells mutate per mutation frame
    const MUTATION_INTERVAL = 5; // frames between mutations

    let cols = 0, rows = 0, grid = [], frameCount = 0;
    let lw = k.w, lh = k.h;

    const randChar = () => CHARS[(Math.random() * CHARS.length) | 0];

    const init = () => {
      cols = Math.ceil(k.w / CELL_W);
      rows = Math.ceil(k.h / CELL_H);
      grid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => randChar())
      );
      lw = k.w;
      lh = k.h;
    };

    init();

    const mutate = () => {
      const total = cols * rows;
      const count = Math.ceil(total * MUTATE_RATE);
      for (let i = 0; i < count; i++) {
        const r = (Math.random() * rows) | 0;
        const c = (Math.random() * cols) | 0;
        grid[r][c] = randChar();
      }
    };

    const stop = U.loop(() => {
      if (k.w !== lw || k.h !== lh) { init(); }

      frameCount++;
      if (frameCount % MUTATION_INTERVAL === 0) {
        mutate();
      }

      ctx.clearRect(0, 0, k.w, k.h);
      ctx.font = FONT_SIZE + 'px "JetBrains Mono", "Fira Code", "Courier New", monospace';
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.06;

      for (let r = 0; r < rows; r++) {
        const y = r * CELL_H + CELL_H - 2; // baseline offset
        for (let c = 0; c < cols; c++) {
          ctx.fillText(grid[r][c], c * CELL_W, y);
        }
      }

      ctx.globalAlpha = 1;
    });

    return { stop(){ stop(); k.destroy(); } };
  };
})();
