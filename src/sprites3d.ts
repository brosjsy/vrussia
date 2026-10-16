/* Small pictures made on the fly for the 3D world: name tags, speech bubbles, signs and the boards' faces. They are drawn on a canvas and
   used as textures. Where a canvas cannot be made (for example in a test without graphics) a plain empty sprite is used instead. */
import * as THREE from 'three';

export function labelTexture(text: string, bg: string, fg: string, font = '600 26px system-ui, sans-serif'): { tex: THREE.CanvasTexture | null; aspect: number } {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (!ctx) return { tex: null, aspect: 4 };
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 36, h = 44;
  c.width = w; c.height = h;
  ctx.font = font;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect?.(0, 0, w, h, 22); if (!ctx.roundRect) ctx.rect(0, 0, w, h); ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: w / h };
}

export function sprite(text: string, bg: string, fg: string, height: number): THREE.Sprite {
  const { tex, aspect } = labelTexture(text, bg, fg);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex ?? undefined, transparent: true, depthTest: false }));
  sp.scale.set(height * aspect, height, 1); sp.renderOrder = 10;
  return sp;
}

/** Writes words in lines no wider than `maxWidth` pixels. Returns the lines (also used by tests, since it needs no canvas of its own). */
export function wrapLines(measure: (s: string) => number, text: string, maxWidth: number): string[] {
  const lines: string[] = []; let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? cur + ' ' + word : word;
    if (measure(next) <= maxWidth || !cur) cur = next; else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** A board face: a coloured title bar and the text in white lines below. Draws into `canvas` and returns whether it could. */
export function drawBoard(canvas: HTMLCanvasElement, title: string, text: string, color: string): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#10182e'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H * 0.26);
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(H * 0.16)}px system-ui, sans-serif`; ctx.fillText(title, W / 2, H * 0.13);
  const size = Math.round(H * 0.13); ctx.font = `600 ${size}px system-ui, sans-serif`;
  const lines = wrapLines(s => ctx.measureText(s).width, text, W * 0.9).slice(0, 4);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.4 + i * size * 1.25));
  return true;
}

/** A round map pin: a white disc with a soft ring and the place's icon in the middle, like the markers of a map. Where a canvas cannot be made, an empty sprite is returned. */
export function pinSprite(icon: string, ring: string, height: number): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  let tex: THREE.CanvasTexture | undefined;
  if (ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(64, 70, 54, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(64, 64, 54, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ring; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(64, 64, 49, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '60px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#16203a'; ctx.fillText(icon, 64, 68);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(height, height, 1); sp.renderOrder = 11;
  return sp;
}
