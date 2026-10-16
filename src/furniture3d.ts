/* The shapes of furniture. A bed is a frame, a mattress, a blanket, a pillow and a headboard; a chair has four legs, a seat and a back; a wardrobe has doors
   and handles; a stove has rings and an oven door. Each piece is described as a short list of simple parts (boxes and cylinders) inside the floor space the
   piece takes, so that the drawing code only has to build them. The back of a piece is at negative z (against the wall), its front at positive z.
   Pure data, no graphics: it is tested without a screen. */
import type { Prop, PropKind } from './interiors';

/** One part of a piece: a box (w wide, h tall, d deep) or an upright cylinder (w is the diameter), with its middle at (x, y, z) inside the piece. */
export interface Part { s: 'box' | 'cyl'; w: number; h: number; d: number; x: number; y: number; z: number; c: string; glow?: boolean }

const shade = (hex: string, amt: number): string => {
  const n = parseInt(hex.slice(1), 16), c = (v: number): number => Math.max(0, Math.min(255, v + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => c(v).toString(16).padStart(2, '0')).join('');
};
const B = (w: number, h: number, d: number, x: number, y: number, z: number, c: string, glow = false): Part => ({ s: 'box', w, h, d, x, y, z, c, glow });
const C = (dia: number, h: number, x: number, y: number, z: number, c: string, glow = false): Part => ({ s: 'cyl', w: dia, h, d: dia, x, y, z, c, glow });
/** Four legs under a top, set in from the corners. */
const legs = (w: number, d: number, h: number, c: string, t = 0.09): Part[] => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => B(t, h, t, a * (w / 2 - t), h / 2, b * (d / 2 - t), c));

/** The kinds that have a shape of their own (the others stay a plain block with a few details). */
export const MODELLED: PropKind[] = ['bed', 'chair', 'table', 'desk', 'sofa', 'wardrobe', 'fridge', 'stove', 'tv', 'plant', 'shelf', 'lamp', 'bedside', 'bench', 'counter', 'round', 'rug', 'laptop', 'item'];

