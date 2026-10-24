/* The advertising agency screen: rent a place and mount an advert (with a live preview of how it will look), the reports of the player's adverts, the
   adverts of real players in this city (online), and shifts as a poster installer. The rules are in adspace.ts; this file draws and connects them. Its
   words are kept here (English and Russian), so the main game does not grow for people who never open it. */
import type { State } from './engine';
import * as G from './engine';
import { SPOTS, GOALS, COLORS, ICONS, TASKS, RANKS, RANKS_RU, RANK_AT, MAX_DAYS, METRO_TOWNS, adSpaceOf, activeOf, book, takeDown, tickAdSpace, install, cannotInstall, rankOf, priceOf, reachOf, lawCheck, costPerAnswer, endOf, isUp, spotOf } from './adspace';
import type { SpotId, Goal, TaskId } from './adspace';
import type { OnlineClient } from './cloud';
import type { Advert } from './api-client';
import { setOnlineAdverts } from './billboards';
import { lang } from './i18n';

const W: Record<string, [string, string]> = {
  title: ['Advertising agency', 'Рекламное агентство'], rent: ['Mount an advert', 'Разместить рекламу'], mine: ['My adverts', 'Моя реклама'], city: ['In the city', 'В городе'], work: ['Work as installer', 'Работа монтажником'],
  place: ['Place', 'Место'], perDay: ['a day', 'в день'], people: ['people a day', 'человек в день'], head: ['Headline', 'Заголовок'], line: ['Second line', 'Вторая строка'], color: ['Colour', 'Цвет'], icon: ['Icon', 'Значок'],
  goal: ['What it is for', 'Для чего'], days: ['Days', 'Дней'], total: ['Total', 'Итого'], mount: ['Pay and mount', 'Оплатить и разместить'], preview: ['How it will look', 'Как это будет выглядеть'],
  online: ['Also show it to real players in this city (online, up to 7 days)', 'Показать и живым игрокам в этом городе (онлайн, до 7 дней)'], offline: ['Log in (🌐) to show your adverts to real players too.', 'Войдите (🌐), чтобы вашу рекламу видели и живые игроки.'],
  law: ['The agency checks every advert against the law on advertising: no alcohol, tobacco, gambling, loans, election campaigning, links or unproven "the best".', 'Агентство проверяет каждую рекламу по закону о рекламе: без алкоголя, табака, азартных игр, займов, агитации, ссылок и недоказанного «лучший».'],
  ok: ['The agency accepts these words.', 'Агентство принимает этот текст.'], noMetro: ['no metro here', 'здесь нет метро'], full: ['You have {n} adverts running: that is the most at a time.', 'У вас {n} рекламы: больше сразу нельзя.'],
  none: ['You have not mounted any adverts yet.', 'Вы ещё не размещали рекламу.'], views: ['views', 'просмотров'], answers: ['answers', 'откликов'], perAnswer: ['per answer', 'за отклик'], realViews: ['real players saw it', 'живых игроков видели'], realView1: ['real player saw it', 'живой игрок видел'],
  up: ['up', 'висит'], waits: ['in another city', 'в другом городе'], ended: ['ended', 'закончилась'], left: ['days left', 'дн. осталось'], left1: ['day left', 'дн. остался'], down: ['Take down', 'Снять'], paid: ['paid', 'оплачено'],
  cityNone: ['No adverts of players in {city} right now. Be the first.', 'Сейчас в городе {city} нет рекламы игроков. Будьте первым.'], report: ['Report', 'Пожаловаться'], by: ['by', 'от'], loading: ['Loading…', 'Загрузка…'],
  cityHint: ['These are adverts of real players. Those on billboards and the big screen also appear in your 3D city.', 'Это реклама живых игроков. С билбордов и большого экрана она видна и в вашем 3D-городе.'],
  rank: ['Rank', 'Разряд'], shifts: ['shifts', 'смен'], shift: ['shift', 'смена'], next: ['next rank at', 'следующий разряд на'], do: ['Take the shift', 'Взять смену'], pay: ['pays', 'платят'], energy: ['energy', 'энергии'],
  workHint: ['The agency needs hands to mount the adverts people book. One shift a day; work at height only in dry weather, after three poster shifts.', 'Агентству нужны руки, чтобы вешать заказанную рекламу. Одна смена в день; работа на высоте только в сухую погоду и после трёх смен с постерами.'],
};
const w = (k: string): string => W[k]?.[lang() === 'ru' ? 1 : 0] ?? k;
const ru = (): boolean => lang() === 'ru';
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

