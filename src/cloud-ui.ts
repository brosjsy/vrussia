/* The Online screen: the account (sign up, log in, the public name, log out), the saved game on the server, the leaderboard, the chat of the place where the
   player stands, and the news (announcements and the number of visits). It draws itself into one element and draws again when something changes.
   The rules and the requests are in cloud.ts; this file is only the screen. When the game has no online part it says so and how to set one up. */
import type { State } from './engine';
import { msgL } from './i18n-account';
import './i18n-online';
import * as G from './engine';
import type { OnlineClient as Cloud, ScoreRow, ChatMessage, Announcement, PlayerAd, Talk, Friend, BestHome, PublicHome, Note, Gift } from './cloud';
import { furnById } from './furniture';
import { placeRoom, directRoom } from './cloud';
import { COOP_ACT } from './coop-acts';
import { t, lang, originText } from './i18n';
import { cityName } from './i18n-words';
import { COUNTRIES, REGIONS, flagOf } from './countries';
import type { Challenge, Chapter, Coop } from './api-client';

export interface OnlineDeps { cloud: Cloud | null; state: () => State | null; notify: (m: string) => void; onLoad: (s: State) => void; onSignedIn?: () => Promise<void>; onSignedOut?: () => void; /** before logging out: upload the game played since the last automatic save (round 152) */ beforeSignOut?: () => Promise<unknown>; /** the game changed here (money from a reward, a gift, a co-op activity): save it and redraw the money */ changed?: () => void; home?: () => { city: string; dwelling: string; design: import('./cloud').HomeDesign; stars: number } | null; status?: () => { lastSaved: number | null; pending: boolean } | null }
type Tab = 'account' | 'challenges' | 'top' | 'chat' | 'friends' | 'ads' | 'news';
const esc = (x: string): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

interface View { email: string; ch: { chapters: Chapter[]; challenges: Challenge[] } | null; coops: Coop[]; openChapter: number; myAds: number | null; myAdList: { id: number; city: string; kind: string; title: string }[]; liked: string | null; link: { kind: 'verify' | 'reset'; token: string } | null; forgot: boolean; tab: Tab; busy: boolean; online: number | null; top: ScoreRow[] | null; chat: ChatMessage[]; news: Announcement[] | null; visits: number | null; signup: boolean; ads: PlayerAd[] | null; talks: Talk[]; dm: { id: string; name: string } | null; friends: Friend[] | null; found: { id: string; username: string }[]; best: BestHome[] | null; blocked: { id: string; username: string }[]; visit: { id: string; name: string; home: PublicHome | null; notes: Note[] } | null }
const FIRST = (): View => ({ email: '', ch: null, coops: [], openChapter: 0, myAds: null, myAdList: [], liked: null, link: null, forgot: false, tab: 'account', busy: false, online: null, top: null, chat: [], news: null, visits: null, signup: false, ads: null, talks: [], dm: null, friends: null, found: [], best: null, blocked: [], visit: null });
const view: View = FIRST();
/** Forgets everything one account had open (chats and private chats, the home visited, the last search, the challenges), keeping only the tab. */
function forgetAccount(): void { const tab = view.tab; Object.assign(view, FIRST(), { tab }); }

