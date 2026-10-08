import * as G from './engine';
import type { State, Scenario, Note } from './engine';
import { countStats } from './content';
import { AWARD_TEXT } from './content/culture';
import { startScene, redraw } from './scene';
import { openBooking } from './booking-ui';
import { openOnlineMenu } from './forms-ui';
import { t, lang, setLang, applyStatic, actionText, originText, locale, HELP_RU, endingText } from './i18n';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (t: string): string => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

let s!: State;
let idle = false;
let selected = G.origins[0].id;

/* ---------- title screen ---------- */
function renderOrigins(): void {
  $('origins').innerHTML = G.origins.map(o => `<button class="ocard ${o.id === selected ? 'sel' : ''}" data-o="${o.id}">
    <b>${o.icon} ${originText(o).label}</b><p>${originText(o).blurb}</p><div class="m">${t('startsIn')}: ${o.city} · ${G.money(o.money)}</div></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('.ocard').forEach(b => { b.onclick = () => { selected = b.dataset.o as string; renderOrigins(); }; });
}

function renderAward(): void {
  $('awardQuote').innerHTML = '<b>' + t('award') + '</b> — ' + esc(t('awardText')) + ' ' + t('awardMore');
}

/** Re-applies the language to the whole page without changing any game state. */
function refreshLanguage(): void {
  document.documentElement.lang = lang();
  applyStatic(document, countStats().total.toLocaleString('en-US') + ' ' + t('scenarios'));
  renderOrigins(); renderAward();
  if (!$('game').hidden) { header(); if (idle) renderIdle(); }
}
function toggleLanguage(): void { setLang(lang() === 'ru' ? 'en' : 'ru'); refreshLanguage(); }

function show(id: 'title' | 'game' | 'end'): void {
  (['title', 'game', 'end'] as const).forEach(x => { $(x).hidden = x !== id; });
  if (id === 'title') $('continueBtn').hidden = !G.load();
  if (id === 'game') { prevHud = {}; buildMap(); redraw(); }
}

/* ---------- game screen ---------- */
const STAT: [keyof State, string, string][] = [
  ['energy', 'Energy', '#3ec27a'], ['health', 'Health', '#3b6fe0'], ['stress', 'Stress', '#e0373f'],
  ['rep', 'Reputation', '#f0b43c'], ['know', 'Knowledge', '#a56be0'], ['clothes', 'Clothing', '#2bb5c9'], ['famLove', 'Family bond', '#e07bb0'],
];

/** Look of each scene category: an icon and an accent colour used on the card. */
const CATS: Record<string, [string, string]> = {
  paper: ['📄', '#3b6fe0'], bank: ['🏦', '#2bb5c9'], love: ['💞', '#e07bb0'], social: ['🗣️', '#a56be0'], culture: ['🎭', '#f0b43c'],
  life: ['🌆', '#3ec27a'], shop: ['🛍️', '#f08a3c'], edu: ['🎓', '#a56be0'], family: ['👪', '#e07bb0'], pets: ['🐕', '#c59a5a'],
  police: ['🚓', '#e0373f'], cal: ['📅', '#f0b43c'], work: ['💼', '#3b6fe0'], intro: ['👋', '#3ec27a'], hospital: ['🏥', '#e0373f'],
  home: ['🏠', '#2bb5c9'], health: ['❤️', '#e0373f'], food: ['🍲', '#f08a3c'], estate: ['🏘️', '#2bb5c9'], car: ['🚗', '#6b7bd6'],
  phone: ['📱', '#3b6fe0'], biz: ['🧾', '#3ec27a'], arc: ['📖', '#f0b43c'], map: ['🗺️', '#3ec27a'],
};
const catLook = (c: string): [string, string] => CATS[c] || ['✨', '#3b6fe0'];

/** Previous values, so the HUD can flash green or red and show a floating +/- when something changes. */
let prevHud: Record<string, number> = {};

function hudHtml(): string {
  const items: [keyof State, string][] = [['energy', '⚡'], ['health', '❤️'], ['stress', '😰'], ['rep', '⭐']];
  const col = (k: string, v: number): string => (k === 'stress' ? (v > 70 ? 'var(--bad)' : v > 40 ? 'var(--warn)' : 'var(--ok)') : (v < 25 ? 'var(--bad)' : v < 50 ? 'var(--warn)' : 'var(--ok)'));
  return items.map(([k, ic]) => {
    const v = Math.round(s[k] as number);
    const p = prevHud[k];
    const d = p === undefined ? 0 : v - p;
    const good = k === 'stress' ? d < 0 : d > 0;
    const cls = d ? (good ? ' up' : ' down') : '';
    return `<div class="hs${cls}" title="${t('stat.' + k)}"><span class="hi" aria-hidden="true">${ic}</span><div class="hb"><div class="hl"><span>${t('stat.' + k)}</span><b>${v}</b></div><div class="bar"><i style="width:${v}%;background:${col(k, v)}"></i></div></div>${d ? `<em class="delta ${good ? 'g' : 'b'}">${d > 0 ? '+' : ''}${d}</em>` : ''}</div>`;
  }).join('');
}

/* ---------- live map ---------- */
function buildMap(): void {
  const places = G.PLACES.map(p => {
    const left = p.x > 70;
    return `<g class="place" data-place="${p.id}"><title>${p.n}</title><circle id="pl-${p.id}" cx="${p.x}" cy="${p.y}" r="2.6"/><text x="${p.x + (left ? -3.6 : 3.6)}" y="${p.y + 1.2}" text-anchor="${left ? 'end' : 'start'}">${p.n}</text></g>`;
  }).join('');
  const roads = G.PLACES.filter(p => p.id !== 'home').map(p => `M50 52 L${p.x} ${p.y}`).join(' ');
  const flakes = Array.from({ length: 26 }, (_, i) => `<circle class="flake" cx="${(i * 41) % 100}" cy="0" r=".8" style="animation-delay:-${(i * 0.37).toFixed(2)}s"/>`).join('');
  $('miniMap').innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="250" role="img" aria-label="Interactive city map">
    <path d="${roads}" stroke="currentColor" stroke-opacity=".25" stroke-width=".8" fill="none"/>
    ${places}<circle class="pulse" id="mapPulse" r="3" fill="#3b6fe0" cx="-10" cy="-10"/><g id="mapSnow" class="snow" style="display:none">${flakes}</g>
    <g class="avatar" id="mapAvatar"><text class="av" x="-3" y="-2">${s.icon}</text></g></svg>`;
  $('miniMap').querySelectorAll<SVGGElement>('.place').forEach(el => {
    el.onclick = () => {
      const id = el.dataset.place as string;
      if (!idle || id === s.loc || (id === 'work' && !s.job)) return;
      showScenario(G.startTrip(s, id), [], 'You pull up the map and head out.');
    };
  });
}

function updateMap(): void {
  G.PLACES.forEach(p => {
    const c = document.getElementById('pl-' + p.id);
    if (!c) return;
    c.setAttribute('class', p.id === s.loc ? 'here' : s.known[p.id] ? 'known' : 'unk');
    (c.parentElement as unknown as SVGGElement).style.display = p.id === 'work' && !s.job ? 'none' : '';
  });
  const here = G.placeById(s.loc);
  const av = document.getElementById('mapAvatar') as SVGGElement | null;
  if (av) av.style.transform = `translate(${here.x}px, ${here.y}px)`;
  const dest = s.dest ? G.placeById(s.dest) : here;
  const pulse = document.getElementById('mapPulse');
  if (pulse) { pulse.setAttribute('cx', String(dest.x)); pulse.setAttribute('cy', String(dest.y)); }
  const snow = document.getElementById('mapSnow');
  if (snow) snow.style.display = s.weather === 'snow' ? '' : 'none';
}

const HELP = `<h3>How to play</h3><ul class="help">
  <li><b>Time.</b> Each day has three parts: morning, afternoon, evening. Every action uses one part. Rent is paid on Saturday.</li>
  <li><b>Actions.</b> Work, eat, go out, do paperwork, study, call family, visit the bank or shops, meet people, run your business, look after a pet. Use the numbers <b>1–9</b> on your keyboard, and <b>Enter</b> to continue.</li>
  <li><b>Map.</b> Click a place on the map to travel there. Snow and frost make you lose your way; a good phone and a known route help.</li>
  <li><b>Online services.</b> The 💻 button opens websites you fill in step by step: jobs, doctor, flats, bank accounts, train tickets, the university portal and more. The ✈️ button books flights.</li>
  <li><b>Papers (if you are a newcomer).</b> Keep your registration, patent or visa valid. Expired papers lead to police checks, fines and legal strikes. Three strikes mean deportation. A clean record slowly clears strikes.</li>
  <li><b>Goals.</b> Study, build a career or a company, get residence (RVP, then VNZh) and citizenship, start a family, adopt a dog, earn the community «Patriot» Award, and collect achievements.</li>
  <li><b>Money.</b> Wages, rent, living costs, loans and taxes are simplified. Everything is a game model, not legal or financial advice.</li>
  <li><b>Saving.</b> The game saves by itself. You can export and import a save file from the title screen.</li>
</ul>`;

const helpHtml = (): string => (lang() === 'ru' ? HELP_RU : HELP);

function profileHtml(): string {
  const tier = s.merit >= 80 ? 'Laureate' : s.merit >= 40 ? 'Nominee' : s.merit >= 15 ? 'Active citizen' : 'Newcomer to the community';
  const done = G.goals.filter(g => g.done(s)).length;
  return `<div class="profile"><div class="row2"><div class="big">${s.icon}</div><div><h2 style="margin:0">${esc(s.name)}</h2><div class="sub">${esc(s.label)} · ${esc(s.city)} · ${esc(s.status)}</div><div class="sub">Home: ${esc(s.home)} · Day ${s.day + 1} · ${esc(t('diff.' + s.diff))}</div></div></div>
    <div class="medal ${s.flags.award ? 'on' : ''}"><b>${s.flags.award ? '🏅 Awarded the community «Patriot» Award' : '🏅 Community merit: ' + s.merit}</b><div class="sub">Standing: ${tier} · merit ${s.merit}/40 for nomination</div></div>
    <div class="sub">${esc(t('awardText'))}</div>
    <div class="sub">Goals achieved: ${done} / ${G.goals.length} · Friends: ${s.friends} · Children: ${s.kids}${s.partner ? ' · Partner: ' + esc(s.partner.name) : ''}</div>
    <ul style="list-style:none;padding:0;margin:0">${G.goals.map(g => `<li>${g.done(s) ? '✔' : '○'} ${g.label}</li>`).join('')}</ul>
    <h3>Achievements ${s.ach.length} / ${G.ACHIEVEMENTS.length}</h3>
    <div class="achgrid">${G.ACHIEVEMENTS.map(a => `<div class="ach ${s.ach.includes(a.id) ? 'on' : ''}" title="${esc(a.text)}"><span>${s.ach.includes(a.id) ? a.icon : '🔒'}</span><b>${esc(a.title)}</b><small>${esc(a.text)}</small></div>`).join('')}</div></div>`;
}

function header(): void {
  updateMap();
  const d = G.dateOf(s);
  $('who').textContent = `${s.icon} ${s.name} — ${s.label}`;
  $('where').textContent = `${s.city} · ${s.job ? G.jobById(s.job).name : t('unemployed')} · ${s.status}`;
  $('date').textContent = `${d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${t('slot.' + s.slot)} · ${t('weather.' + s.weather)}`;
  const shown = G.money(s.money);
  const mb = $('moneyBox');
  if (mb.textContent !== shown) {
    const pm = prevHud.money;
    mb.textContent = shown;
    if (pm !== undefined && pm !== s.money) { mb.classList.remove('gain', 'loss'); void mb.offsetWidth; mb.classList.add(s.money > pm ? 'gain' : 'loss'); }
  }
  $('hud').innerHTML = hudHtml();
  prevHud = { money: s.money, energy: Math.round(s.energy), health: Math.round(s.health), stress: Math.round(s.stress), rep: Math.round(s.rep) };
  $('stats').innerHTML = STAT.map(([k, , c]) => `<div class="stat"><span>${t('stat.' + k)}<b>${Math.round(s[k] as number)}</b></span><div class="bar"><i style="width:${s[k]}%;background:${c}"></i></div></div>`).join('')
    + `<div class="stat"><span>${t('strikes')}<b>${s.strikes}${s.status !== 'citizen' ? ' / 3' : ''}</b></span></div>`;

  const ch: string[] = [];
  if (s.status === 'citizen') ch.push('<span class="chip ok">Russian citizen</span>');
  else if (s.flags.rvp) ch.push('<span class="chip ok">RVP residence</span>');
  else {
    const f = (n: string, v: number) => `<span class="chip ${v <= 0 ? 'bad' : v < 15 ? 'warn' : 'ok'}">${n}: ${v <= 0 ? 'none' : v + 'd'}</span>`;
    ch.push(f('Registration', s.docs.reg));
    if (s.status === 'migrant') ch.push(f('Patent', s.docs.patent), `<span class="chip ${s.flags.med ? 'ok' : 'warn'}">Medical: ${s.flags.med ? 'done' : 'needed'}</span>`);
    if (s.status === 'student') ch.push(f('Visa', s.docs.visa));
  }
  if (s.flags.vnzh) ch.push('<span class="chip ok">VNZh ✓</span>');
  const banks = Object.keys(s.bank).filter(k => s.bank[k]);
  ch.push(`<span class="chip ${banks.length ? 'ok' : 'warn'}">Bank: ${banks.length ? banks.join(', ') : 'none'}</span>`);
  if (s.partner) ch.push(`<span class="chip ok">💞 ${esc(s.partner.name)} (${Math.round(s.partner.love)})${s.flags.married ? ' · married' : ''}</span>`);
  if (s.kids) ch.push(`<span class="chip ok">👶 ${s.kids} child${s.kids > 1 ? 'ren' : ''}</span>`);
  if (s.flags.pregnant) ch.push('<span class="chip warn">Baby expected</span>');
  ch.push(`<span class="chip">Friends: ${s.friends}</span>`);
  ch.push(`<span class="chip ${s.phone >= 2 ? 'ok' : ''}">📱 Phone ${['broken', 'basic', 'good', 'flagship'][s.phone] || 'basic'}</span>`);
  if (s.car) ch.push(`<span class="chip ok">🚗 ${esc(s.car.model)}</span>`);
  if (s.housing !== 'rented') ch.push(`<span class="chip ok">🏠 Homeowner</span>`);
  if (s.pet) ch.push(`<span class="chip ok">🐕 ${esc(s.pet.name)} (bond ${Math.round(s.pet.bond)})</span>`);
  if (s.booking && !s.booking.done) ch.push(`<span class="chip warn">✈️ flight in ${Math.max(0, s.booking.dep - s.day)}d</span>`);
  if (Number(s.tmp.matCap) > 0) ch.push(`<span class="chip ok">👶 maternity capital ${G.money(Number(s.tmp.matCap))}</span>`);
  if (Number(s.tmp.fines) > 0) ch.push(`<span class="chip warn">🧾 unpaid fines ${G.money(Number(s.tmp.fines))}</span>`);
  if (Number(s.tmp.debt) > 0) ch.push(`<span class="chip warn">💳 debt ${G.money(Number(s.tmp.debt))}</span>`);
  if (s.flags.rutest) ch.push('<span class="chip ok">Language test ✓</span>');
  if (s.flags.admitted) ch.push('<span class="chip ok">University ✓</span>');
  $('docs').innerHTML = ch.join('');
  const cl = G.checklistFor(s);
  const open = cl.some(c => !c.done);
  $('checklistBox').hidden = !open || s.day > 120;
  $('checklist').innerHTML = cl.map(c => `<li class="${c.done ? 'done' : ''}">${c.done ? '✔' : '○'} ${c.item.label}</li>`).join('');
  $('goals').innerHTML = G.goals.map(g => `<li class="${g.done(s) ? 'done' : ''}">${g.done(s) ? '✔' : '○'} ${g.label}</li>`).join('');
}

/** A short pop-up for newly earned achievements. */
function toast(list: G.Achievement[]): void {
  if (!list.length) return;
  const box = document.getElementById('toasts');
  if (!box) return;
  list.forEach(a => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<b>${a.icon} Achievement unlocked</b><div>${esc(a.title)} — ${esc(a.text)}</div>`;
    box.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  });
}

function turn(): void {
  toast(G.checkAchievements(s));
  G.save(s);
  header();
  if (s.over) return end();
  if (s.queue.length) {
    const sc = G.get(s.queue.shift() as string, s);
    if (sc) return showScenario(sc, [], '');
  }
  renderIdle();
  focusFirst();
}

/** The last three journal entries, so a returning player remembers what just happened. */
function recentHtml(): string {
  if (!s.log.length) return '';
  return `<div class="recent"><h3>${t('recent')}</h3><ul>${s.log.slice(0, 3).map(l => `<li><b>${t('dayWord')} ${l.day + 1}</b> ${esc(l.text.length > 140 ? l.text.slice(0, 137) + '…' : l.text)}</li>`).join('')}</ul></div>`;
}

/** The "what now?" screen: prompt plus the action buttons. Safe to call again (for example after a language change). */
function renderIdle(): void {
  const probs = G.problems(s);
  $('stage').dataset.cat = ''; $('stage').style.removeProperty('--accent');
  $('stage').innerHTML = `<div class="cat">${t('slot.' + s.slot)}</div><h2>${t('whatNow')}</h2><p>${probs.length ? '⚠ ' + t('warning') + ': ' + probs.join('; ') + '.' : t('pick')}</p>${recentHtml()}`;
  idle = true;
  $('actions').innerHTML = G.actions.map(a => { const x = actionText(a); return `<button data-a="${a.id}"><span class="ic" aria-hidden="true">${a.icon}</span> <span class="lb">${x.label}</span><small>${x.hint}</small></button>`; }).join('');
  $('actions').querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.onclick = () => act(b.dataset.a as string); });
}

function showBooking(): void {
  idle = false;
  $('actions').innerHTML = '';
  openBooking(s, $('stage'), () => turn());
}

function act(id: string): void {
  if (id === 'flight') return showBooking();
  if (id === 'online') { idle = false; $('actions').innerHTML = ''; return openOnlineMenu(s, $('stage'), () => turn()); }
  const r = G.perform(s, id);
  header();
  if (!r.sc) return turn();
  showScenario(r.sc, r.notes, r.pre);
}

/** Keeps keyboard and screen-reader users oriented: focus lands on the first button of the new screen. */
function focusFirst(): void {
  const b = document.querySelector<HTMLButtonElement>('#stage .choices button, #actions button');
  if (b) b.focus({ preventScroll: true });
}

function noteHtml(notes: Note[]): string {
  if (!notes.length) return '';
  return '<div class="notes">' + notes.map(n => {
    const bad = n.k === 'stress' || n.k === 'strike' ? n.v > 0 : n.v < 0;
    return `<span class="note ${bad ? 'neg' : 'pos'}">${n.label} ${n.v ? (n.v > 0 ? '+' : '') + (n.k === 'money' ? G.money(n.v) : n.v) : ''}</span>`;
  }).join('') + '</div>';
}

function showScenario(sc: Scenario, notes: Note[], pre: string): void {
  idle = false;
  $('actions').innerHTML = '';
  const [ci, cc] = catLook(sc.cat);
  $('stage').style.setProperty('--accent', cc); $('stage').dataset.cat = sc.cat;
  $('stage').innerHTML = `<div class="cat"><span aria-hidden="true">${ci}</span> ${esc(sc.cat)}</div><h2>${esc(G.fill(sc.title, s))}</h2>${pre ? `<p class="sub">${esc(pre)}</p>` : ''}${noteHtml(notes)}<p>${esc(G.fill(sc.text, s))}</p>
    <div class="choices">${sc.choices.map((c, i) => `<button data-i="${i}">${esc(G.fill(c.t, s))}</button>`).join('')}</div>`;
  $('stage').querySelectorAll<HTMLButtonElement>('.choices button').forEach(b => {
    b.onclick = () => {
      const res = G.choose(s, sc, Number(b.dataset.i));
      header();
      $('stage').innerHTML = `<div class="cat">${t('result')}</div><h2>${esc(G.fill(sc.title, s))}</h2><p>${esc(res.msg)}</p>${noteHtml(res.notes)}${res.dayNotes.map(t => `<p class="sub">${esc(t)}</p>`).join('')}
        <div class="choices"><button class="primary" id="nextBtn">${t('next')}</button></div>`;
      $('nextBtn').onclick = res.ui === 'booking' ? showBooking : turn;
      toast(res.unlocked);
      focusFirst();
    };
  });
}

function end(): void {
  const [title, text] = endingText(String(s.over), G.endings[s.over as G.EndingId] || ['The end', '']);
  G.clear();
  $('end').innerHTML = `<div class="end"><div class="flagbar"><i></i><i></i><i></i></div><h1>${title}</h1><p>${text}</p>
    <div class="score">${G.score(s)}</div><p class="sub">${t('finalScore')}</p>
    <p>${t('dayWord')} ${s.day + 1} · ${G.money(s.money)} · ${s.strikes} ${t('strikesWord')} · ${s.label}</p>
    <ul style="list-style:none;padding:0">${G.goals.map(g => `<li>${g.done(s) ? '✔' : '○'} ${g.label}</li>`).join('')}</ul>
    <p>🏆 ${t('achievementsWord')}: ${s.ach.length} / ${G.ACHIEVEMENTS.length}</p>
    <div class="achgrid">${G.ACHIEVEMENTS.filter(a => s.ach.includes(a.id)).map(a => `<div class="ach on"><span>${a.icon}</span><b>${esc(a.title)}</b></div>`).join('')}</div>
    <button class="primary" id="againBtn">${t('playAgain')}</button></div>`;
  show('end');
  $('againBtn').onclick = () => show('title');
}

/* ---------- boot ---------- */
export function boot(): void {
  window.addEventListener('unhandledrejection', e => {
    const b = $('errbar'); b.hidden = false;
    b.textContent = `Script error: ${String((e.reason && e.reason.message) || e.reason)}`;
  });
  window.addEventListener('error', e => {
    const b = $('errbar'); b.hidden = false;
    b.textContent = `Script error: ${e.message} (${String(e.filename).split('/').pop()}:${e.lineno})`;
  });
  $('citySel').innerHTML += G.CITIES.map(c => `<option>${c}</option>`).join('');
  $('randomBtn').onclick = () => { selected = G.pick(G.origins).id; renderOrigins(); };
  $('startBtn').onclick = () => { try { if (!localStorage.getItem('vrussia_help_seen')) { localStorage.setItem('vrussia_help_seen', '1'); setTimeout(() => { $('modalBody').innerHTML = helpHtml(); $('modal').hidden = false; }, 50); } } catch { /* storage may be blocked */ } s = G.newState(($<HTMLInputElement>('nameInput')).value.trim() || 'Player', selected, ($<HTMLSelectElement>('citySel')).value, ($<HTMLSelectElement>('diffSel')).value as G.Difficulty); show('game'); turn(); };
  $('continueBtn').onclick = () => { const saved = G.load(); if (saved) { s = saved; show('game'); turn(); } };
  $('menuBtn').onclick = () => { if (confirm('Leave this game? Progress is saved automatically.')) show('title'); };
  $('closeModal').onclick = () => { $('modal').hidden = true; };
  $('logBtn').onclick = () => {
    $('modalBody').innerHTML = '<h3>' + t('journalTitle') + '</h3><ul>' + (s.log.length ? s.log.map(l => `<li><b>${t('dayWord')} ${l.day + 1}</b> — ${esc(l.text)}</li>`).join('') : '<li>' + t('nothingYet') + '</li>') + '</ul>';
    $('modal').hidden = false;
  };
  renderAward();
  $('helpBtn').onclick = () => { $('modalBody').innerHTML = helpHtml(); $('modal').hidden = false; };
  $('profileBtn').onclick = () => { $('modalBody').innerHTML = profileHtml(); $('modal').hidden = false; };
  startScene($<HTMLCanvasElement>('scene'), () => s ?? null);

  // when a pop-up opens, focus moves into it; when it closes, focus returns to where it was
  let lastFocus: HTMLElement | null = null;
  new MutationObserver(() => {
    if (!$('modal').hidden) { lastFocus = document.activeElement as HTMLElement | null; $('closeModal').focus(); }
    else if (lastFocus && document.contains(lastFocus)) { lastFocus.focus(); lastFocus = null; }
  }).observe($('modal'), { attributes: true, attributeFilter: ['hidden'] });

  // keyboard: 1-9 pick the numbered option, Enter continues, Escape closes the pop-up
  document.addEventListener('keydown', e => {
    const t = e.target as HTMLElement;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'Escape') { $('modal').hidden = true; return; }
    if (!$('modal').hidden || $('game').hidden) return;
    if (e.key === 'Enter') { const n = document.getElementById('nextBtn'); if (n) { e.preventDefault(); n.click(); } return; }
    if (/^[1-9]$/.test(e.key)) {
      const buttons = document.querySelectorAll<HTMLButtonElement>('#stage .choices button:not(#nextBtn), #actions button');
      const b = buttons[Number(e.key) - 1];
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
    }
  });

  // export / import a save file
  $('exportBtn').onclick = () => {
    const saved = G.load();
    if (!saved) { alert('There is no saved game yet.'); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `vrussia-save-day${saved.day + 1}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  $<HTMLInputElement>('importFile').onchange = async ev => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text()) as G.State;
      if (obj.version !== 7 || typeof obj.day !== 'number' || !obj.docs) throw new Error('bad file');
      G.save(obj); show('title'); alert('Save imported. Press "Continue saved game".');
    } catch { alert('That file is not a valid V Russia save for this version.'); }
  };

  renderOrigins();
  show('title');
  refreshLanguage();
  $('langBtn').onclick = toggleLanguage; $('langBtn2').onclick = toggleLanguage;
}
