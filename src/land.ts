/* Land, materials and the designer: anyone can buy a plot in a city, order building materials, arrange walls, doors, windows, floors, counters, shelves and a
   sign on the plot by picking pieces up and dropping them, and then open the finished building as a shop. Every price, size and waiting time is an invented
   game value; the rules are simplified from real life and each has its source in platform/citations.ts (land purchase and registration, land tax, notification of
   building, the online cash register). A foreigner may buy city land here as in life, but the plots on offer are never farmland or border land, which a foreigner may not buy.
   Pure functions over the game state: they use only the State type, so the engine's daily tick and the tests can call them. The screens are in land-ui.ts. */
import type { State, Biz } from './engine';

/* ---------- plots ---------- */
export type Purpose = 'home' | 'shop';
export interface Plot { id: number; offer: string; city: string; district: string; cols: number; rows: number; price: number; purpose: Purpose; boughtDay: number; taxPaidDay: number; permit: 'none' | 'asked' | 'granted'; permitDay: number; grid: string; shop?: string }
export interface Offer { id: string; district: string; cols: number; rows: number; price: number; purpose: Purpose }
export interface Order { id: number; item: string; qty: number; arriveDay: number }
export interface LandState { plots: Plot[]; stock: Record<string, number>; orders: Order[]; next: number }
export interface Result { ok: boolean; msg: string }

export const CELL_M2 = 4;                           // one square of the designer is 2 m by 2 m
export const REGISTRATION_FEE = 2000;               // state duty for registering ownership of land by a private person (simplified)
export const TAX_HOME = 0.003, TAX_OTHER = 0.015;   // land tax: 0.3% for housing plots, 1.5% for the rest, of the cadastral value (Tax Code art. 394)
export const CADASTRAL_SHARE = 0.8;                 // the cadastral value of a plot in the game is 80% of its price
export const CASH_REGISTER = 25000;                 // an online cash register for a shop (54-FZ)
export const YEAR = 365;

const BIG = new Set(['Moscow', 'Saint Petersburg']);
const MILLION = new Set(['Kazan', 'Yekaterinburg', 'Novosibirsk', 'Krasnodar', 'Nizhny Novgorod', 'Samara', 'Rostov-on-Don', 'Ufa', 'Krasnoyarsk', 'Perm', 'Voronezh', 'Volgograd', 'Chelyabinsk', 'Omsk', 'Sochi']);
/** Price of one square metre in a city: Moscow and Saint Petersburg the dearest, big cities in the middle, the rest the cheapest. */
export const perM2 = (city: string): number => BIG.has(city) ? 4500 : MILLION.has(city) ? 2200 : 1100;

const DISTRICTS = ['Centre', 'Station quarter', 'Riverside', 'Market street', 'University district', 'New town', 'Old town', 'Park side'];
const SIZES: [number, number][] = [[4, 3], [5, 4], [6, 5], [8, 6], [10, 8]];
const hash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h; };

/** The plots for sale in the player's city: six, the same for the same city and month, each with a size, a district and a price. */
export function offersFor(s: State): Offer[] {
  const month = Math.floor(s.day / 30);
  return Array.from({ length: 6 }, (_, i) => {
    const h = hash(`${s.city}|${month}|${i}`), [cols, rows] = SIZES[h % SIZES.length];
    const district = DISTRICTS[(h >>> 4) % DISTRICTS.length], purpose: Purpose = i % 2 === 0 ? 'home' : 'shop';
    const swing = 0.85 + ((h >>> 9) % 31) / 100;                         // 0.85 to 1.15
    return { id: `${s.city}:${month}:${i}`, district, cols, rows, purpose, price: Math.round(cols * rows * CELL_M2 * perM2(s.city) * (purpose === 'shop' ? 1.25 : 1) * swing / 1000) * 1000 };
  });
}