let syncLine = (): string => '';
function accountHtml(c: Cloud): string {
  const s = c.session(), own = typeof c.forgot === 'function';          // the game's own server has e-mail links; Supabase did them itself
  if (own && view.link?.kind === 'reset') return `<form class="olForm" id="olReset"><h3>${esc(t('olNewPassword'))}</h3>
      <label>${esc(t('olPwNew'))}<input type="password" id="olResetPass" autocomplete="new-password" minlength="10" required></label><p class="sub">${esc(t('olPwHint'))}</p>
      <div class="row"><button class="primary" type="submit"${view.busy ? ' disabled' : ''}>${esc(t('olSetPassword'))}</button><button type="button" class="ghost" id="olLinkCancel">${esc(t('olCancel'))}</button></div></form>`;
  if (own && view.forgot && !s) return `<form class="olForm" id="olForgotForm"><h3>${esc(t('olForgotTitle'))}</h3><p class="sub">${esc(t('olForgotHint'))}</p>
      <label>${esc(t('olEmail'))}<input type="email" id="olEmail" autocomplete="email" required value="${esc(view.email)}"></label>
      <div class="row"><button class="primary" type="submit"${view.busy ? ' disabled' : ''}>${esc(t('olSendLink'))}</button><button type="button" class="ghost" id="olResend">${esc(t('olResend'))}</button><button type="button" class="ghost" id="olLinkCancel">${esc(t('olCancel'))}</button></div></form>`;
  if (!s) {
    return `<form class="olForm" id="olAuth"><h3>${esc(t(view.signup ? 'olSignUp' : 'olLogIn'))}</h3>
      <label>${esc(t('olEmail'))}<input type="email" id="olEmail" autocomplete="email" required value="${esc(view.email)}"></label>
      <label>${esc(t(own ? 'olPassword10' : 'olPassword'))}<input type="password" id="olPass" autocomplete="${view.signup ? 'new-password' : 'current-password'}" minlength="${own ? 10 : 8}" required></label>
      ${view.signup ? `<label>${esc(t('olName'))}<input type="text" id="olName" pattern="[a-z0-9_]{3,20}" maxlength="20" required><small>${esc(t('olNameHint'))}</small></label><label class="olCheck"><input type="checkbox" id="olAdult"> ${esc(t('olAdult'))}</label>${own ? `<label>${esc(t('olCountry'))}<select id="olCountry"><option value="">${esc(t('olCountryNone'))}</option>${REGIONS.map(r => `<optgroup label="${esc(lang() === 'ru' ? r.ru : r.en)}">${COUNTRIES.filter(x => x.region === r.id).map(x => `<option value="${x.code}|${x.region}">${esc(lang() === 'ru' ? x.ru : x.en)}</option>`).join('')}</optgroup>`).join('')}</select><small>${esc(t('olCountryHint'))}</small></label>` : ''}<p class="sub">${esc(t('olPrivacy'))}</p>` : ''}
      <div class="row"><button class="primary" type="submit"${view.busy ? ' disabled' : ''}>${esc(t(view.signup ? 'olSignUp' : 'olLogIn'))}</button><button type="button" class="ghost" id="olSwitch">${esc(t(view.signup ? 'olHaveAccount' : 'olNoAccount'))}</button>${own && !view.signup ? `<button type="button" class="ghost" id="olForgotBtn">${esc(t('olForgot'))}</button>` : ''}</div></form>`;
  }
  if (!s.username) return `<form class="olForm" id="olClaim"><h3>${esc(t('olChooseName'))}</h3><label>${esc(t('olName'))}<input type="text" id="olName" pattern="[a-z0-9_]{3,20}" maxlength="20" required><small>${esc(t('olNameHint'))}</small></label><label class="olCheck"><input type="checkbox" id="olAdult"> ${esc(t('olAdult'))}</label><div class="row"><button class="primary" type="submit">${esc(t('olTakeName'))}</button><button type="button" class="ghost" id="olOut">${esc(t('olLogOut'))}</button></div></form>`;
  return `<div class="olCard"><b>${esc(t('olSignedAs'))} @${esc(s.username)}</b><div class="sub">${esc(s.email)}${view.online !== null ? ` · ${view.online} ${esc(t('olOnline'))}` : ''}</div>
    <div class="row"><button class="primary" id="olSave"${view.busy ? ' disabled' : ''}>${esc(t('olSave'))}</button><button class="secondary" id="olLoad"${view.busy ? ' disabled' : ''}>${esc(t('olLoad'))}</button><button class="ghost" id="olOut">${esc(t('olLogOut'))}</button></div><p class="sub">${esc(t('olSaveHint'))}</p>${syncLine()}<p><button type="button" class="olMini" id="olDelete">${esc(t('olDelete'))}</button>${own ? `<input type="password" id="olDelPass" class="olDelPass" autocomplete="current-password" placeholder="${esc(t('olDelPass'))}" aria-label="${esc(t('olDelPass'))}">` : ''}</p>
    ${own ? `<details class="olPw"><summary>${esc(t('olPwChange'))}</summary><form id="olPwForm"><label>${esc(t('olPwCurrent'))}<input type="password" id="olPwCur" autocomplete="current-password" required></label><label>${esc(t('olPwNew'))}<input type="password" id="olPwNext" autocomplete="new-password" minlength="10" required></label><div class="row"><button class="secondary" type="submit">${esc(t('olPwChange'))}</button><button type="button" class="ghost" id="olEndOthers">${esc(t('olEndOthers'))}</button></div></form></details>` : ''}</div>`;
}
/** A starting life by its name, never its code (round 150: the table showed codes such as "uz_migrant"). */
const originOf = (id: string): string => { const o = G.origins.find(x => x.id === id); return o ? `${o.icon} ${originText(o).label}` : id ? id.replace(/_/g, ' ') : '—'; };
const topHtml = (): string => (view.top === null ? `<p class="hint">${esc(t('olLoading'))}</p>` : view.top.length === 0 ? `<p class="hint">${esc(t('olNoScores'))}</p>`
  : `<ol class="olTop">${view.top.map(r => `<li><b>@${esc(r.username)}</b><span>${esc(cityName(r.city))} · ${esc(originOf(r.origin))} · ${r.days} ${esc(t('olDays'))}</span><i>${r.score}</i></li>`).join('')}</ol>`);
