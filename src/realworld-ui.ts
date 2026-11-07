/* The screen of the real city (round 153, extended in round 154): a search box for places, the card of a place (its real name, kind, distance and walking time,
   "Go here" and what the player can do there), the directions step by step while walking, and the OpenStreetMap credit. Since round 154 the player can also
   start anywhere in Russia: pick one of the 37 cities, or type an address or a town and choose from the answers (the search goes to the public OpenStreetMap
   geocoder, geocode.ts, only after the player agrees), and the map is built around that spot. The street and house number nearest to the player are shown,
   and the place kinds can be listed by kind (every school, every pharmacy). Loaded on demand with realworld3d.ts. */
import type { State } from './engine';
import { lang } from './i18n';
import { play } from './sound';
import { cityName } from './i18n-words';
import { mountRealWorld } from './realworld3d';
import type { RealHandle, RealDeps } from './realworld3d';
import { KIND, searchPois, directions, pathLength, walkMinutes, realFor } from './realworld';
import type { LatLon, Poi, PoiKind } from './realworld';
import { CITY_CENTERS } from './realmap';
import { metroPlan } from './realtransit';
import { geocode, geoConsent, giveGeoConsent } from './geocode';
import type { GeoHit, GeoDeps } from './geocode';

const esc = (x: unknown): string => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const W: Record<string, [string, string]> = {
  title: ['Real city', 'Реальный город'], search: ['Find a place: metro, church, mosque, café, bank, MFC…', 'Найти место: метро, храм, мечеть, кафе, банк, МФЦ…'],
  loading: ['Loading the map around you…', 'Загружаем карту вокруг вас…'], go: ['Go here', 'Идти сюда'], skip: ['Walk there now', 'Сразу дойти'],
  close: ['Close', 'Закрыть'], exit: ['Leave the real city', 'Выйти из реального города'], away: ['m away', 'м отсюда'], min: ['min on foot', 'мин пешком'],
  walkRoute: ['On foot, step by step:', 'Пешком, по шагам:'],
  noWay: ['No walking way yet: the map around this place is still loading. Try again in a moment.', 'Пешеходного пути пока нет: карта рядом ещё загружается. Попробуйте чуть позже.'],
  arrived: ['You have arrived', 'Вы на месте'], doHere: ['Do something here', 'Заняться делом'], near: ['Nearest for the game', 'Ближайшие для игры'],
  credit: ['Map data © OpenStreetMap contributors · tiles OpenFreeMap', 'Данные карты © участники OpenStreetMap · тайлы OpenFreeMap'],
  places: ['places on the map', 'мест на карте'], note: ['Real addresses: check opening hours before you go in real life.', 'Реальные адреса: в жизни проверяйте часы работы перед визитом.'],
  city: ['Go to a city', 'Перейти в город'], pick: ['Choose a city…', 'Выберите город…'], addr: ['Address or town in Russia, e.g. Tverskaya 10, Moscow', 'Адрес или населённый пункт в России, например: Тверская 10, Москва'],
  find: ['Find', 'Найти'], none: ['Nothing found. Try the street and the town.', 'Ничего не найдено. Попробуйте улицу и город.'], here: ['You are at', 'Вы находитесь'], house: ['house', 'дом'],
  kinds: ['Show every…', 'Показать все…'], ask: ['To find an address the game sends what you type to the free OpenStreetMap search service (nominatim.openstreetmap.org). Your internet address is visible to it. Nothing else is sent.', 'Чтобы найти адрес, игра отправляет набранный текст в бесплатный поисковый сервис OpenStreetMap (nominatim.openstreetmap.org). Сервис видит ваш интернет-адрес. Больше ничего не отправляется.'],
  allow: ['Allow the address search', 'Разрешить поиск адресов'], busy: ['Searching…', 'Ищем…'], elsewhere: ['You are looking at', 'Вы смотрите на'], gameCity: ['The game stays in', 'Игра остаётся в городе'],
};
const w = (k: string): string => (lang() === 'ru' ? W[k][1] : W[k][0]);
const GAME_LINKS: [string, string, string][] = [['mfc', 'MFC', 'МФЦ'], ['bank', 'Bank', 'Банк'], ['clinic', 'Clinic', 'Поликлиника'], ['uni', 'University', 'Университет'], ['market', 'Groceries', 'Продукты'], ['station', 'Station', 'Вокзал']];
/** The place kinds that can be listed in one tap, in the order people look for them. */
const KIND_CHIPS: PoiKind[] = ['school', 'church', 'mosque', 'health', 'pharmacy', 'bank', 'gov', 'police', 'post', 'food', 'grocery', 'shop', 'uni', 'culture', 'park', 'sport', 'hotel', 'metro'];
/** A found place in a few words: the geocoder writes "10, Tverskaya street, Moscow, ...", which reads better as "Tverskaya street, 10, Moscow". */
export function shortName(name: string): string {
  const parts = name.split(',').map(x => x.trim()).filter(Boolean);
  if (parts.length > 1 && /^\d+[\p{L}0-9/ ]{0,10}$/u.test(parts[0])) return [parts[1], parts[0], parts[2]].filter(Boolean).join(', ');
  return parts.slice(0, 3).join(', ');
}
const cityLabel =(en: string): string => { try { return cityName(en); } catch { return en; } };

