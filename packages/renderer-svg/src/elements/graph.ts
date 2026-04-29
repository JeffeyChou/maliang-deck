import type { GraphElement } from '../../../schema/src/types.js';
import { animationDataAttrs, buildOpacityAttrs, buildTransform, escapeXml, jsonDataAttr, n } from '../utils.js';
import type { RenderResult } from './index.js';

type Point = { x: number; y: number };
type Point3 = { x: number; y: number; z: number };
type ProjectedPoint = Point3 & { px: number; py: number; depth: number };

function is3dGraph(el: GraphElement): boolean {
  return el.mode === '3d' || Boolean(el.surface || el.parametric || el.scatter3d || el.curves3d || el.vectorField);
}

function evalExpr(expr: string, x: number): number {
  const fn = new Function('x', 'sin', 'cos', 'tan', 'sqrt', 'pow', 'abs', 'log', 'exp', 'PI', `return (${expr});`);
  const value = fn(x, Math.sin, Math.cos, Math.tan, Math.sqrt, Math.pow, Math.abs, Math.log, Math.exp, Math.PI);
  return Number.isFinite(value) ? Number(value) : Number.NaN;
}

function compileExpr2(expr: string): (x: number, y: number) => number {
  const fn = new Function(
    'x', 'y',
    'sin', 'cos', 'tan', 'sqrt', 'pow', 'abs', 'log', 'exp', 'min', 'max', 'PI',
    `return (${expr});`,
  );
  return (x: number, y: number) => {
    const value = fn(x, y, Math.sin, Math.cos, Math.tan, Math.sqrt, Math.pow, Math.abs, Math.log, Math.exp, Math.min, Math.max, Math.PI);
    return Number.isFinite(value) ? Number(value) : Number.NaN;
  };
}

function scalePoint(point: Point, el: GraphElement): Point {
  const axes = el.axes ?? { x: [-10, 10] as [number, number], y: [-10, 10] as [number, number] };
  const px = el.x + ((point.x - axes.x[0]) / (axes.x[1] - axes.x[0])) * el.width;
  const py = el.y + el.height - ((point.y - axes.y[0]) / (axes.y[1] - axes.y[0])) * el.height;
  return { x: px, y: py };
}

