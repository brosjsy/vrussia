/* The phone's Police & law app: the street (what the player may do against the law, with the article and the chance of being caught), calling 102/112
   about a theft and following the case, the player's record (offences, sentences, the register of controlled persons, the police's attention), and
   the player's rights. The rules are in law.ts. */
import type { State } from './engine';
import * as L from './law';
import type { CrimeId } from './law';
import { lang } from './i18n';

const W: Record<string, [string, string]> = {
  title: ['Police & law', 'Полиция и закон'], street: ['Street', 'Улица'], call: ['Call 102 / 112', 'Звонок 102 / 112'], record: ['My record', 'Моё досье'], rights: ['Your rights', 'Ваши права'],
  streetHint: ['Breaking the law is your choice here, and so are the consequences: the station, the court, fines, arrest, a record; for a foreigner, expulsion.', 'Нарушать закон — ваш выбор, как и последствия: отдел полиции, суд, штрафы, арест, судимость; для иностранца — выдворение.'],
  risk: ['chance of being caught', 'шанс попасться'], doIt: ['Do it', 'Сделать'], heat: ['Police attention', 'Внимание полиции'],
  callHint: ['112 works from any phone, free, even without a SIM card. 102 is the police. A statement starts a case; the investigator calls back.', '112 работает с любого телефона, бесплатно, даже без SIM-карты. 102 — полиция. Заявление начинает дело; следователь перезвонит.'],
  noCases: ['Nothing has been stolen from you. Good.', 'У вас ничего не украли. Хорошо.'], reportBtn: ['Call 102 and give a statement', 'Позвонить 102 и написать заявление'],
  'st.open': ['not reported', 'не заявлено'], 'st.reported': ['under investigation until day', 'расследуется до дня'], 'st.solved': ['solved, returned', 'раскрыто, возвращено'], 'st.closed': ['suspended, not found', 'приостановлено, не найдено'],
  clean: ['Your record is clean.', 'Ваше досье чистое.'], register: ['On the register of controlled persons: no legal grounds to stay. Accounts frozen, no driving or marriage; the police may detain you.', 'В реестре контролируемых лиц: нет законных оснований для пребывания. Счета заморожены, нельзя водить и вступать в брак; полиция может задержать.'],
  convicted: ['Criminal record', 'Судимость'], strikes: ['violations on record', 'нарушений в досье'], stats: ['Offences / caught / thefts reported / people helped / raids', 'Нарушения / попался / заявлений / помог людям / проверок'],
};
const w = (k: string): string => W[k]?.[lang() === 'ru' ? 1 : 0] ?? k;
const ru = (): boolean => lang() === 'ru';
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const money = (n: number): string => `${Math.round(n).toLocaleString('en-US')} ₽`;
type Tab = 'street' | 'call' | 'record' | 'rights';
const view: { tab: Tab } = { tab: 'street' };