const MUTE_MS = 86_400_000;
let muteOwner = '';                                                     // the mute list belongs to the account that made it
const MUTE_KEY = (): string => `vrussia_muted${muteOwner ? ':' + muteOwner : ''}`;
export function setMuteOwner(id: string): void { muteOwner = id; }
/** Players muted on this device (until when). Muting only hides their messages here for a day; it tells nobody. */
export function muted(now = Date.now()): Record<string, number> { try { const m = JSON.parse(localStorage.getItem(MUTE_KEY()) ?? '{}') as Record<string, number>; for (const k of Object.keys(m)) if (!(m[k] > now)) delete m[k]; return m; } catch { return {}; } }
export function mute(id: string, now = Date.now()): void { try { const m = muted(now); m[id] = now + MUTE_MS; localStorage.setItem(MUTE_KEY(), JSON.stringify(m)); } catch { /* storage may be blocked */ } }
const GIFTS: { id: Gift; icon: string; price: number }[] = [{ id: 'flowers', icon: '💐', price: 800 }, { id: 'cake', icon: '🍰', price: 600 }, { id: 'tea', icon: '🍵', price: 300 }, { id: 'chocolates', icon: '🍫', price: 500 }];
/** A drawing of a visited home from above: the floor and a square with an icon for each piece of furniture. */
function planHtml(h: PublicHome): string {
  // another player's design: only a real colour and real numbers reach the style attribute (round 152: a crafted "wall" could inject any CSS)
  const color = (x: unknown, dflt: string): string => (typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x) ? x : dflt), num = (x: unknown, dflt: number): number => (typeof x === 'number' && Number.isFinite(x) ? x : dflt);
  const w = Math.max(6, Math.min(20, num(h.design.w, 12))), dd = Math.max(5, Math.min(14, num(h.design.d, 9)));
  const items = (h.design.placed ?? []).slice(0, 60).map(p => { const f = furnById(p.id); if (!f) return ''; const fw = p.rot ? f.d : f.w, fd = p.rot ? f.w : f.d; return `<span class="plItem" style="left:${(num(p.i, 0) / w) * 100}%;top:${(num(p.j, 0) / dd) * 100}%;width:${(fw / w) * 100}%;height:${(fd / dd) * 100}%;background:${esc(f.color)}" title="${esc(f.name)}">${f.icon}</span>`; }).join('');
  return `<div class="plan" style="aspect-ratio:${w}/${dd};background:${esc(h.design.floor === 'parquet' ? '#c9935a' : h.design.floor === 'checker' ? '#e8e2d2' : '#b0865a')};border-color:${color(h.design.wall, '#e8d9c4')}">${items}</div>`;
}
function friendsHtml(c: Cloud): string {
  const me = c.session(); if (!me?.username) return `<p class="hint">${esc(t('olChatLogin'))}</p>`;
  if (view.visit) {
    const v = view.visit, h = v.home;
    return `<div class="sub"><button type="button" class="olMini" id="olVisitBack">‹ ${esc(t('phoneBack'))}</button></div><h3>🏠 @${esc(v.name)}</h3>
      ${h ? `<p class="sub">${esc(h.city)} · ${esc(h.dwelling)} · ★ ${h.stars}</p>${planHtml(h)}<div class="row">${view.liked ? `<p class="sub">👍 ${esc(t(view.liked === view.visit?.id ? 'olLikedThis' : 'olLikedOther'))}</p>` : `<button type="button" class="secondary" id="olLike">👍 ${esc(t('olLike'))}</button>`}</div>` : `<p class="hint">${esc(t('olNoHome'))}</p>`}
      <h4>${esc(t('olGuestbook'))}</h4><ul class="olNotes">${v.notes.length ? v.notes.map(n => `<li>${n.gift ? GIFTS.find(g => g.id === n.gift)?.icon ?? '' : ''} <b>@${esc(n.author_name)}</b> ${esc(n.body)}</li>`).join('') : `<li class="hint">${esc(t('olNoNotes'))}</li>`}</ul>
      ${h ? `<form class="olSend" id="olNote"><input type="text" id="olNoteText" maxlength="200" placeholder="${esc(t('olNotePh'))}" required><select id="olGift" aria-label="${esc(t('olGift'))}"><option value="">${esc(t('olNoGift'))}</option>${GIFTS.map(g => `<option value="${g.id}">${g.icon} ${esc(t('olGift.' + g.id))} · ${g.price} ₽</option>`).join('')}</select><button class="primary" type="submit">${esc(t('olLeave'))}</button></form>` : ''}`;
  }
  const list = view.friends === null ? `<p class="hint">${esc(t('olLoading'))}</p>` : view.friends.length ? `<ul class="olFriends">${view.friends.map(f => `<li><i class="dot${f.online ? ' on' : ''}" aria-label="${esc(t(f.online ? 'olOnlineNow' : 'olOffline'))}"></i><b>@${esc(f.username)}</b>${f.mutual ? ' 🤝' : ''}<small>${f.online && f.city ? esc(f.city) : ''}</small><span class="acts"><button type="button" class="olMini" data-visit="${esc(f.id)}" data-name="${esc(f.username)}">${esc(t('olVisit'))}</button><button type="button" class="olMini" data-dm="${esc(f.id)}" data-name="${esc(f.username)}">${esc(t('olWrite'))}</button><button type="button" class="olMini" data-unfollow="${esc(f.id)}">${esc(t('olUnfollow'))}</button></span></li>`).join('')}</ul>` : `<p class="hint">${esc(t('olNoFriends'))}</p>`;
  const found = view.found.length ? `<ul class="olFriends">${view.found.filter(p => p.id !== me.userId).map(p => `<li><b>@${esc(p.username)}</b><span class="acts"><button type="button" class="olMini" data-follow="${esc(p.id)}">${esc(t('olFollow'))}</button><button type="button" class="olMini" data-visit="${esc(p.id)}" data-name="${esc(p.username)}">${esc(t('olVisit'))}</button></span></li>`).join('')}</ul>` : '';
  const best = view.best && view.best.length ? `<h4>🏆 ${esc(t('olBest'))}</h4><ol class="olTop">${view.best.map(b => `<li><b>@${esc(b.username)}</b><span>${esc(b.city)} · ★ ${b.stars}</span><i>${Number(b.votes)} 👍</i><button type="button" class="olMini" data-visit="${esc(b.owner)}" data-name="${esc(b.username)}">${esc(t('olVisit'))}</button></li>`).join('')}</ol>` : '';
  return `<form class="olSend" id="olFind"><input type="text" id="olFindText" maxlength="20" placeholder="${esc(t('olFindPh'))}"><button class="secondary" type="submit">${esc(t('olFind'))}</button></form>${found}<h4>${esc(t('olFriends'))}</h4>${list}${view.blocked.length ? `<h4>🚫 ${esc(t('olBlocked'))}</h4><ul class="olFriends">${view.blocked.map(b => `<li><b>@${esc(b.username)}</b><span class="acts"><button type="button" class="olMini" data-unblock="${esc(b.id)}">${esc(t('olUnblock'))}</button></span></li>`).join('')}</ul>` : ''}${best}<p class="sub">${esc(t('olPublishHint'))}</p><button type="button" class="ghost" id="olPublish">${esc(t('olPublish'))}</button>`;
}
function chatHtml(c: Cloud, s: State | null): string {
  const me = c.session();
  if (!me || !me.username) return `<p class="hint">${esc(t('olChatLogin'))}</p>`;
  if (!me.adult) return `<p class="hint">${esc(t('olChatAdult'))}</p>`;
  if (!s) return `<p class="hint">${esc(t('olChatNoGame'))}</p>`;
  const talks = view.talks.length ? `<div class="olTalks">${view.talks.filter(k => k.other !== c.session()?.userId).map(k => `<button type="button" class="olChip" data-dm="${esc(k.other)}" data-name="${esc(k.other_name)}">@${esc(k.other_name)}</button>`).join('')}</div>` : '';
  return `${talks}<div class="sub">${view.dm ? `${esc(t('olTalkWith'))} @${esc(view.dm.name)} <button type="button" class="olMini" id="olBack">${esc(t('olBackRoom'))}</button>` : `${esc(t('olChatRoom'))}: ${esc(G.placeById(s.loc).n)}, ${esc(s.city)}`}</div>
    <ul class="olChat">${view.chat.length ? view.chat.slice().reverse().filter(m => !muted()[m.sender]).map(m => `<li class="${m.sender === me.userId ? 'mine' : ''}"><b>@${esc(m.username)}</b> ${esc(m.body)}${m.sender === me.userId ? '' : ` <button type="button" class="olMini" data-report="${m.id}">${esc(t('olReport'))}</button><button type="button" class="olMini" data-block="${esc(m.sender)}">${esc(t('olBlock'))}</button><button type="button" class="olMini" data-mute="${esc(m.sender)}">${esc(t('olMute'))}</button>${view.dm ? '' : `<button type="button" class="olMini" data-dm="${esc(m.sender)}" data-name="${esc(m.username)}">${esc(t('olWrite'))}</button>`}`}</li>`).join('') : `<li class="hint">${esc(t('olChatEmpty'))}</li>`}</ul>
    <form class="olSend" id="olSend"><input type="text" id="olText" maxlength="280" placeholder="${esc(t('olSay'))}" autocomplete="off" required><button class="primary" type="submit">${esc(t('olSendBtn'))}</button><button type="button" class="ghost" id="olRefresh">↻</button></form><p class="sub">${esc(t('olChatRules'))}</p>`;
}
const KINDS: PlayerAd['kind'][] = ['sell', 'job', 'service', 'room', 'lost'];
function adsHtml(c: Cloud, s: State | null): string {
  const me = c.session();
  if (!s) return `<p class="hint">${esc(t('olChatNoGame'))}</p>`;
  const row = (a: PlayerAd): string => {
    const mine = a.player_id === me?.userId;
    const buttons = !me?.username ? '' : mine ? `<button type="button" class="olMini" data-adoff="${a.id}">${esc(t('olTakeDown'))}</button>`
      : `<button type="button" class="olMini" data-dm="${esc(a.player_id)}" data-name="${esc(a.username)}">${esc(t('olWrite'))}</button><button type="button" class="olMini" data-adreport="${a.id}">${esc(t('olReport'))}</button>`;
    return `<li><b>${esc(a.title)}</b> <small>${esc(t('olKind.' + a.kind))} · @${esc(a.username)}${a.price ? ' · ' + Number(a.price).toLocaleString('en-US') + ' ₽' : ''}</small>${a.body ? `<p>${esc(a.body)}</p>` : ''}${buttons}</li>`;
  };
  const list = view.ads === null ? `<p class="hint">${esc(t('olLoading'))}</p>` : view.ads.length ? `<ul class="olAds">${view.ads.map(row).join('')}</ul>` : `<p class="hint">${esc(t('olNoAds'))}</p>`;
  const form = me?.username && (view.myAds ?? 0) >= 3 ? `<p class="hint">${esc(t('olAdsFull'))}</p>` : me?.username ? `<form class="olForm" id="olAdForm"><b>${esc(t('olAdNew'))}</b><label>${esc(t('olAdKind'))}<select id="olAdKind">${KINDS.map(k => `<option value="${k}">${esc(t('olKind.' + k))}</option>`).join('')}</select></label><label>${esc(t('olAdTitle'))}<input type="text" id="olAdTitle" maxlength="60" required></label><label>${esc(t('olAdBody'))}<input type="text" id="olAdBody" maxlength="280"></label><label>${esc(t('olAdPrice'))}<input type="text" id="olAdPrice" inputmode="numeric" value="0"></label><button class="primary" type="submit">${esc(t('olAdPut'))}</button><p class="sub">${esc(t('olAdRules'))}</p></form>` : `<p class="hint">${esc(t('olAdLogin'))}</p>`;
  // the player's own adverts in every city (the limit of three counts them all), each with its take-down button
  const mineAll = view.myAdList.length ? `<h4>${esc(t('olMyAds'))} (${view.myAdList.length}/3)</h4><ul class="olAds">${view.myAdList.map(a => `<li><b>${esc(a.title)}</b> <small>${esc(t('olKind.' + a.kind))} · ${esc(a.city)}</small><button type="button" class="olMini" data-adoff="${a.id}">${esc(t('olTakeDown'))}</button></li>`).join('')}</ul>` : '';
  return `<div class="sub">${esc(t('olAdsIn'))} ${esc(s.city)}</div>${list}${mineAll}${form}`;
}
const newsHtml = (): string => `${view.visits !== null ? `<p class="sub">${esc(t('olVisits'))}: ${view.visits.toLocaleString('en-US')}</p>` : ''}${view.news === null ? `<p class="hint">${esc(t('olLoading'))}</p>` : view.news.length ? view.news.map(a => `<div class="olNews"><b>${esc(a.title)}</b><p>${esc(a.body)}</p></div>`).join('') : `<p class="hint">${esc(t('olNoNews'))}</p>`}`;

