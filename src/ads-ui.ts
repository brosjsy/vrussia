/* The adverts board screen: today's ads with an Answer button, the replies to the player's own ads, the player's ads, and a small form to put up a new
   one. The rules are in ads.ts; this file only draws and connects them. Its few words are kept here (English and Russian) so that the main game does not
   grow for people who never open the board. */
import type { State } from './engine';
import * as G from './engine';
import { boardFor, answer, post, remove, accept, decline, tickAds, openReplies, adsOf, answeredToday, POST_FEE, AD_DAYS, MAX_MINE, MAX_PRICE, ANSWERS_PER_DAY } from './ads';
import type { AdKind } from './ads';
import { lang } from './i18n';

const W: Record<string, [string, string]> = {
  title: ['Adverts board', 'Доска объявлений'], today: ['On the board today', 'Сегодня на доске'], left: ['answers left today', 'ответов осталось сегодня'], answer: ['Answer', 'Откликнуться'], done: ['answered', 'вы откликнулись'],
  replies: ['Replies to your ads', 'Ответы на ваши объявления'], yes: ['Accept', 'Принять'], no: ['Decline', 'Отказать'], mine: ['Your ads', 'Ваши объявления'], none: ['You have no ads on the board.', 'У вас нет объявлений на доске.'],
  down: ['Take down', 'Снять'], daysLeft: ['days left', 'дн. осталось'], add: ['Put up an ad', 'Дать объявление'], kind: ['What is it about', 'О чём оно'], head: ['Title', 'Заголовок'], price: ['Asking price', 'Цена'], put: ['Put it up', 'Повесить'],
  fee: ['The board takes {fee} for an ad. It hangs for {days} days; up to {max} at a time, one new ad a day.', 'Доска берёт {fee} за объявление. Оно висит {days} дн.; не больше {max} сразу, одно новое в день.'],
  'k.room': ['Room', 'Жильё'], 'k.job': ['Work', 'Работа'], 'k.sell': ['For sale', 'Продаю'], 'k.service': ['Service', 'Услуги'], 'k.lost': ['Lost and found', 'Потери и находки'],
  'm.sell': ['I sell an old thing', 'Продаю старую вещь'], 'm.job': ['I look for a day of work', 'Ищу работу на день'], 'm.service': ['I offer lessons or help', 'Предлагаю уроки или помощь'], 'm.room': ['I look for a room', 'Ищу комнату'],
  agency: ['Advertising agency', 'Рекламное агентство'], agencySub: ['Mount a big advert on a billboard, in the metro, on a wall or the city screen — or work as an installer', 'Билборд, метро, стена дома или городской экран — или работа монтажником'],
  free: ['free', 'бесплатно'], pays: ['pays', 'платят'], costs: ['costs', 'стоит'],
};
const w = (k: string): string => W[k]?.[lang() === 'ru' ? 1 : 0] ?? k;
const esc = (x: string): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const ICON: Record<AdKind, string> = { room: '🏠', job: '🧰', sell: '🏷️', service: '🎓', lost: '🔎' };

