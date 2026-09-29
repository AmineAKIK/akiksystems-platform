/*
 * Generates the Systems hero artwork: topographic contour lines rising to a
 * single summit (the point of view). Deterministic: same seed, same file.
 *
 *   node apps/web/scripts/generate-hero-topography.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const W = 1600;
const H = 1000;
const GRID_X = 240;
const GRID_Y = 150;
const STEPS_TO_SUMMIT = 26;
const SUMMIT = { x: 0.62, y: 0.4 };
const OUTPUT = fileURLToPath(new URL('../public/systems/hero-topography.svg', import.meta.url));

/** @typedef {[number, number]} Point */

/**
 * @template T
 * @param {readonly T[]} list
 * @param {number} index
 * @returns {T}
 */
function at(list, index) {
  const value = list[index];
  if (value === undefined) throw new Error(`Hero topography: missing index ${index}`);
  return value;
}

/* ---------- deterministic value noise ---------- */
/** @param {number} seed */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(20260929);
const LATTICE = 48;
const lattice = Array.from({ length: LATTICE * LATTICE }, () => random());
/** @param {number} t */
const smooth = (t) => t * t * (3 - 2 * t);
/** @param {number} x @param {number} y */
function noise(x, y) {
  const fx = x * 8;
  const fy = y * 8;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  /** @param {number} i @param {number} j */
  const cell = (i, j) => at(lattice, (j % LATTICE) * LATTICE + (i % LATTICE));
  const a = cell(x0, y0) + (cell(x0 + 1, y0) - cell(x0, y0)) * tx;
  const b = cell(x0, y0 + 1) + (cell(x0 + 1, y0 + 1) - cell(x0, y0 + 1)) * tx;
  return a + (b - a) * ty;
}

/* ---------- height field (u, v in [0, 1]) ---------- */
/** @param {number} u @param {number} v @param {number} cx @param {number} cy @param {number} sx @param {number} sy */
const gauss = (u, v, cx, cy, sx, sy) =>
  Math.exp(-(((u - cx) / sx) ** 2 + ((v - cy) / sy) ** 2) / 2);

/** @param {number} u @param {number} v */
function height(u, v) {
  let h = 1.0 * gauss(u, v, SUMMIT.x, SUMMIT.y, 0.17, 0.24);
  h += 0.34 * gauss(u, v, 0.86, 0.62, 0.11, 0.17);
  h += 0.26 * gauss(u, v, 0.42, 0.7, 0.2, 0.16);
  h += 0.2 * gauss(u, v, 0.72, 0.18, 0.09, 0.12);
  h += 0.18 * gauss(u, v, 0.95, 0.18, 0.12, 0.16);
  h += 0.2 * (noise(u * 0.45, v * 0.45) - 0.5);
  h += 0.07 * (noise(u * 1.3 + 0.3, v * 1.3 + 0.7) - 0.5);
  h += 0.022 * (noise(u * 3.1 + 0.9, v * 3.1 + 0.2) - 0.5);
  /* the lower band steepens: lines crowd toward the bottom edge */
  h -= 1.15 * Math.max(0, v - 0.66) ** 1.35;
  return h;
}

