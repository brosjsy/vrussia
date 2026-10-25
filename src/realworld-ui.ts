/* The screen of the real city (round 153): a search box for places, the card of a place (its real name, kind, distance and walking time, "Go here" and
   what the player can do there), the directions step by step while walking, and the OpenStreetMap credit. Loaded on demand with realworld3d.ts. */
import type { State } from './engine';
import { lang } from './i18n';
import { mountRealWorld } from './realworld3d';
import type { RealHandle, RealDeps } from './realworld3d';
import { KIND, searchPois, directions, pathLength, walkMinutes, realFor } from './realworld';
import type { LatLon, Poi } from './realworld';

const esc = (x: unknown): string => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const W: Record<string, [string, string]> = {
  title: ['Real city', 'Реальный город'], search: ['Find a place: metro, church, mosque, café, bank, MFC…', 'Найти место: метро, храм, мечеть, кафе, банк, МФЦ…'],
  loading: ['Loading the map around you…', 'Загружаем карту вокруг вас…'], go: ['Go here', 'Идти сюда'], skip: ['Walk there now', 'Сразу дойти'],
  close: ['Close', 'Закрыть'], exit: ['Leave the real city', 'Выйти из реального города'], away: ['m away', 'м отсюда'], min: ['min on foot', 'мин пешком'],
  noWay: ['No walking way yet: the map around this place is still loading. Try again in a moment.', 'Пешеходного пути пока нет: карта рядом ещё загружается. Попробуйте чуть позже.'],
  arrived: ['You have arrived', 'Вы на месте'], doHere: ['Do something here', 'Заняться делом'], near: ['Nearest for the game', 'Ближайшие для игры'],
  credit: ['Map data © OpenStreetMap contributors · tiles OpenFreeMap', 'Данные карты © участники OpenStreetMap · тайлы OpenFreeMap'],
  places: ['places on the map', 'мест на карте'], note: ['Real addresses: check opening hours before you go in real life.', 'Реальные адреса: в жизни проверяйте часы работы перед визитом.'],
};
const w = (k: string): string => (lang() === 'ru' ? W[k][1] : W[k][0]);
const GAME_LINKS: [string, string, string][] = [['mfc', 'MFC', 'МФЦ'], ['bank', 'Bank', 'Банк'], ['clinic', 'Clinic', 'Поликлиника'], ['uni', 'University', 'Университет'], ['market', 'Groceries', 'Продукты'], ['station', 'Station', 'Вокзал']];

