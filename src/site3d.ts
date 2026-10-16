/* The plot where the player builds their house, drawn in the 3D city at every stage: a fenced plot with a sign, a concrete foundation, brick walls, a roof,
   and finally a painted house with windows, a door and a chimney. While the builders are at work a pile of bricks and a sign say so. The group has its
   middle at (0, 0, 0) and is about 12 metres wide and 10 deep; the caller puts it where there is room. */
import * as THREE from 'three';
import { sprite } from './sprites3d';

export const SITE_W = 12, SITE_D = 10;

/** The plot at the given stage: `done` stages are finished (0 nothing, 1 a plot, 2 a foundation, 3 walls, 4 a roof, 5 the finished house). */
export function buildSite(done: number, working: boolean): THREE.Group {
  const g = new THREE.Group(); g.name = 'building-site';
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (c: string): THREE.MeshStandardMaterial => { let m = mats.get(c); if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }); mats.set(c, m); } return m; };
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, c: string): THREE.Mesh => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  if (done < 1) return g;
  add(SITE_W, 0.05, SITE_D, 0, 0, 0, '#a89a74');                                                          // the plot of land
  for (let i = 0; i <= 8; i++) { const x = -SITE_W / 2 + (SITE_W * i) / 8; add(0.15, 1.1, 0.15, x, 0, SITE_D / 2, '#8a6a46'); add(0.15, 1.1, 0.15, x, 0, -SITE_D / 2, '#8a6a46'); }
  for (let i = 1; i < 6; i++) { const z = -SITE_D / 2 + (SITE_D * i) / 6; add(0.15, 1.1, 0.15, -SITE_W / 2, 0, z, '#8a6a46'); add(0.15, 1.1, 0.15, SITE_W / 2, 0, z, '#8a6a46'); }
  add(SITE_W, 0.12, 0.08, 0, 0.7, SITE_D / 2, '#8a6a46'); add(SITE_W, 0.12, 0.08, 0, 0.7, -SITE_D / 2, '#8a6a46');
  if (done < 2) { const sign = sprite('Your plot', '#ffffffee', '#16203a', 1.4); sign.position.set(0, 2.2, SITE_D / 2); g.add(sign); }
  const W = 8, D = 6;
  if (done >= 2) add(W + 0.6, 0.35, D + 0.6, 0, 0.05, 0, '#9a9a9a');                                       // the foundation
  if (done >= 3) {
    const wall = done >= 5 ? '#e8d9b0' : '#b0552f', h = 3.2;
    add(W, h, 0.4, 0, 0.4, D / 2 - 0.2, wall); add(W, h, 0.4, 0, 0.4, -D / 2 + 0.2, wall); add(0.4, h, D - 0.8, -W / 2 + 0.2, 0.4, 0, wall); add(0.4, h, D - 0.8, W / 2 - 0.2, 0.4, 0, wall);
    if (done < 5) add(W - 0.8, 0.05, D - 0.8, 0, 0.4, 0, '#7a6a4a');
  }
  if (done >= 4) {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(W, D) * 0.62, 2.6, 4), mat(done >= 5 ? '#8a3a2a' : '#6a4a2e')); roof.position.set(0, 3.6 + 1.3, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, D / W + 0.1); roof.castShadow = true; g.add(roof);
  }
  if (done >= 5) {
    add(1.1, 2.1, 0.12, 0, 0.4, D / 2 + 0.02, '#5a3a24');
    for (const x of [-2.6, 2.6]) add(1.3, 1.1, 0.12, x, 1.6, D / 2 + 0.02, '#9fd4ff');
    add(0.8, 1.6, 0.8, 2.4, 4.4, -1.2, '#8a8a8a');
    const flag = sprite('Home', '#2f6fd6', '#ffffff', 1.2); flag.position.set(0, 6.8, 0); g.add(flag);
  }
  if (working && done < 5) {
    add(1.6, 0.9, 1.2, SITE_W / 2 - 1.4, 0, SITE_D / 2 - 1.6, '#b0552f'); add(1.2, 0.6, 1.0, SITE_W / 2 - 3.0, 0, SITE_D / 2 - 1.4, '#c9c0a8');
    const w = sprite('Under construction', '#f0b43c', '#16203a', 1.3); w.position.set(0, 7.2, 0); g.add(w);
  }
  return g;
}

/** Frees everything a site made (shapes, colours and signs). */
export function disposeSite(g: THREE.Group): void {
  g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); const mm = m.material; if (Array.isArray(mm)) mm.forEach(x => x.dispose()); else mm.dispose(); } if (o instanceof THREE.Sprite) { o.material.map?.dispose(); o.material.dispose(); } });
}