/* ---------- sample ---------- */
/** @type {number[][]} */
const field = [];
/** @param {number} i @param {number} j */
const sample = (i, j) => at(at(field, j), i);
let min = Infinity;
let max = -Infinity;
for (let j = 0; j <= GRID_Y; j++) {
  const row = [];
  for (let i = 0; i <= GRID_X; i++) {
    const value = height(i / GRID_X, j / GRID_Y);
    row.push(value);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  field.push(row);
}
let peak = { i: 0, j: 0 };
field.forEach((row, j) =>
  row.forEach((value, i) => {
    if (value > sample(peak.i, peak.j)) peak = { i, j };
  }),
);
const summitHeight = sample(peak.i, peak.j);
const summit = { x: peak.i / GRID_X, y: peak.j / GRID_Y };

/* ---------- marching squares ---------- */
/** @param {number} level */
function contour(level) {
  /** @type {Point[][]} */
  const segments = [];
  /** @param {number} i */
  const px = (i) => (i / GRID_X) * W;
  /** @param {number} j */
  const py = (j) => (j / GRID_Y) * H;
  /** @param {number} a @param {number} b @param {number} va @param {number} vb */
  const lerp = (a, b, va, vb) => a + ((level - va) / (vb - va)) * (b - a);
  for (let j = 0; j < GRID_Y; j++) {
    for (let i = 0; i < GRID_X; i++) {
      const a = sample(i, j);
      const b = sample(i + 1, j);
      const c = sample(i + 1, j + 1);
      const d = sample(i, j + 1);
      const idx =
        (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      /** @type {Point} */
      const top = [lerp(px(i), px(i + 1), a, b), py(j)];
      /** @type {Point} */
      const right = [px(i + 1), lerp(py(j), py(j + 1), b, c)];
      /** @type {Point} */
      const bottom = [lerp(px(i), px(i + 1), d, c), py(j + 1)];
      /** @type {Point} */
      const left = [px(i), lerp(py(j), py(j + 1), a, d)];
      /** @type {Record<number, Point[][]>} */
      const table = {
        1: [[left, bottom]],
        2: [[bottom, right]],
        3: [[left, right]],
        4: [[top, right]],
        5: [
          [left, top],
          [bottom, right],
        ],
        6: [[top, bottom]],
        7: [[left, top]],
        8: [[left, top]],
        9: [[top, bottom]],
        10: [
          [left, bottom],
          [top, right],
        ],
        11: [[top, right]],
        12: [[left, right]],
        13: [[bottom, right]],
        14: [[left, bottom]],
      };
      for (const segment of table[idx] ?? []) segments.push(segment);
    }
  }
  return joinSegments(segments);
}

/** @param {Point[][]} segments */
function joinSegments(segments) {
  /** @param {Point} p */
  const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  /** @type {Map<string, number[]>} */
  const byPoint = new Map();
  segments.forEach((segment, index) => {
    for (const p of segment) {
      const k = key(p);
      const list = byPoint.get(k) ?? [];
      list.push(index);
      byPoint.set(k, list);
    }
  });
  const used = new Set();
  /** @type {Point[][]} */
  const lines = [];
  for (let start = 0; start < segments.length; start++) {
    if (used.has(start)) continue;
    used.add(start);
    const line = [...at(segments, start)];
    for (const forward of [true, false]) {
      for (;;) {
        const end = at(line, forward ? line.length - 1 : 0);
        const next = (byPoint.get(key(end)) ?? []).find((index) => !used.has(index));
        if (next === undefined) break;
        used.add(next);
        const [p, q] = /** @type {[Point, Point]} */ (at(segments, next));
        const other = key(p) === key(end) ? q : p;
        if (forward) line.push(other);
        else line.unshift(other);
      }
    }
    if (line.length > 6) lines.push(line);
  }
  return lines;
}

/* ---------- simplify + smooth ---------- */
/**
 * @param {Point[]} points
 * @param {number} epsilon
 * @returns {Point[]}
 */
function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const [ax, ay] = at(points, 0);
  const [bx, by] = at(points, points.length - 1);
  const length = Math.hypot(bx - ax, by - ay) || 1;
  let index = 0;
  let distance = 0;
  for (let k = 1; k < points.length - 1; k++) {
    const [x, y] = at(points, k);
    const d = Math.abs((by - ay) * x - (bx - ax) * y + bx * ay - by * ax) / length;
    if (d > distance) {
      distance = d;
      index = k;
    }
  }
  if (distance <= epsilon) return [at(points, 0), at(points, points.length - 1)];
  return [
    ...simplify(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(index), epsilon),
  ];
}

/* closed loops start and end on the same point: simplify each half separately */
/** @param {Point[]} points @param {number} epsilon */
function simplifyLine(points, epsilon) {
  const first = at(points, 0);
  const last = at(points, points.length - 1);
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.5) return simplify(points, epsilon);
  const mid = Math.floor(points.length / 2);
  return [
    ...simplify(points.slice(0, mid + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(mid), epsilon),
  ];
}

/** @param {number} n */
const r = (n) => Math.round(n * 10) / 10;
/** @param {Point[]} points */
function toPath(points) {
  const first = at(points, 0);
  const last = at(points, points.length - 1);
  const closed = Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.5;
  const p = closed ? points.slice(0, -1) : points;
  const n = p.length;
  /** @param {number} k */
  const get = (k) => at(p, closed ? (k + n) % n : Math.max(0, Math.min(n - 1, k)));
  let d = `M${r(first[0])} ${r(first[1])}`;
  const count = closed ? n : n - 1;
  for (let k = 0; k < count; k++) {
    const p0 = get(k - 1);
    const p1 = get(k);
    const p2 = get(k + 1);
    const p3 = get(k + 2);
    /** @type {Point} */
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    /** @type {Point} */
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/* ---------- compose ---------- */
/* equal spacing from the upland base to the summit, continued down into the lower band */
const upland = field
  .slice(0, Math.floor(GRID_Y * 0.62))
  .flat()
  .sort((a, b) => a - b);
const base = at(upland, Math.floor(upland.length * 0.06));
const step = (summitHeight - base) / STEPS_TO_SUMMIT;
/** @type {string[]} */
const minor = [];
/** @type {string[]} */
const major = [];
for (let k = Math.floor((min - base) / step) + 1; k < STEPS_TO_SUMMIT; k++) {
  const level = base + k * step;
  const target = ((k % 5) + 5) % 5 === 0 ? major : minor;
  for (const line of contour(level)) target.push(toPath(simplifyLine(line, 0.7)));
}

const sx = r(summit.x * W);
const sy = r(summit.y * H);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<radialGradient id="glow" cx="${summit.x}" cy="${summit.y}" r="0.55"><stop offset="0" stop-color="#1b3a8f" stop-opacity=".55"/><stop offset=".45" stop-color="#0c1a44" stop-opacity=".35"/><stop offset="1" stop-color="#05070a" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="#05070a"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<g fill="none" stroke-linejoin="round" stroke-linecap="round">
<path stroke="#8fa8e8" stroke-opacity=".2" stroke-width="1" d="${minor.join('')}"/>
<path stroke="#b9c9f5" stroke-opacity=".42" stroke-width="1.35" d="${major.join('')}"/>
</g>
<circle cx="${sx}" cy="${sy}" r="15" fill="none" stroke="#c8ff2e" stroke-opacity=".32" stroke-width="1"/>
<circle cx="${sx}" cy="${sy}" r="4.2" fill="#c8ff2e"/>
</svg>
`;

writeFileSync(OUTPUT, svg);
process.stdout.write(
  `Summit at ${(summit.x * 100).toFixed(0)}% / ${(summit.y * 100).toFixed(0)}%. Wrote ${OUTPUT} (${(svg.length / 1024).toFixed(1)} KB, ${minor.length + major.length} lines)\n`,
);