function render2dGraph(el: GraphElement): string {
  const axes = el.axes ?? { x: [-10, 10] as [number, number], y: [-10, 10] as [number, number], grid: true, labels: true };
  const parts = [
    `<rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>`,
  ];
  if (axes.grid) {
    const tick = axes.tickInterval ?? 1;
    for (let x = Math.ceil(axes.x[0]); x <= axes.x[1]; x += tick) {
      const p = scalePoint({ x, y: 0 }, el);
      parts.push(`<line x1="${n(p.x)}" y1="${n(el.y)}" x2="${n(p.x)}" y2="${n(el.y + el.height)}" stroke="#e2e8f0" stroke-width="0.75"/>`);
    }
    for (let y = Math.ceil(axes.y[0]); y <= axes.y[1]; y += tick) {
      const p = scalePoint({ x: 0, y }, el);
      parts.push(`<line x1="${n(el.x)}" y1="${n(p.y)}" x2="${n(el.x + el.width)}" y2="${n(p.y)}" stroke="#e2e8f0" stroke-width="0.75"/>`);
    }
  }
  const xAxis = scalePoint({ x: 0, y: 0 }, el).y;
  const yAxis = scalePoint({ x: 0, y: 0 }, el).x;
  parts.push(`<line x1="${n(el.x)}" y1="${n(xAxis)}" x2="${n(el.x + el.width)}" y2="${n(xAxis)}" stroke="#64748b" stroke-width="1.5"/>`);
  parts.push(`<line x1="${n(yAxis)}" y1="${n(el.y)}" x2="${n(yAxis)}" y2="${n(el.y + el.height)}" stroke="#64748b" stroke-width="1.5"/>`);

  for (const fn of el.functions ?? []) {
    const domain = fn.domain ?? axes.x;
    const samples = 160;
    const points: string[] = [];
    for (let i = 0; i <= samples; i += 1) {
      const x = domain[0] + ((domain[1] - domain[0]) * i) / samples;
      const y = evalExpr(fn.expr, x);
      if (!Number.isFinite(y)) continue;
      const p = scalePoint({ x, y }, el);
      points.push(`${n(p.x)},${n(p.y)}`);
    }
    if (points.length > 1) {
      parts.push(`<polyline points="${points.join(' ')}" fill="none" stroke="${escapeXml(fn.color ?? '#2563eb')}" stroke-width="${n(fn.strokeWidth ?? 2.5)}" data-graph-function="${escapeXml(fn.expr)}"/>`);
    }
  }
  return parts.join('\n');
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function interpolateStops(stops: string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const localT = scaled - index;
  const a = hexToRgb(stops[index]);
  const b = hexToRgb(stops[index + 1]);
  return rgbToHex([
    lerp(a[0], b[0], localT),
    lerp(a[1], b[1], localT),
    lerp(a[2], b[2], localT),
  ]);
}

function colorMap(name: string | undefined, t: number): string {
  switch (name) {
    case 'viridis':
      return interpolateStops(['#440154', '#31688e', '#35b779', '#fde725'], t);
    case 'inferno':
      return interpolateStops(['#000004', '#57106e', '#bc3754', '#f98e09', '#fcffa4'], t);
    case 'coolwarm':
      return interpolateStops(['#3b4cc0', '#f7f7f7', '#b40426'], t);
    case 'rainbow':
      return interpolateStops(['#2563eb', '#06b6d4', '#22c55e', '#facc15', '#ef4444'], t);
    case 'monochrome':
      return interpolateStops(['#cbd5e1', '#334155'], t);
    case 'plasma':
    default:
      return interpolateStops(['#0d0887', '#7e03a8', '#cc4778', '#f89540', '#f0f921'], t);
  }
}

function finalCamera(el: GraphElement): { theta: number; phi: number } {
  const keyframe = el.cameraKeyframes?.slice().sort((a, b) => a.t - b.t).at(-1);
  return {
    theta: keyframe?.theta ?? el.camera?.theta ?? 0.55,
    phi: keyframe?.phi ?? el.camera?.phi ?? 0.8,
  };
}

function normalizeZ(z: number, zRange: [number, number]): number {
  if (zRange[1] === zRange[0]) return 0;
  return Math.max(-1, Math.min(1, ((z - zRange[0]) / (zRange[1] - zRange[0])) * 2 - 1));
}

function project3d(point: Point3, theta: number, phi: number): { x: number; y: number; depth: number } {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  const rx = point.x * ct - point.y * st;
  const ry = point.x * st + point.y * ct;
  return {
    x: rx,
    y: ry * cp - point.z * sp,
    depth: ry * sp + point.z * cp,
  };
}

function render3dSurface(el: GraphElement): string {
  if (!el.surface) {
    return `<rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}" fill="rgba(15,23,42,0.35)" stroke="#94a3b8" stroke-width="1"/><text x="${n(el.x + el.width / 2)}" y="${n(el.y + el.height / 2)}" text-anchor="middle" font-size="14" fill="#e2e8f0">3D graph final frame unavailable</text>`;
  }

  const axes = el.axes ?? { x: [-5, 5] as [number, number], y: [-5, 5] as [number, number] };
  const zRange = el.zAxis ?? [-1, 1] as [number, number];
  const resolution = Math.max(8, Math.min(36, Math.round(el.surface.resolution ?? 28)));
  const evalSurface = compileExpr2(el.surface.expr);
  const camera = finalCamera(el);
  const projected: ProjectedPoint[][] = [];
  const rawZValues: number[] = [];

  for (let iy = 0; iy <= resolution; iy += 1) {
    const row: ProjectedPoint[] = [];
    const y = axes.y[0] + ((axes.y[1] - axes.y[0]) * iy) / resolution;
    for (let ix = 0; ix <= resolution; ix += 1) {
      const x = axes.x[0] + ((axes.x[1] - axes.x[0]) * ix) / resolution;
      const rawZ = evalSurface(x, y);
      const safeZ = Number.isFinite(rawZ) ? rawZ : 0;
      rawZValues.push(safeZ);
      const normalizedPoint = {
        x: ((x - axes.x[0]) / (axes.x[1] - axes.x[0])) * 2 - 1,
        y: ((y - axes.y[0]) / (axes.y[1] - axes.y[0])) * 2 - 1,
        z: normalizeZ(safeZ, zRange),
      };
      const proj = project3d(normalizedPoint, camera.theta, camera.phi);
      row.push({ ...normalizedPoint, px: proj.x, py: proj.y, depth: proj.depth, z: safeZ });
    }
    projected.push(row);
  }

  const flat = projected.flat();
  const minX = Math.min(...flat.map((p) => p.px));
  const maxX = Math.max(...flat.map((p) => p.px));
  const minY = Math.min(...flat.map((p) => p.py));
  const maxY = Math.max(...flat.map((p) => p.py));
  const pad = Math.min(el.width, el.height) * 0.08;
  const scale = Math.min((el.width - pad * 2) / Math.max(0.01, maxX - minX), (el.height - pad * 2) / Math.max(0.01, maxY - minY));
  const sx = (px: number) => el.x + el.width / 2 + (px - (minX + maxX) / 2) * scale;
  const sy = (py: number) => el.y + el.height / 2 + (py - (minY + maxY) / 2) * scale;
  const zMin = Math.min(...rawZValues);
  const zMax = Math.max(...rawZValues);
  const zT = (z: number) => zMax === zMin ? 0.5 : (z - zMin) / (zMax - zMin);
  const opacity = el.surface.opacity ?? 0.92;

  const quads: Array<{ depth: number; points: string; fill: string }> = [];
  for (let iy = 0; iy < resolution; iy += 1) {
    for (let ix = 0; ix < resolution; ix += 1) {
      const p1 = projected[iy][ix];
      const p2 = projected[iy][ix + 1];
      const p3 = projected[iy + 1][ix + 1];
      const p4 = projected[iy + 1][ix];
      const avgZ = (p1.z + p2.z + p3.z + p4.z) / 4;
      quads.push({
        depth: (p1.depth + p2.depth + p3.depth + p4.depth) / 4,
        fill: colorMap(el.surface.colorMap, zT(avgZ)),
        points: [p1, p2, p3, p4].map((p) => `${n(sx(p.px))},${n(sy(p.py))}`).join(' '),
      });
    }
  }
  quads.sort((a, b) => a.depth - b.depth);

  const axis = (from: Point3, to: Point3, label: string, color: string) => {
    const p1 = project3d(from, camera.theta, camera.phi);
    const p2 = project3d(to, camera.theta, camera.phi);
    return `<line x1="${n(sx(p1.x))}" y1="${n(sy(p1.y))}" x2="${n(sx(p2.x))}" y2="${n(sy(p2.y))}" stroke="${color}" stroke-width="2"/><text x="${n(sx(p2.x))}" y="${n(sy(p2.y) - 6)}" font-size="13" fill="${color}" font-family="system-ui, sans-serif">${label}</text>`;
  };

  const parts = [
    `<rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}" rx="10" fill="rgba(15,23,42,0.42)" stroke="rgba(148,163,184,0.25)" stroke-width="1"/>`,
    ...quads.map((quad) => `<polygon points="${quad.points}" fill="${quad.fill}" fill-opacity="${n(opacity)}" stroke="rgba(15,23,42,0.2)" stroke-width="0.45"/>`),
  ];

  if (el.surface.wireframe) {
    const stride = Math.max(2, Math.floor(resolution / 12));
    for (let iy = 0; iy <= resolution; iy += stride) {
      parts.push(`<polyline points="${projected[iy].map((p) => `${n(sx(p.px))},${n(sy(p.py))}`).join(' ')}" fill="none" stroke="rgba(226,232,240,0.45)" stroke-width="0.8"/>`);
    }
    for (let ix = 0; ix <= resolution; ix += stride) {
      const line = projected.map((row) => row[ix]);
      parts.push(`<polyline points="${line.map((p) => `${n(sx(p.px))},${n(sy(p.py))}`).join(' ')}" fill="none" stroke="rgba(226,232,240,0.45)" stroke-width="0.8"/>`);
    }
  }

  parts.push(axis({ x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, 'x', '#bfdbfe'));
  parts.push(axis({ x: -1, y: -1, z: -1 }, { x: -1, y: 1, z: -1 }, 'y', '#bbf7d0'));
  parts.push(axis({ x: -1, y: -1, z: -1 }, { x: -1, y: -1, z: 1 }, 'z', '#fecaca'));
  parts.push(`<text x="${n(el.x + 18)}" y="${n(el.y + el.height - 18)}" font-size="13" fill="#cbd5e1" font-family="system-ui, sans-serif">${escapeXml(el.surface.expr)}</text>`);

  return parts.join('\n');
}

export function renderGraph(el: GraphElement): RenderResult {
  const transform = buildTransform(el);
  const opacityAttrs = buildOpacityAttrs(el.opacity);
  const metadata = { kind: 'graph', id: el.id, mode: is3dGraph(el) ? '3d' : '2d', dsl: el, animation: el.animation };
  const attrs = [
    ...animationDataAttrs(el),
    `data-maliang-deck-kind="graph"`,
    jsonDataAttr('data-maliang-graph', metadata),
    opacityAttrs,
    transform ? `transform="${transform}"` : '',
  ].filter(Boolean).join(' ');

  if (!is3dGraph(el)) {
    return { svg: `<g ${attrs}>\n${render2dGraph(el)}\n</g>`, warnings: [] };
  }

  const fallbackImage = (el as GraphElement & { fallbackImage?: string }).fallbackImage;
  if (fallbackImage) {
    return {
      svg: `<g ${attrs}>\n<image x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}" href="${escapeXml(fallbackImage)}" data-maliang-raster-final-frame="true"/>\n</g>`,
      warnings: [],
    };
  }

  return {
    svg: `<g ${attrs} data-maliang-graph-final-frame="vector-projection">\n${render3dSurface(el)}\n</g>`,
    warnings: [],
  };
}
