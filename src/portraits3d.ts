/* Draws one person from the 3D model into a small picture (a data address), for figure.ts. Loaded on demand with the 3D library.
   One hidden drawing surface is shared by every picture. A head-and-shoulders picture sits on a soft round tint like the flat portrait; a whole-body
   picture keeps the person's real height, so tall people look taller than short ones. */
import * as THREE from 'three';
import { buildCharacter, setPose, CHAR_SCALE } from './characters3d';
import { ACCENTS, normalizeLook } from './avatar';
import type { Worn } from './avatar';
import type { FigureKind } from './figure';

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene;
const SIZE = { bust: { w: 240, h: 288 }, body: { w: 240, h: 480 } } as const;

function ensure(): THREE.WebGLRenderer {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#9aa6b8', 1.0));
  const sun = new THREE.DirectionalLight('#ffffff', 1.15); sun.position.set(2.5, 4, 5); scene.add(sun);
  return renderer;
}
const lighten = (hex: string): string => { const n = parseInt(hex.slice(1), 16); const m = (v: number): number => Math.round(v + (255 - v) * 0.72); return `rgb(${m((n >> 16) & 255)},${m((n >> 8) & 255)},${m(n & 255)})`; };

/** The picture of a person as a PNG data address. */
export function renderFigure(kind: FigureKind, rawLook: unknown, worn: Worn = {}): string {
  const r = ensure(), look = normalizeLook(rawLook);
  const c = buildCharacter(look, worn);
  const sc = c.root.scale.x / CHAR_SCALE;                        // the person's own height factor, without the size used in the city
  c.root.scale.setScalar(sc); c.root.rotation.y = 0.28; setPose(c, 'idle', 0, 0.4);
  scene.add(c.root);
  const { w, h } = SIZE[kind];
  r.setSize(w, h, false);
  const top = kind === 'body' ? 2.1 : sc * 2.08, bottom = kind === 'body' ? -0.04 : sc * 1.28, vh = top - bottom, vw = (vh * w) / h, cy = (top + bottom) / 2;
  const cam = new THREE.OrthographicCamera(-vw / 2, vw / 2, vh / 2, -vh / 2, 0.1, 30);
  cam.position.set(0, cy, 6); cam.lookAt(0, cy, 0);
  r.render(scene, cam);
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const g = out.getContext('2d');
  if (!g) { scene.remove(c.root); throw new Error('no drawing surface'); }
  if (kind === 'bust') { g.fillStyle = lighten(ACCENTS[look.accent]); g.beginPath(); g.arc(w / 2, h / 2, h * 0.48, 0, Math.PI * 2); g.fill(); }
  else { g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(w / 2, (top / vh) * h, w * 0.2, h * 0.012, 0, 0, Math.PI * 2); g.fill(); }
  g.drawImage(r.domElement, 0, 0);
  scene.remove(c.root);
  return out.toDataURL('image/png');
}