type Tab = 'rent' | 'mine' | 'city' | 'work';
interface Draft { spot: SpotId; head: string; line: string; color: string; icon: string; goal: Goal; days: number; online: boolean }
const view: { tab: Tab; d: Draft; city: Advert[] | null; cityOf: string; mineOnline: Record<number, number> } = {
  tab: 'rent', d: { spot: 'stop', head: '', line: '', color: COLORS[0], icon: ICONS[0], goal: 'name', days: 3, online: true }, city: null, cityOf: '', mineOnline: {},
};

const preview = (d: { head: string; line: string; color: string; icon: string }, cls = ''): string =>
  `<div class="asPreview ${cls}" style="--as:${esc(d.color)}"><b>${esc(d.icon)} ${esc(d.head || '…')}</b><span>${esc(d.line)}</span></div>`;

function rentHtml(s: State, signedIn: boolean): string {
  const d = view.d, spot = spotOf(d.spot)!, full = activeOf(s).length >= 2, why = d.head.trim().length >= 3 ? lawCheck(d.head, d.line) : null;
  const spots = SPOTS.map(p => { const no = p.metro && !METRO_TOWNS.includes(s.city);
    return `<label class="asSpot${p.id === d.spot ? ' on' : ''}${no ? ' off' : ''}"><input type="radio" name="asSpot" value="${p.id}"${p.id === d.spot ? ' checked' : ''}${no ? ' disabled' : ''}><span class="asIc">${p.icon}</span><b>${esc(ru() ? p.ru : p.name)}</b>
      <small>${no ? esc(w('noMetro')) : `${G.money(priceOf(p, s.city))} ${esc(w('perDay'))} · ≈${reachOf(p, s.city).toLocaleString('en-US')} ${esc(w('people'))}`}</small><i>${esc(ru() ? p.ruBlurb : p.blurb)}</i></label>`; }).join('');
  const total = priceOf(spot, s.city) * d.days;
  return `<div class="asGrid"><fieldset class="asSpots"><legend>${esc(w('place'))} · ${esc(s.city)}</legend>${spots}</fieldset>
    <form class="asForm" id="asForm">
      <p class="asLabel">${esc(w('preview'))}</p>${preview(d, d.spot === 'screen' ? 'screen' : '')}
      <label>${esc(w('head'))}<input id="asHead" maxlength="32" value="${esc(d.head)}" required></label>
      <label>${esc(w('line'))}<input id="asLine" maxlength="60" value="${esc(d.line)}"></label>
      <div class="asRow"><span>${esc(w('color'))}</span>${COLORS.map(c => `<button type="button" class="asSw${c === d.color ? ' on' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}" aria-pressed="${c === d.color}"></button>`).join('')}</div>
      <div class="asRow"><span>${esc(w('icon'))}</span>${ICONS.map(i => `<button type="button" class="asIcon${i === d.icon ? ' on' : ''}" data-icon="${i}" aria-pressed="${i === d.icon}">${i}</button>`).join('')}</div>
      <label>${esc(w('goal'))}<select id="asGoal">${GOALS.map(g => `<option value="${g.id}"${g.id === d.goal ? ' selected' : ''}>${g.icon} ${esc(ru() ? g.ru : g.name)}</option>`).join('')}</select></label>
      <label>${esc(w('days'))}: <b id="asDaysN">${d.days}</b><input type="range" id="asDays" min="1" max="${MAX_DAYS}" value="${d.days}"></label>
      ${signedIn ? `<label class="asCheck"><input type="checkbox" id="asOnline"${d.online ? ' checked' : ''}> ${esc(w('online'))}</label>` : `<p class="sub">${esc(w('offline'))}</p>`}
      <p class="sub asLaw${why ? ' bad' : ''}">${esc(why ?? (d.head.trim().length >= 3 ? w('ok') : w('law')))}</p>
      ${full ? `<p class="hint">${esc(w('full').replace('{n}', '2'))}</p>` : ''}
      <div class="asTotal"><span>${esc(w('total'))}: <b>${G.money(total)}</b></span><button class="primary" type="submit"${full || why || s.money < total ? ' disabled' : ''}>${esc(w('mount'))}</button></div>
    </form></div>`;
}