/** The whole screen as HTML. Opening it also brings the replies up to date. */
export function adsHtml(s: State): string {
  tickAds(s);
  const a = adsOf(s), left = ANSWERS_PER_DAY - answeredToday(s);
  const board = boardFor(s).map(ad => `<li class="adRow"><div class="adTop"><span>${ICON[ad.kind]}</span><b>${esc(ad.title)}</b><small>${esc(w('k.' + ad.kind))} · ${esc(ad.by)}</small></div><p>${esc(ad.text)}</p>
    <div class="adFoot"><i>${ad.price ? `${esc(w(ad.kind === 'job' ? 'pays' : 'costs'))} ${G.money(ad.price)}` : esc(w('free'))}</i>${a.answered.includes(ad.id) ? `<span class="sub">${esc(w('done'))}</span>` : `<button type="button" class="primary" data-answer="${ad.id}"${left <= 0 ? ' disabled' : ''}>${esc(w('answer'))}</button>`}</div></li>`).join('');
  const replies = openReplies(s).map((r, i) => `<li class="adRow reply"><p><b>${esc(r.from)}</b>: ${esc(r.text)}${r.offer ? ` <b>${G.money(r.offer)}</b>` : ''}<br><small>${esc(a.mine.find(m => m.id === r.ad)?.title ?? '')}</small></p><div class="adFoot"><button type="button" class="primary" data-accept="${i}">${esc(w('yes'))}</button><button type="button" class="ghost" data-decline="${i}">${esc(w('no'))}</button></div></li>`).join('');
  const mine = a.mine.map(m => `<li class="adRow"><div class="adTop"><span>${ICON[m.kind]}</span><b>${esc(m.title)}</b><small>${m.price ? G.money(m.price) + ' · ' : ''}${AD_DAYS - (s.day - m.day)} ${esc(w('daysLeft'))}</small></div><div class="adFoot"><button type="button" class="ghost" data-remove="${m.id}">${esc(w('down'))}</button></div></li>`).join('');
  return `<div class="ads"><h2>📌 ${esc(w('title'))}</h2><button type="button" class="asOpen" data-adspace>📣 ${esc(w('agency'))}<small>${esc(w('agencySub'))}</small></button>
    ${replies ? `<h3>${esc(w('replies'))}</h3><ul class="adList">${replies}</ul>` : ''}
    <h3>${esc(w('today'))} <small>(${Math.max(0, left)} ${esc(w('left'))})</small></h3><ul class="adList">${board}</ul>
    <h3>${esc(w('mine'))}</h3>${mine ? `<ul class="adList">${mine}</ul>` : `<p class="hint">${esc(w('none'))}</p>`}
    <form class="adForm" id="adForm"><b>${esc(w('add'))}</b><p class="sub">${esc(w('fee').replace('{fee}', G.money(POST_FEE)).replace('{days}', String(AD_DAYS)).replace('{max}', String(MAX_MINE)))}</p>
      <label>${esc(w('kind'))}<select id="adKind">${(['sell', 'job', 'service', 'room'] as const).map(k => `<option value="${k}">${esc(w('m.' + k))}</option>`).join('')}</select></label>
      <label>${esc(w('head'))}<input type="text" id="adTitle" maxlength="60" required></label>
      <label id="adPriceRow">${esc(w('price'))}<input type="number" id="adPrice" min="100" max="${MAX_PRICE}" step="50" value="1000"></label>
      <button class="primary" type="submit">${esc(w('put'))}</button></form></div>`;
}
/** Connects the buttons. `again` is called after anything changed (to save and to draw the screen again). */
export function wireAds(host: HTMLElement, s: State, d: { notify: (m: string) => void; again: () => void; saved?: () => void }): void {
  // the advertising agency opens in the same window; `saved` saves without drawing the board again
  const ag = host.querySelector<HTMLButtonElement>('[data-adspace]'); if (ag) ag.onclick = () => void import('./adspace-ui').then(m => m.openAgency(host, s, { notify: d.notify, again: d.saved ?? (() => undefined) }));
  const run = (r: { ok: boolean; msg: string }): void => { d.notify(r.msg); if (r.ok) d.again(); };
  host.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(b => { b.onclick = () => run(answer(s, b.dataset.answer as string)); });
  host.querySelectorAll<HTMLButtonElement>('[data-accept]').forEach(b => { b.onclick = () => run(accept(s, Number(b.dataset.accept))); });
  host.querySelectorAll<HTMLButtonElement>('[data-decline]').forEach(b => { b.onclick = () => run(decline(s, Number(b.dataset.decline))); });
  host.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(b => { b.onclick = () => run(remove(s, b.dataset.remove as string)); });
  const kind = host.querySelector<HTMLSelectElement>('#adKind'), row = host.querySelector<HTMLElement>('#adPriceRow');
  if (kind && row) kind.onchange = () => { row.hidden = kind.value !== 'sell'; };
  const form = host.querySelector<HTMLFormElement>('#adForm');
  if (form && kind) form.onsubmit = e => { e.preventDefault(); run(post(s, kind.value as 'sell' | 'job' | 'service' | 'room', host.querySelector<HTMLInputElement>('#adTitle')?.value ?? '', Number(host.querySelector<HTMLInputElement>('#adPrice')?.value ?? 0))); };
}
