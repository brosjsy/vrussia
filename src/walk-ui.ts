/* Walking by hand in the 3D city (a separate download, fetched when the 3D view opens): W A S D or the arrow keys on a keyboard,
   a round stick in the corner on a touch screen. Standing at a door shows a chip that goes in (or travels there, which takes the usual time).
   Holding the keys only moves the person in the picture: the game's day does not move until the player goes somewhere. */
import { placeById } from './engine';
import { placeL } from './i18n-words';
import './i18n-life';
import { t } from './i18n';

export interface Walker {
  walk: (dir: { x: number; z: number } | null) => void;
  walkInfo: () => { near: string | null; waiting: boolean };
}
export interface WalkOpts { here: () => string; go: (placeId: string) => void; stick?: boolean; blocked?: () => boolean }

const KEYS: Record<string, [number, number]> = { w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };

/** The direction the held keys point to (x to the right, z away from the viewer), at most 1 long; null when none are held. */
export function keyDir(held: Iterable<string>): { x: number; z: number } | null {
  let x = 0, z = 0;
  for (const k of held) { const v = KEYS[k]; if (v) { x += v[0]; z += v[1]; } }
  const l = Math.hypot(x, z); return l ? { x: x / l, z: z / l } : null;
}
/** The direction of the stick from where it is pressed, relative to its centre and radius (screen y grows downwards). */
export function stickDir(dx: number, dy: number, radius: number): { x: number; z: number } | null {
  const l = Math.hypot(dx, dy); if (l < radius * 0.15) return null;
  const k = Math.min(1, l / radius) / l; return { x: dx * k, z: -dy * k };
}

/** Starts the controls over the 3D view; the result stops them. */
export function mountWalk(host: HTMLElement, ctl: Walker, o: WalkOpts): () => void {
  const held = new Set<string>();
  let stick: { x: number; z: number } | null = null;
  const push = (): void => { ctl.walk(stick ?? keyDir(held)); };
  const typing = (e: Event): boolean => { const el = e.target as HTMLElement | null; return !!el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName); };
  const down = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase(); if (!KEYS[k] || typing(e) || e.ctrlKey || e.metaKey || e.altKey || o.blocked?.()) return;
    e.preventDefault(); if (!held.has(k)) { held.add(k); push(); }
  };
  const up = (e: KeyboardEvent): void => { const k = e.key.toLowerCase(); if (held.delete(k)) push(); };
  const blur = (): void => { held.clear(); stick = null; push(); };
  document.addEventListener('keydown', down); document.addEventListener('keyup', up); window.addEventListener('blur', blur);

  // the stick: shown on touch screens (or when asked); a finger pressed on it walks, lifting it stops
  const coarse = o.stick ?? (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
  let pad: HTMLElement | null = null;
  if (coarse) {
    pad = document.createElement('div'); pad.className = 'walkStick'; pad.setAttribute('role', 'application'); pad.setAttribute('aria-label', t('walkStick'));
    pad.innerHTML = '<span class="knob"></span>'; host.appendChild(pad);
    const knob = pad.querySelector<HTMLElement>('.knob')!;
    const at = (e: PointerEvent): void => {
      const r = pad!.getBoundingClientRect(), rad = (r.width || 110) / 2, dx = e.clientX - (r.left + rad), dy = e.clientY - (r.top + rad);
      stick = stickDir(dx, dy, rad); const d = Math.hypot(dx, dy), k = (d > rad ? rad / d : 1) * 0.6;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`; push();
    };
    let id = -1;
    pad.addEventListener('pointerdown', e => { id = e.pointerId; try { pad!.setPointerCapture(e.pointerId); } catch { /* not every browser */ } e.preventDefault(); at(e); });
    pad.addEventListener('pointermove', e => { if (e.pointerId === id) at(e); });
    const stop = (e: PointerEvent): void => { if (e.pointerId !== id) return; id = -1; stick = null; knob.style.transform = ''; push(); };
    pad.addEventListener('pointerup', stop); pad.addEventListener('pointercancel', stop);
  }

  // the chip at a door
  const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'walkNear'; chip.hidden = true; host.appendChild(chip);
  let shown = '';
  chip.onclick = () => { if (shown) { held.clear(); stick = null; push(); o.go(shown); } };
  const look = (): void => {
    const w = ctl.walkInfo(), near = w.near;
    const text = w.waiting ? `🚗 ${t('walkWait')}` : near ? `🚪 ${t(near === o.here() ? 'walkIn' : 'walkGo')}: ${placeL(placeById(near).n)}` : '';
    if (text !== chip.textContent) chip.textContent = text;
    shown = w.waiting ? '' : near ?? ''; chip.hidden = !text; chip.disabled = w.waiting;
  };
  const timer = window.setInterval(look, 300); look();

  return () => {
    window.clearInterval(timer); document.removeEventListener('keydown', down); document.removeEventListener('keyup', up); window.removeEventListener('blur', blur);
    pad?.remove(); chip.remove(); ctl.walk(null);
  };
}