export interface RealUiDeps { notify: (m: string) => void; act: (action: string) => void; close: () => void; onFail: (m: string) => void; /** tests and the dev page: stand-ins for the graphics card, the map tiles and the geocoder */ world?: Partial<Pick<RealDeps, 'rendererFactory' | 'fetchTile'>>; geo?: GeoDeps }
/** Opens the real city in `host` (the 3D view's box) around `origin`. Returns a function that closes it. */
export async function openRealCity(host: HTMLElement, s: State, origin: LatLon, d: RealUiDeps): Promise<() => void> {
  host.innerHTML = ''; host.classList.add('realCity');
  const view = document.createElement('div'); view.className = 'realView'; host.appendChild(view);
  const ui = document.createElement('div'); ui.className = 'realUi'; host.appendChild(ui);
  let world: RealHandle | null = null, card: Poi | null = null, steps: string[] = [], query = '', status = w('loading'), centre = origin, label = '';
  let addrQuery = '', hits: GeoHit[] | null = null, geoBusy = false, geoAsk = false, kindFilter: PoiKind | '' = '', dead = false;
  const ru = (): boolean => lang() === 'ru';
  const nameOf = (p: Poi): string => (ru() ? p.name : p.nameEn ?? p.name);
  const hereLine = (): string => {
    const a = world?.address(); if (!a || (!a.street && !a.num)) return '';
    const street = ru() ? a.street : a.streetEn ?? a.street;
    return `${w('here')}: ${[street, a.num ? `${w('house')} ${a.num}` : ''].filter(Boolean).join(', ')}`;
  };
  const draw = (): void => {
    const here = world?.player() ?? { x: 0, z: 0 }, pois = world?.pois() ?? [];
    const byKind = kindFilter ? pois.filter(p => p.kind === kindFilter).sort((a, b) => Math.hypot(a.at.x - here.x, a.at.z - here.z) - Math.hypot(b.at.x - here.x, b.at.z - here.z)).slice(0, 12) : [];
    const found = query ? searchPois(pois, query, here) : byKind;
    const links = GAME_LINKS.map(([id, en, rus]) => { const p = realFor(id, pois, here); return p ? `<button type="button" class="realChip" data-realgo="${esc(p.id)}">${esc(ru() ? rus : en)}</button>` : ''; }).join('');
    const kinds = KIND_CHIPS.map(k => `<button type="button" class="realChip kind${kindFilter === k ? ' on' : ''}" data-realkind="${k}" aria-pressed="${kindFilter === k}">${esc(KIND[k].icon)} ${esc(ru() ? KIND[k].ru : KIND[k].en)}</button>`).join('');
    const dist = card ? Math.round(Math.hypot(card.at.x - here.x, card.at.z - here.z)) : 0, line = hereLine();
    const cities = Object.keys(CITY_CENTERS).map(c => `<option value="${esc(c)}">${esc(cityLabel(c))}</option>`).join('');
    ui.innerHTML = `<div class="realTop"><label class="sr" for="realQ">${esc(w('search'))}</label><input id="realQ" type="search" placeholder="${esc(w('search'))}" value="${esc(query)}" autocomplete="off">
        <button type="button" class="ghost" id="realExit">${esc(w('exit'))}</button></div>
      <p class="realStatus" role="status">${esc(status)}${line ? ` · ${esc(line)}` : ''}${label ? ` · ${esc(w('elsewhere'))}: ${esc(label)} (${esc(w('gameCity'))} ${esc(cityLabel(s.city))})` : ''}</p>
      <div class="realGo"><label class="sr" for="realCity">${esc(w('city'))}</label><select id="realCity"><option value="">${esc(w('pick'))}</option>${cities}</select>
        <form id="realAddrForm" class="realAddr"><label class="sr" for="realAddr">${esc(w('addr'))}</label><input id="realAddr" type="search" maxlength="120" placeholder="${esc(w('addr'))}" value="${esc(addrQuery)}" autocomplete="off"><button type="submit" class="secondary" id="realFind">${esc(geoBusy ? w('busy') : w('find'))}</button></form></div>
      ${geoAsk ? `<div class="realAsk" role="alertdialog" aria-label="${esc(w('allow'))}"><p>${esc(w('ask'))}</p><button type="button" class="primary" id="realAllow">${esc(w('allow'))}</button> <button type="button" class="ghost" id="realNoGeo">${esc(w('close'))}</button></div>` : ''}
      ${hits ? (hits.length ? `<ul class="realHits">${hits.map((h, i) => `<li><button type="button" data-realhit="${i}">${esc(h.name)}</button></li>`).join('')}</ul>` : `<p class="realStatus">${esc(w('none'))}</p>`) : ''}
      ${links ? `<div class="realChips" aria-label="${esc(w('near'))}">${links}</div>` : ''}
      <details class="realKinds"${kindFilter ? ' open' : ''}><summary>${esc(w('kinds'))}</summary><div class="realChips">${kinds}</div></details>
      ${found.length ? `<ul class="realList">${found.map(p => `<li><button type="button" data-realpoi="${esc(p.id)}"><b>${esc(KIND[p.kind].icon)} ${esc(nameOf(p))}</b><span>${esc(ru() ? KIND[p.kind].ru : KIND[p.kind].en)} · ${Math.round(Math.hypot(p.at.x - here.x, p.at.z - here.z))} ${esc(w('away'))}</span></button></li>`).join('')}</ul>` : ''}
      ${card ? `<section class="realCard" aria-label="${esc(nameOf(card))}"><b>${esc(KIND[card.kind].icon)} ${esc(nameOf(card))}</b><span>${esc(ru() ? KIND[card.kind].ru : KIND[card.kind].en)}</span>
        <span>${dist} ${esc(w('away'))} · ${walkMinutes(dist * 1.3)} ${esc(w('min'))}</span><p class="sub">${esc(w('note'))}</p>
        <div class="row"><button type="button" class="primary" id="realGo">${esc(w('go'))}</button><button type="button" class="secondary" id="realSkip">${esc(w('skip'))}</button><button type="button" class="ghost" id="realDo">${esc(w('doHere'))}</button><button type="button" class="ghost" id="realClose">${esc(w('close'))}</button></div></section>` : ''}
      ${steps.length ? `<ol class="realSteps">${steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}
      <p class="realCredit">${esc(w('credit'))}</p>`;
    const q = ui.querySelector<HTMLInputElement>('#realQ')!; q.oninput = () => { query = q.value; const pos = q.selectionStart; draw(); const q2 = ui.querySelector<HTMLInputElement>('#realQ')!; q2.focus(); q2.setSelectionRange(pos, pos); };
    const a = ui.querySelector<HTMLInputElement>('#realAddr')!; a.oninput = () => { addrQuery = a.value; };
    ui.querySelector<HTMLButtonElement>('#realExit')!.onclick = () => d.close();
    ui.querySelector<HTMLSelectElement>('#realCity')!.onchange = e => { const c = (e.target as HTMLSelectElement).value, ll = CITY_CENTERS[c]; if (ll) void relocate({ lat: ll[0], lon: ll[1] }, cityLabel(c)); };
    ui.querySelector<HTMLFormElement>('#realAddrForm')!.onsubmit = e => { e.preventDefault(); void search(); };
    const allow = ui.querySelector<HTMLButtonElement>('#realAllow'); if (allow) allow.onclick = () => { giveGeoConsent(); geoAsk = false; void search(); };
    const noGeo = ui.querySelector<HTMLButtonElement>('#realNoGeo'); if (noGeo) noGeo.onclick = () => { geoAsk = false; draw(); };
    ui.querySelectorAll<HTMLButtonElement>('[data-realhit]').forEach(b => { b.onclick = () => { const h = hits?.[Number(b.dataset.realhit)]; if (h) void relocate({ lat: h.lat, lon: h.lon }, h.name); }; });
    ui.querySelectorAll<HTMLButtonElement>('[data-realkind]').forEach(b => { b.onclick = () => { const k = b.dataset.realkind as PoiKind; kindFilter = kindFilter === k ? '' : k; query = ''; draw(); }; });
    ui.querySelectorAll<HTMLButtonElement>('[data-realpoi],[data-realgo]').forEach(b => { b.onclick = () => { const id = b.dataset.realpoi ?? b.dataset.realgo; card = (world?.pois() ?? []).find(p => p.id === id) ?? null; query = ''; draw(); }; });
    const go = (): boolean => { if (!card || !world) return false; const r = world.goTo(card), g = world.graph(); if (!r.ok || !g) { play('error'); d.notify(w('noWay')); return false; } const walk = walkMinutes(pathLength(g, r.path)), mp = metroPlan(world.pois(), world.player(), card.at, walk, ru()); steps = [...(mp ? [...mp.steps, w('walkRoute')] : []), ...directions(g, r.path, nameOf(card), ru()).map(x => x.text)]; status = `${walk} ${w('min')}`; draw(); return true; };
    const goBtn = ui.querySelector<HTMLButtonElement>('#realGo'); if (goBtn) goBtn.onclick = () => { go(); };
    const skip = ui.querySelector<HTMLButtonElement>('#realSkip'); if (skip) skip.onclick = () => { if (go()) world?.skip(); };
    const doIt = ui.querySelector<HTMLButtonElement>('#realDo'); if (doIt) doIt.onclick = () => { if (card) d.act(KIND[card.kind].action); };
    const cl = ui.querySelector<HTMLButtonElement>('#realClose'); if (cl) cl.onclick = () => { card = null; draw(); };
  };
  /** The address search: asks once for the player's agreement, then asks the geocoder (at most one question a second) and lists the answers. */
  const search = async (): Promise<void> => {
    if (geoBusy || addrQuery.trim().length < 3) return;
    if (!geoConsent()) { geoAsk = true; draw(); return; }
    geoBusy = true; hits = null; draw();
    try { hits = await geocode(addrQuery, d.geo); } catch (e) { hits = []; d.onFail(String((e as Error)?.message ?? e)); }
    geoBusy = false; if (!dead) draw();
  };
  const mount = async (): Promise<void> => {
    try {
      world = await mountRealWorld({
        host: view, s, origin: centre, ...d.world,
        onPoi: p => { card = p; draw(); },
        onArrive: p => { steps = []; status = p ? `${w('arrived')}: ${nameOf(p)}` : w('arrived'); if (p) { card = p; d.notify(status); } play('chime'); draw(); },
        onFail: m => { play('error'); d.onFail(m); },
        onData: () => { status = `${(world?.pois().length ?? 0).toLocaleString(ru() ? 'ru-RU' : 'en-US')} ${w('places')}`; draw(); },
      });
      status = `${world.pois().length.toLocaleString(ru() ? 'ru-RU' : 'en-US')} ${w('places')}`; play('pop'); draw();
    } catch (e) { play('error'); d.onFail(String((e as Error)?.message ?? e)); }
  };
  /** Builds the map around another spot (a city, or an address that was found) and puts the player there. */
  const relocate = async (to: LatLon, name: string): Promise<void> => {
    world?.destroy(); world = null; centre = to; label = shortName(name); card = null; steps = []; query = ''; kindFilter = ''; hits = null; status = w('loading'); draw();
    await mount();
  };
  draw();
  await mount();
  return () => { dead = true; world?.destroy(); world = null; host.classList.remove('realCity'); host.innerHTML = ''; };
}
