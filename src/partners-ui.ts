/* The phone's Partner services app: a list of the verified organisations that have a place in the player's city, each with the advertising label, what it
   does for newcomers, its real price in roubles if it states one, and a link to its own page. Leaving the game by a link is said out loud: the game never
   asks for money or documents, and the address is shown in full so the player can check it. Nothing records who looked. */
import type { State } from './engine';
import { CATEGORIES, label, partnersFor, realPrice, type Partner } from './partners';
import { PARTNERS } from './content/partners';
import { lang } from './i18n';

const ru = (): boolean => lang() === 'ru';
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
export interface PartnersDeps { back: () => void }

/** The list for one city, as html. `list` is the registry unless a test gives its own. */
export function partnersHtml(s: State, list: readonly Partner[] = PARTNERS, today?: string): string {
  const here = partnersFor(list, s.city, today);
  const head = `<div class="phHead"><button class="ghost" data-pback>${ru() ? '‹ Назад' : '‹ Back'}</button><b>🤝 ${ru() ? 'Партнёры города' : 'Partner services'}</b></div>`;
  const note = `<p class="hint">${ru()
    ? 'Это реклама проверенных организаций. Игра никогда не просит деньги или документы: по ссылке откроется сайт организации, проверьте адрес. Цены ниже настоящие, в рублях, и платятся организации, а не в игре.'
    : 'This is advertising from checked organisations. The game never asks for money or documents: a link opens the organisation\'s own site, so check the address. Prices below are real, in roubles, and are paid to the organisation, not in the game.'}</p>`;
  if (!here.length) return `<div class="svc partners">${head}${note}<p class="hint">${ru() ? 'В этом городе пока нет партнёров.' : 'No partners in this city yet.'}</p></div>`;
  const cards = here.map(p => {
    const cat = CATEGORIES[p.category];
    return `<li class="partner"><small class="adLabel">${esc(label(p, ru()))}</small><h3>${esc(ru() ? p.nameRu : p.name)}</h3><small>${esc(ru() ? cat.ru : cat.en)}</small><p>${esc(ru() ? p.blurbRu : p.blurb)}</p><p class="price">${esc(realPrice(p, ru()))}</p><p><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.url)}</a></p></li>`;
  }).join('');
  return `<div class="svc partners">${head}${note}<ul class="partnerList">${cards}</ul></div>`;
}

export function openPartners(host: HTMLElement, s: State, d: PartnersDeps, list: readonly Partner[] = PARTNERS, today?: string): void {
  host.innerHTML = partnersHtml(s, list, today);
  const b = host.querySelector<HTMLButtonElement>('[data-pback]'); if (b) b.onclick = d.back;
}
