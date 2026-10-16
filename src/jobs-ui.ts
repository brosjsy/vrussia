/* The phone's Jobs app: the two starter jobs with their rank and pay, and their shifts as mini-games: the courier taps the deliveries in the order to
   drive them, the barista makes the drink each customer asks for. The rules are in gigs.ts; this file only draws them into the phone. */
import type { State } from './engine';
import * as G from './engine';
import { GIGS, gigsOf, rankOf, cannotWork, courierRound, routeLength, bestRoute, courierScore, baristaRound, baristaScore, orderText, finishShift, RANK_AT, DRINKS, DRINKS_RU, MILKS, MILKS_RU, SUGARS } from './gigs';
import type { GigId, Order } from './gigs';
import { t, lang } from './i18n';

const esc = (x: string): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
export interface JobsDeps { back: () => void; refresh: () => void; notify: (m: string) => void }

/** Takes over the phone screen `host` until the player goes back. */
export function openJobs(host: HTMLElement, s: State, d: JobsDeps): void {
  const ru = lang() === 'ru';
  let mode: 'list' | GigId = 'list', order: number[] = [], made: Order[] = [], cur: Order = { drink: 0, milk: 0, sugar: 0 }, flash = '';
  const head = (title: string): string => `<div class="phHead"><button class="ghost" data-jb="back" aria-label="Back">‹ ${esc(t('phoneBack'))}</button><b>${esc(title)}</b></div>`;
  const note = (): string => { const f = flash; flash = ''; return f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''; };

  const list = (): string => `<div class="phone sub jobs">${head(t('jbTitle'))}${note()}<p class="sub">${esc(t('jbHint'))}</p><ul class="msgs">${GIGS.map(g => {
    const r = rankOf(s, g.id), n = gigsOf(s).shifts[g.id] ?? 0, next = RANK_AT[r + 1], why = cannotWork(s, g.id);
    return `<li class="jobCard"><span class="msgIcon" aria-hidden="true">${g.icon}</span><div><b>${esc(ru ? g.ru : g.name)} · ${esc((ru ? g.ranksRu : g.ranks)[r])}</b><small>${esc(t('jbPay'))} ${esc(G.money(Math.round(g.base * 0.6)))}–${esc(G.money(Math.round(g.base * 1.2 * [1, 1.1, 1.2][r])))} · ⚡ −${g.energy}</small>${next !== undefined ? `<small>${n}/${next} ${esc(t('jbToRank'))}</small><i class="qbar"><em style="width:${Math.round((n / next) * 100)}%"></em></i>` : `<small>${esc(t('careerTop'))}</small>`}${why ? `<small class="why">${esc(why)}</small>` : ''}</div><button type="button" class="primary" data-shift="${g.id}"${why ? ' disabled' : ''}>${esc(t('jbStart'))}</button></li>`;
  }).join('')}</ul><p class="sub">${esc(t('jbEarned'))}: ${esc(G.money(gigsOf(s).earned))}</p></div>`;

  const courier = (): string => {
    const rd = courierRound(s), cells: string[] = [];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
      const k = rd.stops.findIndex(p => p.x === x && p.y === y), at = order.indexOf(k);
      cells.push(x === 0 && y === 0 ? '<span class="cell depot" aria-label="depot">🏪</span>' : k >= 0 ? `<button type="button" class="cell stop${at >= 0 ? ' done' : ''}" data-stop="${k}" aria-label="${esc(t('jbStop'))} ${k + 1}">${at >= 0 ? at + 1 : '📦'}</button>` : '<span class="cell"></span>');
    }
    const len = order.length ? routeLength(rd, order) : 0;
    return `<div class="phone sub jobs">${head(ru ? 'Курьер' : 'Courier')}${note()}<p class="sub">${esc(t('jbCourierHint'))}</p><div class="cmap">${cells.join('')}</div>
      <p class="sub">${esc(t('jbBlocks'))}: <b>${len}</b>${order.length === rd.stops.length ? ` · ${esc(t('jbBest'))}: ${bestRoute(rd)}` : ''}</p>
      <div class="row"><button type="button" class="ghost" data-jb="reset">↺ ${esc(t('jbAgain'))}</button><button type="button" class="primary" data-jb="finish"${order.length === rd.stops.length ? '' : ' disabled'}>${esc(t('jbDeliver'))}</button></div></div>`;
  };
  const barista = (): string => {
    const orders = baristaRound(s), i = made.length, o = orders[i];
    const pick = (key: 'drink' | 'milk' | 'sugar', names: readonly (string | number)[]): string => `<div class="chipsRow">${names.map((n, k) => `<button type="button" class="chipBtn" data-make="${key}:${k}" aria-pressed="${cur[key] === k}">${esc(String(n))}${key === 'sugar' ? ' 🥄' : ''}</button>`).join('')}</div>`;
    return `<div class="phone sub jobs">${head(ru ? 'Бариста' : 'Barista')}${note()}<p class="sub">${esc(t('jbOrder'))} ${i + 1}/${orders.length}</p>
      ${o ? `<p class="bubbleOrder">🙋 «${esc(orderText(o, ru))}»</p>${pick('drink', ru ? DRINKS_RU : DRINKS)}${pick('milk', ru ? MILKS_RU : MILKS)}${pick('sugar', SUGARS)}<button type="button" class="primary" data-jb="serve">${esc(t('jbServe'))}</button>` : `<p>${esc(t('jbDone'))}</p><button type="button" class="primary" data-jb="finish">${esc(t('jbEnd'))}</button>`}</div>`;
  };

  const draw = (): void => { host.innerHTML = mode === 'list' ? list() : mode === 'courier' ? courier() : barista(); wire(); };
  const end = (id: GigId, score: number): void => { const r = finishShift(s, id, score); d.notify(r.msg); flash = r.msg; if (r.ok) d.refresh(); mode = 'list'; draw(); };
  function wire(): void {
    host.querySelectorAll<HTMLButtonElement>('[data-shift]').forEach(b => { b.onclick = () => { mode = b.dataset.shift as GigId; order = []; made = []; cur = { drink: 0, milk: 0, sugar: 0 }; draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-stop]').forEach(b => { b.onclick = () => { const k = Number(b.dataset.stop); if (!order.includes(k)) order.push(k); draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-make]').forEach(b => { b.onclick = () => { const [key, v] = (b.dataset.make as string).split(':'); cur = { ...cur, [key]: Number(v) }; draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-jb]').forEach(b => { b.onclick = () => {
      const a = b.dataset.jb;
      if (a === 'back') { if (mode === 'list') d.back(); else { mode = 'list'; draw(); } return; }
      if (a === 'reset') { order = []; draw(); return; }
      if (a === 'serve') { made.push(cur); cur = { drink: 0, milk: 0, sugar: 0 }; draw(); return; }
      if (a === 'finish') end(mode as GigId, mode === 'courier' ? courierScore(courierRound(s), order) : baristaScore(baristaRound(s), made));
    }; });
  }
  draw();
}
