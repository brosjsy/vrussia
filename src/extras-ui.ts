/* The phone's Extras app: the interest test of extras.ts. A banner says it is not on sale, each offer shows what it would be and the planned price in real
   roubles, and one button says "I would want this". No card, no payment form, no e-mail is asked for here. */
import { EXTRAS, extrasOpen, press, pressed, rub, type ExtraId } from './extras';
import { ApiCloud, apiFromEnv, type CounterKey } from './api-client';
import { lang } from './i18n';

const ru = (): boolean => lang() === 'ru';
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
export interface ExtrasDeps { back: () => void; send?: (key: CounterKey) => void }

/** Sends the count to the server when there is one; a failure changes nothing for the player. */
const sendDefault = (key: CounterKey): void => { const base = apiFromEnv(); if (base) void new ApiCloud(base).bump(key).catch(() => undefined); };

export function extrasHtml(done: Set<ExtraId> = pressed(), today?: string): string {
  const head = `<div class="phHead"><button class="ghost" data-xback>${ru() ? '‹ Назад' : '‹ Back'}</button><b>⭐ ${ru() ? 'Дополнения' : 'Extras'}</b></div>`;
  if (!extrasOpen(today)) return `<div class="svc extras">${head}<p class="hint">${ru() ? 'Этот опрос закончился. Спасибо!' : 'This survey has ended. Thank you!'}</p></div>`;
  const banner = `<p class="xBanner" role="note"><b>${ru() ? 'Пока не продаётся.' : 'Not on sale yet.'}</b> ${ru()
    ? 'Мы выбираем, что делать дальше. Нажмите «Хочу такое», если вам это было бы нужно: мы прибавим единицу к безымянному счётчику. Ничего не списывается, у вас ничего не просят, о вас ничего не сохраняется. Вся игра и все уроки остаются бесплатными. Цены ниже планируемые, в настоящих рублях.'
    : 'We are choosing what to build next. Press "I would want this" if it would be useful to you: we add one to an anonymous counter. Nothing is charged, nothing is asked of you, nothing about you is stored. The whole game and every lesson stay free. The prices below are planned, in real roubles.'}</p>`;
  const cards = EXTRAS.map(e => {
    const yes = done.has(e.id);
    return `<li class="extra"><h3><span aria-hidden="true">${e.icon}</span> ${esc(ru() ? e.ru : e.name)}</h3><p>${esc(ru() ? e.whatRu : e.what)}</p><p class="price">${esc(rub(e.priceRub, ru()))} ${esc(ru() ? e.periodRu : e.period)} · ${ru() ? 'планируемая цена, не продаётся' : 'planned price, not on sale'}</p><button class="${yes ? 'ghost' : ''}" data-xwant="${e.id}" ${yes ? 'disabled' : ''}>${yes ? (ru() ? 'Спасибо, учтено' : 'Thank you, counted') : (ru() ? 'Хочу такое' : 'I would want this')}</button></li>`;
  }).join('');
  return `<div class="svc extras">${head}${banner}<ul class="extraList">${cards}</ul></div>`;
}

export function openExtras(host: HTMLElement, d: ExtrasDeps): void {
  const draw = (): void => {
    host.innerHTML = extrasHtml();
    const b = host.querySelector<HTMLButtonElement>('[data-xback]'); if (b) b.onclick = d.back;
    host.querySelectorAll<HTMLButtonElement>('button[data-xwant]').forEach(x => {
      x.onclick = () => { const e = EXTRAS.find(k => k.id === x.dataset.xwant); if (e && press(e.id)) (d.send ?? sendDefault)(e.counter); draw(); };
    });
  };
  draw();
}