/* ---------- state ---------- */
const state = (s: State): LandState => {
  const x = s as State & { land?: LandState };
  const l = x.land;
  if (!l || typeof l !== 'object' || !Array.isArray(l.plots) || !Array.isArray(l.orders) || typeof l.stock !== 'object' || l.stock === null) x.land = { plots: [], stock: {}, orders: [], next: 1 };
  return x.land as LandState;
};
export const landOf = (s: State): LandState => state(s);
export const plotOf = (s: State, id: number): Plot | undefined => state(s).plots.find(p => p.id === id);
export const m2 = (p: { cols: number; rows: number }): number => p.cols * p.rows * CELL_M2;

/** Can this player buy land? Any adult in the game can; money is the only test (and a plot must be bought for one of the two purposes). */
export function buyPlot(s: State, offerId: string): Result {
  const o = offersFor(s).find(x => x.id === offerId);
  if (!o) return { ok: false, msg: 'That plot is no longer for sale.' };
  const l = state(s);
  if (l.plots.some(p => p.offer === offerId)) return { ok: false, msg: 'You have already bought that plot.' };
  if (l.plots.length >= 6) return { ok: false, msg: 'Six plots is enough to look after for now.' };
  const total = o.price + REGISTRATION_FEE;
  if (s.money < total) return { ok: false, msg: `The plot costs ${o.price.toLocaleString('en-US')} ₽ plus ${REGISTRATION_FEE.toLocaleString('en-US')} ₽ to register the ownership; you have ${Math.floor(s.money).toLocaleString('en-US')} ₽.` };
  s.money -= total;
  l.plots.push({ id: l.next++, offer: offerId, city: s.city, district: o.district, cols: o.cols, rows: o.rows, price: o.price, purpose: o.purpose, boughtDay: s.day, taxPaidDay: s.day, permit: 'none', permitDay: 0, grid: ' '.repeat(o.cols * o.rows) });
  return { ok: true, msg: `The plot in ${s.city}, ${o.district} (${o.cols * o.rows * CELL_M2} m²) is yours. The ownership is registered in the state register (${REGISTRATION_FEE.toLocaleString('en-US')} ₽ duty).` };
}

/* ---------- land tax ---------- */
export const cadastral = (p: Plot): number => Math.round(p.price * CADASTRAL_SHARE);
export const taxPerYear = (p: Plot): number => Math.round(cadastral(p) * (p.purpose === 'home' ? TAX_HOME : TAX_OTHER));
/** Tax owed for the whole years since it was last paid. */
export function taxDue(s: State): number { return state(s).plots.reduce((t, p) => t + Math.max(0, Math.floor((s.day - p.taxPaidDay) / YEAR)) * taxPerYear(p), 0); }
export function payTax(s: State): Result {
  const due = taxDue(s);
  if (due <= 0) return { ok: false, msg: 'No land tax is due. It is charged once a year for each whole year you have owned a plot.' };
  if (s.money < due) return { ok: false, msg: `The land tax is ${due.toLocaleString('en-US')} ₽ and you have ${Math.floor(s.money).toLocaleString('en-US')} ₽.` };
  s.money -= due;
  for (const p of state(s).plots) p.taxPaidDay += Math.floor((s.day - p.taxPaidDay) / YEAR) * YEAR;
  return { ok: true, msg: `Land tax paid: ${due.toLocaleString('en-US')} ₽.` };
}

