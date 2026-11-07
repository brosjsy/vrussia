/* The Crew tab of the online screen: found a crew, answer invitations, see who is in it and who is online, invite a friend who follows you back
   (up to 12 members), leave or remove a member, and talk in the crew's own chat room, which updates live. The rules are on the server
   (migrations/0013_crews.sql); this file only draws and sends. It draws into its own box and never redraws the rest of the online screen. */
import type { OnlineClient } from './cloud';
import type { Friend } from './cloud';
import { lang } from './i18n';

export const crewRoom = (id: number): string => `crew:${id}`;
const W: Record<string, [string, string]> = {
  none: ['You are not in a crew. Found one and invite friends who follow you back, or wait for an invitation.', 'Вы не состоите в команде. Создайте её и приглашайте друзей, которые подписаны на вас в ответ, или дождитесь приглашения.'],
  name: ['Crew name (3–30 letters)', 'Название команды (3–30 символов)'], found: ['Found the crew', 'Создать команду'],
  invites: ['Invitations', 'Приглашения'], yes: ['Join', 'Вступить'], no: ['Decline', 'Отказаться'], from: ['from', 'от'],
  members: ['Members', 'Участники'], top: ['Top crews', 'Лучшие команды'], pts: ['points', 'очков'], online: ['online', 'в сети'], owner: ['owner', 'владелец'], invite: ['Invite a friend', 'Пригласить друга'], inviteBtn: ['Invite', 'Пригласить'],
  noFriends: ['No friends who follow you back yet. Follow someone in the Friends tab and ask them to follow you.', 'Пока нет друзей, подписанных на вас в ответ. Подпишитесь на кого-нибудь во вкладке «Друзья» и попросите подписаться в ответ.'],
  leave: ['Leave the crew', 'Выйти из команды'], kick: ['Remove', 'Исключить'], chat: ['Crew chat', 'Чат команды'], say: ['Write to the crew', 'Написать команде'], send: ['Send', 'Отправить'],
  login: ['Choose a public name in the Account tab first.', 'Сначала выберите публичное имя во вкладке «Аккаунт».'], adult: ['Crews and their chat are for players who are 18 or older.', 'Команды и их чат — для игроков от 18 лет.'],
  loading: ['Loading…', 'Загрузка…'], full: ['The crew is full (12).', 'В команде нет мест (12).'],
};
const w = (k: string): string => W[k]?.[lang() === 'ru' ? 1 : 0] ?? k;
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));

interface Msg { id: number; sender: string; username: string; body: string }
type Crew = { id: number; name: string; city: string | null; role: 'owner' | 'member'; members: { id: string; username: string; role: string; online: boolean }[] };
type Invite = { id: number; crew_id: number; crew_name: string; inviter_name: string };

