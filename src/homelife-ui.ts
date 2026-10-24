/* The phone's Household app: how the flat is (clean, the sink, the bin, the plants, what is broken, the keys), the things to do about it, the alarm,
   and the quiet evening things (a series, a book, a nap). The rules are in homelife.ts. */
import type { State } from './engine';
import * as H from './homelife';
import { lang } from './i18n';

const W: Record<string, [string, string]> = {
  title: ['Household', 'Быт дома'], state: ['How the flat is', 'Как дома'], clean: ['Clean', 'Чистота'], sink: ['Dirty dishes', 'Грязная посуда'], bin: ['Rubbish bin', 'Мусорное ведро'], plants: ['Plants', 'Растения'], none: ['none', 'нет'],
  wash: ['Wash the dishes', 'Помыть посуду'], cleanSelf: ['Clean the flat', 'Убраться'], hire: ['Hire a cleaner (2,500 ₽)', 'Вызвать клининг (2 500 ₽)'], out: ['Take out the rubbish', 'Вынести мусор'], sort: ['Sort it for recycling', 'Рассортировать'],
  waterBtn: ['Water the plants', 'Полить растения'], buy: ['Buy a plant (600 ₽)', 'Купить растение (600 ₽)'], broken: ['Broken', 'Сломалось'], diy: ['Fix it yourself', 'Починить самому'], pro: ['Call a handyman', 'Вызвать мастера'], mgmt: ['Call the management company (free)', 'Позвонить в управляющую компанию (бесплатно)'],
  keys: ['You lost your keys.', 'Вы потеряли ключи.'], lock: ['Call a locksmith (3,000 ₽)', 'Вызвать слесаря (3 000 ₽)'], alarm: ['Alarm', 'Будильник'], off: ['off', 'выкл.'], evening: ['Quiet time', 'Тихий вечер'],
  series: ['Watch an episode', 'Посмотреть серию'], book: ['Read', 'Почитать'], nap: ['Take a nap', 'Вздремнуть'], books: ['books read', 'книг прочитано'],
};
const w = (k: string): string => W[k]?.[lang() === 'ru' ? 1 : 0] ?? k;
const ru = (): boolean => lang() === 'ru';
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const b = (act: string, label: string, cls = 'ghost small'): string => `<button type="button" class="${cls}" data-hl="${act}">${esc(label)}</button>`;
const bar = (label: string, v: number, bad: boolean): string => `<li><span>${esc(label)}</span><meter min="0" max="100" low="40" high="70" optimum="${bad ? 0 : 100}" value="${v}"></meter></li>`;

export function homeLifeHtml(s: State): string {
  H.tickHome(s); const h = H.homeOf(s);
  const k = h.broken ? H.BREAK[h.broken] : null;
  return `<div class="svc">
    ${h.keysLost ? `<p class="lwAlert">🔑 ${esc(w('keys'))} ${b('lock', w('lock'), 'primary small')}</p>` : ''}
    ${k ? `<section class="svCard"><b>🔧 ${esc(w('broken'))}: ${esc(ru() ? k.ru : k.name)}</b><small class="sub">${esc(k.text)}</small><div class="svChips">${b('fix:diy', w('diy'))}${b('fix:pro', k.pro ? `${w('pro')} (${k.pro.toLocaleString('en-US')} ₽)` : w('mgmt'))}</div></section>` : ''}
    <h3>${esc(w('state'))}</h3><ul class="hlBars">${bar(w('clean'), 100 - h.dirt, false)}${bar(w('bin'), h.rubbish, true)}</ul>
    <p class="sub">${esc(w('sink'))}: <b>${h.dishes}</b> · ${esc(w('plants'))}: ${h.plants.length ? h.plants.map(p => `${esc(p.name)} ${p.water < 30 ? '🥀' : '🌿'}`).join(', ') : esc(w('none'))}</p>
    <div class="svChips">${b('dishes', w('wash'))}${b('clean', w('cleanSelf'))}${b('hire', w('hire'))}${b('rubbish', w('out'))}${b('sort', w('sort'))}${b('water', w('waterBtn'))}${b('plant', w('buy'))}</div>
    <h3>⏰ ${esc(w('alarm'))}</h3><div class="svChips">${[6 * 60, 6 * 60 + 30, 7 * 60, 8 * 60].map(m => `<button type="button" class="svChip${h.alarm === m ? ' on' : ''}" data-hl="alarm:${m}">${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}</button>`).join('')}<button type="button" class="svChip${h.alarm === null ? ' on' : ''}" data-hl="alarm:off">${esc(w('off'))}</button></div>
    <h3>${esc(w('evening'))}</h3><div class="svChips">${b('tv', '📺 ' + w('series'))}${b('read', '📖 ' + w('book'))}${b('nap', '😴 ' + w('nap'))}</div>
    <p class="sub">${h.books} ${esc(w('books'))} · ${h.series} 📺</p></div>`;
}
export function wireHomeLife(host: HTMLElement, s: State, d: { notify: (m: string) => void; again: () => void }): void {
  host.querySelectorAll<HTMLButtonElement>('[data-hl]').forEach(btn => { btn.onclick = () => {
    const [a, arg] = (btn.dataset.hl as string).split(':');
    const r = a === 'dishes' ? H.washDishes(s) : a === 'clean' ? H.clean(s, false) : a === 'hire' ? H.clean(s, true) : a === 'rubbish' ? H.rubbish(s, false) : a === 'sort' ? H.rubbish(s, true)
      : a === 'water' ? H.water(s) : a === 'plant' ? H.buyPlant(s, ['Ficus', 'Aloe', 'Basil', 'Violet', 'Cactus', 'Monstera'][H.homeOf(s).plants.length % 6]) : a === 'fix' ? H.fix(s, arg as 'diy' | 'pro') : a === 'lock' ? H.locksmith(s)
      : a === 'alarm' ? H.setAlarm(s, arg === 'off' ? null : Number(arg)) : a === 'tv' ? H.watchSeries(s) : a === 'read' ? H.read(s) : a === 'nap' ? H.nap(s) : null;
    if (r) { d.notify(r.msg); d.again(); }
  }; });
}
export function openHomeLife(host: HTMLElement, s: State, d: { back: () => void; refresh: () => void; notify: (m: string) => void }): void {
  let flash = '';
  const draw = (): void => {
    const f = flash; flash = '';
    host.innerHTML = `<div class="phone sub svcApp"><div class="phHead"><button class="ghost" data-hlback aria-label="Back">‹</button><b>🧹 ${esc(w('title'))}</b></div>${f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''}${homeLifeHtml(s)}</div>`;
    host.querySelector<HTMLButtonElement>('[data-hlback]')!.onclick = () => d.back();
    wireHomeLife(host, s, { notify: m => { flash = m; d.notify(m); }, again: () => { d.refresh(); draw(); } });
  };
  draw();
}
