/**
 * ASCII art 3D surface renderer.
 * Isometric projection with z-buffer for f(x,y) height-field visualization.
 * Uses a safe recursive descent parser — no `new Function` / `eval`.
 */

// ─── Safe Math Expression Evaluator ──────────────────────────────────────────

const MATH_FUNCS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  atan2: Math.atan2,
  sqrt: Math.sqrt, abs: Math.abs, log: Math.log,
  exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
  round: Math.round, sign: Math.sign, pow: Math.pow,
};

const MATH_CONSTS: Record<string, number> = {
  pi: Math.PI, PI: Math.PI, e: Math.E, E: Math.E,
};

interface Token {
  type: 'num' | 'id' | 'op' | 'lparen' | 'rparen' | 'comma' | 'eof';
  value: string;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d/.test(ch) || (ch === '.' && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let num = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) { num += expr[i++]; }
      tokens.push({ type: 'num', value: num });
    } else if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[a-zA-Z_0-9]/.test(expr[i])) { id += expr[i++]; }
      tokens.push({ type: 'id', value: id });
    } else if ('+-*/^%'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
    } else if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i++;
    } else if (ch === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      i++;
    } else if (ch === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
    } else {
      // Unknown character — skip
      i++;
    }
  }
  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private vars: Record<string, number> = {};

  constructor(tokens: Token[], vars: Record<string, number>) {
    this.tokens = tokens;
    this.vars = vars;
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }

  parse(): number {
    const result = this.expr();
    return typeof result === 'number' && isFinite(result) ? result : 0;
  }

  // expr = term (('+' | '-') term)*
  private expr(): number {
    let left = this.term();
    while (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value;
      const right = this.term();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  // term = power (('*' | '/' | '%') power)*
  private term(): number {
    let left = this.power();
    while (this.peek().type === 'op' && ('*/%'.includes(this.peek().value))) {
      const op = this.advance().value;
      const right = this.power();
      if (op === '*') left *= right;
      else if (op === '/') left = right !== 0 ? left / right : 0;
      else left = right !== 0 ? left % right : 0;
    }
    return left;
  }

  // power = unary ('^' power)?
  private power(): number {
    const base = this.unary();
    if (this.peek().type === 'op' && this.peek().value === '^') {
      this.advance();
      const exp = this.power(); // right-associative
      return Math.pow(base, exp);
    }
    return base;
  }

  // unary = ('-' | '+') unary | primary
  private unary(): number {
    if (this.peek().type === 'op' && this.peek().value === '-') {
      this.advance();
      return -this.unary();
    }
    if (this.peek().type === 'op' && this.peek().value === '+') {
      this.advance();
      return this.unary();
    }
    return this.primary();
  }

  // primary = number | variable | constant | function_call | '(' expr ')'
  // Also handles implicit multiplication: 2x, 2sin(x), etc.
  private primary(): number {
    const tok = this.peek();

    if (tok.type === 'num') {
      this.advance();
      let val = parseFloat(tok.value);
      // Implicit multiplication: number followed by id or lparen
      if (this.peek().type === 'id' || this.peek().type === 'lparen') {
        val *= this.primary();
      }
      return val;
    }

    if (tok.type === 'id') {
      this.advance();
      const name = tok.value;

      // Function call
      if (this.peek().type === 'lparen' && name in MATH_FUNCS) {
        this.advance(); // consume '('
        const args: number[] = [this.expr()];
        while (this.peek().type === 'comma') {
          this.advance();
          args.push(this.expr());
        }
        if (this.peek().type === 'rparen') this.advance();
        return MATH_FUNCS[name](...args);
      }

      // Variable
      if (name in this.vars) return this.vars[name];
      // Constant
      if (name in MATH_CONSTS) return MATH_CONSTS[name];
      // Unknown identifier — treat as 0
      return 0;
    }

    if (tok.type === 'lparen') {
      this.advance();
      const val = this.expr();
      if (this.peek().type === 'rparen') this.advance();
      return val;
    }

    // EOF or unexpected — return 0
    this.advance();
    return 0;
  }
}

function safeEval(expr: string, vars: Record<string, number>): number {
  try {
    const tokens = tokenize(expr);
    const parser = new Parser(tokens, vars);
    return parser.parse();
  } catch {
    return 0;
  }
}

// ─── ASCII 3D Renderer ──────────────────────────────────────────────────────

export interface Ascii3dOptions {
  cols?: number;
  rows?: number;
  chars?: string;
}

/**
 * Render an f(x,y) surface as ASCII art using isometric projection.
 */
export function renderAscii3d(
  expr: string,
  xRange: [number, number],
  yRange: [number, number],
  opts?: Ascii3dOptions,
): string {
  const cols = opts?.cols ?? 72;
  const rows = opts?.rows ?? 24;
  const chars = opts?.chars ?? ' .:-=+*#%@';

  const sampleRes = Math.max(cols, 50);

  // Sample the surface
  const samples: { ix: number; iy: number; z: number }[] = [];
  let zMin = Infinity;
  let zMax = -Infinity;

  for (let iy = 0; iy < sampleRes; iy++) {
    for (let ix = 0; ix < sampleRes; ix++) {
      const x = xRange[0] + (xRange[1] - xRange[0]) * ix / (sampleRes - 1);
      const y = yRange[0] + (yRange[1] - yRange[0]) * iy / (sampleRes - 1);
      let z = safeEval(expr, { x, y });
      if (!isFinite(z)) z = 0;
      samples.push({ ix, iy, z });
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
    }
  }

  const zRange = zMax - zMin || 1;

  // Aspect ratio correction for terminal (chars ~2x taller than wide)
  const aspectX = 0.6;
  const aspectY = 0.3;
  const heightScale = 8;

  // Z-buffer with original z as depth
  const screenBuf: string[] = new Array(rows * cols).fill(' ');
  const depthBuf = new Float32Array(rows * cols).fill(-Infinity);

  for (const s of samples) {
    const normZ = (s.z - zMin) / zRange;

    // Isometric projection
    const sx = (s.ix - s.iy) * aspectX + cols / 2;
    const sy = (s.ix + s.iy) * aspectY - normZ * heightScale + rows / 2;
    const col = Math.round(sx);
    const row = Math.round(sy);

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const idx = row * cols + col;
      // Z-buffer: keep front-most (highest z) point
      if (s.z > depthBuf[idx]) {
        depthBuf[idx] = s.z;
        const charIdx = Math.floor(normZ * (chars.length - 1));
        screenBuf[idx] = chars[Math.max(0, Math.min(chars.length - 1, charIdx))];
      }
    }
  }

  // Build output
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      line += screenBuf[r * cols + c];
    }
    lines.push(line.replace(/\s+$/, ''));
  }

  return lines.join('\n');
}