function mineHtml(s: State): string {
  const list = adSpaceOf(s).list; if (!list.length) return `<p class="hint">${esc(w('none'))}</p>`;
  return `<ul class="asList">${list.map(c => { const spot = spotOf(c.spot)!, live = s.day < endOf(c), cpa = costPerAnswer(c), real = c.online ? view.mineOnline[c.online] : undefined;
    const state = !live ? w('ended') : isUp(s, c) ? `${w('up')} · ${endOf(c) - s.day} ${w(endOf(c) - s.day === 1 ? 'left1' : 'left')}` : w('waits');
    return `<li class="asItem">${preview(c, 'small')}<div><b>${spot.icon} ${esc(ru() ? spot.ru : spot.name)} · ${esc(c.city)}</b><small>${esc(state)} · ${esc(w('paid'))} ${G.money(c.paid)}</small>
      <div class="asStats"><span><b>${c.views.toLocaleString('en-US')}</b> ${esc(w('views'))}</span><span><b>${c.answers}</b> ${esc(w('answers'))}</span><span><b>${cpa === null ? '—' : G.money(cpa)}</b> ${esc(w('perAnswer'))}</span>${real !== undefined ? `<span><b>${real}</b> ${esc(w(real === 1 ? 'realView1' : 'realViews'))}</span>` : ''}</div>
      ${live ? `<button type="button" class="ghost" data-down="${c.id}">${esc(w('down'))}</button>` : ''}</div></li>`; }).join('')}</ul>`;
}

function cityHtml(s: State): string {
  if (view.city === null) return `<p class="sub">${esc(w('loading'))}</p>`;
  if (!view.city.length) return `<p class="hint">${esc(w('cityNone').replace('{city}', s.city))}</p>`;
  return `<p class="sub">${esc(w('cityHint'))}</p><ul class="asList">${view.city.map(a => { const p = spotOf(a.spot);
    return `<li class="asItem">${preview(a, 'small')}<div><b>${p?.icon ?? ''} ${esc(p ? (ru() ? p.ru : p.name) : a.spot)}</b><small>${esc(w('by'))} ${esc(a.username)} · ${Number(a.views)} ${esc(w(Number(a.views) === 1 ? 'realView1' : 'realViews'))}</small>
      <button type="button" class="ghost" data-report="${a.id}">${esc(w('report'))}</button></div></li>`; }).join('')}</ul>`;
}