/* ---------- permits ---------- */
/** A housing plot needs only a notification of planned building (art. 51.1 of the Town Planning Code), a shop needs a building permit: both are free, and take a day or three. */
export const permitDays = (p: Plot): number => p.purpose === 'home' ? 1 : 3;
export function askPermit(s: State, id: number): Result {
  const p = plotOf(s, id); if (!p) return { ok: false, msg: 'No such plot.' };
  if (p.permit === 'granted') return { ok: false, msg: 'You already have it.' };
  if (p.permit === 'asked') return { ok: false, msg: 'The application is already with the city administration.' };
  p.permit = 'asked'; p.permitDay = s.day + permitDays(p);
  return { ok: true, msg: p.purpose === 'home' ? 'Notification of planned building sent. The administration has seven working days in life; in the game it takes one day.' : 'Building permit applied for. It takes about three days in the game.' };
}
/** Settles permits and deliveries that are due. Called when a screen opens and by the daily tick. */
export function settle(s: State): string[] {
  const l = state(s), out: string[] = [];
  for (const p of l.plots) if (p.permit === 'asked' && s.day >= p.permitDay) { p.permit = 'granted'; out.push(`${p.purpose === 'home' ? 'Building notification accepted' : 'Building permit granted'} for your plot in ${p.district}.`); }
  const arrived = l.orders.filter(o => s.day >= o.arriveDay);
  for (const o of arrived) { l.stock[o.item] = (l.stock[o.item] || 0) + o.qty; out.push(`Delivered: ${o.qty} × ${MATERIALS.find(m => m.id === o.item)?.name ?? o.item}.`); }
  if (arrived.length) l.orders = l.orders.filter(o => s.day < o.arriveDay);
  return out;
}

/* ---------- materials ---------- */
export interface Material { id: string; name: string; icon: string; price: number }
export const MATERIALS: Material[] = [
  { id: 'brick', name: 'Bricks (pack)', icon: '🧱', price: 900 }, { id: 'board', name: 'Floor boards (pack)', icon: '📦', price: 700 }, { id: 'timber', name: 'Timber', icon: '🌲', price: 1200 },
  { id: 'glass', name: 'Window glass', icon: '🔲', price: 2500 }, { id: 'door', name: 'Door', icon: '🚪', price: 6500 }, { id: 'paint', name: 'Paint and boards for a sign', icon: '🎨', price: 1100 },
];
export const matById = (id: string): Material | undefined => MATERIALS.find(m => m.id === id);
export const MAX_ORDER = 60;
/** Delivery takes one day, and one more for every ten pieces. */
export const deliveryDays = (qty: number): number => 1 + Math.floor(qty / 10);
export function orderMaterial(s: State, id: string, qty: number): Result {
  const m = matById(id), n = Math.floor(Number(qty));
  if (!m) return { ok: false, msg: 'No such material.' };
  if (!Number.isFinite(n) || n < 1 || n > MAX_ORDER) return { ok: false, msg: `Order between 1 and ${MAX_ORDER} at a time.` };
  const l = state(s);
  if (l.orders.length >= 12) return { ok: false, msg: 'Too many deliveries on the way. Wait for some to arrive.' };
  const cost = m.price * n;
  if (s.money < cost) return { ok: false, msg: `That costs ${cost.toLocaleString('en-US')} ₽ and you have ${Math.floor(s.money).toLocaleString('en-US')} ₽.` };
  s.money -= cost;
  const days = deliveryDays(n);
  l.orders.push({ id: l.next++, item: id, qty: n, arriveDay: s.day + days });
  return { ok: true, msg: `${n} × ${m.name} ordered for ${cost.toLocaleString('en-US')} ₽. Delivery in ${days} day${days === 1 ? '' : 's'}.` };
}

/* ---------- the designer ---------- */
export type Piece = 'wall' | 'door' | 'window' | 'floor' | 'counter' | 'shelf' | 'sign';
export interface PieceInfo { id: Piece; ch: string; name: string; icon: string; needs: Record<string, number>; structural: boolean }
export const PIECES: PieceInfo[] = [
  { id: 'wall', ch: 'w', name: 'Wall', icon: '🧱', needs: { brick: 1 }, structural: true }, { id: 'door', ch: 'd', name: 'Door', icon: '🚪', needs: { door: 1 }, structural: true },
  { id: 'window', ch: 'n', name: 'Window', icon: '🔲', needs: { glass: 1 }, structural: true }, { id: 'floor', ch: 'f', name: 'Floor', icon: '🟫', needs: { board: 1 }, structural: false },
  { id: 'counter', ch: 'c', name: 'Counter', icon: '🛒', needs: { timber: 2 }, structural: false }, { id: 'shelf', ch: 's', name: 'Shelf', icon: '📚', needs: { timber: 1 }, structural: false },
  { id: 'sign', ch: 'g', name: 'Sign', icon: '🔖', needs: { paint: 1 }, structural: false },
];
export const pieceById = (id: string): PieceInfo | undefined => PIECES.find(p => p.id === id);
const byChar = (ch: string): PieceInfo | undefined => PIECES.find(p => p.ch === ch);
export const cellAt = (p: Plot, i: number, j: number): PieceInfo | undefined => (i < 0 || j < 0 || i >= p.cols || j >= p.rows) ? undefined : byChar(p.grid[j * p.cols + i]);
const setCell = (p: Plot, i: number, j: number, ch: string): void => { const k = j * p.cols + i; p.grid = p.grid.slice(0, k) + ch + p.grid.slice(k + 1); };

