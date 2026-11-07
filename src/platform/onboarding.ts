/* The first-run tutorial: a short guided tour of the game screen (about a minute), with skip, back and replay.
   This file is the logic only (which step, whether it was seen); platform-ui.ts draws it. The state is kept under "vrussia_tour". */
import type { KV } from '../store';

export const TOUR_KEY = 'vrussia_tour';
/** `sel` is the element to point at (the first one found that is on screen); `key` names the texts "tour.<key>.t" and "tour.<key>.b". */
export interface TourStep { key: string; sel: string }
export const TOUR_STEPS: readonly TourStep[] = [
  { key: 'day', sel: '#date' },
  { key: 'map', sel: '#cityView' },
  { key: 'act', sel: '#actions' },
  { key: 'meters', sel: '#hud' },
  { key: 'papers', sel: '#docs' },
  { key: 'phone', sel: '#dockPhone' },
  { key: 'settings', sel: '#settingsBtn' },
];

export type TourStatus = 'new' | 'done' | 'skipped';
export interface TourState { status: TourStatus; step: number }

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

export function loadTour(kv: KV | null = defaultKV()): TourState {
  try {
    const o = JSON.parse(kv?.getItem(TOUR_KEY) ?? 'null') as Partial<TourState> | null;
    if (o && (o.status === 'done' || o.status === 'skipped')) return { status: o.status, step: 0 };
  } catch { /* fall through */ }
  return { status: 'new', step: 0 };
}
function put(s: TourState, kv: KV | null): void { try { kv?.setItem(TOUR_KEY, JSON.stringify(s)); } catch { /* storage may be blocked */ } }

/** True when the tour should start by itself: a player who has never finished or skipped it. */
export const shouldAutoStart = (kv: KV | null = defaultKV()): boolean => loadTour(kv).status === 'new';

/** A tour in progress. `next` past the last step finishes it (saved as done); `skip` saves it as skipped; `reset` forgets it so it can be replayed. */
export class Tour {
  step = 0;
  active = true;
  constructor(private readonly kv: KV | null = defaultKV(), private readonly steps: readonly TourStep[] = TOUR_STEPS) {}
  get current(): TourStep | null { return this.active ? this.steps[this.step] ?? null : null; }
  get total(): number { return this.steps.length; }
  get last(): boolean { return this.step >= this.steps.length - 1; }
  next(): TourStep | null {
    if (!this.active) return null;
    if (this.last) { this.finish('done'); return null; }
    this.step++;
    return this.current;
  }
  back(): TourStep | null { if (this.active && this.step > 0) this.step--; return this.current; }
  skip(): void { this.finish('skipped'); }
  private finish(status: TourStatus): void { this.active = false; put({ status, step: 0 }, this.kv); }
}
export function resetTour(kv: KV | null = defaultKV()): void { try { kv?.removeItem(TOUR_KEY); } catch { /* ignore */ } }

/** The first element for the selector that is really on screen (not hidden, with a size); null when there is none, and the step is shown centred. */
export function findTarget(sel: string, doc: Document = document): HTMLElement | null {
  for (const el of Array.from(doc.querySelectorAll<HTMLElement>(sel))) {
    if (el.hidden || el.closest('[hidden]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}
