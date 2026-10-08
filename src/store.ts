/* The game's local data layer.
   There is no server: everything lives in the player's browser. This module keeps the "tables" in one place so that a later
   cloud database (see docs/DATABASE.md) can be added behind the same functions without touching the game rules.
   Tables:
     runs  - one row per finished game (the "hall of fame"), newest first, capped.
   The current save game (key vrussia_save) is still managed by engine.ts; it is the "current_game" table of one row. */

export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

/** One finished game. Plain data only, so that it can be sent to a database unchanged. */
export interface RunRow {
  id: string;              // unique, sortable: <savedAt>-<random>
  name: string;            // player's name (max 20 characters)
  origin: string;          // origin id, for example "tajik"
  label: string;           // origin label shown to the player
  ending: string;          // 'time' | 'hospital' | 'deported' | 'debt'
  score: number;
  days: number;            // days survived
  citizen: boolean;
  diff: string;            // difficulty
  achievements: number;
  savedAt: number;         // epoch milliseconds
}

/** Lifetime totals across every finished game (one row), kept even when a run is too weak for the hall of fame. */
export interface Lifetime { games: number; citizens: number; bestScore: number; totalDays: number; endings: Record<string, number> }

export const RUNS_KEY = 'vrussia_runs';
export const LIFE_KEY = 'vrussia_lifetime';
export const RUNS_MAX = 20;
const SCHEMA = 1;

const defaultKV = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

const clean = (r: unknown): RunRow | null => {
  if (!r || typeof r !== 'object') return null;
  const o = r as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.score !== 'number' || !Number.isFinite(o.score) || typeof o.days !== 'number') return null;
  return {
    id: o.id.slice(0, 40), name: String(o.name ?? '').slice(0, 20), origin: String(o.origin ?? '').slice(0, 30), label: String(o.label ?? '').slice(0, 40),
    ending: String(o.ending ?? 'time').slice(0, 12), score: Math.max(0, Math.round(o.score)), days: Math.max(0, Math.round(o.days)), citizen: !!o.citizen,
    diff: String(o.diff ?? 'normal').slice(0, 10), achievements: Math.max(0, Math.round(Number(o.achievements) || 0)), savedAt: Number(o.savedAt) || 0,
  };
};

/** Finished games, best score first. Corrupt or foreign data is ignored, never thrown. */
export function hallOfFame(kv: KV | null = defaultKV()): RunRow[] {
  if (!kv) return [];
  try {
    const raw = kv.getItem(RUNS_KEY);
    const o = raw ? JSON.parse(raw) as { schema?: number; rows?: unknown[] } : null;
    if (!o || o.schema !== SCHEMA || !Array.isArray(o.rows)) return [];
    return o.rows.map(clean).filter((x): x is RunRow => !!x).sort((a, b) => b.score - a.score || b.savedAt - a.savedAt).slice(0, RUNS_MAX);
  } catch { return []; }
}

const emptyLife = (): Lifetime => ({ games: 0, citizens: 0, bestScore: 0, totalDays: 0, endings: {} });

export function lifetime(kv: KV | null = defaultKV()): Lifetime {
  if (!kv) return emptyLife();
  try {
    const raw = kv.getItem(LIFE_KEY);
    const o = raw ? JSON.parse(raw) as { schema?: number; v?: Partial<Lifetime> } : null;
    if (!o || o.schema !== SCHEMA || !o.v) return emptyLife();
    const n = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.round(x) : 0);
    const endings: Record<string, number> = {};
    for (const [k, v] of Object.entries(o.v.endings ?? {})) endings[k.slice(0, 12)] = n(v);
    return { games: n(o.v.games), citizens: n(o.v.citizens), bestScore: n(o.v.bestScore), totalDays: n(o.v.totalDays), endings };
  } catch { return emptyLife(); }
}

/** Adds a finished game and keeps only the best RUNS_MAX. Returns the new list, and whether this run made it into the list. */
export function recordRun(row: Omit<RunRow, 'id' | 'savedAt'>, kv: KV | null = defaultKV(), now: number = Date.now()): { rows: RunRow[]; kept: boolean } {
  const full = clean({ ...row, id: `${now}-${Math.random().toString(36).slice(2, 6)}`, savedAt: now });
  if (!full) return { rows: hallOfFame(kv), kept: false };
  const life = lifetime(kv);
  life.games += 1; life.citizens += full.citizen ? 1 : 0; life.bestScore = Math.max(life.bestScore, full.score); life.totalDays += full.days; life.endings[full.ending] = (life.endings[full.ending] || 0) + 1;
  if (kv) { try { kv.setItem(LIFE_KEY, JSON.stringify({ schema: SCHEMA, v: life })); } catch { /* ignore */ } }
  const rows = [...hallOfFame(kv), full].sort((a, b) => b.score - a.score || b.savedAt - a.savedAt).slice(0, RUNS_MAX);
  if (kv) { try { kv.setItem(RUNS_KEY, JSON.stringify({ schema: SCHEMA, rows })); } catch { /* storage full or blocked: the game still works */ } }
  return { rows, kept: rows.some(r => r.id === full.id) };
}

export function clearHall(kv: KV | null = defaultKV()): void { try { kv?.removeItem(RUNS_KEY); kv?.removeItem(LIFE_KEY); } catch { /* ignore */ } }
