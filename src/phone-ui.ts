/* The phone screens: home with app icons, messages and chats, contacts and calls, and the bank app.
   It draws into one container and keeps its own small "which screen" state. The game itself is only touched through the functions in
   phone.ts, social.ts and engine.ts, and through the callbacks the caller passes in. */
import * as G from './engine';
import './i18n-life';
import { choresOf } from './chores';
import { openJobs } from './jobs-ui';
import { openStudy, openHousing, openChores, openTrains } from './study-ui';
import { unpaid } from './housing';
import { savingsOf, setGoal, move, budget } from './budget';
import type { State } from './engine';
import { flows } from './forms';
import type { Flow } from './forms';
import { contactsFor, phoneBlock, replyFor, chatBonus, callScript, transfer, canReceive, groupsFor, requestsFor, resolveRequest, TRANSFER_MAX } from './phone';
import { play } from './sound';
import { bustHtml } from './figure';
import { phoneNight, setPhoneNight, seenApps, markSeen } from './prefs';
import { newMemory, flip, memoryWon, newScramble, checkScramble, reward } from './games';
import type { Memory, Scramble } from './games';
import { dating, profilesFor, swipesLeft, swipe, compat, playerInterests, dateReply, askOnDate, makeCouple, DATE_COST } from './dating';
import type { Contact } from './phone';
import { messagesFor } from './social';
import { t, locale } from './i18n';

const esc = (x: string): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const BANK_NAMES: Record<string, string> = { sber: 'Sber', vtb: 'VTB', tbank: 'T-Bank' };

export interface PhoneDeps {
  s: State; host: HTMLElement; show: () => void; close: () => void; refresh: () => void;
  openShop: () => void; startFlow: (f: Flow) => void; flights: () => void; journal: () => void; profile: () => void; help: () => void;
  /** Plays a scenario of the engine (a lecture): the phone closes first. Optional so that older callers keep working. */
  scenario?: (sc: import('./engine').Scenario) => void;
}

type Screen = { name: 'home' } | { name: 'games' } | { name: 'memory' } | { name: 'scramble' } | { name: 'dating' } | { name: 'datechat'; id: string } | { name: 'requests' } | { name: 'group'; id: string } | { name: 'messages' } | { name: 'updates' } | { name: 'chat'; id: string } | { name: 'contacts' } | { name: 'call'; id: string } | { name: 'bank' };