/** Draws the screen into `host` and keeps it up to date. Returns a function that stops it (call it when the screen is closed). */
export function mountOnline(host: HTMLElement, d: OnlineDeps): () => void {
  const c = d.cloud; let alive = true, timer = 0;
  syncLine = (): string => { const st = d.status?.(); if (!st) return ''; return `<p class="sub syncLine">☁️ ${st.pending ? esc(t('olSyncPending')) : st.lastSaved ? `${esc(t('olSyncedAt'))} ${new Date(st.lastSaved).toLocaleTimeString(lang() === 'ru' ? 'ru-RU' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}` : esc(t('olSyncAuto'))}</p>`; };
  const draw = (): void => {
    if (!alive) return;
    if (!c) { host.innerHTML = `<div class="online"><h2>🌐 ${esc(t('olTitle'))}</h2><p>${esc(t('olOff'))}</p><p class="sub">${esc(t('olOffHow'))}</p></div>`; return; }
    const tabs: [Tab, string][] = [['account', t('olTabAccount')], ...(c.challenges ? [['challenges', t('chlTab')] as [Tab, string]] : []), ['top', t('olTabTop')], ['chat', t('olTabChat')], ['friends', t('olTabFriends')], ['ads', t('olTabAds')], ['news', t('olTabNews')]];
    host.innerHTML = `<div class="online"><h2>🌐 ${esc(t('olTitle'))}</h2><div class="olTabs" role="tablist">${tabs.map(([id, l]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${view.tab === id}">${esc(l)}</button>`).join('')}</div>
      <div class="olBody">${view.tab === 'account' ? accountHtml(c) : view.tab === 'challenges' ? challengesHtml(c, d.state()) : view.tab === 'top' ? topHtml() : view.tab === 'chat' ? chatHtml(c, d.state()) : view.tab === 'friends' ? friendsHtml(c) : view.tab === 'ads' ? adsHtml(c, d.state()) : newsHtml()}</div></div>`;
    wire();
  };
  const say = (r: { ok: boolean; msg: string }): void => { if (r.msg) d.notify(msgL(r.msg, lang() === 'ru')); };
  const busy = async (fn: () => Promise<void>): Promise<void> => { view.busy = true; draw(); try { await fn(); } finally { view.busy = false; draw(); } };
  const refresh = async (): Promise<void> => {
    if (!c || !alive) return;
    if (view.tab === 'account') { const r = await c.online(); if (r.ok) view.online = r.data ?? 0; }
    if (view.tab === 'top') { const r = await c.top(20); view.top = r.ok ? r.data ?? [] : []; if (!r.ok) say(r); }
    if (view.tab === 'news') { const [a, n] = await Promise.all([c.announcements(), c.counters()]); view.news = a.ok ? a.data ?? [] : []; view.visits = n.ok ? Number(n.data?.find(x => x.key === 'visits')?.value ?? 0) : null; }
    if (view.tab === 'chat') { const s = d.state(), me = c.session(); if (s && me?.adult) { const [r, k] = await Promise.all([c.messages(roomNow(s, me.userId)), c.talks()]); if (r.ok) view.chat = r.data ?? []; if (k.ok && Array.isArray(k.data)) view.talks = k.data; } }
    if (view.tab === 'friends' && c.session()?.username) {
      if (view.visit) { const [h, n, lv] = await Promise.all([c.home(view.visit.id), c.guestbook(view.visit.id), c.myHomeVote ? c.myHomeVote() : Promise.resolve({ ok: false, msg: '', data: null as string | null })]); view.liked = lv.ok ? lv.data ?? null : null; if (view.visit) { view.visit.home = h.ok ? h.data ?? null : null; view.visit.notes = n.ok ? n.data ?? [] : []; } }
      else { const [f, b, k] = await Promise.all([c.friends(), c.bestHomes(), c.blocks ? c.blocks() : Promise.resolve({ ok: false, msg: '', data: [] })]); view.friends = f.ok && Array.isArray(f.data) ? f.data : []; view.best = b.ok && Array.isArray(b.data) ? b.data : []; view.blocked = k.ok && Array.isArray(k.data) ? k.data : []; }
    }
    if (view.tab === 'challenges' && c.challenges && c.session()?.username) {
      const s = d.state(); const [r, k, f] = await Promise.all([c.challenges(s?.city ?? 'Moscow'), c.coops!(), c.friends()]);
      view.ch = r.ok ? r.data ?? null : null; view.coops = k.ok ? k.data ?? [] : []; view.friends = f.ok && Array.isArray(f.data) ? f.data : [];
      if (!view.openChapter && view.ch) view.openChapter = (view.ch.chapters.find(ch => view.ch!.challenges.some(x => x.chapter === ch.id && !x.claimed)) ?? view.ch.chapters[0])?.id ?? 1;
    }
    if (view.tab === 'ads') { const s = d.state(); if (s) { const [r, mine] = await Promise.all([c.ads(s.city), c.myAds && c.session()?.username ? c.myAds() : Promise.resolve(null)]); view.ads = r.ok ? r.data ?? [] : []; view.myAds = mine && mine.ok ? (mine.data ?? []).length : null; view.myAdList = mine && mine.ok ? mine.data ?? [] : []; } }
    draw();
  };
  const roomNow = (s: State, me: string): string => (view.dm ? directRoom(me, view.dm.id) : placeRoom(s.city, s.loc));
  const val = (id: string): string => (host.querySelector<HTMLInputElement>('#' + id)?.value ?? '');
  const checked = (id: string): boolean => !!host.querySelector<HTMLInputElement>('#' + id)?.checked;
  function wire(): void {
    if (!c) return;
    host.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b => { b.onclick = () => { view.tab = b.dataset.tab as Tab; draw(); void refresh(); }; });
    const auth = host.querySelector<HTMLFormElement>('#olAuth'); if (auth) auth.onsubmit = e => { e.preventDefault(); const email = val('olEmail'), pass = val('olPass'), name = val('olName'), adult = checked('olAdult'), up = view.signup; void busy(async () => { const [cc, rg] = val('olCountry').split('|'); const r = up ? await c.signUp(email, pass, name, adult, cc ? { country: cc, region: rg } : undefined) : await c.signIn(email, pass); say(r); if (up && r.ok) { view.signup = false; view.email = email; } if (!up && r.ok) { forgetAccount(); setMuteOwner(c.session()?.userId ?? ''); await d.onSignedIn?.(); }   /* next step: confirm the e-mail, then log in here (found by playing, round 124) */ await refresh(); }); };
    host.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b => { b.onclick = () => { view.openChapter = Number(b.dataset.chapter); draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach(b => { b.onclick = () => void busy(async () => { const s = d.state(); const r = await c.claimChallenge!(b.dataset.claim as string, s?.city ?? 'Moscow'); if (r.ok) { if (s) { s.money += r.data ?? 0; d.changed?.(); } d.notify(`${t('chlClaimed')} +${(r.data ?? 0).toLocaleString()} ₽`); } else say(r); await refresh(); }); });
    host.querySelectorAll<HTMLButtonElement>('[data-join]').forEach(b => { b.onclick = () => void busy(async () => { const s = d.state(); const r = await c.joinCity!(b.dataset.join as string, s?.city ?? 'Moscow'); say(r.ok ? { ok: true, msg: t('chlJoined') } : r); await refresh(); }); });
    host.querySelectorAll<HTMLButtonElement>('[data-invite]').forEach(b => { b.onclick = () => { const who = host.querySelector<HTMLSelectElement>(`#inv-${b.dataset.invite}`)?.value; if (!who) { d.notify(t('chlPickFriend')); return; } void busy(async () => { say(await c.coopInvite!(who, b.dataset.invite as string)); await refresh(); }); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-coop]').forEach(b => { b.onclick = () => void busy(async () => { const [act, idS] = (b.dataset.coop as string).split(':'), id = Number(idS); if (act === 'done') { const s = d.state(), need = COOP_ACT[view.coops.find(k => k.id === id)?.challenge_id ?? '']; if (!s) { d.notify(t('chlNeedGame')); return; }
      if (need) { const la = await import('./lifeacts'), since = s.coopSince?.[id] ?? s.day, L = la.lifeOf(s);
        if (!((L.done[need.act] ?? -1) >= since)) { const done = la.doAct(s, need.act); if (!done.ok) { d.notify(`${t('chlPartFirst')} ${lang() === 'ru' ? need.ru : need.en}: ${done.msg}`); return; } d.changed?.(); d.notify(done.msg); } } }
      if (act === 'yes') { const s = d.state(); if (s) (s.coopSince ??= {})[id] = s.day; }
      const r = act === 'done' ? await c.coopDone!(id) : await c.coopAnswer!(id, act === 'yes'); say(r.ok ? { ok: true, msg: act === 'done' ? t(r.data === 'done' ? 'chlBothDone' : 'chlWaiting') : t(act === 'yes' ? 'chlAccepted' : 'chlDeclined') } : r); await refresh(); }); });
    const fb = host.querySelector<HTMLButtonElement>('#olForgotBtn'); if (fb) fb.onclick = () => { view.forgot = true; draw(); };
    const lc = host.querySelector<HTMLButtonElement>('#olLinkCancel'); if (lc) lc.onclick = () => { view.forgot = false; view.link = null; draw(); };
    const ff = host.querySelector<HTMLFormElement>('#olForgotForm'); if (ff) ff.onsubmit = e => { e.preventDefault(); const email = val('olEmail'); void busy(async () => { say(await c.forgot!(email)); view.forgot = false; }); };
    const rs = host.querySelector<HTMLButtonElement>('#olResend'); if (rs) rs.onclick = () => { const email = val('olEmail'); if (!email) { d.notify(t('olEmail')); return; } void busy(async () => { say(await c.resendVerification!(email)); }); };
    const rf2 = host.querySelector<HTMLFormElement>('#olReset'); if (rf2) rf2.onsubmit = e => { e.preventDefault(); const pw = val('olResetPass'), link = view.link; if (!link) return; void busy(async () => { const r = await c.resetPassword!(link.token, pw); say(r); if (r.ok) view.link = null; }); };
    const pwf = host.querySelector<HTMLFormElement>('#olPwForm'); if (pwf) pwf.onsubmit = e => { e.preventDefault(); const cur = val('olPwCur'), next = val('olPwNext'); void busy(async () => { say(await c.changePassword!(cur, next)); }); };
    const eo = host.querySelector<HTMLButtonElement>('#olEndOthers'); if (eo) eo.onclick = () => void busy(async () => { say(await c.endOtherSessions!()); });
    const sw = host.querySelector<HTMLButtonElement>('#olSwitch'); if (sw) sw.onclick = () => { view.signup = !view.signup; draw(); };
    const claim = host.querySelector<HTMLFormElement>('#olClaim'); if (claim) claim.onsubmit = e => { e.preventDefault(); const name = val('olName'), adult = checked('olAdult'); void busy(async () => { say(await c.claim(name, adult)); }); };
    const out = host.querySelector<HTMLButtonElement>('#olOut'); if (out) out.onclick = () => void busy(async () => { try { await d.beforeSignOut?.(); } catch { /* offline: the game stays saved on this device */ } say(await c.signOut()); forgetAccount(); setMuteOwner(''); d.onSignedOut?.(); });
    const save = host.querySelector<HTMLButtonElement>('#olSave'); if (save) save.onclick = () => { const s = d.state(); if (!s) { d.notify(t('olNoGame')); return; } void busy(async () => { say(await c.save(s)); }); };
    const load = host.querySelector<HTMLButtonElement>('#olLoad'); if (load) load.onclick = () => void busy(async () => { const r = await c.load(); const st = r.ok && r.data ? r.data.state : null;
      // the same check as for a save file from disk: a game from another version of the rules is not loaded
      if (st && (st.version !== 7 || typeof st.day !== 'number' || !st.docs)) { d.notify(t('olBadSave')); return; }
      say(r); if (st) d.onLoad(st); });
    const send = host.querySelector<HTMLFormElement>('#olSend'); if (send) send.onsubmit = e => { e.preventDefault(); const s = d.state(), text = val('olText'); if (!s) return; void (async () => { const r = await c.send(roomNow(s, c.session()?.userId ?? ''), text); if (!r.ok) say(r); await refresh(); })(); };
    const rf = host.querySelector<HTMLButtonElement>('#olRefresh'); if (rf) rf.onclick = () => void refresh();
    host.querySelectorAll<HTMLButtonElement>('[data-visit]').forEach(b => { b.onclick = () => { view.visit = { id: b.dataset.visit as string, name: b.dataset.name ?? '', home: null, notes: [] }; view.tab = 'friends'; draw(); void refresh(); }; });
    const vb = host.querySelector<HTMLButtonElement>('#olVisitBack'); if (vb) vb.onclick = () => { view.visit = null; draw(); void refresh(); };
    host.querySelectorAll<HTMLButtonElement>('[data-follow]').forEach(b => { b.onclick = () => void (async () => { say(await c.follow(b.dataset.follow as string)); view.found = []; await refresh(); })(); });
    host.querySelectorAll<HTMLButtonElement>('[data-unfollow]').forEach(b => { b.onclick = () => void (async () => { say(await c.unfollow(b.dataset.unfollow as string)); await refresh(); })(); });
    host.querySelectorAll<HTMLButtonElement>('[data-mute]').forEach(b => { b.onclick = () => { mute(b.dataset.mute as string); d.notify(t('olMuted')); draw(); }; });
    const find = host.querySelector<HTMLFormElement>('#olFind'); if (find) find.onsubmit = e => { e.preventDefault(); void (async () => { const r = await c.findPlayers(val('olFindText')); view.found = r.ok ? r.data ?? [] : []; if (!view.found.length) d.notify(t('olNobody')); draw(); })(); };
    const like = host.querySelector<HTMLButtonElement>('#olLike'); if (like && view.visit) like.onclick = () => void (async () => { const r = await c.voteHome(view.visit!.id); d.notify(r.ok ? t('olLiked') : r.msg); if (r.ok) { view.liked = view.visit!.id; draw(); } })();
    const note = host.querySelector<HTMLFormElement>('#olNote'); if (note && view.visit) note.onsubmit = e => { e.preventDefault(); const body = val('olNoteText'), gift = (val('olGift') || null) as Gift | null, st = d.state(), price = GIFTS.find(g => g.id === gift)?.price ?? 0;
      if (gift && (!st || st.money < price)) { d.notify(t('olGiftPoor')); return; }
      void (async () => { const r = await c.signGuestbook(view.visit!.id, body, gift); if (r.ok && gift && st) { st.money -= price; d.changed?.(); d.notify(t('olGiftSent')); } else say(r.ok ? { ok: true, msg: t('olNoteSent') } : r); await refresh(); })(); };
    const pub = host.querySelector<HTMLButtonElement>('#olPublish'); if (pub) pub.onclick = () => void (async () => { const h = d.home?.(); if (!h) { d.notify(t('olChatNoGame')); return; } say(await c.publishHome(h.city, h.dwelling, h.design, h.stars)); })();
    host.querySelectorAll<HTMLButtonElement>('[data-dm]').forEach(b => { b.onclick = () => { view.dm = { id: b.dataset.dm as string, name: b.dataset.name ?? '' }; view.chat = []; view.tab = 'chat'; draw(); void refresh(); }; });
    const back = host.querySelector<HTMLButtonElement>('#olBack'); if (back) back.onclick = () => { view.dm = null; view.chat = []; draw(); void refresh(); };
    const del = host.querySelector<HTMLButtonElement>('#olDelete'); if (del) del.onclick = () => { if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = t('olDeleteSure'); return; } void busy(async () => { say(await c.deleteAccount(val('olDelPass'))); view.chat = []; view.talks = []; view.dm = null; }); };
    const adForm = host.querySelector<HTMLFormElement>('#olAdForm'); if (adForm) adForm.onsubmit = e => { e.preventDefault(); const s = d.state(); if (!s) return; const kind = val('olAdKind') as PlayerAd['kind'], title = val('olAdTitle'), body = val('olAdBody'), rawPrice = val('olAdPrice'), price = Number(rawPrice.replace(/[^0-9]/g, '')) || 0; if (/[-−]\s*\d/.test(rawPrice)) { /* "-500" is refused, not saved as 500 (round 150) */ d.notify(msgL('The price cannot be below zero.', lang() === 'ru')); return; } void (async () => { say(await c.postAd(s.city, kind, title, body, price)); await refresh(); })(); };
    host.querySelectorAll<HTMLButtonElement>('[data-adoff]').forEach(b => { b.onclick = () => void (async () => { say(await c.removeAd(Number(b.dataset.adoff))); await refresh(); })(); });
    host.querySelectorAll<HTMLButtonElement>('[data-adreport]').forEach(b => { b.onclick = () => void (async () => { say(await c.reportAd(Number(b.dataset.adreport))); })(); });
    host.querySelectorAll<HTMLButtonElement>('[data-report]').forEach(b => { b.onclick = () => void (async () => { say(await c.report(Number(b.dataset.report), 'reported from the chat')); })(); });
    host.querySelectorAll<HTMLButtonElement>('[data-unblock]').forEach(b => { b.onclick = () => void (async () => { if (c.unblock) say(await c.unblock(b.dataset.unblock as string)); await refresh(); })(); });
    host.querySelectorAll<HTMLButtonElement>('[data-block]').forEach(b => { b.onclick = () => void (async () => { say(await c.block(b.dataset.block as string)); await refresh(); })(); });
  }
  draw(); void refresh();
  if (c && view.link?.kind === 'verify' && c.verifyEmail) { const tok = view.link.token; view.link = null; void busy(async () => { say(await c.verifyEmail!(tok)); }); }
  else if (c?.restore) void c.restore().then(() => { if (alive) draw(); });
  if (c && typeof window !== 'undefined') timer = window.setInterval(() => { if (view.tab === 'chat' && !view.busy && !host.querySelector('#olText:focus')) void refresh(); }, 8000);
  return () => { alive = false; if (timer) window.clearInterval(timer); };
}
/** The storyline and the challenges with other players: chapters to open, progress bars, a reward to take, a city effort to join,
    a friend to invite for a co-op challenge, and the invitations under way. */
