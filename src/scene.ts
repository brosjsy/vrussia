/* Animated city scene: sky by time of day, skyline by city, weather particles, a train and a walking avatar. */
import type { State } from './engine';

interface Particle { x: number; y: number; v: number; r: number; d: number }

const SKY: Record<number, [string, string]> = {
  0: ['#f6b26b', '#7fa6d8'],   // morning
  1: ['#6db3f2', '#cfe8ff'],   // afternoon
  2: ['#2b2f6b', '#e8785a'],   // evening
};

type Skyline = (g: CanvasRenderingContext2D, w: number, base: number, col: string) => void;

const block = (g: CanvasRenderingContext2D, x: number, base: number, w: number, h: number): void => { g.fillRect(x, base - h, w, h); };
const dome = (g: CanvasRenderingContext2D, cx: number, base: number, r: number, h: number): void => {
  g.fillRect(cx - r * 0.55, base - h, r * 1.1, h);
  g.beginPath(); g.ellipse(cx, base - h, r, r * 1.25, 0, Math.PI, 0); g.quadraticCurveTo(cx + r * 0.3, base - h - r * 2.1, cx, base - h - r * 2.3); g.quadraticCurveTo(cx - r * 0.3, base - h - r * 2.1, cx - r, base - h); g.fill();
  g.fillRect(cx - 1, base - h - r * 3.1, 2, r * 0.9);
};

const moscow: Skyline = (g, w, b, col) => {
  g.fillStyle = col;
  for (let x = 0; x < w; x += 46) block(g, x, b, 40, 30 + ((x * 7) % 35));
  const c = w * 0.5;
  block(g, c - 90, b, 180, 34);
  block(g, c - 6, b, 12, 90); g.beginPath(); g.moveTo(c - 10, b - 90); g.lineTo(c, b - 120); g.lineTo(c + 10, b - 90); g.fill();
  dome(g, c - 52, b - 34, 11, 24); dome(g, c + 50, b - 34, 11, 24); dome(g, c - 28, b - 34, 8, 16);
};
const spb: Skyline = (g, w, b, col) => {
  g.fillStyle = col;
  for (let x = 0; x < w; x += 54) block(g, x, b, 50, 26 + ((x * 5) % 22));
  const c = w * 0.55;
  block(g, c - 12, b, 24, 70);
  g.beginPath(); g.moveTo(c - 6, b - 70); g.lineTo(c, b - 150); g.lineTo(c + 6, b - 70); g.fill();
  block(g, c - 60, b, 40, 40); dome(g, c - 40, b - 40, 14, 10);
};
const kazan: Skyline = (g, w, b, col) => {
  g.fillStyle = col;
  for (let x = 0; x < w; x += 48) block(g, x, b, 42, 28 + ((x * 3) % 34));
  const c = w * 0.5;
  block(g, c - 80, b, 160, 40);
  for (const dx of [-60, -36, 36, 60]) { block(g, c + dx - 4, b - 40, 8, 62); g.beginPath(); g.moveTo(c + dx - 6, b - 102); g.lineTo(c + dx, b - 130); g.lineTo(c + dx + 6, b - 102); g.fill(); }
  g.beginPath(); g.arc(c, b - 40, 22, Math.PI, 0); g.fill();
};
const generic: Skyline = (g, w, b, col) => {
  g.fillStyle = col;
  let x = 0, i = 0;
  while (x < w) { const bw = 34 + ((i * 13) % 28), bh = 34 + ((i * 29) % 70); block(g, x, b, bw, bh); x += bw + 6; i++; }
};
const SKYLINES: Record<string, Skyline> = { Moscow: moscow, 'Saint Petersburg': spb, Kazan: kazan };

