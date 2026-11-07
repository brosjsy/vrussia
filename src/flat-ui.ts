/* The Flat tab of the online screen: start a shared flat in the player's city, invite friends who follow you back (up to 4 people live there), answer
   invitations, do the daily chore, and see the rent share. The server keeps who lives together (migrations/0014_flats.sql); the game splits the
   rent through `tmp.flatmates` (engine.rentDue), which this tab and the background sync (cloud-sync.ts) keep up to date.
   It draws into its own box and never redraws the rest of the online screen. */
import type { OnlineClient, Friend } from './cloud';
import type { State } from './engine';
import { rentDue } from './engine';
import { lang } from './i18n';

const W: Record<string, [string, string]> = {
  none: ['You do not share a flat. Start one in your city and invite friends who follow you back: the rent is split between everyone who lives there.', 'У вас нет общей квартиры. Заведите её в своём городе и пригласите друзей, которые подписаны на вас в ответ: аренда делится на всех, кто там живёт.'],
  start: ['Start a shared flat in', 'Завести общую квартиру в городе'], invites: ['Invitations', 'Приглашения'], yes: ['Move in', 'Въехать'], no: ['Decline', 'Отказаться'], from: ['from', 'от'],
  flat: ['Shared flat in', 'Общая квартира в городе'], who: ['Living here', 'Живут здесь'], chore: ['Do today\'s chore', 'Выполнить дежурство'], choreDone: ['chore done', 'дежурство выполнено'],
  invite: ['Invite a friend', 'Пригласить друга'], inviteBtn: ['Invite', 'Пригласить'], noFriends: ['No friends who follow you back and are free to move in. Follow someone in the Friends tab and ask them to follow you.', 'Нет друзей, подписанных на вас в ответ и свободных для переезда. Подпишитесь на кого-нибудь во вкладке «Друзья» и попросите подписаться в ответ.'],
  full: ['The flat is full (4).', 'В квартире нет мест (4).'], leave: ['Move out', 'Выехать'], rent: ['Your rent share on Saturday', 'Ваша доля аренды в субботу'], of: ['of', 'из'],
  login: ['Choose a public name in the Account tab first.', 'Сначала выберите публичное имя во вкладке «Аккаунт».'], loading: ['Loading…', 'Загрузка…'], sent: ['Invitation sent.', 'Приглашение отправлено.'],
  choreOk: ['Chore done. The kitchen shines.', 'Дежурство выполнено. Кухня сияет.'],
};
const w = (k: string): string => W[k]?.[lang() === 'ru' ? 1 : 0] ?? k;
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));
const money = (n: number): string => `${Math.round(n).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US')} ₽`;

type Flat = { id: number; city: string; owner: string; members: { id: string; username: string; chore_today: boolean }[] };
type Invite = { id: number; flat_id: number; city: string; inviter_name: string };

/** Shows the Flat tab in `el` and keeps `tmp.flatmates` of the game right. Returns the function that stops it. */
export function mountFlat(el: HTMLElement, c: OnlineClient, d: { notify: (m: string) => void; state: () => State | null }): () => void {
  let alive = true, flat: Flat | null = null, invites: Invite[] = [], friends: Friend[] = [], loaded = false;
  const me = c.session();
  const say = (r: { ok: boolean; msg: string }): void => { if (r.msg) d.notify(r.msg); };
  const apply = (): void => { const s = d.state(); if (s) s.tmp.flatmates = flat ? Math.max(0, Math.min(3, flat.members.length - 1)) : 0; };
  const draw = (): void => {
    if (!alive) return;
    if (!me?.username) { el.innerHTML = `<p class="hint">${esc(w('login'))}</p>`; return; }
    if (!loaded) { el.innerHTML = `<p class="hint">${esc(w('loading'))}</p>`; return; }
    const s = d.state();
    const inv = invites.length ? `<h3>${esc(w('invites'))}</h3><ul class="olList">${invites.map(i => `<li><b>${esc(i.city)}</b> <span class="sub">${esc(w('from'))} @${esc(i.inviter_name)}</span> <button type="button" class="primary" data-flat="yes:${i.id}">${esc(w('yes'))}</button> <button type="button" class="ghost" data-flat="no:${i.id}">${esc(w('no'))}</button></li>`).join('')}</ul>` : '';
    if (!flat) { el.innerHTML = `${inv}<p class="hint">${esc(w('none'))}</p>${s ? `<p><button type="button" class="primary" data-flat="start:0">${esc(w('start'))} ${esc(s.city)}</button></p>` : ''}`; wire(); return; }
    const inFlat = new Set(flat.members.map(m => m.id)), can = friends.filter(f => f.mutual && !inFlat.has(f.id));
    const mineDone = flat.members.find(m => m.id === me.userId)?.chore_today;
    const add = flat.members.length >= 4 ? `<p class="sub">${esc(w('full'))}</p>` : can.length ? `<form class="olSend" id="flInvite"><select id="flFriend" aria-label="${esc(w('invite'))}">${can.map(f => `<option value="${esc(f.id)}">@${esc(f.username)}</option>`).join('')}</select><button class="secondary" type="submit">${esc(w('inviteBtn'))}</button></form>` : `<p class="sub">${esc(w('noFriends'))}</p>`;
    const share = s && s.rent > 0 ? `<p class="sub">${esc(w('rent'))}: <b>${money(rentDue(s))}</b> ${esc(w('of'))} ${money(s.rent)}</p>` : '';
    el.innerHTML = `${inv}<h3>🏠 ${esc(w('flat'))} ${esc(flat.city)}</h3><h4>${esc(w('who'))} (${flat.members.length}/4)</h4><ul class="olList">${flat.members.map(m => `<li><b>@${esc(m.username)}</b>${m.chore_today ? ` <span class="sub">✔ ${esc(w('choreDone'))}</span>` : ''}</li>`).join('')}</ul>${share}
      <p><button type="button" class="primary" data-flat="chore:0"${mineDone ? ' disabled' : ''}>${esc(w('chore'))}</button></p>${add}<p><button type="button" class="ghost" data-flat="leave:0">${esc(w('leave'))}</button></p>`;
    wire();
  };
  const load = async (): Promise<void> => {
    if (!alive || !me?.username || !c.myFlat) { loaded = true; draw(); return; }
    const r = await c.myFlat(); if (!alive) return;
    if (r.ok && r.data) { flat = r.data.flat; invites = r.data.invites; apply(); } else say(r);
    if (flat) { const f = await c.friends(); if (f.ok && Array.isArray(f.data)) friends = f.data; }
    loaded = true; draw();
  };
  const wire = (): void => {
    el.querySelectorAll<HTMLButtonElement>('[data-flat]').forEach(b => { b.onclick = () => void (async () => {
      const [act, arg] = (b.dataset.flat as string).split(':');
      if (act === 'yes' || act === 'no') say(await c.answerFlatInvite!(Number(arg), act === 'yes'));
      else if (act === 'start') { const s = d.state(); if (s) say(await c.createFlat!(s.city)); }
      else if (act === 'leave') say(await c.leaveFlat!());
      else if (act === 'chore') { const r = await c.doChore!(); say(r.ok ? { ok: true, msg: w('choreOk') } : r); }
      await load();
    })(); });
    const inv = el.querySelector<HTMLFormElement>('#flInvite'); if (inv) inv.onsubmit = e => { e.preventDefault(); void (async () => { const r = await c.inviteToFlat!(el.querySelector<HTMLSelectElement>('#flFriend')?.value ?? ''); say(r.ok ? { ok: true, msg: w('sent') } : r); })(); };
  };
  draw(); void load();
  return () => { alive = false; };
}
