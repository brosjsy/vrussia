/* The Cyber app of the phone (round 151): today's "Scam or not?" round, the player's level, the protections to switch on and what to do if one has been
   fooled. Loaded on demand from the phone; the words are in English and Russian. */
import type { State } from './engine';
import { lang } from './i18n';
import { cyberOf, levelOf, todaysRound, answer, MESSAGES, PROTECTIONS, protect, registerCyber } from './cyber';

const esc = (x: unknown): string => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const W: Record<string, [string, string]> = {
  title: ['Cyber safety', 'Кибербезопасность'], quiz: ['Scam or not?', 'Мошенники или нет?'], quizHint: ['Five messages a day. Decide for each: a trick, or a normal message?', 'Пять сообщений в день. Решите для каждого: уловка или обычное сообщение?'],
  scam: ['Scam', 'Мошенники'], fine: ['It is fine', 'Всё в порядке'], right: ['Right.', 'Верно.'], wrong: ['Not quite.', 'Не совсем.'], done: ['Today\'s round is done. Come back tomorrow.', 'Сегодняшний раунд пройден. Приходите завтра.'],
  level: ['Level', 'Уровень'], xp: ['experience', 'опыт'], spotted: ['tricks spotted', 'уловок распознано'], fooled: ['times fooled', 'раз попались'],
  prot: ['Your protection', 'Ваша защита'], on: ['On', 'Включено'], turnOn: ['Switch on', 'Включить'],
  help: ['If you have been fooled', 'Если вас обманули'],
  h1: ['Call your bank on the number on the back of the card and block the card.', 'Позвоните в банк по номеру на обороте карты и заблокируйте карту.'],
  h2: ['Report to the police: 102 from a mobile (112 in an emergency).', 'Сообщите в полицию: 102 с мобильного (112 в экстренном случае).'],
  h3: ['Change passwords, sign out of other devices on Gosuslugi, switch on two-step login.', 'Смените пароли, завершите другие сеансы на Госуслугах, включите двухэтапный вход.'],
  h4: ['Never give anyone SMS codes, passwords or the CVV — no real bank, police or clinic asks for them.', 'Никому не называйте коды из СМС, пароли и CVV — настоящие банк, полиция и поликлиника их не спрашивают.'],
  h5: ['Before any "urgent" transfer, wait 24 hours and talk to your family.', 'Перед любым «срочным» переводом подождите сутки и посоветуйтесь с близкими.'],
};
const w = (k: string): string => (lang() === 'ru' ? W[k][1] : W[k][0]);
const FROM_RU: Record<string, string> = { 'Bank security': 'Служба безопасности банка', Polyclinic: 'Поликлиника', 'Aunt Galya': 'Тётя Галя', '"Director" (new number)': '«Директор» (новый номер)', 'Your son (voice)': 'Ваш сын (голос)', Courier: 'Курьер', 'Job chat': 'Чат вакансий', Acquaintance: 'Знакомый', 'Rental ad': 'Объявление об аренде', 'Parking meter': 'Паркомат', Investments: 'Инвестиции', 'Your bank': 'Ваш банк', Operator: 'Оператор', '"Investigator"': '«Следователь»', Marketplace: 'Маркетплейс', 'Seller on Avito': 'Продавец на Авито', 'Bank (labelled)': 'Банк (маркированный звонок)', Unknown: 'Неизвестный', 'Fellow student': 'Однокурсник', University: 'Университет' };
const CH: Record<string, string> = { sms: '✉️', call: '📞', chat: '💬', mail: '📧', web: '🌐', qr: '🔳' };

export function openCyber(host: HTMLElement, s: State, d: { back: () => void; refresh: () => void; notify: (m: string) => void }): void {
  registerCyber();
  let flash = '', last: { right: boolean; sign: string } | null = null;
  const draw = (): void => {
    const b = cyberOf(s), lv = levelOf(s), round = todaysRound(s), today = b.day === s.day ? b.done : [], next = round.find(i => !today.includes(i));
    const ru = lang() === 'ru', f = flash; flash = '';
    const m = next !== undefined ? MESSAGES[next] : null;
    const quiz = m ? `<div class="cyMsg"><p class="sub">${CH[m.ch]} <b>${esc(ru ? FROM_RU[m.from] ?? m.from : m.from)}</b> · ${today.length + 1}/5</p><p>${esc(ru ? m.ru : m.en)}</p>
        <div class="row"><button data-cyans="1" class="danger">${esc(w('scam'))}</button><button data-cyans="0">${esc(w('fine'))}</button></div></div>` : `<p class="sub">${esc(w('done'))}</p>`;
    const res = last ? `<p class="phNote" role="status">${last.right ? '✅ ' + esc(w('right')) : '❌ ' + esc(w('wrong'))} ${esc(last.sign)}</p>` : '';
    const prot = PROTECTIONS.map(p => { const on = b.shield[p.id] !== undefined; return `<li><b>${p.icon} ${esc(ru ? p.ru : p.en)}</b>${on ? ` · <span class="ok">${esc(w('on'))}</span>` : ` <button data-cyprot="${p.id}">${esc(w('turnOn'))}</button>`}<br><span class="sub">${esc(ru ? p.howRu : p.how)}</span></li>`; }).join('');
    host.innerHTML = `<div class="phone sub svcApp"><div class="phHead"><button class="ghost" data-cyback aria-label="Back">‹</button><b>🛡️ ${esc(w('title'))}</b></div>${f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''}
      <p class="sub">${esc(w('level'))}: <b>${esc(lv.name)}</b> · ${b.xp} ${esc(w('xp'))}${lv.next ? ` / ${lv.next}` : ''} · ${b.spotted} ${esc(w('spotted'))} · ${b.fooled} ${esc(w('fooled'))}</p>
      <h3>${esc(w('quiz'))}</h3><p class="sub">${esc(w('quizHint'))}</p>${res}${quiz}
      <h3>${esc(w('prot'))}</h3><ul class="cyProt">${prot}</ul>
      <h3>${esc(w('help'))}</h3><ol class="cyHelp"><li>${esc(w('h1'))}</li><li>${esc(w('h2'))}</li><li>${esc(w('h3'))}</li><li>${esc(w('h4'))}</li><li>${esc(w('h5'))}</li></ol></div>`;
    host.querySelector<HTMLButtonElement>('[data-cyback]')!.onclick = () => d.back();
    host.querySelectorAll<HTMLButtonElement>('[data-cyans]').forEach(btn => { btn.onclick = () => { if (next === undefined) return; const r = answer(s, next, btn.dataset.cyans === '1'); last = r; if (r.msg) { flash = r.msg; d.notify(r.msg); } d.refresh(); draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-cyprot]').forEach(btn => { btn.onclick = () => { const r = protect(s, btn.dataset.cyprot as never); flash = r.msg; d.notify(r.msg); d.refresh(); draw(); }; });
  };
  draw();
}