function street(s: State): string {
  const st = L.lawOf(s);
  return `<p class="sub">${esc(w('streetHint'))}</p><p class="lwHeat"><span>${esc(w('heat'))}</span><meter min="0" max="100" low="30" high="60" optimum="0" value="${st.heat}"></meter><b>${st.heat}</b></p>
    <ul class="svVacs">${L.CRIMES.map(c => { const why = L.cannotCommit(s, c.id), r = Math.round(L.riskOf(s, c.id) * 100);
      return `<li class="svVac lwCrime ${c.kind}"><span class="svIc">${c.id === 'pickpocket' ? '👛' : c.id === 'shoplift' ? '🛒' : c.id === 'fare' ? '🚇' : c.id === 'drink' ? '🍺' : '👊'}</span><div><b>${esc(ru() ? c.ru : c.name)}</b><small>${esc(c.blurb)}</small>
        <div class="svTags"><span class="${c.kind === 'criminal' ? 'lwCrim' : ''}">${esc(c.law)}</span><span>${r}% ${esc(w('risk'))}</span></div>
        ${why ? `<small class="why">${esc(why)}</small>` : `<button type="button" class="ghost small" data-lw="commit:${c.id}">${esc(w('doIt'))}</button>`}</div></li>`; }).join('')}</ul>`;
}
function call(s: State): string {
  const t = L.lawOf(s).thefts;
  return `<p class="sub">${esc(w('callHint'))}</p>${t.length ? `<ul class="svCases">${t.map(x => `<li class="svCase${x.status === 'solved' ? ' done' : ''}"><b>${esc(x.what)}</b><p>${money(x.value)} · ${esc(w('st.' + x.status))}${x.status === 'reported' ? ` ${x.due + 1}` : ''}</p>${x.status === 'open' ? `<button type="button" class="primary small" data-lw="report:${x.id}">📞 ${esc(w('reportBtn'))}</button>` : ''}</li>`).join('')}</ul>` : `<p class="hint">${esc(w('noCases'))}</p>`}`;
}
function record(s: State): string {
  const st = L.lawOf(s);
  return `${st.register ? `<p class="lwAlert">⚠ ${esc(w('register'))}</p>` : ''}<p><b>${s.strikes}</b> ${esc(w('strikes'))}${L.convicted(s) ? ` · <b class="lwCrim">${esc(w('convicted'))}</b>` : ''}</p>
    <p class="sub">${esc(w('stats'))}: ${st.crimes} / ${st.caught} / ${st.reported} / ${st.helped} / ${st.raids}</p>
    ${st.record.length ? `<ul class="svCases">${st.record.map(r => `<li class="svCase"><b>${esc(r.what)}</b><p>${esc(r.law)} · ${esc(r.sentence)} · day ${r.day + 1}</p></li>`).join('')}</ul>` : `<p class="hint">${esc(w('clean'))}</p>`}`;
}
const rights = (): string => `<ul class="lwRights">${L.RIGHTS.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`;

export function lawHtml(s: State): string {
  const tabs = (['street', 'call', 'record', 'rights'] as Tab[]).map(t => `<button type="button" role="tab" class="asTab${t === view.tab ? ' on' : ''}" data-lw="tab:${t}" aria-selected="${t === view.tab}">${esc(w(t))}</button>`).join('');
  return `<div class="svc"><div class="asTabs" role="tablist">${tabs}</div>${view.tab === 'street' ? street(s) : view.tab === 'call' ? call(s) : view.tab === 'record' ? record(s) : rights()}</div>`;
}
/** Connects the screen. `again` saves and draws again; `turnOver` is called when something sent the game on (a court, arrest days, the end). */
export function wireLaw(host: HTMLElement, s: State, d: { notify: (m: string) => void; again: () => void }): void {
  host.querySelectorAll<HTMLButtonElement>('[data-lw]').forEach(b => { b.onclick = () => {
    const [act, arg] = (b.dataset.lw as string).split(':');
    if (act === 'tab') { view.tab = arg as Tab; return d.again(); }
    if (act === 'commit') { d.notify(L.commit(s, arg as CrimeId).msg); return d.again(); }
    if (act === 'report') { d.notify(L.report(s, arg).msg); return d.again(); }
  }; });
}
/** Takes over the phone screen (the same way as the other apps). */
export function openLaw(host: HTMLElement, s: State, d: { back: () => void; refresh: () => void; notify: (m: string) => void }): void {
  let flash = '';
  const draw = (): void => {
    const f = flash; flash = '';
    host.innerHTML = `<div class="phone sub svcApp"><div class="phHead"><button class="ghost" data-lwback aria-label="Back">‹</button><b>🚨 ${esc(w('title'))}</b></div>${f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''}${lawHtml(s)}</div>`;
    host.querySelector<HTMLButtonElement>('[data-lwback]')!.onclick = () => d.back();
    wireLaw(host, s, { notify: m => { flash = m; d.notify(m); }, again: () => { d.refresh(); draw(); } });
  };
  draw();
}
export function resetLawView(): void { view.tab = 'street'; }
