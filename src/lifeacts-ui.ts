/* The phone's City life app: every ordinary activity of lifeacts.ts by category, with a search, what each costs and why it cannot be done now, and how
   many different things the player has done. */
import type { State } from './engine';
import * as A from './lifeacts';
import type { Cat } from './lifeacts';
import { lang } from './i18n';

const W: Record<string, [string, string]> = {
  title: ['City life', 'Городская жизнь'], all: ['All', 'Все'], search: ['Search', 'Поиск'], doIt: ['Do it', 'Сделать'], free: ['free', 'бесплатно'], takes: ['takes a part of the day', 'занимает часть дня'],
  variety: ['Different things you have done', 'Разных дел сделано'], none: ['Nothing matches.', 'Ничего не найдено.'], times: ['times', 'раз'], step: ['lesson', 'занятие'],
};
const w = (k: string): string => W[k]?.[lang() === 'ru' ? 1 : 0] ?? k;
const ru = (): boolean => lang() === 'ru';
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const view: { cat: Cat | 'all'; q: string } = { cat: 'all', q: '' };

export function lifeHtml(s: State): string {
  const L = A.lifeOf(s), v = A.variety(s), q = view.q.trim().toLowerCase();
  const list = A.ACTS.filter(a => (view.cat === 'all' || a.cat === view.cat) && (!q || a.name.toLowerCase().includes(q) || a.ru.toLowerCase().includes(q)));
  const chips = [`<button type="button" class="svChip${view.cat === 'all' ? ' on' : ''}" data-la="cat:all">${esc(w('all'))}</button>`, ...A.CATS.filter(c => A.ACTS.some(a => a.cat === c.id)).map(c => `<button type="button" class="svChip${view.cat === c.id ? ' on' : ''}" data-la="cat:${c.id}">${c.icon} ${esc(ru() ? c.ru : c.name)}</button>`)].join('');
  return `<div class="svc"><p class="lwHeat"><span>${esc(w('variety'))}</span><meter min="0" max="${v.all}" value="${v.done}"></meter><b>${v.done}/${v.all}</b></p>
    <label class="laSearch">${esc(w('search'))}<input type="search" id="laQ" value="${esc(view.q)}"></label><div class="svChips">${chips}</div>
    ${list.length ? `<ul class="svVacs">${list.map(a => { const why = A.cannotDo(s, a.id), n = L.count[a.id] ?? 0, st = a.steps ? L.step[a.id] ?? 0 : 0;
      return `<li class="svVac"><span class="svIc">${a.icon}</span><div><b>${esc(ru() ? a.ru : a.name)}</b><div class="svTags"><span class="svPay">${a.cost ? `${a.cost.toLocaleString('en-US')} ₽` : esc(w('free'))}</span>${a.time ? `<span>${esc(w('takes'))}</span>` : ''}${n ? `<span>${n} ${esc(w('times'))}</span>` : ''}${a.steps ? `<span>${esc(w('step'))} ${Math.min(st + 1, a.steps.n)}/${a.steps.n}</span>` : ''}</div>
        ${why ? `<small class="why">${esc(why)}</small>` : `<button type="button" class="ghost small" data-la="do:${a.id}">${esc(w('doIt'))}</button>`}</div></li>`; }).join('')}</ul>` : `<p class="hint">${esc(w('none'))}</p>`}</div>`;
}
export function wireLife(host: HTMLElement, s: State, d: { notify: (m: string) => void; again: () => void }): void {
  const q = host.querySelector<HTMLInputElement>('#laQ');
  if (q) q.oninput = () => { view.q = q.value; const at = q.selectionStart; d.again(); const q2 = host.querySelector<HTMLInputElement>('#laQ'); if (q2) { q2.focus(); q2.setSelectionRange(at, at); } };
  host.querySelectorAll<HTMLButtonElement>('[data-la]').forEach(b => { b.onclick = () => {
    const [act, arg] = (b.dataset.la as string).split(':');
    if (act === 'cat') { view.cat = arg as Cat | 'all'; return d.again(); }
    if (act === 'do') { d.notify(A.doAct(s, arg).msg); return d.again(); }
  }; });
}
export function openLife(host: HTMLElement, s: State, d: { back: () => void; refresh: () => void; notify: (m: string) => void }): void {
  let flash = '';
  const draw = (): void => {
    const f = flash; flash = '';
    host.innerHTML = `<div class="phone sub svcApp"><div class="phHead"><button class="ghost" data-laback aria-label="Back">‹</button><b>🏙️ ${esc(w('title'))}</b></div>${f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''}${lifeHtml(s)}</div>`;
    host.querySelector<HTMLButtonElement>('[data-laback]')!.onclick = () => d.back();
    wireLife(host, s, { notify: m => { flash = m; d.notify(m); }, again: () => { d.refresh(); draw(); } });
  };
  draw();
}
export function resetLifeView(): void { view.cat = 'all'; view.q = ''; }