/** Drops a piece on a square (the materials are used up). A wall, door or window needs the permit first. Putting a piece on a used square is refused: pick the old one up first. */
export function drop(s: State, plotId: number, piece: string, i: number, j: number): Result {
  const p = plotOf(s, plotId), info = pieceById(piece);
  if (!p || !info) return { ok: false, msg: 'Nothing to place.' };
  if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= p.cols || j >= p.rows) return { ok: false, msg: 'That is outside your plot.' };
  if (info.structural && p.permit !== 'granted') return { ok: false, msg: p.purpose === 'home' ? 'Send the notification of planned building first: building without it is a breach of the rules.' : 'Get the building permit first.' };
  if (cellAt(p, i, j)) return { ok: false, msg: 'That square is taken. Pick up what is there first.' };
  const l = state(s);
  for (const [k, n] of Object.entries(info.needs)) if ((l.stock[k] || 0) < n) return { ok: false, msg: `You need ${n} × ${matById(k)?.name ?? k} and have ${l.stock[k] || 0}. Order more under Materials.` };
  for (const [k, n] of Object.entries(info.needs)) l.stock[k] -= n;
  setCell(p, i, j, info.ch);
  return { ok: true, msg: `${info.name} placed.` };
}
/** Lifts a piece off a square: its materials come back to the stock, so moving a piece costs nothing. */
export function lift(s: State, plotId: number, i: number, j: number): { ok: boolean; msg: string; piece?: Piece } {
  const p = plotOf(s, plotId); if (!p) return { ok: false, msg: 'No such plot.' };
  const c = cellAt(p, i, j); if (!c) return { ok: false, msg: 'Nothing there.' };
  if (p.shop) return { ok: false, msg: 'The shop is open: close it before you rebuild.' };
  const l = state(s);
  for (const [k, n] of Object.entries(c.needs)) l.stock[k] = (l.stock[k] || 0) + n;
  setCell(p, i, j, ' ');
  return { ok: true, msg: `${c.name} picked up.`, piece: c.id };
}