function workHtml(s: State): string {
  const r = rankOf(s), n = adSpaceOf(s).install.shifts;
  return `<p class="sub">${esc(w('workHint'))}</p><p><b>${esc(w('rank'))}: ${esc((ru() ? RANKS_RU : RANKS)[r])}</b> · ${n} ${esc(w(n === 1 ? 'shift' : 'shifts'))}${r < 2 ? ` · ${esc(w('next'))} ${RANK_AT[r + 1]}` : ''}</p>
    <ul class="asList">${TASKS.map(t => { const why = cannotInstall(s, t.id);
      return `<li class="asItem task"><div><b>${t.height ? '🏗️' : '🚏'} ${esc(ru() ? t.ru : t.name)}</b><small>${esc(w('pay'))} ${G.money(Math.round(t.pay * [1, 1.15, 1.3][r] / 50) * 50)} · −${t.energy} ${esc(w('energy'))}</small>${why ? `<small class="why">${esc(why)}</small>` : ''}
        <button type="button" class="primary" data-task="${t.id}"${why ? ' disabled' : ''}>${esc(w('do'))}</button></div></li>`; }).join('')}</ul>`;
}

/** The whole screen. Opening it brings the adverts up to date (views, answers, what they gave back). */
export function adSpaceHtml(s: State, c: OnlineClient | null): string {
  const signedIn = !!c?.session();
  const tabs = (['rent', 'mine', 'city', 'work'] as Tab[]).map(t => `<button type="button" role="tab" class="asTab${t === view.tab ? ' on' : ''}" data-tab="${t}" aria-selected="${t === view.tab}">${esc(w(t))}${t === 'mine' && activeOf(s).length ? ` <span class="badge">${activeOf(s).length}</span>` : ''}</button>`).join('');
  const body = view.tab === 'rent' ? rentHtml(s, signedIn) : view.tab === 'mine' ? mineHtml(s) : view.tab === 'city' ? cityHtml(s) : workHtml(s);
  return `<div class="adspace"><h2>📣 ${esc(w('title'))}</h2><div class="asTabs" role="tablist">${tabs}</div>${body}</div>`;
}

