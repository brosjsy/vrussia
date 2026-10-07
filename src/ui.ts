import * as G from './engine';
import type { State, Scenario, Note } from './engine';
import { countStats } from './content';
import { AWARD_TEXT } from './content/culture';
import { startScene, redraw } from './scene';
import { openBooking } from './booking-ui';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (t: string): string => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

let s!: State;
let idle = false;
let selected = G.origins[0].id;

/* ---------- title screen ---------- */
function renderOrigins(): void {
  $('origins').innerHTML = G.origins.map(o => `<button class="ocard ${o.id === selected ? 'sel' : ''}" data-o="${o.id}">
    <b>${o.icon} ${o.label}</b><p>${o.blurb}</p><div class="m">Starts in ${o.city} · ${G.money(o.money)}</div></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('.ocard').forEach(b => { b.onclick = () => { selected = b.dataset.o as string; renderOrigins(); }; });
}

function show(id: 'title' | 'game' | 'end'): void {
  (['title', 'game', 'end'] as const).forEach(x => { $(x).hidden = x !== id; });
  if (id === 'title') $('continueBtn').hidden = !G.load();
  if (id === 'game') { buildMap(); redraw(); }
}

/* ---------- game screen ---------- */
const STAT: [keyof State, string, string][] = [
  ['energy', 'Energy', '#3ec27a'], ['health', 'Health', '#3b6fe0'], ['stress', 'Stress', '#e0373f'],
  ['rep', 'Reputation', '#f0b43c'], ['know', 'Knowledge', '#a56be0'], ['clothes', 'Clothing', '#2bb5c9'], ['famLove', 'Family bond', '#e07bb0'],
];

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

function profileHtml(): string {
  const tier = s.merit >= 80 ? 'Laureate' : s.merit >= 40 ? 'Nominee' : s.merit >= 15 ? 'Active citizen' : 'Newcomer to the community';
  const done = G.goals.filter(g => g.done(s)).length;
  return `<div class="profile"><div class="row2"><div class="big">${s.icon}</div><div><h2 style="margin:0">${esc(s.name)}</h2><div class="sub">${esc(s.label)} · ${esc(s.city)} · ${esc(s.status)}</div><div class="sub">Home: ${esc(s.home)} · Day ${s.day + 1}</div></div></div>
    <div class="medal ${s.flags.award ? 'on' : ''}"><b>${s.flags.award ? '🏅 Awarded the community «Patriot» Award' : '🏅 Community merit: ' + s.merit}</b><div class="sub">Standing: ${tier} · merit ${s.merit}/40 for nomination</div></div>
    <div class="sub">${esc(AWARD_TEXT)}</div>
    <div class="sub">Goals achieved: ${done} / ${G.goals.length} · Friends: ${s.friends} · Children: ${s.kids}${s.partner ? ' · Partner: ' + esc(s.partner.name) : ''}</div>
    <ul style="list-style:none;padding:0;margin:0">${G.goals.map(g => `<li>${g.done(s) ? '✔' : '○'} ${g.label}</li>`).join('')}</ul></div>`;
}

function header(): void {
  updateMap();
  const d = G.dateOf(s);
  $('who').textContent = `${s.icon} ${s.name} — ${s.label}`;
  $('where').textContent = `${s.city} · ${s.job ? G.jobById(s.job).name : 'unemployed'} · ${s.status}`;
  $('date').textContent = `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${G.SLOTS[s.slot]} · ${G.WEATHER[s.weather]}`;
  $('moneyBox').textContent = G.money(s.money);
  $('stats').innerHTML = STAT.map(([k, l, c]) => `<div class="stat"><span>${l}<b>${Math.round(s[k] as number)}</b></span><div class="bar"><i style="width:${s[k]}%;background:${c}"></i></div></div>`).join('')
    + `<div class="stat"><span>Legal strikes<b>${s.strikes}${s.status !== 'citizen' ? ' / 3' : ''}</b></span></div>`;

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
  if (Number(s.tmp.debt) > 0) ch.push(`<span class="chip warn">💳 debt ${G.money(Number(s.tmp.debt))}</span>`);
  if (s.flags.rutest) ch.push('<span class="chip ok">Language test ✓</span>');
  if (s.flags.admitted) ch.push('<span class="chip ok">University ✓</span>');
  $('docs').innerHTML = ch.join('');
  $('goals').innerHTML = G.goals.map(g => `<li class="${g.done(s) ? 'done' : ''}">${g.done(s) ? '✔' : '○'} ${g.label}</li>`).join('');
}

function turn(): void {
  G.save(s);
  header();
  if (s.over) return end();
  if (s.queue.length) {
    const sc = G.get(s.queue.shift() as string, s);
    if (sc) return showScenario(sc, [], '');
  }
  const probs = G.problems(s);
  $('stage').innerHTML = `<div class="cat">${G.SLOTS[s.slot]}</div><h2>What now?</h2><p>${probs.length ? '⚠ Warning: ' + probs.join('; ') + '.' : 'Pick how to spend this part of the day.'}</p>`;
  idle = true;
  $('actions').innerHTML = G.actions.map(a => `<button data-a="${a.id}">${a.icon} ${a.label}<small>${a.hint}</small></button>`).join('');
  $('actions').querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.onclick = () => act(b.dataset.a as string); });
}

function showBooking(): void {
  idle = false;
  $('actions').innerHTML = '';
  openBooking(s, $('stage'), () => turn());
}

function act(id: string): void {
  if (id === 'flight') return showBooking();
  const r = G.perform(s, id);
  header();
  if (!r.sc) return turn();
  showScenario(r.sc, r.notes, r.pre);
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
  $('stage').innerHTML = `<div class="cat">${esc(sc.cat)}</div><h2>${esc(G.fill(sc.title, s))}</h2>${pre ? `<p class="sub">${esc(pre)}</p>` : ''}${noteHtml(notes)}<p>${esc(G.fill(sc.text, s))}</p>
    <div class="choices">${sc.choices.map((c, i) => `<button data-i="${i}">${esc(G.fill(c.t, s))}</button>`).join('')}</div>`;
  $('stage').querySelectorAll<HTMLButtonElement>('.choices button').forEach(b => {
    b.onclick = () => {
      const res = G.choose(s, sc, Number(b.dataset.i));
      header();
      $('stage').innerHTML = `<div class="cat">Result</div><h2>${esc(G.fill(sc.title, s))}</h2><p>${esc(res.msg)}</p>${noteHtml(res.notes)}${res.dayNotes.map(t => `<p class="sub">${esc(t)}</p>`).join('')}
        <div class="choices"><button class="primary" id="nextBtn">Continue</button></div>`;
      $('nextBtn').onclick = res.ui === 'booking' ? showBooking : turn;
    };
  });
}

function end(): void {
  const [title, text] = G.endings[s.over as G.EndingId] || ['The end', ''];
  G.clear();
  $('end').innerHTML = `<div class="end"><div class="flagbar"><i></i><i></i><i></i></div><h1>${title}</h1><p>${text}</p>
    <div class="score">${G.score(s)}</div><p class="sub">final score</p>
    <p>Day ${s.day + 1} · ${G.money(s.money)} · ${s.strikes} strikes · ${s.label}</p>
    <ul style="list-style:none;padding:0">${G.goals.map(g => `<li>${g.done(s) ? '✔' : '○'} ${g.label}</li>`).join('')}</ul>
    <button class="primary" id="againBtn">Play again</button></div>`;
  show('end');
  $('againBtn').onclick = () => show('title');
}

/* ---------- boot ---------- */
export function boot(): void {
  window.addEventListener('error', e => {
    const b = $('errbar'); b.hidden = false;
    b.textContent = `Script error: ${e.message} (${String(e.filename).split('/').pop()}:${e.lineno})`;
  });
  $('citySel').innerHTML += G.CITIES.map(c => `<option>${c}</option>`).join('');
  $('randomBtn').onclick = () => { selected = G.pick(G.origins).id; renderOrigins(); };
  $('startBtn').onclick = () => { s = G.newState(($<HTMLInputElement>('nameInput')).value.trim() || 'Player', selected, ($<HTMLSelectElement>('citySel')).value); show('game'); turn(); };
  $('continueBtn').onclick = () => { const saved = G.load(); if (saved) { s = saved; show('game'); turn(); } };
  $('menuBtn').onclick = () => { if (confirm('Leave this game? Progress is saved automatically.')) show('title'); };
  $('closeModal').onclick = () => { $('modal').hidden = true; };
  $('logBtn').onclick = () => {
    $('modalBody').innerHTML = '<h3>Journal</h3><ul>' + (s.log.length ? s.log.map(l => `<li><b>Day ${l.day + 1}</b> — ${esc(l.text)}</li>`).join('') : '<li>Nothing yet.</li>') + '</ul>';
    $('modal').hidden = false;
  };
  $('awardQuote').innerHTML = '<b>«Patriot» Award</b> — ' + esc(AWARD_TEXT) + ' Earn it in the game by learning, taking part and helping others.';
  $('profileBtn').onclick = () => { $('modalBody').innerHTML = profileHtml(); $('modal').hidden = false; };
  startScene($<HTMLCanvasElement>('scene'), () => s ?? null);
  renderOrigins();
  show('title');
  $('tagCount').textContent = countStats().total.toLocaleString('en-US') + ' scenarios';
}