export interface Check { closed: boolean; room: number; entrance: boolean; counters: number; shelves: number; signs: number; problems: string[] }
/** Is the building a real building? Rooms (floor squares) the outside cannot reach without passing a wall, a window or a door; at least one door between inside and outside. */
export function inspect(p: Plot): Check {
  const open = (i: number, j: number): boolean => { const c = cellAt(p, i, j); return !c || !(c.id === 'wall' || c.id === 'window' || c.id === 'door'); };
  const outside = new Set<number>(), todo: number[] = [];
  const push = (i: number, j: number): void => { if (i < 0 || j < 0 || i >= p.cols || j >= p.rows) return; const k = j * p.cols + i; if (!outside.has(k) && open(i, j)) { outside.add(k); todo.push(k); } };
  for (let i = 0; i < p.cols; i++) { push(i, 0); push(i, p.rows - 1); }
  for (let j = 0; j < p.rows; j++) { push(0, j); push(p.cols - 1, j); }
  while (todo.length) { const k = todo.pop() as number, i = k % p.cols, j = Math.floor(k / p.cols); push(i + 1, j); push(i - 1, j); push(i, j + 1); push(i, j - 1); }
  let room = 0, counters = 0, shelves = 0, signs = 0, leaking = 0;
  for (let j = 0; j < p.rows; j++) for (let i = 0; i < p.cols; i++) {
    const c = cellAt(p, i, j), inside = !!c && c.id !== 'wall' && c.id !== 'window' && c.id !== 'door' && !outside.has(j * p.cols + i);
    if (c?.id === 'floor') { if (outside.has(j * p.cols + i)) leaking++; else room++; }
    if (inside && c?.id === 'counter') counters++; if (inside && c?.id === 'shelf') shelves++;
    if (c?.id === 'sign') signs++;
  }
  let entrance = false;
  for (let j = 0; j < p.rows && !entrance; j++) for (let i = 0; i < p.cols && !entrance; i++) if (cellAt(p, i, j)?.id === 'door') {
    const ns: [number, number][] = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]];
    const out = ns.some(([a, b]) => a < 0 || b < 0 || a >= p.cols || b >= p.rows || outside.has(b * p.cols + a));
    const inn = ns.some(([a, b]) => cellAt(p, a, b)?.id === 'floor' && !outside.has(b * p.cols + a));
    if (out && inn) entrance = true;
  }
  const problems: string[] = [];
  if (room < 4) problems.push('Build a closed room with at least 4 floor squares inside walls.');
  if (!entrance) problems.push('Add a door between the room and the outside.');
  if (leaking) problems.push('Some floor squares are outside the walls: close the walls or take the floor up.');
  return { closed: room >= 4 && leaking === 0, room, entrance, counters, shelves, signs, problems };
}

/* ---------- the shop ---------- */
export const canTrade = (s: State): boolean => s.status === 'citizen' || s.status === 'eaeu' || s.docs.reg > 0;
/** A shop on a shop plot: the building must be a real building with a counter, a shelf and a sign; the owner must be registered (self-employed or an individual entrepreneur) and pay for an online cash register. */
export function openShop(s: State, plotId: number, name: string): Result {
  const p = plotOf(s, plotId); if (!p) return { ok: false, msg: 'No such plot.' };
  if (p.purpose !== 'shop') return { ok: false, msg: 'This plot is for housing. A shop needs a plot bought for a shop.' };
  if (p.shop) return { ok: false, msg: 'The shop is already open.' };
  if (s.biz) return { ok: false, msg: 'You already run a business. Close it before you open another.' };
  if (!canTrade(s)) return { ok: false, msg: 'To trade you must be registered in Russia: finish your migration registration first.' };
  const c = inspect(p);
  const need = [...c.problems, ...(c.counters < 1 ? ['Put a counter inside.'] : []), ...(c.shelves < 1 ? ['Put a shelf inside.'] : []), ...(c.signs < 1 ? ['Put up a sign.'] : [])];
  if (need.length) return { ok: false, msg: need[0] };
  if (s.money < CASH_REGISTER) return { ok: false, msg: `An online cash register costs ${CASH_REGISTER.toLocaleString('en-US')} ₽ and a shop must have one.` };
  const clean = name.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30) || 'My shop';
  s.money -= CASH_REGISTER;
  const level = Math.min(3, 1 + Math.floor((c.counters + c.shelves) / 4));
  const biz: Biz = { kind: 'shop', name: clean, level, staff: 0, rep: 50, regime: s.status === 'citizen' ? 'ip' : 'npd', profit: 0, weeks: 0, revenueYear: 0 };
  s.biz = biz; p.shop = clean; s.flags.bizOpened = true;
  return { ok: true, msg: `${clean} is open. You registered as ${biz.regime === 'ip' ? 'an individual entrepreneur' : 'self-employed'} and bought an online cash register (${CASH_REGISTER.toLocaleString('en-US')} ₽). Level ${level}: more counters and shelves sell more.` };
}
export function closeShop(s: State, plotId: number): Result {
  const p = plotOf(s, plotId); if (!p || !p.shop) return { ok: false, msg: 'No shop is open there.' };
  if (s.biz && s.biz.kind === 'shop') s.biz = null;
  p.shop = undefined;
  return { ok: true, msg: 'The shop is closed. You can rebuild the building.' };
}