export function startScene(canvas: HTMLCanvasElement, getState: () => State | null): () => void {
  const g = canvas.getContext('2d');
  if (!g) return () => {};
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, raf = 0, t = 0;
  let parts: Particle[] = [];
  let partKind = '';

  const resize = (): void => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(280, r.width); h = 170;
    canvas.width = w * dpr; canvas.height = h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const seed = (kind: string): void => {
    partKind = kind;
    const n = kind === 'snow' ? 90 : kind === 'frost' ? 45 : kind === 'rain' ? 120 : 0;
    parts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, v: 0.6 + Math.random() * 1.8, r: 0.8 + Math.random() * 1.8, d: Math.random() * 6 }));
  };

  const frame = (): void => {
    const s = getState();
    t += 1;
    const slot = s ? s.slot : 1;
    const weather = s ? s.weather : 'clear';
    const city = s ? s.city : 'Moscow';
    if (weather !== partKind) seed(weather);
    const grey = weather === 'rain' || weather === 'snow';
    const [top, bot] = SKY[slot] || SKY[1];
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, grey ? '#7b8798' : top); grad.addColorStop(1, grey ? '#aab4c2' : bot);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);

    // sun or moon on an arc, drifting slowly
    const prog = ((slot + 0.5) / 3 + (t % 3000) / 3000 * 0.04);
    const sx = w * (0.1 + 0.8 * prog), sy = h * 0.62 - Math.sin(prog * Math.PI) * h * 0.5;
    if (!grey) {
      g.fillStyle = slot === 2 ? '#f5e9c8' : weather === 'heat' ? '#fff3a0' : '#ffe27a';
      g.beginPath(); g.arc(sx, sy, weather === 'heat' ? 22 : 16, 0, Math.PI * 2); g.fill();
    }
    // slow clouds
    g.fillStyle = grey ? 'rgba(80,90,105,.55)' : 'rgba(255,255,255,.6)';
    for (let i = 0; i < 4; i++) {
      const cx = ((t * (0.12 + i * 0.05) + i * 220) % (w + 160)) - 80, cy = 22 + i * 14;
      g.beginPath(); g.ellipse(cx, cy, 36, 10, 0, 0, Math.PI * 2); g.ellipse(cx + 20, cy - 5, 22, 9, 0, 0, Math.PI * 2); g.fill();
    }

    // skyline (far + near)
    const base = h - 34;
    (SKYLINES[city] || generic)(g, w, base - 6, slot === 2 ? 'rgba(20,24,48,.55)' : 'rgba(70,86,120,.45)');
    generic(g, w * 1.4, base, slot === 2 ? '#141a33' : '#33415e');
    // lit windows in the evening
    if (slot === 2) {
      g.fillStyle = 'rgba(255,220,120,.85)';
      for (let x = 8; x < w; x += 22) for (let y = base - 54; y < base - 6; y += 14) if (((x * 7 + y * 3) % 5) === 0 && Math.sin(t / 50 + x) > -0.9) g.fillRect(x, y, 3, 4);
    }
    // ground
    g.fillStyle = weather === 'snow' || weather === 'frost' ? '#e8eef7' : '#4b5b46'; g.fillRect(0, base, w, h - base);
    g.fillStyle = '#2a2f3a'; g.fillRect(0, base + 12, w, 14);
    g.fillStyle = '#f6c744'; for (let x = (-t * 1.5) % 40; x < w; x += 40) g.fillRect(x, base + 18, 20, 2);

    // train / tram moving across
    const tx = (t * 1.6) % (w + 220) - 200;
    g.fillStyle = '#d2373f'; g.fillRect(tx, base - 4, 170, 15);
    g.fillStyle = '#ffffff'; g.fillRect(tx, base + 2, 170, 2);
    g.fillStyle = slot === 2 ? '#ffe9a6' : '#bfe0ff';
    for (let i = 0; i < 6; i++) g.fillRect(tx + 8 + i * 27, base - 1, 16, 6);

    // walking avatar from the player's profile
    if (s) {
      const ax = ((t * 0.7) % (w + 80)) - 40;
      const bob = Math.sin(t / 5) * 2;
      g.font = '24px system-ui, "Segoe UI Emoji", sans-serif'; g.textBaseline = 'alphabetic';
      g.fillText(s.icon, ax, base + 10 + bob);
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(ax + 11, base + 14, 11, 3, 0, 0, Math.PI * 2); g.fill();
    }

    // weather
    for (const p of parts) {
      if (weather === 'rain') {
        g.strokeStyle = 'rgba(210,225,255,.7)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - 3, p.y + 9); g.stroke();
        p.y += p.v * 6; p.x -= 1.6;
      } else {
        g.fillStyle = weather === 'frost' ? 'rgba(220,240,255,.8)' : 'rgba(255,255,255,.95)';
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
        p.y += p.v * (weather === 'frost' ? 0.5 : 1); p.x += Math.sin((t + p.d * 60) / 40) * 0.6;
      }
      if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
      if (p.x < -5) p.x = w + 5;
    }
    if (weather === 'heat') { g.fillStyle = `rgba(255,230,150,${0.08 + 0.04 * Math.sin(t / 30)})`; g.fillRect(0, 0, w, h); }

    if (!reduced) raf = requestAnimationFrame(frame);
  };

  const onResize = (): void => { resize(); seed(partKind || 'clear'); if (reduced) frame(); };
  window.addEventListener('resize', onResize);
  resize(); seed('clear'); frame();
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
}

/** Re-draw once (used when reduced motion is on and the state changed). */
export const redraw = (): void => { window.dispatchEvent(new Event('resize')); };