export function openPhone(d: PhoneDeps): void {
  const { s, host } = d;
  let screen: Screen = { name: 'home' };
  let msgTab: 'chats' | 'groups' = 'chats';
  let dTab: 'discover' | 'matches' = 'discover';
  let mem: Memory | null = null;
  let scr: Scramble | null = null;
  let plays = 0;
  let flash = '';           // a short result line shown at the top of the current screen
  const block = (): string | null => phoneBlock(s);
  const find = (id: string): Contact | undefined => contactsFor(s).find(c => c.id === id);
  const back = (title: string, to: Screen['name'] = 'home'): string => `<div class="phHead"><button class="ghost" data-go="${to}" aria-label="Back">‹ ${esc(t('phoneBack'))}</button><b>${esc(title)}</b></div>`;
  const note = (): string => { const f = flash; flash = ''; return f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''; };

  /* ----- home ----- */
  const home = (): string => {
    const dt = G.dateOf(s);
    const clock = ['08:30', '14:00', '19:30'][s.slot] || '12:00';
    const broken = s.phone <= 0;
    const why = block();
    const apps = flows.map((f, i) => { const w = broken ? 'Your phone is broken.' : f.available(s); return `<button class="app ${w ? 'off' : ''}" data-flow="${i}" ${w ? `title="${esc(w)}" aria-disabled="true"` : ''}><span class="appIcon" aria-hidden="true">${f.icon}</span><span class="appName">${esc(f.title)}</span></button>`; });
    const urgent = messagesFor(s).filter(m => m.tag === 'urgent').length + requestsFor(s).length;
    const sys: [string, string, string, boolean, number][] = [
      ['💼', t('phoneJobs'), 'jobs', broken, 0], ['🎓', t('phoneStudy'), 'study', broken, 0], ['🏘️', t('phoneHousing'), 'housing', broken, unpaid(s).length], ['🧺', t('phoneLife'), 'chores', broken, choresOf(s).clothes <= 15 ? 1 : 0], ['🚆', t('trTitle'), 'trains', broken, 0], ['🛍️', t('shopTitle'), 'shop', broken, 0], ['💬', t('phoneMessages'), 'messages', !!why, urgent], ['💘', t('phoneDating'), 'dating', broken, 0], ['🎮', t('phoneGames'), 'games', broken, 0], ['📞', t('phoneCalls'), 'phone', !!why, 0], ['🏦', t('phoneBank'), 'bank', broken, 0],
      ['✈️', t('phoneFlights'), 'flights', false, 0], ['📜', t('phoneJournal'), 'journal', false, 0], ['👤', t('phoneProfile'), 'profile', false, 0], ['💡', t('phoneHelp'), 'help', false, 0],
    ];
    const seen = seenApps();
    const sysHtml = sys.map(([ic, name, id, off, badge]) => `<button class="app sys ${off ? 'off' : ''}" data-sys="${id}" ${off ? 'aria-disabled="true"' : ''}><span class="appIcon" aria-hidden="true">${ic}${badge ? `<i class="badge">${badge}</i>` : !seen.has(id) && !off ? `<i class="newTag">${esc(t('phoneNew'))}</i>` : ''}</span><span class="appName">${esc(name)}</span></button>`);
    return `<div class="phone${phoneNight() ? ' night' : ''}" role="group" aria-label="${esc(t('phoneTitle'))}"><div class="phoneBar"><span>${clock}</span><span>${broken ? '✖ no phone' : why ? 'No SIM' : '4G ▮▮▮'}</span></div>
      <div class="phoneClock">${clock}</div><div class="phoneDate">${esc(dt.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }))} · ${esc(s.city)}</div>
      <div class="phoneNum">📱 ${esc(G.phoneOf(s).number)} <button type="button" class="nightBtn" id="phNight" aria-pressed="${phoneNight()}">🌙 ${esc(t('phoneNight'))}</button></div>${why ? `<p class="phWarn" role="alert">${esc(why)}</p>` : ''}${note()}
      <div class="apps">${[...apps, ...sysHtml].join('')}</div></div>`;
  };

  /* ----- messages ----- */
  const lastOf = (id: string): string => { const l = G.phoneOf(s).chats[id]; return l && l.length ? l[l.length - 1].text : ''; };
  const messagesScreen = (): string => {
    const upd = messagesFor(s);
    const reqs = requestsFor(s);
    const tabs = `<div class="tabs" role="tablist"><button role="tab" data-tab="chats" aria-selected="${msgTab === 'chats'}">${esc(t('phoneChats'))}</button><button role="tab" data-tab="groups" aria-selected="${msgTab === 'groups'}">${esc(t('phoneGroups'))}</button></div>`;
    const top = `<li><button class="thread official" data-go="updates"><span class="msgIcon" aria-hidden="true">🔔</span><div><b>${esc(t('phoneUpdates'))}</b><small>${upd.length} · ${esc(upd[0].text.slice(0, 50))}</small></div></button></li>
      <li><button class="thread" data-go="requests"><span class="msgIcon" aria-hidden="true">📨</span><div><b>${esc(t('phoneRequests'))}</b><small>${reqs.length ? reqs.length + ' ' + esc(t('phoneUnknown')) : esc(t('phoneNoRequests'))}</small></div></button></li>`;
    const rows = msgTab === 'chats'
      ? contactsFor(s).filter(c => c.kind !== 'emergency').map(c => `<li><button class="thread" data-chat="${c.id}"><span class="msgIcon" aria-hidden="true">${c.icon}</span><div><b>${esc(c.name)}</b><small>${esc(lastOf(c.id) || t('phoneNoChat'))}</small></div></button></li>`).join('')
      : groupsFor(s).map(g => `<li><button class="thread" data-group="${g.id}"><span class="msgIcon" aria-hidden="true">${g.icon}</span><div><b>${esc(g.name)}</b><small>${esc(g.lines[g.lines.length - 1].text)}</small></div></button></li>`).join('');
    return `<div class="phone sub">${back(t('phoneMessages'))}${note()}${tabs}<ul class="msgs">${top}${rows}</ul></div>`;
  };
  const requestsScreen = (): string => {
    const reqs = requestsFor(s);
    return `<div class="phone sub">${back(t('phoneRequests'), 'messages')}${note()}<p class="hint">${esc(t('phoneRequestsHint'))}</p><ul class="msgs">${reqs.length ? reqs.map(r => `<li class="msg"><span class="msgIcon" aria-hidden="true">❓</span><div><b>${esc(r.from)}</b><p>${esc(r.text)}</p><div class="cBtns"><button data-req-block="${r.id}">🚫 ${esc(t('phoneBlock'))}</button><button data-req-open="${r.id}">${esc(t('phoneOpenIt'))}</button></div></div></li>`).join('') : `<li class="hint">${esc(t('phoneNoRequests'))}</li>`}</ul></div>`;
  };
  const groupScreen = (id: string): string => {
    const g = groupsFor(s).find(x => x.id === id);
    if (!g) return messagesScreen();
    return `<div class="phone sub">${back(g.name, 'messages')}<ul class="bubbles">${g.lines.map(l => `<li class="b them"><b>${esc(l.from)}</b> ${esc(l.text)}</li>`).join('')}</ul><p class="hint">${esc(t('phoneGroupRead'))}</p></div>`;
  };
  const updatesScreen = (): string => `<div class="phone sub">${back(t('phoneUpdates'), 'messages')}<ul class="msgs">${messagesFor(s).map(m => `<li class="msg ${m.tag || ''}"><span class="msgIcon" aria-hidden="true">${m.icon}</span><div><b>${esc(m.from)}</b><p>${esc(m.text)}</p>${m.tag === 'scam' ? `<small>⚠ ${esc(t('msgScam'))}</small>` : m.tag === 'urgent' ? `<small>${esc(t('msgUrgent'))}</small>` : ''}</div></li>`).join('')}</ul></div>`;
  const chatScreen = (id: string): string => {
    const c = find(id);
    if (!c) return messagesScreen();
    const list = G.phoneOf(s).chats[id] || [];
    return `<div class="phone sub">${back(c.name, 'messages')}${note()}<ul class="bubbles" aria-live="polite">${list.length ? list.map(m => `<li class="b ${m.from}">${esc(m.text)}</li>`).join('') : `<li class="hint">${esc(t('phoneNoChat'))}</li>`}</ul>
      <form class="chatForm" id="phChatForm"><input id="phChatInput" maxlength="120" autocomplete="off" placeholder="${esc(t('phoneType'))}" aria-label="${esc(t('phoneType'))}"><button class="primary" type="submit">${esc(t('chatSend'))}</button></form></div>`;
  };

  /* ----- contacts and calls ----- */
  const contactsScreen = (): string => {
    const why = block();
    const recents = G.phoneOf(s).calls.slice(0, 5).map(r => `<li>${r.dir === 'out' ? '↗' : r.dir === 'in' ? '↙' : '✖'} ${esc(r.who)} <small>${esc(t('dayWord'))} ${r.day + 1}</small></li>`).join('');
    return `<div class="phone sub">${back(t('phoneCalls'))}${note()}<p class="phoneNum">📱 ${esc(t('phoneMyNumber'))}: <b>${esc(G.phoneOf(s).number)}</b></p>${why ? `<p class="phWarn">${esc(why)}</p>` : ''}
      <ul class="msgs">${contactsFor(s).map(c => `<li class="contact"><span class="msgIcon" aria-hidden="true">${c.icon}</span><div><b>${esc(c.name)}</b><small>${esc(c.number)}</small></div><div class="cBtns"><button data-call="${c.id}" ${why ? 'disabled' : ''} aria-label="${esc(t('phoneCall'))} ${esc(c.name)}">📞</button>${c.kind !== 'emergency' ? `<button data-chat="${c.id}" ${why ? 'disabled' : ''} aria-label="${esc(t('phoneMessages'))} ${esc(c.name)}">💬</button>` : ''}</div></li>`).join('')}</ul>
      ${recents ? `<h3>${esc(t('phoneRecents'))}</h3><ul class="recents">${recents}</ul>` : ''}</div>`;
  };
  const callScreen = (id: string): string => {
    const c = find(id);
    if (!c) return contactsScreen();
    const res = callScript(s, c);
    play('ring');
    G.addCall(s, c.name, 'out');
    G.apply(s, res.fx);
    d.refresh();
    return `<div class="phone sub callScr"><div class="callWho"><span class="appIcon" aria-hidden="true">${c.icon}</span><b>${esc(c.name)}</b><small>${esc(c.number)}</small></div>
      <div class="callLines">${res.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div><button class="primary" data-go="contacts">${esc(t('phoneHangUp'))}</button></div>`;
  };

  /* ----- bank ----- */
  const bankScreen = (): string => {
    const banks = Object.keys(s.bank).filter(k => s.bank[k]);
    if (!banks.length) return `<div class="phone sub">${back(t('phoneBank'))}<p class="phWarn">${esc(t('phoneNoAccount'))}</p><button class="primary" data-open-bank-flow="1">${esc(t('phoneOpenAccount'))}</button></div>`;
    const tx = G.phoneOf(s).tx.slice(0, 8).map(x => `<li class="tx ${x.amount < 0 ? 'out' : 'in'}"><span>${esc(x.label)}<small>${esc(t('dayWord'))} ${x.day + 1}</small></span><b>${x.amount < 0 ? '−' : '+'}₽${Math.abs(x.amount).toLocaleString('en-US')}</b></li>`).join('');
    const to = contactsFor(s).filter(canReceive);
    const debt = Number(s.tmp.debt) || 0, fines = Number(s.tmp.fines) || 0;
    return `<div class="phone sub bank">${back(t('phoneBank'))}${note()}<div class="bal"><small>${esc(t('phoneBalance'))}</small><b>${esc(G.money(s.money))}</b></div>
      <div class="cards">${banks.map(b => `<span class="card">💳 ${esc(BANK_NAMES[b] || b)}</span>`).join('')}</div>
      ${debt > 0 ? `<p class="phNote">${esc(t('phoneLoan'))}: ${esc(G.money(debt))}</p>` : ''}${fines > 0 ? `<button class="ghost" data-open-fines="1">🧾 ${esc(t('phonePayFines'))}: ${esc(G.money(fines))}</button>` : ''}
      <h3>${esc(t('phoneTransfer'))}</h3>
      <form class="chatForm" id="phTransfer"><select id="phTo" aria-label="${esc(t('phoneTo'))}">${to.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
      <input id="phAmount" inputmode="numeric" maxlength="7" placeholder="₽ (max ${TRANSFER_MAX.toLocaleString('en-US')})" aria-label="${esc(t('phoneAmount'))}"><button class="primary" type="submit">${esc(t('phoneSend'))}</button></form>
      ${(() => { const sv = savingsOf(s), bd = budget(s), top = Math.max(1, bd.income, bd.spent), pct = sv.goal ? Math.min(100, Math.round((sv.saved / sv.goal) * 100)) : 0;
        const kinds = (['home', 'food', 'travel', 'shopping', 'papers', 'other'] as const).filter(k => bd.byKind[k] > 0);
        return `<h3>🐷 ${esc(t('svTitle'))}</h3>${sv.goal ? `<p class="sub">${esc(sv.name)}: <b>${esc(G.money(sv.saved))}</b> / ${esc(G.money(sv.goal))}</p><i class="qbar"><em style="width:${pct}%"></em></i>` : `<p class="sub">${esc(t('svNone'))}</p>`}
        <form class="chatForm" id="svMove"><input id="svAmount" inputmode="numeric" maxlength="8" placeholder="₽" aria-label="${esc(t('phoneAmount'))}"><button type="button" class="primary" data-sv="in">${esc(t('svIn'))}</button><button type="button" class="ghost" data-sv="out">${esc(t('svOut'))}</button></form>
        <form class="chatForm" id="svGoal"><input id="svName" maxlength="40" placeholder="${esc(t('svName'))}" aria-label="${esc(t('svName'))}"><input id="svTarget" inputmode="numeric" maxlength="9" placeholder="₽ ${esc(t('svGoal'))}" aria-label="${esc(t('svGoal'))}"><button type="submit" class="ghost">${esc(t('svSet'))}</button></form>
        <h3>📊 ${esc(t('bdTitle'))}</h3><div class="budget"><div class="bdRow"><span>${esc(t('bdIn'))}</span><i><em class="in" style="width:${Math.round((bd.income / top) * 100)}%"></em></i><b>${esc(G.money(bd.income))}</b></div><div class="bdRow"><span>${esc(t('bdOut'))}</span><i><em class="out" style="width:${Math.round((bd.spent / top) * 100)}%"></em></i><b>${esc(G.money(bd.spent))}</b></div>${kinds.map(k => `<div class="bdRow small"><span>${esc(t('bd.' + k))}</span><i><em class="out" style="width:${Math.round((bd.byKind[k] / top) * 100)}%"></em></i><b>${esc(G.money(bd.byKind[k]))}</b></div>`).join('')}</div>`; })()}
      <h3>${esc(t('phoneHistory'))}</h3><ul class="txs">${tx || `<li class="hint">${esc(t('phoneNoHistory'))}</li>`}</ul></div>`;
  };

  /* ----- games ----- */
  const gamesScreen = (): string => `<div class="phone sub">${back(t('phoneGames'))}${note()}<ul class="msgs">
    <li><button class="thread" data-go="memory"><span class="msgIcon" aria-hidden="true">🃏</span><div><b>${esc(t('gameMemory'))}</b><small>${esc(t('gameMemoryHint'))}</small></div></button></li>
    <li><button class="thread" data-go="scramble"><span class="msgIcon" aria-hidden="true">🔤</span><div><b>${esc(t('gameScramble'))}</b><small>${esc(t('gameScrambleHint'))}</small></div></button></li></ul></div>`;
  const memoryScreen = (): string => {
    if (!mem) mem = newMemory(`m|${s.day}|${plays++}`);
    const m = mem;
    return `<div class="phone sub">${back(t('gameMemory'), 'games')}${note()}<p class="hint">${esc(t('gameMoves'))}: <b>${m.moves}</b></p>
      <div class="memGrid">${m.cards.map((c, i) => `<button class="memCard ${m.done[i] ? 'done' : ''}" data-card="${i}" aria-label="${m.done[i] || m.open.includes(i) ? esc(c) : esc(t('gameHidden'))}">${m.done[i] || m.open.includes(i) ? c : '❓'}</button>`).join('')}</div>
      ${memoryWon(m) ? `<button class="primary" data-go="memory-new">${esc(t('gameAgain'))}</button>` : ''}</div>`;
  };
  const scrambleScreen = (): string => {
    if (!scr) scr = newScramble(`s|${s.day}|${plays++}`);
    return `<div class="phone sub">${back(t('gameScramble'), 'games')}${note()}<p class="hint">${esc(t('gameScrambleAsk'))}</p><div class="scr" aria-live="polite">${scr.letters.toUpperCase().split('').map(l => `<span>${esc(l)}</span>`).join('')}</div>
      <form class="chatForm" id="scrForm"><input id="scrInput" maxlength="12" autocomplete="off" aria-label="${esc(t('gameAnswer'))}" placeholder="${esc(t('gameAnswer'))}"><button class="primary" type="submit">${esc(t('gameCheck'))}</button></form>
      <div class="cBtns"><button data-go="scramble-hint">${esc(t('gameHint'))}</button><button data-go="scramble-new">${esc(t('gameSkip'))}</button></div></div>`;
  };

  /* ----- dating ----- */
  const datingScreen = (): string => {
    const why = block();
    const left = swipesLeft(s);
    const next = profilesFor(s)[0];
    const tabs = `<div class="tabs" role="tablist"><button role="tab" data-dtab="discover" aria-selected="${dTab === 'discover'}">${esc(t('dateDiscover'))}</button><button role="tab" data-dtab="matches" aria-selected="${dTab === 'matches'}">${esc(t('dateMatches'))} (${dating(s).matches.length})</button></div>`;
    let body = '';
    if (why) body = `<p class="phWarn">${esc(why)}</p>`;
    else if (dTab === 'matches') body = `<ul class="msgs">${dating(s).matches.length ? dating(s).matches.map(p => `<li><button class="thread" data-dchat="${p.id}"><span class="miniFace">${bustHtml(p.look, {}, p.name)}</span><div><b>${esc(p.name)}, ${p.age}</b><small>${esc(p.city)}</small></div></button></li>`).join('') : `<li class="hint">${esc(t('dateNoMatches'))}</li>`}</ul>`;
    else if (!next) body = `<p class="hint">${esc(t('dateDone'))}</p>`;
    else {
      const mine = new Set(playerInterests(s));
      const c = compat(s, next);
      body = `<div class="dateCard"><div class="dateFace">${bustHtml(next.look, {}, next.name)}</div><h3>${esc(next.name)}, ${next.age}</h3><div class="sub">${esc(next.city)} · ${esc(t('dateCompat'))} ${c}%</div>
        <div class="bar"><i style="width:${c}%;background:var(--ok)"></i></div><p>${esc(next.bio)}</p>
        <div class="chipsRow">${next.interests.map(i => `<span class="chip ${mine.has(i) ? 'ok' : ''}">${esc(i)}</span>`).join('')}</div>
        <p class="hint">${left} ${esc(t('dateLeft'))}</p>
        <div class="cBtns dateBtns"><button data-swipe="pass" aria-label="${esc(t('datePass'))}">✖ ${esc(t('datePass'))}</button><button class="primary" data-swipe="like" aria-label="${esc(t('dateLike'))}">♥ ${esc(t('dateLike'))}</button></div></div>`;
    }
    return `<div class="phone sub">${back(t('phoneDating'))}${note()}${tabs}${body}</div>`;
  };
  const dateChatScreen = (id: string): string => {
    const p = dating(s).matches.find(m => m.id === id);
    if (!p) return datingScreen();
    const list = G.phoneOf(s).chats['date:' + id] || [];
    return `<div class="phone sub">${back(p.name, 'dating')}${note()}<div class="dateHead"><span class="miniFace">${bustHtml(p.look, {}, p.name)}</span><div><b>${esc(p.name)}, ${p.age}</b><small>${esc(p.city)}</small></div>
      <button class="primary" data-ask="${p.id}">${esc(t('dateAsk'))} (${esc(G.money(DATE_COST))})</button></div>
      <ul class="bubbles" aria-live="polite">${list.length ? list.map(m => `<li class="b ${m.from}">${esc(m.text)}</li>`).join('') : `<li class="hint">${esc(t('phoneNoChat'))}</li>`}</ul>
      <form class="chatForm" id="dateForm"><input id="dateInput" maxlength="120" autocomplete="off" placeholder="${esc(t('phoneType'))}" aria-label="${esc(t('phoneType'))}"><button class="primary" type="submit">${esc(t('chatSend'))}</button></form></div>`;
  };

  /* ----- drawing and wiring ----- */
  const draw = (): void => {
    host.innerHTML = screen.name === 'home' ? home() : screen.name === 'messages' ? messagesScreen() : screen.name === 'games' ? gamesScreen() : screen.name === 'memory' ? memoryScreen() : screen.name === 'scramble' ? scrambleScreen() : screen.name === 'dating' ? datingScreen() : screen.name === 'datechat' ? dateChatScreen(screen.id) : screen.name === 'updates' ? updatesScreen() : screen.name === 'requests' ? requestsScreen() : screen.name === 'group' ? groupScreen(screen.id)
      : screen.name === 'chat' ? chatScreen(screen.id) : screen.name === 'contacts' ? contactsScreen() : screen.name === 'call' ? callScreen(screen.id) : bankScreen();
    wire();
  };
  const go = (next: Screen): void => { screen = next; draw(); };

  function wire(): void {
    host.querySelectorAll<HTMLButtonElement>('[data-go]').forEach(b => {
      b.onclick = () => {
        const n = b.dataset.go as string;
        if (n === 'memory-new') { mem = null; return go({ name: 'memory' }); }
        if (n === 'scramble-new') { scr = null; return go({ name: 'scramble' }); }
        if (n === 'scramble-hint') { flash = scr ? `${t('gameHint')}: ${scr.word[0].toUpperCase()}… (${scr.word.length})` : ''; return draw(); }
        const names: Record<string, Screen> = { home: { name: 'home' }, messages: { name: 'messages' }, updates: { name: 'updates' }, requests: { name: 'requests' }, contacts: { name: 'contacts' }, games: { name: 'games' }, memory: { name: 'memory' }, scramble: { name: 'scramble' }, dating: { name: 'dating' } };
        go(names[n] ?? { name: 'home' });
      };
    });
    host.querySelectorAll<HTMLButtonElement>('button[data-flow]').forEach(b => {
      b.onclick = () => {
        const f = flows[Number(b.dataset.flow)];
        const why = s.phone <= 0 ? 'Your phone is broken.' : f.available(s);
        if (why) { b.title = why; b.classList.add('shake'); return; }
        d.close(); d.startFlow(f);
      };
    });
    const nb = host.querySelector<HTMLButtonElement>('#phNight'); if (nb) nb.onclick = () => { setPhoneNight(!phoneNight()); draw(); };
    host.querySelectorAll<HTMLButtonElement>('button[data-sys]').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.sys as string; if (!b.classList.contains('off')) markSeen(id);
        if (b.classList.contains('off')) { b.classList.add('shake'); return; }
        if (id === 'shop') d.openShop();
        else if (id === 'dating') go({ name: 'dating' });
        else if (id === 'games') go({ name: 'games' });
        else if (id === 'messages') go({ name: 'messages' });
        else if (id === 'phone') go({ name: 'contacts' });
        else if (id === 'bank') go({ name: 'bank' });
        else if (id === 'study' || id === 'housing' || id === 'chores' || id === 'trains') (id === 'study' ? openStudy : id === 'housing' ? openHousing : id === 'chores' ? openChores : openTrains)(host, s, { back: () => go({ name: 'home' }), refresh: d.refresh, scenario: sc => { d.close(); d.scenario?.(sc); } });
        else if (id === 'jobs') openJobs(host, s, { back: () => go({ name: 'home' }), refresh: d.refresh, notify: m => { flash = m; } });
        else if (id === 'flights') { d.close(); d.flights(); }
        else if (id === 'journal') d.journal();
        else if (id === 'profile') d.profile();
        else d.help();
      };
    });
    host.querySelectorAll<HTMLButtonElement>('[data-sv]').forEach(b => { b.onclick = () => { const a = Number((host.querySelector<HTMLInputElement>('#svAmount')?.value ?? '').replace(/[^0-9]/g, '')); const r = move(s, b.dataset.sv === 'out' ? -a : a); flash = r.msg; if (r.ok) d.refresh(); draw(); }; });
    const sg = host.querySelector<HTMLFormElement>('#svGoal'); if (sg) sg.onsubmit = e => { e.preventDefault(); const r = setGoal(s, host.querySelector<HTMLInputElement>('#svName')?.value ?? '', Number((host.querySelector<HTMLInputElement>('#svTarget')?.value ?? '').replace(/[^0-9]/g, ''))); flash = r.msg; if (r.ok) d.refresh(); draw(); };
    host.querySelectorAll<HTMLButtonElement>('button[data-tab]').forEach(b => { b.onclick = () => { msgTab = b.dataset.tab === 'groups' ? 'groups' : 'chats'; draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('button[data-group]').forEach(b => { b.onclick = () => go({ name: 'group', id: b.dataset.group as string }); });
    const handle = (id: string, action: 'block' | 'open'): void => {
      const r = requestsFor(s).find(x => x.id === id);
      if (!r) return;
      const res = resolveRequest(s, r, action);
      G.apply(s, res.fx); G.recTx(s, 'Scam text opened', res.fx.money || 0);
      flash = res.message; play(res.fx.money ? 'bad' : 'pop'); d.refresh(); draw();
    };
    host.querySelectorAll<HTMLButtonElement>('button[data-req-block]').forEach(b => { b.onclick = () => handle(b.dataset.reqBlock as string, 'block'); });
    host.querySelectorAll<HTMLButtonElement>('button[data-req-open]').forEach(b => { b.onclick = () => handle(b.dataset.reqOpen as string, 'open'); });
    host.querySelectorAll<HTMLButtonElement>('button[data-chat]').forEach(b => { b.onclick = () => go({ name: 'chat', id: b.dataset.chat as string }); });
    host.querySelectorAll<HTMLButtonElement>('button[data-call]').forEach(b => { b.onclick = () => go({ name: 'call', id: b.dataset.call as string }); });
    host.querySelectorAll<HTMLButtonElement>('button[data-open-bank-flow]').forEach(b => { b.onclick = () => { const f = flows.find(x => x.id === 'bank'); if (f) { d.close(); d.startFlow(f); } }; });
    host.querySelectorAll<HTMLButtonElement>('button[data-open-fines]').forEach(b => { b.onclick = () => { const f = flows.find(x => x.id === 'fines'); if (f) { d.close(); d.startFlow(f); } }; });

    /* games */
    host.querySelectorAll<HTMLButtonElement>('button[data-card]').forEach(b => {
      b.onclick = () => {
        if (!mem || memoryWon(mem)) return;
        mem = flip(mem, Number(b.dataset.card));
        play('tap');
        if (memoryWon(mem)) {
          const r = reward(s, 'memory');
          play('chime');
          G.apply(s, r.fx); flash = `${r.message} (${mem.moves} ${t('gameMoves')})`; if (r.given) d.refresh();
        }
        draw();
      };
    });
    const scrForm = host.querySelector<HTMLFormElement>('#scrForm');
    if (scrForm) {
      scrForm.onsubmit = (e: Event) => {
        e.preventDefault();
        const guess = (host.querySelector('#scrInput') as HTMLInputElement).value;
        if (!scr) return;
        if (checkScramble(scr, guess)) {
          const r = reward(s, 'scramble');
          play('chime');
          G.apply(s, r.fx); flash = `${r.message} (${scr.word})`; scr = null; if (r.given) d.refresh();
        } else { flash = t('gameWrong'); play('error'); }
        draw();
      };
    }

    /* dating */
    host.querySelectorAll<HTMLButtonElement>('button[data-dtab]').forEach(b => { b.onclick = () => { dTab = b.dataset.dtab === 'matches' ? 'matches' : 'discover'; draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('button[data-swipe]').forEach(b => {
      b.onclick = () => {
        const p = profilesFor(s)[0];
        if (!p) return;
        const r = swipe(s, p, b.dataset.swipe === 'like');
        flash = r.message; play(r.matched ? 'chime' : 'pop'); d.refresh(); draw();
      };
    });
    host.querySelectorAll<HTMLButtonElement>('button[data-dchat]').forEach(b => { b.onclick = () => go({ name: 'datechat', id: b.dataset.dchat as string }); });
    const dateForm = host.querySelector<HTMLFormElement>('#dateForm');
    if (dateForm && screen.name === 'datechat') {
      const id = screen.id;
      dateForm.onsubmit = (e: Event) => {
        e.preventDefault();
        const input = host.querySelector('#dateInput') as HTMLInputElement;
        const text = input.value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
        const p = dating(s).matches.find(m => m.id === id);
        if (!text || !p) return;
        input.value = '';
        G.addChat(s, 'date:' + id, 'me', text);
        G.addChat(s, 'date:' + id, 'them', dateReply(p, text));
        play('pop'); draw();
        host.querySelector<HTMLInputElement>('#dateInput')?.focus();
      };
    }
    host.querySelectorAll<HTMLButtonElement>('button[data-ask]').forEach(b => {
      b.onclick = () => {
        const p = dating(s).matches.find(m => m.id === b.dataset.ask);
        if (!p) return;
        const r = askOnDate(s, p);
        flash = r.message;
        if (r.ok) {
          G.apply(s, r.fx); G.recTx(s, `Date with ${p.name}`, r.fx.money || 0);
          if (r.becameCouple) { makeCouple(s, p); play('chime'); } else play('coin');
          d.refresh();
        } else play('error');
        draw();
      };
    });

    const chatForm = host.querySelector<HTMLFormElement>('#phChatForm');
    if (chatForm && screen.name === 'chat') {
      const id = screen.id;
      chatForm.onsubmit = (e: Event) => {
        e.preventDefault();
        const input = host.querySelector<HTMLInputElement>('#phChatInput') as HTMLInputElement;
        const text = input.value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
        const c = find(id);
        if (!text || !c) return;
        input.value = '';
        G.addChat(s, id, 'me', text);
        G.addChat(s, id, 'them', replyFor(c, text));
        play('pop');
        const bonus = chatBonus(s, c);
        if (bonus) { G.apply(s, bonus); d.refresh(); }
        draw();
        host.querySelector<HTMLInputElement>('#phChatInput')?.focus();
      };
    }
    const tf = host.querySelector<HTMLFormElement>('#phTransfer');
    if (tf) {
      let pending: { id: string; raw: string } | null = null;
      tf.onsubmit = (e: Event) => {
        e.preventDefault();
        const id = (host.querySelector('#phTo') as HTMLSelectElement).value;
        const raw = (host.querySelector('#phAmount') as HTMLInputElement).value;
        const c = find(id);
        if (!c) return;
        const r = transfer(s, c, raw);
        if (!r.ok) { flash = r.message; play('error'); draw(); return; }
        if (!pending || pending.id !== id || pending.raw !== raw) {   // first press: ask to confirm; second press with the same data: send
          pending = { id, raw };
          const btn = tf.querySelector('button') as HTMLButtonElement;
          btn.textContent = t('phoneConfirm'); btn.classList.add('warnBtn');
          return;
        }
        G.apply(s, r.fx);
        play('coin');
        G.recTx(s, `Transfer to ${c.name}`, r.fx.money || 0);
        G.addChat(s, id, 'me', r.message);
        flash = r.message;
        d.refresh();
        draw();
      };
    }
  }

  d.show();
  draw();
}