/** Connects the screen. `again` saves and draws it again. */
export function wireAdSpace(host: HTMLElement, s: State, c: OnlineClient | null, d: { notify: (m: string) => void; again: () => void }): void {
  for (const line of tickAdSpace(s)) d.notify(line);
  const redraw = (): void => d.again();
  const loadCity = async (): Promise<void> => {
    if (!c?.adverts) { view.city = []; redraw(); return; }
    const r = await c.adverts(s.city); view.city = r.ok && Array.isArray(r.data) ? r.data : []; view.cityOf = s.city; setOnlineAdverts(view.city); redraw();
  };
  host.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b => { b.onclick = () => {
    view.tab = b.dataset.tab as Tab; if (view.tab === 'city' && (view.city === null || view.cityOf !== s.city)) { view.city = null; void loadCity(); }
    if (view.tab === 'mine' && c?.myAdverts && c.session()) void c.myAdverts().then(r => { if (r.ok && r.data) { view.mineOnline = Object.fromEntries(r.data.map(x => [x.id, Number(x.views)])); redraw(); } });
    redraw(); }; });
  // the form: every change updates the draft and the preview
  const form = host.querySelector<HTMLFormElement>('#asForm');
  if (form) {
    const v = view.d, txt = (id: string): string => host.querySelector<HTMLInputElement>(id)?.value ?? '';
    host.querySelectorAll<HTMLInputElement>('input[name="asSpot"]').forEach(r => { r.onchange = () => { v.spot = r.value as SpotId; redraw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b => { b.onclick = () => { v.color = b.dataset.color as string; redraw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-icon]').forEach(b => { b.onclick = () => { v.icon = b.dataset.icon as string; redraw(); }; });
    const live = (): void => { v.head = txt('#asHead'); v.line = txt('#asLine');
      const p = host.querySelector('.asForm .asPreview'); if (p) p.outerHTML = preview(v, v.spot === 'screen' ? 'screen' : '');
      const law = host.querySelector<HTMLElement>('.asLaw'), why = v.head.trim().length >= 3 ? lawCheck(v.head, v.line) : null;
      if (law) { law.textContent = why ?? (v.head.trim().length >= 3 ? w('ok') : w('law')); law.classList.toggle('bad', !!why); }
      const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]'); if (btn) btn.disabled = !!why || activeOf(s).length >= 2 || s.money < priceOf(spotOf(v.spot)!, s.city) * v.days; };
    for (const id of ['#asHead', '#asLine']) { const el = host.querySelector<HTMLInputElement>(id); if (el) el.oninput = live; }
    const goal = host.querySelector<HTMLSelectElement>('#asGoal'); if (goal) goal.onchange = () => { v.goal = goal.value as Goal; };
    const days = host.querySelector<HTMLInputElement>('#asDays'); if (days) days.oninput = () => { v.days = Number(days.value); const n = host.querySelector('#asDaysN'); if (n) n.textContent = days.value; const t = host.querySelector('.asTotal b'); if (t) t.textContent = G.money(priceOf(spotOf(v.spot)!, s.city) * v.days); live(); };
    const on = host.querySelector<HTMLInputElement>('#asOnline'); if (on) on.onchange = () => { v.online = on.checked; };
    form.onsubmit = async e => {
      e.preventDefault(); v.head = txt('#asHead'); v.line = txt('#asLine');
      const r = book(s, v); d.notify(r.msg); if (!r.ok) return;
      const camp = adSpaceOf(s).list[0];
      if (v.online && c?.mountAdvert && c.session()) {
        const o = await c.mountAdvert({ city: s.city, spot: v.spot, head: camp.head, line: camp.line, color: camp.color, icon: camp.icon, days: v.days });
        if (o.ok && o.data) camp.online = o.data; else d.notify(o.msg === 'place taken' ? 'Online, every frame of this place is taken by other players; your advert hangs in your city only.' : o.msg);
        view.city = null;
      }
      view.d = { ...v, head: '', line: '' }; view.tab = 'mine'; redraw();
    };
  }
  host.querySelectorAll<HTMLButtonElement>('[data-down]').forEach(b => { b.onclick = async () => {
    const camp = adSpaceOf(s).list.find(x => x.id === b.dataset.down); const r = takeDown(s, b.dataset.down as string); d.notify(r.msg);
    if (r.ok && camp?.online && c?.removeAdvert) await c.removeAdvert(camp.online);
    redraw(); }; });
  host.querySelectorAll<HTMLButtonElement>('[data-report]').forEach(b => { b.onclick = async () => {
    if (!c?.reportAdvert || !c.session()) { d.notify(w('offline')); return; }
    const r = await c.reportAdvert(Number(b.dataset.report)); d.notify(r.msg); b.disabled = true; }; });
  host.querySelectorAll<HTMLButtonElement>('[data-task]').forEach(b => { b.onclick = () => { const r = install(s, b.dataset.task as TaskId); d.notify(r.msg); if (r.ok) redraw(); }; });
  if (view.tab === 'city' && view.city === null) void loadCity();
}
/** Opens the agency in the modal (from the adverts board): `saved` saves the game and redraws the header after every change. */
export async function openAgency(host: HTMLElement, s: State, d: { notify: (m: string) => void; again: () => void }): Promise<void> {
  let c: OnlineClient | null = null; try { c = (await import('./cloud')).cloud(); } catch { /* offline */ }
  const draw = (): void => { host.innerHTML = adSpaceHtml(s, c); wireAdSpace(host, s, c, { notify: d.notify, again: () => { d.again(); draw(); } }); };
  draw(); d.again();
  if (c?.adverts) { const r = await c.adverts(s.city).catch(() => null); if (r?.ok && r.data) setOnlineAdverts(r.data); }       // other players' adverts on the 3D boards
}
/** For the tests: start the screen from its first tab again. */
export function resetAdSpaceView(): void { view.tab = 'rent'; view.city = null; view.cityOf = ''; view.mineOnline = {}; view.d = { spot: 'stop', head: '', line: '', color: COLORS[0], icon: ICONS[0], goal: 'name', days: 3, online: true }; }
