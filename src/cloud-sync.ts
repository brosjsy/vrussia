/* Saving to the server without the player thinking about it. When a player is signed in: every 30 seconds, if the game changed since the last upload,
   the save goes up; when the tab is hidden or closed it goes up at once; if the connection is gone, the game keeps playing on this device and the
   save goes up as soon as the browser says it is online again. The home is shown to other players (published) at most every five minutes, when its
   furniture or looks changed. The game itself always saves on this device first, so nothing is lost when the server cannot be reached.
   Loaded only when the online part is switched on. */
import type { State } from './engine';
import type { OnlineClient as Cloud, HomeDesign } from './cloud';

export interface SyncDeps {
  cloud: Cloud; state: () => State | null;
  home?: () => { city: string; dwelling: string; design: HomeDesign; stars: number } | null;
  now?: () => number; win?: Pick<Window, 'addEventListener' | 'removeEventListener' | 'setInterval' | 'clearInterval'>; doc?: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>;
  onStatus?: (s: SyncStatus) => void;
}
export interface SyncStatus { lastSaved: number | null; pending: boolean; error: string }
export const EVERY_MS = 30_000, HOME_EVERY_MS = 300_000;
/** A short fingerprint of a saved game: enough to see that something changed, without sending anything when nothing did. */
export const fingerprint = (s: State): string => { const j = JSON.stringify(s); let h = 2166136261; for (let i = 0; i < j.length; i++) h = Math.imul(h ^ j.charCodeAt(i), 16777619) >>> 0; return `${j.length}:${h}`; };

export interface Sync { flush: (why?: string) => Promise<boolean>; status: () => SyncStatus; stop: () => void }
export function startSync(d: SyncDeps): Sync {
  const now = d.now ?? (() => Date.now()), win = d.win ?? window, doc = d.doc ?? document;
  const st: SyncStatus = { lastSaved: null, pending: false, error: '' };
  let lastPrint = '', lastHome = '', lastHomeAt = -Infinity, busy = false, stopped = false;
  const tell = (): void => d.onStatus?.({ ...st });
  const flush = async (_why = 'timer'): Promise<boolean> => {
    if (stopped || busy || !d.cloud.session()?.username) return false;
    const s = d.state(); if (!s) return false;
    const p = fingerprint(s); if (p === lastPrint && !st.pending) return false;
    busy = true;
    try {
      const r = await d.cloud.save(s);
      if (r.ok) { lastPrint = p; st.pending = false; st.lastSaved = now(); st.error = ''; }
      else { st.pending = true; st.error = r.msg; }
      const h = d.home?.();
      if (r.ok && h && now() - lastHomeAt >= HOME_EVERY_MS) { const hp = JSON.stringify(h); if (hp !== lastHome) { const hr = await d.cloud.publishHome(h.city, h.dwelling, h.design, h.stars); if (hr.ok) { lastHome = hp; lastHomeAt = now(); } } }
      return r.ok;
    } finally { busy = false; tell(); }
  };
  const timer = win.setInterval(() => { void flush('timer'); }, EVERY_MS);
  const onOnline = (): void => { if (st.pending) void flush('online'); };
  const onHide = (): void => { if (doc.visibilityState === 'hidden') void flush('hidden'); };
  const onLeave = (): void => { void flush('close'); };
  win.addEventListener('online', onOnline); win.addEventListener('pagehide', onLeave); doc.addEventListener('visibilitychange', onHide);
  return {
    flush, status: () => ({ ...st }),
    stop: () => { stopped = true; win.clearInterval(timer); win.removeEventListener('online', onOnline); win.removeEventListener('pagehide', onLeave); doc.removeEventListener('visibilitychange', onHide); },
  };
}
