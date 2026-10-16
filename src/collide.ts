/* Solid things in the 3D city, so that nobody walks through a house, a tree, a notice board or into the water. Shapes (rectangles, outlines of buildings and
   circles) are kept in a grid of cells, so asking "can a person of this size stand here?" is quick even with a thousand houses. People that walk into
   something slide along it instead of passing through. Pure and deterministic: no graphics, tested without a screen. */
export interface P2 { x: number; z: number }

type Shape =
  | { k: 'rect'; cx: number; cz: number; hw: number; hd: number }
  | { k: 'poly'; pts: [number, number][]; minX: number; maxX: number; minZ: number; maxZ: number }
  | { k: 'circle'; x: number; z: number; r: number };

const CELL = 8;
const cellOf = (v: number): number => Math.floor(v / CELL);

const insidePoly = (pts: [number, number][], x: number, z: number): boolean => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) if ((pts[i][1] > z) !== (pts[j][1] > z) && x < ((pts[j][0] - pts[i][0]) * (z - pts[i][1])) / (pts[j][1] - pts[i][1]) + pts[i][0]) c = !c;
  return c;
};
const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number): number => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};

export class Field {
  private shapes: Shape[] = [];
  private grid = new Map<number, number[]>();
  private mark: number[] = [];
  private stamp = 0;
  get size(): number { return this.shapes.length; }

  private put(s: Shape, minX: number, maxX: number, minZ: number, maxZ: number): void {
    const id = this.shapes.push(s) - 1;
    for (let gx = cellOf(minX); gx <= cellOf(maxX); gx++) for (let gz = cellOf(minZ); gz <= cellOf(maxZ); gz++) { const k = gx * 65536 + gz; const l = this.grid.get(k); if (l) l.push(id); else this.grid.set(k, [id]); }
  }
  /** A box with its middle at (cx, cz), half the width hw and half the depth hd, not turned. */
  addRect(cx: number, cz: number, hw: number, hd: number): void { this.put({ k: 'rect', cx, cz, hw, hd }, cx - hw, cx + hw, cz - hd, cz + hd); }
  /** The outline of a building (points on the ground, at least three). */
  addPoly(pts: [number, number][]): void {
    if (pts.length < 3) return;
    const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    this.put({ k: 'poly', pts, minX, maxX, minZ, maxZ }, minX, maxX, minZ, maxZ);
  }
  addCircle(x: number, z: number, r: number): void { this.put({ k: 'circle', x, z, r }, x - r, x + r, z - r, z + r); }
  clear(): void { this.shapes = []; this.grid.clear(); this.mark = []; }

  /** Does a person of radius r standing at (x, z) touch anything? */
  blocked(x: number, z: number, r = 0.4): boolean {
    this.stamp++;
    for (let gx = cellOf(x - r); gx <= cellOf(x + r); gx++) for (let gz = cellOf(z - r); gz <= cellOf(z + r); gz++) {
      const cell = this.grid.get(gx * 65536 + gz); if (!cell) continue;
      for (const id of cell) {
        if (this.mark[id] === this.stamp) continue; this.mark[id] = this.stamp;
        const s = this.shapes[id];
        if (s.k === 'rect') { const dx = Math.max(Math.abs(x - s.cx) - s.hw, 0), dz = Math.max(Math.abs(z - s.cz) - s.hd, 0); if (dx * dx + dz * dz < r * r) return true; }
        else if (s.k === 'circle') { if (Math.hypot(x - s.x, z - s.z) < s.r + r) return true; }
        else {
          if (x < s.minX - r || x > s.maxX + r || z < s.minZ - r || z > s.maxZ + r) continue;
          if (insidePoly(s.pts, x, z)) return true;
          for (let i = 0; i < s.pts.length; i++) { const a = s.pts[i], b = s.pts[(i + 1) % s.pts.length]; if (segDist(x, z, a[0], a[1], b[0], b[1]) < r) return true; }
        }
      }
    }
    return false;
  }

  /** Moves from one point towards another and stops short of anything solid, sliding along it when it can: returns where the person ends up. A person who is already inside something may move out. */
  slide(from: P2, to: P2, r = 0.4): P2 {
    if (!this.blocked(to.x, to.z, r)) return { x: to.x, z: to.z };
    const here = this.blocked(from.x, from.z, r);
    if (here) return { x: to.x, z: to.z };                               // stuck inside: do not hold anyone in
    if (!this.blocked(to.x, from.z, r) && Math.abs(to.x - from.x) > 1e-9) return { x: to.x, z: from.z };
    if (!this.blocked(from.x, to.z, r) && Math.abs(to.z - from.z) > 1e-9) return { x: from.x, z: to.z };
    for (const t of [0.75, 0.5, 0.25, 0.12]) { const x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t; if (!this.blocked(x, z, r)) return { x, z }; }   // not all the way, but as far as it goes
    return { x: from.x, z: from.z };
  }

