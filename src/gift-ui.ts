/* The Gifts tab of the online screen: take the gifts friends sent you, and send one to a friend who follows you back. The rules (who may send to whom, three
   gifts a day, the language and contact-details filters) are on the server (migrations/0016_gifts.sql); what each gift costs and does is in gifts.ts.
   It draws into its own box and never redraws the rest of the online screen. */
import type { OnlineClient, Friend } from './cloud';
import type { State } from './engine';
import { GIFTS, KINDS, MAX_MONEY, cannotSend, cost, pay, receive } from './gifts';
import type { GiftKind } from './gifts';
import { lang } from './i18n';

const W: Record<string, [string, string]> = {
  inbox: ['For you', 'Для вас'], empty: ['No gifts waiting.', 'Подарков нет.'], take: ['Take', 'Забрать'], from: ['from', 'от'],
  send: ['Send a gift', 'Отправить подарок'], to: ['To', 'Кому'], what: ['Gift', 'Подарок'], amount: ['Amount (50–1000 ₽)', 'Сумма (50–1000 ₽)'], note: ['A kind word (up to 80 characters)', 'Тёплое слово (до 80 символов)'],
  sendBtn: ['Send', 'Отправить'], noFriends: ['No friends who follow you back yet. Follow someone in the Friends tab and ask them to follow you.', 'Пока нет друзей, подписанных на вас в ответ. Подпишитесь на кого-нибудь во вкладке «Друзья» и попросите подписаться в ответ.'],
  login: ['Choose a public name in the Account tab first.', 'Сначала выберите публичное имя во вкладке «Аккаунт».'], loading: ['Loading…', 'Загрузка…'], sent: ['Gift sent.', 'Подарок отправлен.'], cost: ['Costs', 'Стоит'],
  limit: ['Three gifts a day at most.', 'Не больше трёх подарков в день.'],
};
const w = (k: string): string => W[k]?.[lang() === 'ru' ? 1 : 0] ?? k;
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));
const money = (n: number): string => `${Math.round(n).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US')} ₽`;
const name = (k: GiftKind): string => (lang() === 'ru' ? GIFTS[k].ru : GIFTS[k].en);

type Gift = { id: number; sender: string; sender_name: string; kind: GiftKind; amount: number; note: string };

/** Shows the Gifts tab in `el`. Returns the function that stops it. */
export function mountGifts(el: HTMLElement, c: OnlineClient, d: { notify: (m: string) => void; state: () => State | null }): () => void {
  let alive = true, gifts: Gift[] = [], friends: Friend[] = [], loaded = false;
  const me = c.session();
  const say = (r: { ok: boolean; msg: string }): void => { if (r.msg) d.notify(r.msg); };
  const draw = (): void => {
    if (!alive) return;
    if (!me?.username) { el.innerHTML = `<p class="hint">${esc(w('login'))}</p>`; return; }
    if (!loaded) { el.innerHTML = `<p class="hint">${esc(w('loading'))}</p>`; return; }
    const mutual = friends.filter(f => f.mutual);
    const box = gifts.length ? `<ul class="olList">${gifts.map(g => `<li>${GIFTS[g.kind]?.icon ?? '🎁'} <b>${esc(name(g.kind))}${g.kind === 'money' ? ` ${money(g.amount)}` : ''}</b> <span class="sub">${esc(w('from'))} @${esc(g.sender_name)}${g.note ? ` — “${esc(g.note)}”` : ''}</span> <button type="button" class="primary" data-gift="take:${g.id}">${esc(w('take'))}</button></li>`).join('')}</ul>` : `<p class="hint">${esc(w('empty'))}</p>`;
    const form = mutual.length ? `<form class="olSend" id="giftSend"><select id="giftTo" aria-label="${esc(w('to'))}">${mutual.map(f => `<option value="${esc(f.id)}">@${esc(f.username)}</option>`).join('')}</select>
      <select id="giftKind" aria-label="${esc(w('what'))}">${KINDS.map(k => `<option value="${k}">${GIFTS[k].icon} ${esc(name(k))}${k === 'money' ? '' : ` — ${money(cost(k))}`}</option>`).join('')}</select>
      <input type="number" id="giftAmount" min="50" max="${MAX_MONEY}" step="50" value="200" aria-label="${esc(w('amount'))}" style="display:none">
      <input type="text" id="giftNote" maxlength="80" placeholder="${esc(w('note'))}" autocomplete="off"><button class="primary" type="submit">${esc(w('sendBtn'))}</button></form><p class="sub">${esc(w('limit'))}</p>` : `<p class="sub">${esc(w('noFriends'))}</p>`;
    el.innerHTML = `<h3>🎁 ${esc(w('inbox'))}</h3>${box}<h3>${esc(w('send'))}</h3>${form}`;
    wire();
  };
  const load = async (): Promise<void> => {
    if (!alive || !me?.username || !c.myGifts) { loaded = true; draw(); return; }
    const [g, f] = await Promise.all([c.myGifts(), c.friends()]); if (!alive) return;
    gifts = g.ok && Array.isArray(g.data) ? (g.data as unknown as Gift[]) : []; friends = f.ok && Array.isArray(f.data) ? f.data : [];
    loaded = true; draw();
  };
  const wire = (): void => {
    el.querySelectorAll<HTMLButtonElement>('[data-gift]').forEach(b => { b.onclick = () => void (async () => {
      const id = Number((b.dataset.gift as string).split(':')[1]), g = gifts.find(x => x.id === id), s = d.state(); if (!g || !s) return;
      const r = await c.claimGift!(id); if (!r.ok) { say(r); await load(); return; }
      const got = receive(s, g.kind, g.amount); d.notify(`${GIFTS[g.kind]?.icon ?? '🎁'} @${g.sender_name}: ${got}`); await load();
    })(); });
    const kind = el.querySelector<HTMLSelectElement>('#giftKind'), amount = el.querySelector<HTMLInputElement>('#giftAmount');
    if (kind && amount) kind.onchange = () => { amount.style.display = kind.value === 'money' ? '' : 'none'; };
    const send = el.querySelector<HTMLFormElement>('#giftSend'); if (send) send.onsubmit = e => { e.preventDefault(); void (async () => {
      const s = d.state(); if (!s) return;
      const to = el.querySelector<HTMLSelectElement>('#giftTo')!.value, k = (kind?.value ?? 'tea') as GiftKind, a = k === 'money' ? Number(amount?.value ?? 0) : 0, note = (el.querySelector<HTMLInputElement>('#giftNote')?.value ?? '').trim();
      const why = cannotSend(s, k, a); if (why) { d.notify(why); return; }
      const r = await c.sendGift!(to, k, a, note); if (r.ok) { pay(s, k, a); d.notify(w('sent')); } else say(r);
      await load();
    })(); };
  };
  draw(); void load();
  return () => { alive = false; };
}