/** Shows the Crew tab in `el`. Returns the function that stops its live stream and timer. */
export function mountCrew(el: HTMLElement, c: OnlineClient, d: { notify: (m: string) => void }): () => void {
  let alive = true, top: { id: number; name: string; city: string | null; members: number | string; points: number | string }[] = [], crew: Crew | null = null, invites: Invite[] = [], friends: Friend[] = [], msgs: Msg[] = [], stopLive: (() => void) | null = null, liveFor = 0, timer = 0, loaded = false;
  const me = c.session();
  const say = (r: { ok: boolean; msg: string }): void => { if (r.msg) d.notify(r.msg); };
  const draw = (): void => {
    if (!alive) return;
    if (!me?.username) { el.innerHTML = `<p class="hint">${esc(w('login'))}</p>`; return; }
    if (!me.adult) { el.innerHTML = `<p class="hint">${esc(w('adult'))}</p>`; return; }
    if (!loaded) { el.innerHTML = `<p class="hint">${esc(w('loading'))}</p>`; return; }
    const board = top.length ? `<h3>🏆 ${esc(w('top'))}</h3><ol class="olList">${top.slice(0, 10).map(t => `<li><b>${esc(t.name)}</b> <span class="sub">${t.city ? esc(t.city) + ' · ' : ''}${Number(t.members)}/12 · ${Number(t.points).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US')} ${esc(w('pts'))}</span></li>`).join('')}</ol>` : '';
    const inv = invites.length ? `<h3>${esc(w('invites'))}</h3><ul class="olList">${invites.map(i => `<li><b>${esc(i.crew_name)}</b> <span class="sub">${esc(w('from'))} @${esc(i.inviter_name)}</span> <button type="button" class="primary" data-crew="yes:${i.id}">${esc(w('yes'))}</button> <button type="button" class="ghost" data-crew="no:${i.id}">${esc(w('no'))}</button></li>`).join('')}</ul>` : '';
    if (!crew) { el.innerHTML = `${inv}<p class="hint">${esc(w('none'))}</p><form class="olSend" id="crFound"><input type="text" id="crName" minlength="3" maxlength="30" placeholder="${esc(w('name'))}" required><button class="primary" type="submit">${esc(w('found'))}</button></form>${board}`; wire(); return; }
    const inCrew = new Set(crew.members.map(m => m.id));
    const can = friends.filter(f => f.mutual && !inCrew.has(f.id));
    const list = `<ul class="olList">${crew.members.map(m => `<li><b>@${esc(m.username)}</b> <span class="sub">${m.role === 'owner' ? esc(w('owner')) : ''}${m.online ? ` · ${esc(w('online'))}` : ''}</span>${crew!.role === 'owner' && m.id !== me.userId ? ` <button type="button" class="olMini" data-crew="kick:${esc(m.id)}">${esc(w('kick'))}</button>` : ''}</li>`).join('')}</ul>`;
    const add = crew.members.length >= 12 ? `<p class="sub">${esc(w('full'))}</p>` : can.length ? `<form class="olSend" id="crInvite"><select id="crFriend" aria-label="${esc(w('invite'))}">${can.map(f => `<option value="${esc(f.id)}">@${esc(f.username)}</option>`).join('')}</select><button class="secondary" type="submit">${esc(w('inviteBtn'))}</button></form>` : `<p class="sub">${esc(w('noFriends'))}</p>`;
    const chat = `<h3>${esc(w('chat'))}</h3><ul class="olChat" id="crChat">${msgs.slice().reverse().map(m => `<li class="${m.sender === me.userId ? 'mine' : ''}"><b>@${esc(m.username)}</b> ${esc(m.body)}</li>`).join('')}</ul><form class="olSend" id="crSend"><input type="text" id="crText" maxlength="280" placeholder="${esc(w('say'))}" autocomplete="off" required><button class="primary" type="submit">${esc(w('send'))}</button></form>`;
    const keep = el.querySelector<HTMLInputElement>('#crText')?.value ?? '';
    el.innerHTML = `${inv}<h3>👥 ${esc(crew.name)}${crew.city ? ` <span class="sub">${esc(crew.city)}</span>` : ''}</h3><h4>${esc(w('members'))} (${crew.members.length}/12)</h4>${list}${add}${chat}<p><button type="button" class="ghost" data-crew="leave:0">${esc(w('leave'))}</button></p>${board}`;
    const box = el.querySelector<HTMLInputElement>('#crText'); if (box && keep) box.value = keep;
    wire();
  };
  const load = async (): Promise<void> => {
    if (!alive || !me?.username || !me.adult || !c.myCrew) { loaded = true; draw(); return; }
    const [r, tb] = await Promise.all([c.myCrew(), c.topCrews ? c.topCrews() : Promise.resolve(null)]); if (!alive) return;
    if (tb && tb.ok && Array.isArray(tb.data)) top = tb.data;
    if (r.ok && r.data) { crew = r.data.crew; invites = r.data.invites; } else say(r);
    if (crew && c.session()) { const [m, f] = await Promise.all([c.messages(crewRoom(crew.id)), c.friends()]); if (m.ok) msgs = (m.data ?? []) as unknown as Msg[]; if (f.ok && Array.isArray(f.data)) friends = f.data; }
    else { msgs = []; }
    loaded = true; if (alive) { sync(); draw(); }
  };
  const sync = (): void => {
    const want = crew && c.live ? crew.id : 0;
    if (want === liveFor) return;
    stopLive?.(); stopLive = null; liveFor = want;
    if (want && c.live) stopLive = c.live([crewRoom(want)], () => { if (alive && !el.querySelector('#crText:focus')) void load(); else if (alive) void quickMessages(); });
  };
  const quickMessages = async (): Promise<void> => { if (!crew) return; const m = await c.messages(crewRoom(crew.id)); if (m.ok && alive) { msgs = (m.data ?? []) as unknown as Msg[]; draw(); } };
  const wire = (): void => {
    el.querySelectorAll<HTMLButtonElement>('[data-crew]').forEach(b => { b.onclick = () => void (async () => {
      const [act, arg] = (b.dataset.crew as string).split(':');
      if (act === 'yes' || act === 'no') say(await c.answerCrewInvite!(Number(arg), act === 'yes'));
      else if (act === 'leave') say(await c.leaveCrew!());
      else if (act === 'kick') say(await c.kickFromCrew!(arg as string));
      await load();
    })(); });
    const found = el.querySelector<HTMLFormElement>('#crFound'); if (found) found.onsubmit = e => { e.preventDefault(); void (async () => { say(await c.createCrew!((el.querySelector<HTMLInputElement>('#crName')?.value ?? '').trim())); await load(); })(); };
    const inv = el.querySelector<HTMLFormElement>('#crInvite'); if (inv) inv.onsubmit = e => { e.preventDefault(); void (async () => { const r = await c.inviteToCrew!(el.querySelector<HTMLSelectElement>('#crFriend')?.value ?? ''); say(r.ok ? { ok: true, msg: lang() === 'ru' ? 'Приглашение отправлено.' : 'Invitation sent.' } : r); })(); };
    const send = el.querySelector<HTMLFormElement>('#crSend'); if (send) send.onsubmit = e => { e.preventDefault(); void (async () => {
      const input = el.querySelector<HTMLInputElement>('#crText'), text = (input?.value ?? '').trim(); if (!text || !crew) return;
      const r = await c.send(crewRoom(crew.id), text); say(r); if (r.ok && input) input.value = ''; await quickMessages();
    })(); };
  };
  draw(); void load();
  timer = window.setInterval(() => { if (alive && !el.querySelector('#crText:focus')) void load(); }, 30000);
  return () => { alive = false; stopLive?.(); window.clearInterval(timer); };
}