  /** A way round the solid things from one point to another (see findPath). */
  path(from: P2, to: P2, r = 0.45): P2[] { return findPath(this, from, to, r); }

  /** The nearest spot where a person can stand, looking outwards in rings of half a metre; the point itself if it is free. */
  free(x: number, z: number, r = 0.4): P2 {
    if (!this.blocked(x, z, r)) return { x, z };
    for (let ring = 1; ring <= 40; ring++) {
      const d = ring * 0.5; let best: P2 | null = null, bd = Infinity;
      const n = Math.max(8, ring * 8);
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (!this.blocked(px, pz, r)) { const dd = Math.hypot(px - x, pz - z); if (dd < bd) { bd = dd; best = { x: px, z: pz }; } } }
      if (best) return best;
    }
    return { x, z };
  }
}

/* ---------- finding a way round the solid things ---------- */
const KEY = (ix: number, iz: number): number => (ix + 1024) * 4096 + (iz + 1024);
class Heap {
  private a: { k: number; f: number }[] = [];
  get size(): number { return this.a.length; }
  push(k: number, f: number): void { const a = this.a; a.push({ k, f }); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop(): number {
    const a = this.a, top = a[0], last = a.pop() as { k: number; f: number };
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top.k;
  }
}

/** Is the straight line from one point to another clear for a person of radius r? */
export function clearLine(f: Field, a: P2, b: P2, r: number): boolean {
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(d / 0.4));
  for (let i = 1; i <= n; i++) { const t = i / n; if (f.blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, r)) return false; }
  return true;
}

/** A way from one point to another round everything solid: a short list of points to walk to in turn (the last is where the walk ends; if the target is inside something it is the nearest free spot). Empty when already there. The search is on a grid of one metre, then the corners are cut where the line is clear. */
export function findPath(f: Field, from: P2, to: P2, r = 0.45): P2[] {
  const start = f.free(from.x, from.z, r), goal = f.free(to.x, to.z, r);
  if (Math.hypot(goal.x - start.x, goal.z - start.z) < 0.3) return Math.hypot(goal.x - from.x, goal.z - from.z) < 0.3 ? [] : [goal];
  if (clearLine(f, start, goal, r)) return [goal];
  const cell = (v: number): number => Math.round(v);
  const sx = cell(start.x), sz = cell(start.z), gx = cell(goal.x), gz = cell(goal.z);
  const memo = new Map<number, boolean>();
  const open = (ix: number, iz: number): boolean => { const k = KEY(ix, iz); let v = memo.get(k); if (v === undefined) { v = !f.blocked(ix, iz, r); memo.set(k, v); } return v; };
  const g = new Map<number, number>(), came = new Map<number, number>(), heap = new Heap(), closed = new Set<number>();
  const h = (ix: number, iz: number): number => { const dx = Math.abs(ix - gx), dz = Math.abs(iz - gz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const sk = KEY(sx, sz), gk = KEY(gx, gz); g.set(sk, 0); heap.push(sk, h(sx, sz));
  let found = false, steps = 0;
  while (heap.size && steps++ < 30000) {
    const k = heap.pop(); if (closed.has(k)) continue; closed.add(k);
    if (k === gk) { found = true; break; }
    const ix = Math.floor(k / 4096) - 1024, iz = (k % 4096) - 1024;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const nx = ix + dx, nz = iz + dz; if (Math.abs(nx) > 600 || Math.abs(nz) > 600) continue;
      const open1 = open(nx, nz) || (nx === gx && nz === gz); if (!open1) continue;
      if (dx && dz && (!open(ix + dx, iz) || !open(ix, iz + dz))) continue;
      const nk = KEY(nx, nz), ng = (g.get(k) as number) + (dx && dz ? 1.414 : 1);
      if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); came.set(nk, k); heap.push(nk, ng + h(nx, nz)); }
    }
  }
  if (!found) return [goal];
  const cells: P2[] = []; for (let k = gk; k !== sk; k = came.get(k) as number) cells.push({ x: Math.floor(k / 4096) - 1024, z: (k % 4096) - 1024 });
  cells.reverse(); cells[cells.length - 1] = goal;
  const out: P2[] = []; let cur = start, i = 0;
  while (i < cells.length) { let j = cells.length - 1; while (j > i && !clearLine(f, cur, cells[j], r)) j--; out.push(cells[j]); cur = cells[j]; i = j + 1; }
  return out;
}