function challengesHtml(c: Cloud, st: State | null): string {
  if (!c.session()?.username) return `<p class="hint">${esc(t('olChooseName'))}</p>`;
  if (!view.ch) return `<p class="hint">${esc(t('olLoading'))}</p>`;
  const ru = lang() === 'ru', mutual = (view.friends ?? []).filter(f => f.mutual);
  const title = (x: { title_en: string; title_ru: string }): string => (ru ? x.title_ru : x.title_en), text = (x: { text_en: string; text_ru: string }): string => (ru ? x.text_ru : x.text_en);
  const kindIcon = { event: '⭐', coop: '🤝', city: '🏙️' } as const;
  // what this player does for an accepted co-op; it counts from the game day the co-op started for them
  const part = (k: Coop): string => { const need = COOP_ACT[k.challenge_id], s = st; if (s && !s.coopSince?.[k.id]) (s.coopSince ??= {})[k.id] = s.day; return need ? `<span class="sub">${esc(t('chlYourPart'))}: ${esc(lang() === 'ru' ? need.ru : need.en)}</span>` : ''; };
  const coopsHtml = view.coops.length ? `<h3>🤝 ${esc(t('chlCoops'))}</h3><ul class="olList">${view.coops.map(k => {
    const ch = view.ch!.challenges.find(x => x.id === k.challenge_id), me = k.mine ? k.inviter_done : k.invitee_done;
    const act = k.status === 'invited' ? (k.mine ? `<span class="sub">${esc(t('chlSent'))}</span>` : `<button type="button" class="primary" data-coop="yes:${k.id}">${esc(t('chlAccept'))}</button><button type="button" class="ghost" data-coop="no:${k.id}">${esc(t('chlDecline'))}</button>`)
      : k.status === 'accepted' ? (me ? `<span class="sub">${esc(t('chlWaiting'))}</span>` : `${part(k)}<button type="button" class="primary" data-coop="done:${k.id}">${esc(t('chlMyPart'))}</button>`) : `<span class="sub">✔ ${esc(t('chlBothDone'))}</span>`;
    return `<li><b>${esc(ch ? title(ch) : k.challenge_id)}</b> · @${esc(k.other_name)}<div class="row">${act}</div></li>`; }).join('')}</ul>` : '';
  const chapters = view.ch.chapters.map(chp => {
    const items = view.ch!.challenges.filter(x => x.chapter === chp.id), done = items.filter(x => x.claimed).length, open = view.openChapter === chp.id;
    const body = open ? `<p class="sub">${esc(text(chp))}</p><ul class="olList chlList">${items.map(x => {
      const pct = Math.min(100, Math.round((100 * x.have) / x.target));
      const btn = x.claimed ? `<span class="sub">✔ ${esc(t('chlTaken'))}</span>`
        : x.kind === 'city' && !x.joined ? `<button type="button" class="secondary" data-join="${x.id}">${esc(t('chlJoin'))}</button>`
        : x.done ? `<button type="button" class="primary" data-claim="${x.id}">${esc(t('chlClaim'))} +${x.reward.toLocaleString()} ₽</button>`
        : x.kind === 'coop' ? (mutual.length ? `<select id="inv-${x.id}" aria-label="${esc(t('chlPickFriend'))}"><option value="">${esc(t('chlPickFriend'))}</option>${mutual.map(f => `<option value="${esc(f.id)}">@${esc(f.username)}</option>`).join('')}</select><button type="button" class="secondary" data-invite="${x.id}">${esc(t('chlInvite'))}</button>` : `<span class="sub">${esc(t('chlNeedFriend'))}</span>`) : '';
      return `<li class="chl${x.done ? ' done' : ''}"><span class="chlIcon" aria-hidden="true">${kindIcon[x.kind]}</span><div><b>${esc(title(x))}</b>${x.weekly ? ` <i class="chlWeek">${esc(t('chlWeekly'))}</i>` : ''}<small>${esc(text(x))}</small>
        <span class="chlBar" role="progressbar" aria-valuemin="0" aria-valuemax="${x.target}" aria-valuenow="${Math.min(x.have, x.target)}"><em style="width:${pct}%"></em></span><small>${Math.min(x.have, x.target)} / ${x.target} · +${x.reward.toLocaleString()} ₽</small><div class="row">${btn}</div></div></li>`; }).join('')}</ul>` : '';
    return `<section class="chlChapter"><button type="button" class="chlHead" data-chapter="${chp.id}" aria-expanded="${open}"><span>${chp.id}. ${esc(title(chp))}</span><span class="sub">${done}/${items.length}</span></button>${body}</section>`;
  }).join('');
  return `<p class="sub">${esc(t('chlIntro'))}</p>${coopsHtml}${chapters}`;
}
void flagOf;
/** A link from one of our e-mails (#verify=..., #reset=..., #forgot=1): the Online screen opens on the right form. True when it was such a link. */
export function openAuthLink(hash: string): boolean {
  const m = /^#(verify|reset|forgot)=([A-Za-z0-9_-]{1,64})$/.exec(hash); if (!m) return false;
  view.tab = 'account';
  if (m[1] === 'forgot') { view.forgot = true; view.link = null; } else if (/^[A-Za-z0-9_-]{43}$/.test(m[2])) view.link = { kind: m[1] as 'verify' | 'reset', token: m[2] }; else return false;
  return true;
}
/** For tests: puts the screen back to its first state. */
export function resetOnlineView(): void { Object.assign(view, FIRST()); }