/** The parts of a piece. `h` is its height and `base` its main colour. Unknown kinds give an empty list (the caller draws a plain block). */
export function partsFor(p: Pick<Prop, 'kind' | 'w' | 'd'>, h: number, base: string): Part[] {
  const { w, d } = p, wood = shade(base, -28), dark = '#2a2f3a';
  switch (p.kind) {
    case 'bed': {
      const frame = '#8a6a46';
      return [
        B(w, 0.28, d, 0, 0.14, 0, frame), ...legs(w, d, 0.12, shade(frame, -30), 0.12).map(l => ({ ...l, y: 0.06 })),
        B(w * 0.94, 0.24, d * 0.95, 0, 0.4, 0.02, '#f4f1ea'),                                    // mattress
        B(w * 0.96, 0.12, d * 0.62, 0, 0.56, d * 0.17, base), B(w * 0.96, 0.06, 0.24, 0, 0.6, -d * 0.14, shade(base, 45)),   // blanket and its folded edge
        B(Math.min(w * 0.7, 1.5), 0.16, 0.55, 0, 0.6, -d / 2 + 0.5, '#ffffff'),                   // pillow
        B(w, 1.0, 0.12, 0, 0.5, -d / 2 + 0.06, shade(frame, -18)),                                 // headboard
      ];
    }
    case 'chair': return [...legs(w * 0.8, d * 0.8, 0.46, wood, 0.07), B(w * 0.82, 0.07, d * 0.82, 0, 0.49, 0, base), B(0.07, 0.55, 0.07, -w * 0.36, 0.8, -d * 0.36, wood), B(0.07, 0.55, 0.07, w * 0.36, 0.8, -d * 0.36, wood), B(w * 0.8, 0.22, 0.06, 0, 0.96, -d * 0.36, base)];
    case 'table': return [...legs(w, d, h - 0.08, wood), B(w, 0.08, d, 0, h - 0.04, 0, base), B(w * 0.86, 0.05, d * 0.86, 0, h - 0.11, 0, wood)];
    case 'desk': return [...legs(w, d, h - 0.07, wood, 0.08), B(w, 0.07, d, 0, h - 0.035, 0, base), B(w * 0.3, h * 0.6, d * 0.9, w * 0.33, h * 0.62, 0, shade(base, -14)), B(w * 0.24, 0.04, 0.03, w * 0.33, h * 0.7, d * 0.46, dark), B(w * 0.24, 0.04, 0.03, w * 0.33, h * 0.45, d * 0.46, dark)];
    case 'sofa': {
      const n = w > 2.6 ? 3 : w > 1.5 ? 2 : 1, cw = (w - 0.5) / n, out: Part[] = [B(w, 0.28, d, 0, 0.16, 0, shade(base, -30)), B(w, 0.75, 0.3, 0, 0.62, -d / 2 + 0.15, shade(base, -12)), B(0.25, 0.5, d, -w / 2 + 0.125, 0.5, 0, shade(base, -20)), B(0.25, 0.5, d, w / 2 - 0.125, 0.5, 0, shade(base, -20))];
      for (let i = 0; i < n; i++) { const x = -w / 2 + 0.25 + cw * (i + 0.5); out.push(B(cw * 0.94, 0.2, d - 0.42, x, 0.4, 0.14, base), B(cw * 0.9, 0.4, 0.16, x, 0.68, -d / 2 + 0.36, shade(base, 14))); }
      return out;
    }
    case 'wardrobe': {
      const n = w > 1.8 ? 2 : 1, out: Part[] = [B(w, h, d, 0, h / 2, 0, base), B(w + 0.08, 0.1, d + 0.06, 0, h + 0.05, 0, wood), B(w, 0.12, d * 0.96, 0, 0.06, 0.02, wood)];
      for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * (w / n); out.push(B(w / n - 0.06, h - 0.3, 0.04, x, h / 2 + 0.04, d / 2 + 0.02, shade(base, 16)), B(0.04, 0.3, 0.05, x + (n === 1 ? w * 0.3 : (i === 0 ? 1 : -1) * (w / n) * 0.36), h * 0.5, d / 2 + 0.06, dark)); }
      return out;
    }
    case 'fridge': return [B(w, h, d, 0, h / 2, 0, base), B(w * 0.96, h * 0.3, 0.04, 0, h * 0.83, d / 2 + 0.02, shade(base, -10)), B(w * 0.96, h * 0.62, 0.04, 0, h * 0.33, d / 2 + 0.02, shade(base, -6)), B(0.05, h * 0.2, 0.06, w * 0.36, h * 0.82, d / 2 + 0.07, '#8a8f99'), B(0.05, h * 0.3, 0.06, w * 0.36, h * 0.45, d / 2 + 0.07, '#8a8f99'), B(w, 0.08, d, 0, 0.04, 0, dark)];
    case 'stove': return [B(w, h, d, 0, h / 2, 0, base), B(w * 0.8, h * 0.45, 0.04, 0, h * 0.42, d / 2 + 0.02, dark), B(w * 0.6, 0.04, 0.06, 0, h * 0.72, d / 2 + 0.06, '#8a8f99'), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => C(Math.min(w, d) * 0.3, 0.03, a * w * 0.22, h + 0.015, b * d * 0.2, dark)), ...[-0.3, -0.1, 0.1, 0.3].map(x => C(0.08, 0.05, x * w, h * 0.9, d / 2 + 0.03, '#e8e8e8')), B(w, 0.25, 0.06, 0, h + 0.125, -d / 2 + 0.03, shade(base, -10))];
    case 'tv': {
      const long = Math.max(w, d), thin = Math.min(w, d), sideways = d > w;                    // a television may be given as a thin slab either way round
      const scr = (lw: number, lh: number, lt: number, y: number, off: number, c: string, glow = false): Part => (sideways ? B(lt, lh, lw, off, y, 0, c, glow) : B(lw, lh, lt, 0, y, off, c, glow));
      return [sideways ? B(Math.max(thin, 0.45), 0.5, long * 0.9, 0, 0.25, 0, '#6a4a2c') : B(long * 0.9, 0.5, Math.max(thin, 0.45), 0, 0.25, 0, '#6a4a2c'), scr(0.5, 0.1, 0.16, 0.55, 0, dark), scr(long * 0.86, 0.72, 0.07, 1.0, 0, dark), scr(long * 0.8, 0.62, 0.02, 1.0, 0.04, '#2f5fa8', true)];
    }
    case 'plant': { const r = Math.min(w, d); return [C(r * 0.62, 0.42, 0, 0.21, 0, '#a05a3a'), C(r * 0.68, 0.06, 0, 0.43, 0, '#8a4a2e'), C(0.06, h * 0.5, 0, 0.42 + h * 0.25, 0, '#5a7a3a'), C(r * 1.1, h * 0.22, 0, h * 0.62, 0, shade(base, -10)), C(r * 0.9, h * 0.22, 0, h * 0.8, 0, base), C(r * 0.55, h * 0.18, 0, h * 0.96, 0, shade(base, 22))]; }
    case 'shelf': {
      const n = Math.max(2, Math.round(h / 0.5)), along = w >= d, out: Part[] = [B(w, h, d, 0, h / 2, 0, shade(base, -24))], cols = ['#b3262e', '#2f6fd6', '#d6a53a', '#3c8f4a', '#8a4fc9', '#f4f1ea'];
      for (let i = 0; i < n; i++) { const y = (h / n) * (i + 0.5); out.push(along ? B(w * 0.9, (h / n) * 0.72, 0.06, 0, y, d / 2 + 0.01, shade(base, 28)) : B(0.06, (h / n) * 0.72, d * 0.9, w / 2 + 0.01, y, 0, shade(base, 28))); for (let k = 0; k < 4; k++) { const o = ((k + 0.5) / 4 - 0.5) * (along ? w : d) * 0.8; out.push(along ? B((w * 0.8) / 4 * 0.8, (h / n) * 0.55, 0.05, o, y - (h / n) * 0.06, d / 2 + 0.05, cols[(i * 3 + k) % cols.length]) : B(0.05, (h / n) * 0.55, (d * 0.8) / 4 * 0.8, w / 2 + 0.05, y - (h / n) * 0.06, o, cols[(i * 3 + k) % cols.length])); } }
      return out;
    }
    case 'lamp': return [C(Math.min(w, d) * 0.7, 0.06, 0, 0.03, 0, dark), C(0.05, h * 0.8, 0, h * 0.42, 0, '#8a8f99'), C(Math.min(w, d) * 0.95, h * 0.2, 0, h * 0.9, 0, base, true)];
    case 'bedside': return [B(w, h, d, 0, h / 2, 0, base), B(w * 0.86, h * 0.34, 0.04, 0, h * 0.68, d / 2 + 0.02, shade(base, 18)), B(w * 0.86, h * 0.34, 0.04, 0, h * 0.26, d / 2 + 0.02, shade(base, 18)), B(0.12, 0.04, 0.05, 0, h * 0.68, d / 2 + 0.06, dark), B(0.12, 0.04, 0.05, 0, h * 0.26, d / 2 + 0.06, dark), B(0.16, 0.02, 0.3, w * 0.15, h + 0.01, 0, dark)];
    case 'bench': return [B(w, 0.08, d, 0, h - 0.04, 0, base), ...legs(w, d, h - 0.08, shade(base, -40), 0.1), B(w * 0.9, 0.05, 0.08, 0, h * 0.4, 0, shade(base, -40))];
    case 'counter': return [B(w, h - 0.08, d, 0, (h - 0.08) / 2, 0, base), B(w + 0.1, 0.08, d + 0.1, 0, h - 0.04, 0, shade(base, 60)), B(w * 0.96, (h - 0.08) * 0.7, 0.03, 0, (h - 0.08) * 0.5, d / 2 + 0.015, shade(base, -22))];
    case 'round': { const r = Math.min(w, d) * 0.9; return [C(r, h, 0, h / 2, 0, base), C(r * 1.08, 0.05, 0, h, 0, shade(base, 40)), C(r * 0.86, 0.02, 0, h + 0.03, 0, h < 0.6 ? '#7fc4f0' : shade(base, -30))]; }
    case 'rug': return [B(w, 0.03, d, 0, 0.015, 0, shade(base, -34)), B(w * 0.9, 0.035, d * 0.86, 0, 0.02, 0, base), B(w * 0.5, 0.04, d * 0.42, 0, 0.022, 0, shade(base, 38))];
    case 'laptop': return [B(w, 0.03, d, 0, 0.815, 0, dark), B(w, d * 0.9, 0.03, 0, 0.83 + d * 0.45, -d / 2, dark), B(w * 0.9, d * 0.74, 0.01, 0, 0.83 + d * 0.45, -d / 2 + 0.02, '#7fb4ff', true)];
    case 'item': return [B(w, h, d, 0, h / 2, 0, base), B(w * 0.92, 0.05, d * 0.92, 0, h + 0.025, 0, shade(base, -26)), B(w * 0.7, h * 0.5, 0.03, 0, h * 0.5, d / 2 + 0.015, shade(base, 24))];
    default: return [];
  }
}