export interface RealUiDeps { notify: (m: string) => void; act: (action: string) => void; close: () => void; onFail: (m: string) => void; /** tests and the dev page: stand-ins for the graphics card and the map tiles */ world?: Partial<Pick<RealDeps, 'rendererFactory' | 'fetchTile'>> }
/** Opens the real city in `host` (the 3D view's box). Returns a function that closes it. */
export async function openRealCity(host: HTMLElement, s: State, origin: LatLon, d: RealUiDeps): Promise<() => void> {
  host.innerHTML = ''; host.classList.add('realCity');
  const view = document.createElement('div'); view.className = 'realView'; host.appendChild(view);
  const ui = document.createElement('div'); ui.className = 'realUi'; host.appendChild(ui);
  let world: RealHandle | null = null, card: Poi | null = null, steps: string[] = [], query = '', status = w('loading');
  const ru = (): boolean => lang() === 'ru';
  const nameOf = (p: Poi): string => (ru() ? p.name : p.nameEn ?? p.name);
  const draw = (): void => {
    const here = world?.player() ?? { x: 0, z: 0 }, pois = world?.pois() ?? [];
    const found = query ? searchPois(pois, query, here) : [];
    const links = GAME_LINKS.map(([id, en, rus]) => { const p = realFor(id, pois, here); return p ? `<button type="button" class="realChip" data-realgo="${esc(p.id)}">${esc(ru() ? rus : en)}</button>` : ''; }).join('');
    const dist = card ? Math.round(Math.hypot(card.at.x - here.x, card.at.z - here.z)) : 0;
    ui.innerHTML = `<div class="realTop"><label class="sr" for="realQ">${esc(w('search'))}</label><input id="realQ" type="search" placeholder="${esc(w('search'))}" value="${esc(query)}" autocomplete="off">
        <button type="button" class="ghost" id="realExit">${esc(w('exit'))}</button></div>
      <p class="realStatus" role="status">${esc(status)}</p>
      ${links ? `<div class="realChips" aria-label="${esc(w('near'))}">${links}</div>` : ''}
      ${found.length ? `<ul class="realList">${found.map(p => `<li><button type="button" data-realpoi="${esc(p.id)}"><b>${esc(KIND[p.kind].icon)} ${esc(nameOf(p))}</b><span>${esc(ru() ? KIND[p.kind].ru : KIND[p.kind].en)} · ${Math.round(Math.hypot(p.at.x - here.x, p.at.z - here.z))} ${esc(w('away'))}</span></button></li>`).join('')}</ul>` : ''}
      ${card ? `<section class="realCard" aria-label="${esc(nameOf(card))}"><b>${esc(KIND[card.kind].icon)} ${esc(nameOf(card))}</b><span>${esc(ru() ? KIND[card.kind].ru : KIND[card.kind].en)}</span>
        <span>${dist} ${esc(w('away'))} · ${walkMinutes(dist * 1.3)} ${esc(w('min'))}</span><p class="sub">${esc(w('note'))}</p>
        <div class="row"><button type="button" class="primary" id="realGo">${esc(w('go'))}</button><button type="button" class="secondary" id="realSkip">${esc(w('skip'))}</button><button type="button" class="ghost" id="realDo">${esc(w('doHere'))}</button><button type="button" class="ghost" id="realClose">${esc(w('close'))}</button></div></section>` : ''}
      ${steps.length ? `<ol class="realSteps">${steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}
      <p class="realCredit">${esc(w('credit'))}</p>`;
    const q = ui.querySelector<HTMLInputElement>('#realQ')!; q.oninput = () => { query = q.value; const pos = q.selectionStart; draw(); const q2 = ui.querySelector<HTMLInputElement>('#realQ')!; q2.focus(); q2.setSelectionRange(pos, pos); };
    ui.querySelector<HTMLButtonElement>('#realExit')!.onclick = () => d.close();
    ui.querySelectorAll<HTMLButtonElement>('[data-realpoi],[data-realgo]').forEach(b => { b.onclick = () => { const id = b.dataset.realpoi ?? b.dataset.realgo; card = (world?.pois() ?? []).find(p => p.id === id) ?? null; query = ''; draw(); }; });
    const go = (): boolean => { if (!card || !world) return false; const r = world.goTo(card), g = world.graph(); if (!r.ok || !g) { d.notify(w('noWay')); return false; } steps = directions(g, r.path, nameOf(card), ru()).map(x => x.text); status = `${walkMinutes(pathLength(g, r.path))} ${w('min')}`; draw(); return true; };
    const goBtn = ui.querySelector<HTMLButtonElement>('#realGo'); if (goBtn) goBtn.onclick = () => { go(); };
    const skip = ui.querySelector<HTMLButtonElement>('#realSkip'); if (skip) skip.onclick = () => { if (go()) world?.skip(); };
    const doIt = ui.querySelector<HTMLButtonElement>('#realDo'); if (doIt) doIt.onclick = () => { if (card) d.act(KIND[card.kind].action); };
    const cl = ui.querySelector<HTMLButtonElement>('#realClose'); if (cl) cl.onclick = () => { card = null; draw(); };
  };
  draw();
  try {
    world = await mountRealWorld({
      host: view, s, origin, ...d.world,
      onPoi: p => { card = p; draw(); },
      onArrive: p => { steps = []; status = p ? `${w('arrived')}: ${nameOf(p)}` : w('arrived'); if (p) { card = p; d.notify(status); } draw(); },
      onFail: m => d.onFail(m),
      onData: () => { status = `${(world?.pois().length ?? 0).toLocaleString(ru() ? 'ru-RU' : 'en-US')} ${w('places')}`; draw(); },
    });
    status = `${world.pois().length.toLocaleString(ru() ? 'ru-RU' : 'en-US')} ${w('places')}`; draw();
  } catch (e) { d.onFail(String((e as Error)?.message ?? e)); }
  return () => { world?.destroy(); world = null; host.classList.remove('realCity'); host.innerHTML = ''; };
}
