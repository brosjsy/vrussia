import * as G from './engine';
import { BRAND } from './brand';
import { L, LG, eyeL, cityName, placeL, flavourL, decreeL, checkL, sceneRu, homeRu, catRu, loadRussian } from './i18n-words';
import type { State, Scenario, Note } from './engine';
import { countStats } from './content';
import { AWARD_TEXT } from './content/culture';
import { mountRealMap, consentGiven, giveConsent } from './realmap';
import { supportsWebGL } from './world3d-support';
import type { RealMapHandle } from './realmap';
import { bustHtml, bodyHtml, upgradeFigures } from './figure';
import { viewOf as careerView, RANKS, THRESHOLDS } from './career';
import { viewOf as buildView } from './build';
import { kitchenOf, RECIPES, cannotCook, cook, buyGroceries, shopsHere, BAG_PRICE, mealMoodlet } from './cooking';
import type { Where } from './cooking';
import { useObject, teaMoodlet } from './objects';
import { afterTurn, beforeAction } from './turn';
import { FILTERS, STICKERS, composePhoto, download as downloadPhoto } from './photo';
import type { Filter } from './photo';
import { load as loadSettings, save as saveSettings, defaults as defaultSettings, HOTKEYS } from './settings';
import type { Graphics } from './settings';
import { activeEvent, bump as bumpEvent, progress as eventProgress, claim as claimEvent, claimable } from './events';
/** Cities with a metro (the same list as venues.ts, kept here so that the places-to-go module loads only when the map is opened). */
const hasMetro = (city: string): boolean => ['Moscow', 'Saint Petersburg', 'Kazan', 'Yekaterinburg', 'Novosibirsk', 'Nizhny Novgorod', 'Samara'].includes(city);
import { setColourSafe, needsOf, NEED_KEYS, NEED_INFO, wash, meterColor, meterAdvice, moodlets, useToilet } from './needs';
import type { Meter } from './needs';
import { RUSSIAN_NAMES, FACIAL, LIPS, NOSES, BROWS, FACES, BUILDS, EYE_COLOR_NAMES, EYE_COLORS, SKIN_ORDER, SAMPLES, normalizeLook, applyGroup, GROUPS, GROUP_OF_ORIGIN, EYES, HAIR_COLOR_NAMES, DEFAULT_LOOK, SKINS, HAIR_COLORS, HAIR_STYLES, STYLES, ACCENTS, BOTTOMS, SHOES, BOTTOM_COLORS, SHOE_COLORS, HEIGHTS } from './avatar';
import type { Worn } from './avatar';
import type { Look } from './avatar';
import { DREAMS, dreamOf } from './dreams';
import { play, soundOn, setSound, soundForNotes } from './sound';
import { ambientChat, chatReply, cleanMessage, LAYERS, inLayer } from './social';
import type { ChatLine } from './social';
import { crowdFor, cityMarkup, updateCity, newsItems, quests, placeActions, moodOf, PLACE_LOOK } from './city';
import { openOnlineMenu, openFlow } from './forms-ui';
import { flows } from './forms';
import { shareText, copyText } from './share';
import { applyTextStep, cycleTextStep, textStep } from './prefs';
import { hallOfFame, recordRun, clearHall, lifetime } from './store';
import { governorOf, decreeFor } from './election';
import { warmthMeter, temperatureOf, coldWord, seasonOf } from './warmth';
const SEASON_ICON: Record<string, [string, string]> = { winter: ['❄️', '❄️'], summer: ['☀️', '☀️'], offseason: ['🌱', '🍂'] };
import { t, lang, setLang, applyStatic, actionText, originText, locale, endingText } from './i18n';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (t: string): string => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

let s!: State;
let idle = false;
let selected = G.origins[0].id;

/* ---------- title screen ---------- */
function renderOrigins(): void {
  $('origins').innerHTML = G.origins.map(o => `<button class="ocard ${o.id === selected ? 'sel' : ''}" data-o="${o.id}">
    <b>${o.icon} ${originText(o).label}</b><p>${originText(o).blurb}</p><div class="m">${t('startsIn')}: ${cityName(o.city)} · ${G.money(o.money)}</div></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('.ocard').forEach(b => { b.onclick = () => { selected = b.dataset.o as string; if (!lookTouched && GROUP_OF_ORIGIN[selected]) { draftLook = applyGroup(draftLook, GROUP_OF_ORIGIN[selected]); renderCreator(); } renderOrigins(); }; });
}

function renderAward(): void {
  $('awardQuote').innerHTML = '<b>' + t('award') + '</b> — ' + esc(t('awardText')) + ' ' + t('awardMore');
}

/** The local hall of fame: the best finished games stored in this browser (see src/store.ts). */
function renderHall(): void {
  const rows = hallOfFame();
  $('hallBox').hidden = rows.length === 0;
  const L = lifetime();
  $('hallTotals').textContent = L.games ? `${t('hallGames')}: ${L.games} · ${t('hallCitizens')}: ${L.citizens} · ${t('hallBest')}: ${L.bestScore}` : '';
  $('hallList').innerHTML = rows.slice(0, 5).map(r => `<li><b>${r.score}</b> · ${esc(r.name)} — ${esc(r.label)} · ${t('dayWord')} ${r.days} · ${t('hallEnd')}: ${esc(r.ending)}${r.citizen ? ' 🛂' : ''}</li>`).join('');
}

/** Re-applies the language to the whole page without changing any game state. */
function refreshLanguage(): void {
  document.documentElement.lang = lang();
  applyStatic(document, countStats().total.toLocaleString('en-US') + ' ' + t('scenarios'));
  renderOrigins(); renderAward(); renderHall(); renderCreator();
  if (!$('game').hidden) { header(); renderLayers(); renderW3Quests(); if (idle) renderIdle(); }
}
function toggleLanguage(): void { setLang(lang() === 'ru' ? 'en' : 'ru'); refreshLanguage(); if (lang() === 'ru') void loadRussian().then(fresh => { if (fresh) refreshLanguage(); }); }

function show(id: 'title' | 'game' | 'end'): void {
  (['title', 'game', 'end'] as const).forEach(x => { $(x).hidden = x !== id; });
  if (id === 'title') { $('continueBtn').hidden = !G.load(); renderHall(); }
  if (id !== 'game' && realCtl) closeRealMap();
  if (id !== 'game' && worldCtl) close3d();
  $('dock').hidden = id !== 'game';
  $('keysBtn').hidden = id !== 'game';
  if (id === 'game') { prevHud = {}; newsIdx = 0; buildMap(); }
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

/* Every flat portrait on the page (header, creator, shop, phone, maps) is upgraded to the 3D person model when the device can draw 3D.
   Watching the page for new pictures covers every screen, including ones opened later. */
let figureTimer = 0;
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  new MutationObserver(() => {
    if (figureTimer) return;
    figureTimer = window.setTimeout(() => { figureTimer = 0; if (typeof document !== 'undefined') void upgradeFigures(document.body); }, 60);   // the page may be gone by then (a test that ended)
  }).observe(document.body, { childList: true, subtree: true });
}

/* ---------- live map ---------- */
let newsIdx = 0;
let layer = 'all';
let chat: ChatLine[] = [];
let chatPlace = '';

function renderLayers(): void {
  renderW3Tools();
  if (furnOn && worldCtl?.inside() !== 'home') { furnOn = false; document.querySelector('.furnPanel')?.remove(); }
  $('layers').innerHTML = LAYERS.map(l => `<button data-layer="${l.id}" aria-pressed="${l.id === layer}">${l.icon} ${esc(t('layer.' + l.id) === 'layer.' + l.id ? l.label : t('layer.' + l.id))}</button>`).join('');
  { const ev = activeEvent(s); if (ev) $('layers').innerHTML += `<button class="realBtn eventBtn" id="eventBtn" title="${esc(lang() === 'ru' ? ev.ru : ev.name)}">${ev.icon} ${esc(lang() === 'ru' ? ev.ru : ev.name)}${claimable(s) ? ' ●' : ''}</button>`; }
  $('layers').innerHTML += `<button class="realBtn metroBtn" id="metroBtn" title="${esc(t('mtTitle'))}">${hasMetro(s.city) ? 'Ⓜ' : '🚌'} ${esc(t(hasMetro(s.city) ? 'mtShort' : 'mtBusShort'))}</button><button class="realBtn view3d" id="view3dBtn" aria-pressed="${view === '3d'}" title="${esc(t('w3Tip'))}">🧊 3D</button><button class="realBtn" id="realBtn" aria-pressed="${realOn}" title="${esc(t('realTip'))}">🛰️ ${esc(t('realBtn'))}</button><button class="realBtn" id="realCityBtn" aria-pressed="${!!realCityClose}" title="${esc(t('rcTip'))}">🌍 ${esc(t('rcBtn'))}</button>`;
  $('layers').querySelectorAll<HTMLButtonElement>('button[data-layer]').forEach(b => { b.onclick = () => { layer = b.dataset.layer as string; renderLayers(); applyLayer(); }; });
  ($('metroBtn') as HTMLButtonElement).onclick = () => void openMetroScreen();
  const evb = document.getElementById('eventBtn'); if (evb) evb.onclick = openEvent;
  ($('realBtn') as HTMLButtonElement).onclick = () => { if (realOn) closeRealMap(); else void openRealMap(); };
  ($('realCityBtn') as HTMLButtonElement).onclick = () => void toggleRealCity();
  if (view === '3d') {
    { const b = document.createElement('button'); b.className = 'realBtn'; b.id = 'realHousesBtn'; b.setAttribute('aria-pressed', String(realHouses)); b.title = t('osmTip'); b.textContent = t('lyReal'); b.onclick = () => void toggleRealHouses(); $('layers').appendChild(b); }
    { const b = document.createElement('button'); b.className = 'realBtn'; b.id = 'civicBtn'; b.textContent = t('lyGov'); b.title = t('cvTitle'); b.onclick = () => void openCivic(); $('layers').appendChild(b); }
    for (const [id, label, on] of [['names', t('lyNames'), names3d], ['boards', t('lyBoards'), boards3d], ['traffic', t('lyTraffic'), traffic3d]] as const) { const b = document.createElement('button'); b.className = 'realBtn'; b.dataset.ly3 = id; b.setAttribute('aria-pressed', String(on)); b.textContent = label; b.onclick = () => { if (id === 'names') names3d = !names3d; else if (id === 'boards') boards3d = !boards3d; else traffic3d = !traffic3d; worldCtl?.setLayer(id, id === 'names' ? names3d : id === 'boards' ? boards3d : traffic3d); renderLayers(); renderW3Quests(); }; $('layers').appendChild(b); }
  }
  if (view === '3d' && worldCtl?.inside() === 'home') { const fb = document.createElement('button'); fb.className = 'realBtn'; fb.id = 'furnBtn'; fb.setAttribute('aria-pressed', String(furnOn)); fb.textContent = t('fuBuyMode'); fb.onclick = () => toggleFurnish(); $('layers').appendChild(fb); }
  if (view === '3d') { const inB = document.createElement('button'); inB.className = 'realBtn'; inB.id = 'inBtn'; inB.title = t('goInTip'); const inside = !!worldCtl?.inside(); inB.textContent = inside ? '🚪 ' + t('goOut') : '🏠 ' + t('goIn'); inB.onclick = () => { if (!worldCtl) return; if (worldCtl.inside()) worldCtl.leave(); else if (!worldCtl.enter()) notify(t('noInside')); renderLayers(); }; $('layers').appendChild(inB); }
  ($('view3dBtn') as HTMLButtonElement).onclick = () => { if (view === '3d') { close3d(); rememberIso(); } else void open3d(); };
}
/** Places outside the chosen layer fade out; the current place always stays visible. */
function applyLayer(): void {
  document.querySelectorAll<SVGGElement>('#city .place').forEach(el => { el.classList.toggle('dim', !(inLayer(layer, el.dataset.place as string) || el.dataset.place === s.loc)); });
}

/** Something was used inside a 3D room: the wardrobe is the shop, the phone is the phone, everything else is the same action as its button. */
/** The card of a thing in the room: what it is, and the little things that can be done with it (seconds, price, what it gives). */
async function openActivities(key: string): Promise<void> {
  const ac = await import('./activities'), th = ac.thingFor(key); if (!th || !worldCtl) return;
  const host = $('world3d'); host.querySelector('.actCard')?.remove();
  const card = document.createElement('div'); card.className = 'actCard'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', th.name);
  const left = ac.leftNow(s);
  card.innerHTML = `<div class="actHead"><span class="actIcon" aria-hidden="true">${th.icon}</span><div><b>${esc(th.name)}</b><div class="sub">${esc(th.flavour)}</div></div><button type="button" class="actX" aria-label="${esc(t('fuHide'))}">✕</button></div>
    <div class="actLeft">${esc(t('actLeft'))}: ${left} / ${ac.PER_SLOT}</div>
    <ul class="actList">${th.list.map(a => `<li><button type="button" class="actBtn" data-a="${a.id}"${left <= 0 ? ' disabled' : ''}><span class="actSecs">⏱ ${a.secs}s</span><span class="actCost">${a.cost ? esc(G.money(a.cost)) : esc(t('actFree'))}</span><b>${esc(a.name)}</b><span class="actTags">${ac.tagsOf(a).map(x => `<i>${esc(x)}</i>`).join('')}</span></button></li>`).join('')}</ul>`;
  host.appendChild(card);
  (card.querySelector('.actX') as HTMLButtonElement).onclick = () => card.remove();
  card.querySelectorAll<HTMLButtonElement>('.actBtn').forEach(b => { b.onclick = () => {
    const r = ac.doActivity(s, key, b.dataset.a as string); notify(r.msg);
    if (!r.ok) return;
    card.remove(); worldCtl?.playPose(r.pose, r.secs); G.save(s); header(); renderW3Quests();
    const bar = document.createElement('div'); bar.className = 'actProg'; bar.innerHTML = `<i style="animation-duration:${r.secs}s"></i>`; host.appendChild(bar); window.setTimeout(() => bar.remove(), r.secs * 1000);
  }; });
}
/** The words of the thing under the pointer in a room, shown in one chip at the top of the 3D view (the things themselves carry only a small picture). */
function showHover(label: string | null): void {
  const host = document.getElementById('world3d'); if (!host) return;
  let chip = host.querySelector<HTMLElement>('.w3Hover');
  if (!label) { chip?.remove(); return; }
  if (!chip) { chip = document.createElement('div'); chip.className = 'w3Hover'; chip.setAttribute('role', 'status'); host.appendChild(chip); }
  chip.textContent = label;
}
/** The city hall: this week's policy, the open election, voting (in person at the polling station) and standing as a candidate. */
async function openCivic(): Promise<void> {
  const ui = await import('./civic-ui');
  const draw = (): void => { $('modalBody').innerHTML = ui.civicHtml(s); ui.wireCivic($('modalBody'), s, { notify, again: () => { G.save(s); header(); draw(); } }); };
  draw(); $('modal').classList.remove('phoneMode'); $('modal').hidden = false;
}
/** The adverts board: today's small ads, the replies to the player's own ads, and a form to put one up. */
async function openAds(): Promise<void> {
  const ui = await import('./ads-ui');
  const draw = (): void => { $('modalBody').innerHTML = ui.adsHtml(s); ui.wireAds($('modalBody'), s, { notify, again: () => { G.save(s); header(); draw(); }, saved: () => { G.save(s); header(); } }); };
  draw(); G.save(s); $('modal').classList.remove('phoneMode'); $('modal').hidden = false;
}
/** The metro (or bus) map: a station for every place and every place to go; going to a place starts the usual trip, a visit is a part of the day. */
async function openMetroScreen(): Promise<void> {
  if (!idle) { notify(t('busyNow')); return; }
  const [ui, vn] = await Promise.all([import('./metro-ui'), import('./venues')]);
  ui.openMetro($('modalBody'), s, {
    close: () => { $('modal').hidden = true; },
    goPlace: id => { if (id === s.loc || (id === 'work' && !s.job)) { if (id === 'work') notify(t('mtNoJob')); return; } if (idle) showScenario(G.startTrip(s, id), [], t('mtRide')); },
    visit: id => { const sc = vn.visitScenario(s, id, lang() === 'ru'); if (sc && idle) showScenario(sc, [], ''); },
  });
  $('modal').classList.remove('phoneMode'); $('modal').hidden = false;
}
/** Holidays (events.ts): meeting people and being in the city centre count toward the tasks; a button opens the event's card and the free pass. */
function eventHtml(): string {
  const p = eventProgress(s); if (!p) return '';
  const ru = lang() === 'ru', e = p.event, got = claimable(s);
  return `<div class="eventCard"><h3>${e.icon} ${esc(ru ? e.ru : e.name)}</h3><p>${esc(ru ? e.ru_text : e.en_text)}</p>
    <ul class="evTasks">${p.tasks.map(x => `<li class="${x.done ? 'done' : ''}"><span>${x.done ? '✔' : '○'} ${esc(ru ? x.task.ru : x.task.en)}</span><b>${x.have}/${x.task.need}</b></li>`).join('')}</ul>
    <h4>${esc(t('evPass'))}</h4><ol class="evPass">${e.rewards.map(r => `<li class="${p.done >= r.at ? 'open' : ''}"><b>${r.at}</b> ${esc(G.money(r.money))} · ${esc(ru ? r.ru : r.keepsake)}</li>`).join('')}</ol>
    ${got ? `<button type="button" class="primary" id="evClaim">${esc(t('evClaim'))} (${got})</button>` : ''}<p class="sub">${esc(t('evFree'))}</p></div>`;
}
function openEvent(): void {
  const draw = (): void => { $('modalBody').innerHTML = eventHtml(); const b = document.getElementById('evClaim'); if (b) b.onclick = () => { const r = claimEvent(s); notify(`${t('evGot')}: ${G.money(r.money)} · ${r.keepsakes.join(', ')}`); G.save(s); header(); draw(); }; };
  draw(); $('modal').classList.remove('phoneMode'); $('modal').hidden = false;
}
/* ---------- photo mode (photo.ts): the view without the interface, a filter, a sticker and a date, saved as a PNG ---------- */
let photo: { filter: Filter; sticker: string } | null = null;
function openPhotoMode(): void {
  const host = document.getElementById('world3d'); if (!host || !worldCtl) return;
  photo = { filter: 'none', sticker: '' }; $('game').classList.add('photoMode'); worldCtl.setFreeCam(true); drawPhotoBar();
}
function closePhotoMode(): void {
  photo = null; $('game').classList.remove('photoMode'); worldCtl?.setFreeCam(false); document.querySelector('.photoBar')?.remove();
  const c = document.querySelector<HTMLCanvasElement>('#world3d canvas'); if (c) c.style.filter = '';
}
function drawPhotoBar(): void {
  const host = document.getElementById('world3d'); if (!host || !photo) return;
  let bar = host.querySelector<HTMLElement>('.photoBar'); if (!bar) { bar = document.createElement('div'); bar.className = 'photoBar'; host.appendChild(bar); }
  const c = host.querySelector<HTMLCanvasElement>('canvas'); if (c) c.style.filter = FILTERS[photo.filter] === 'none' ? '' : FILTERS[photo.filter];
  bar.innerHTML = `<div class="pbRow">${(Object.keys(FILTERS) as Filter[]).map(f => `<button type="button" data-filter="${f}" aria-pressed="${photo!.filter === f}">${esc(t('ph.' + f))}</button>`).join('')}</div>
    <div class="pbRow">${STICKERS.map(x => `<button type="button" data-sticker="${x}" aria-pressed="${photo!.sticker === x}" aria-label="${x || esc(t('ph.none'))}">${x || '∅'}</button>`).join('')}</div>
    <div class="pbRow"><button type="button" data-ph="rotate">🔄</button><button type="button" class="primary" data-ph="save">📷 ${esc(t('ph.save'))}</button><button type="button" data-ph="exit">✕ ${esc(t('ph.exit'))}</button></div>`;
  bar.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(b => { b.onclick = () => { photo!.filter = b.dataset.filter as Filter; drawPhotoBar(); }; });
  bar.querySelectorAll<HTMLButtonElement>('[data-sticker]').forEach(b => { b.onclick = () => { photo!.sticker = b.dataset.sticker ?? ''; drawPhotoBar(); }; });
  bar.querySelectorAll<HTMLButtonElement>('[data-ph]').forEach(b => { b.onclick = () => void (async () => {
    const a = b.dataset.ph;
    if (a === 'exit') return closePhotoMode();
    if (a === 'rotate') return worldCtl?.rotateView(1);
    const shot = worldCtl?.snapshot(); if (!shot || !photo) { notify(t('photoFail')); return; }
    const caption = `${BRAND} · ${s.city} · ${G.dateOf(s).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const url = (await composePhoto(shot, photo.filter, photo.sticker, caption)) ?? shot;
    downloadPhoto(url, `v-russia-${s.day + 1}.png`); notify(t('photoSaved'));
  })(); });
}
/* ---------- settings (settings.ts) ---------- */
let settings = loadSettings(undefined, defaultSettings(undefined, typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches));
function applySettings(): void {
  setColourSafe(settings.colourSafe); document.documentElement.classList.toggle('lessMotion', settings.lessMotion);
  if (worldCtl) { worldCtl.setSaver(settings.graphics === 'low' || settings.lessMotion); worldCtl.setFpsCap(settings.fps); }
}
function openSettings(): void {
  const r = (name: string, v: string, now: string, label: string): string => `<label class="setOpt"><input type="radio" name="${name}" value="${v}"${v === now ? ' checked' : ''}> ${esc(label)}</label>`;
  $('modalBody').innerHTML = `<div class="settings"><h3>⚙️ ${esc(t('stTitle2'))}</h3>
    <fieldset><legend>${esc(t('stGraphics'))}</legend>${r('gfx', 'low', settings.graphics, t('stLow'))}${r('gfx', 'medium', settings.graphics, t('stMedium'))}${r('gfx', 'high', settings.graphics, t('stHigh'))}</fieldset>
    <fieldset><legend>${esc(t('stFps'))}</legend>${r('fps', '30', String(settings.fps), '30')}${r('fps', '60', String(settings.fps), '60')}</fieldset>
    <fieldset><legend>${esc(t('stAccess'))}</legend><label class="setOpt"><input type="checkbox" id="setSafe"${settings.colourSafe ? ' checked' : ''}> ${esc(t('stColourSafe'))}</label><label class="setOpt"><input type="checkbox" id="setMotion"${settings.lessMotion ? ' checked' : ''}> ${esc(t('stLessMotion'))}</label><p class="sub">${esc(t('stTextHint'))}</p></fieldset>
    <h4>⌨️ ${esc(t('keysTitle'))}</h4><ul class="keyList">${HOTKEYS.map(([k, what]) => `<li><kbd>${esc(k)}</kbd> ${esc(t('key.' + k) === 'key.' + k ? what : t('key.' + k))}</li>`).join('')}</ul></div>`;
  const save = (): void => { saveSettings(settings); applySettings(); header(); renderW3Quests(); };
  $('modalBody').querySelectorAll<HTMLInputElement>('input[name="gfx"]').forEach(i => { i.onchange = () => { settings = { ...settings, graphics: i.value as Graphics }; save(); }; });
  $('modalBody').querySelectorAll<HTMLInputElement>('input[name="fps"]').forEach(i => { i.onchange = () => { settings = { ...settings, fps: Number(i.value) as 30 | 60 }; save(); }; });
  ($('setSafe') as HTMLInputElement).onchange = e => { settings = { ...settings, colourSafe: (e.target as HTMLInputElement).checked }; save(); };
  ($('setMotion') as HTMLInputElement).onchange = e => { settings = { ...settings, lessMotion: (e.target as HTMLInputElement).checked }; save(); };
  $('modal').classList.remove('phoneMode'); $('modal').hidden = false;
}
/** The keys of the game (when no pop-up is open and nothing is being typed). */
function hotkey(key: string): boolean {
  const k = key.toLowerCase();
  if (k === 'h') { $('cleanBtn').click(); return true; }
  if (k === 'p') { openPhoneScreen(); return true; }
  if (k === 'm') { void openMetroScreen(); return true; }
  if (k === 'r') { worldCtl?.rotateView(1); return !!worldCtl; }
  if (k === 'f') { if (photo) closePhotoMode(); else openPhotoMode(); return !!worldCtl; }
  if (k === 'b') { if (worldCtl?.inside() === 'home') void toggleFurnish(); else openShopScreen(); return true; }
  return false;
}
/** The stove: the dishes the player can cook, the groceries in the pantry, and bags of groceries to buy. */
function kitchenHtml(): string {
  const k = kitchenOf(s), ru = lang() === 'ru';
  const dish = (r: typeof RECIPES[number]): string => { const why = cannotCook(s, r); return `<li class="dish${why ? ' off' : ''}"><span class="fic" aria-hidden="true">${r.icon}</span><div><b>${esc(ru ? r.ru : r.name)}</b><small>${r.portions} ${esc(t('ckPortions'))} · ${esc(t('ckSkill'))} ${r.skill} · 🍲 +${r.hunger}${r.mood ? ` · 🙂 +${r.mood}` : ''}</small>${why ? `<small class="why">${esc(why)}</small>` : ''}</div><button type="button" class="primary" data-cook="${r.id}"${why ? ' disabled' : ''}>${esc(t('ckCook'))}</button></li>`; };
  return `<div class="kitchen"><h3>🍳 ${esc(t('ckTitle'))}</h3><p class="sub">${esc(t('ckPantry'))}: <b>${k.pantry}</b> · ${esc(t('ckSkill'))}: <b>${k.skill}</b></p>
    <ul class="dishes">${RECIPES.map(dish).join('')}</ul>
    <h4>${esc(t('ckBuy'))}</h4><div class="row">${shopsHere(s).map(w => `<button type="button" class="secondary" data-bag="${w}">${esc(t('ckWhere.' + w))} · ${esc(G.money(BAG_PRICE[w]))}</button>`).join('')}</div><p class="sub">${esc(t('ckBagHint'))}</p></div>`;
}
async function openKitchen(): Promise<void> {
  const draw = (): void => {
    $('modalBody').innerHTML = kitchenHtml();
    $('modalBody').querySelectorAll<HTMLButtonElement>('[data-cook]').forEach(b => { b.onclick = () => { const r = cook(s, b.dataset.cook as string); notify(r.msg); if (r.ok) { worldCtl?.playPose('wash', 2.5); G.save(s); header(); renderW3Quests(); } draw(); }; });
    $('modalBody').querySelectorAll<HTMLButtonElement>('[data-bag]').forEach(b => { b.onclick = () => { const r = buyGroceries(s, b.dataset.bag as Where); notify(r.msg); if (r.ok) { G.save(s); header(); } draw(); }; });
  };
  draw(); $('modal').classList.remove('phoneMode'); $('modal').hidden = false;
}
/** Washing up in the flat: a bucket, or a shower cabin if the player has bought one. Takes no time, once in each part of the day. */
function washUp(): void {
  const placed = (s as unknown as { furn?: { placed?: { id: string }[] } }).furn?.placed ?? [];
  const r = wash(s, placed.some(p => p.id === 'shower-cab') ? 'shower' : 'bucket');
  notify(r.msg); if (!r.ok) return;
  worldCtl?.playPose('wash', 2.6); G.save(s); header(); renderW3Quests();
}
function roomAction(a: string): void {
  if (a === 'wardrobe') return openShopScreen();
  if (a === 'phone') return openPhoneScreen();
  if (a === 'wash') return washUp();
  if (a === 'cook') return void openKitchen();
  if (a === 'tv' || a === 'tea' || a === 'samovar' || a === 'sit') { const r = useObject(s, a === 'samovar' ? 'tea' : a, a === 'samovar'); notify(r.msg); if (r.ok) { if (r.pose) worldCtl?.playPose(r.pose, 3); G.save(s); header(); renderW3Quests(); } return; }
  if (a === 'vote') return void openCivic();
  if (a.startsWith('act:')) return void openActivities(a.slice(4));
  if (!idle) { notify(t('busyNow')); return; }
  worldCtl?.leave(); renderLayers();
  act(a);
}

/** Travel to a place chosen on the map (the offline map or the real one). Only possible while the game is waiting for a choice. */
function travelTo(id: string): void {
  if (worldCtl && id === s.loc && !worldCtl.inside()) { if (!worldCtl.enter()) notify(t('noInside')); else renderLayers(); return; }
  if (!idle || id === s.loc || (id === 'work' && !s.job)) return;
  showScenario(G.startTrip(s, id), [], 'You pull up the map and head out.');
}

/* ---------- the optional real map (see realmap.ts) ---------- */
let realCtl: RealMapHandle | null = null;
let realOn = false;
type View = 'iso' | '3d' | 'real';
let view: View = 'iso';
let worldCtl: import('./world3d').World3dHandle | null = null;
let stopWalk: (() => void) | null = null;                         // the walking controls (walk-ui.ts), while the 3D view is open
let traffic3d = true, names3d = true, boards3d = true, realHouses = false, overview3d = false, furnOn = false;
const VIEW_KEY = 'vrussia_view';

/** The 3D world is the normal view when the device can draw 3D, unless the player has chosen the flat map before or prefers less motion. */
function preferred3d(): boolean {
  let pref: string | null = null;
  try { pref = localStorage.getItem(VIEW_KEY); } catch { /* ignore */ }
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return supportsWebGL() && pref !== 'iso' && !(calm && pref !== '3d');
}

/** Shows one of the three views of the city: the flat illustrated map, the 3D world or the real map. */
function applyView(v: View): void {
  view = v; realOn = v === 'real';
  $('city').hidden = v !== 'iso';
  $('realmap').hidden = v !== 'real';
  $('world3d').hidden = v !== '3d';
  // the 3D city fills the whole screen and everything else floats over it (see the 'immersive' rules in style.css)
  $('game').classList.toggle('immersive', v === '3d'); if (v !== '3d') $('game').classList.remove('drawer');
  renderLayers();
}
function showRealMapView(on: boolean): void { applyView(on ? 'real' : 'iso'); }

let w3City = '';
function close3d(): void {
  closeRealCity();
  stopWalk?.(); stopWalk = null; worldCtl?.destroy(); worldCtl = null;
  $('world3d').innerHTML = '';
  if (view === '3d') applyView('iso');
}
function fail3d(message: string): void { close3d(); notify(`${t('w3Fail')} ${message}`); }
/** Opens the 3D world (a separate download). If the device cannot do 3D, the flat map stays. */
async function open3d(remember = true): Promise<void> {
  if (worldCtl) return;
  if (!supportsWebGL()) { if (remember) notify(t('w3Fail')); return; }
  closeRealCity();
  if (realCtl) closeRealMap();
  applyView('3d');
  $('world3d').innerHTML = `<p class="hint realLoading">${esc(t('w3Loading'))}</p>`;
  try {
    const m = await import('./world3d');
    if (view !== '3d' || realCityClose || realCityOpening) return;   // the player went elsewhere (or into the real city) while it loaded
    const handle = await m.mountWorld3d({ host: $('world3d'), s, onPlace: travelTo, onNpc: talkToNpc, onFail: fail3d, onAction: roomAction, onHover: showHover, onFurnish: furnished, onPickUp: pickedUp, onFurnishFail: (why) => notify(`${t('fuNoFit')}: ${why}`), onSaver: () => { notify(t('saverOn')); renderW3Quests(); }, onLandmark: id => { void import('./landmarks').then(lm => notify(lm.landmarkText(id, lang() === 'ru'))); } });
    w3City = s.city;
    if (view !== '3d' || realCityClose || realCityOpening) { handle.destroy(); if (!realCityClose && !realCityOpening) $('world3d').innerHTML = ''; return; }
    worldCtl = handle; applySettings(); realHouses = false; overview3d = false; buildKey = ''; syncBuild(); void autoRealHouses();
    handle.setLayer('names', names3d); handle.setLayer('boards', boards3d); handle.setLayer('traffic', traffic3d); renderW3Quests();
    $('world3d').querySelector('.realLoading')?.remove();
    void import('./walk-ui').then(w => { if (worldCtl === handle && !stopWalk) stopWalk = w.mountWalk($('world3d'), handle, { here: () => s.loc, go: travelTo, blocked: () => !$('modal').hidden || !idle }); });
    if (remember) { try { localStorage.setItem(VIEW_KEY, '3d'); } catch { /* ignore */ } }
  } catch (e) { fail3d(String((e as Error)?.message || '')); }
}
const rememberIso = (): void => { try { localStorage.setItem(VIEW_KEY, 'iso'); } catch { /* ignore */ } };
function closeRealMap(): void {
  realCtl?.destroy(); realCtl = null;
  $('realmap').innerHTML = '';
  if (view === 'real') showRealMapView(false);
}
function failRealMap(message: string): void {
  closeRealMap();
  notify(`${t('realFail')} ${message}`);
}
/** Opens the real map. The first time it asks, in plain words, because it uses the internet. */
async function openRealMap(): Promise<void> {
  if (realCtl) return;
  closeRealCity();
  if (worldCtl) close3d();
  showRealMapView(true);
  if (!consentGiven()) {
    $('realmap').innerHTML = `<div class="realNotice" role="dialog" aria-labelledby="realNoticeTitle"><h3 id="realNoticeTitle">${esc(t('realNoticeTitle'))}</h3><p>${esc(t('realNoticeBody'))}</p>
      <div class="row"><button class="primary" id="realYes">${esc(t('realLoad'))}</button><button class="ghost" id="realNo">${esc(t('realNotNow'))}</button></div></div>`;
    ($('realYes') as HTMLButtonElement).onclick = () => { giveConsent(); void openRealMap(); };
    ($('realNo') as HTMLButtonElement).onclick = () => closeRealMap();
    return;
  }
  $('realmap').innerHTML = `<p class="hint realLoading">${esc(t('realLoading'))}</p>`;
  try {
    const handle = await mountRealMap({ host: $('realmap'), s, onPlace: travelTo, onNpc: talkToNpc, onFail: failRealMap });
    if (view !== 'real') { handle.destroy(); $('realmap').innerHTML = ''; return; }          // the player went elsewhere while it loaded
    realCtl = handle;
    $('realmap').querySelector('.realLoading')?.remove();
  } catch (e) { failRealMap(String((e as Error)?.message || '')); }
}

function buildMap(): void {
  $('city').innerHTML = cityMarkup(s);
  $('city').querySelectorAll<SVGGElement>('.place').forEach(el => {
    const go = (): void => travelTo(el.dataset.place as string);
    el.onclick = go;
    el.onkeydown = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });
  $('ticker').onclick = () => { newsIdx++; renderOverlays(); };
  // people on the map: click one (or press Enter on it) to say hello
  const npcAt = (e: Event): string | null => ((e.target as Element | null)?.closest('.npc') as SVGGElement | null)?.dataset.npc ?? null;
  $('city').onclick = e => { const id = npcAt(e); if (id) talkToNpc(id); };
  $('city').onkeydown = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { const id = npcAt(e); if (id) { e.preventDefault(); talkToNpc(id); } } };
  renderLayers(); applyLayer();
}

/** Say hello to a person standing on the map. They answer in the chat of the place card, but only if you are at their place. */
function talkToNpc(id: string): void {
  const n = crowdFor(s).find(x => x.id === id);
  if (!n) return;
  if (n.place !== s.loc) { notify(`${n.handle}: ${G.placeById(n.place).n}`); return; }
  chat.push({ from: 'You', text: 'Hello!' }, { from: n.handle, text: n.say ?? chatReply(s.loc, 'hello').text });
  play('pop');
  renderOverlays();
  document.getElementById('placeCard')?.scrollIntoView({ block: 'nearest' });
}

/** The cards on top of the map: quests, the news ticker and the place card with shortcuts for what can be done here. */
function renderOverlays(): void {
  $('quests').innerHTML = quests(s).map(q => `<div class="quest"><span aria-hidden="true">${q.icon}</span><div><b>${esc(q.title)}</b><small>${esc(q.sub)}</small></div></div>`).join('');
  const news = newsItems(s);
  $('ticker').textContent = '📰 ' + news[(s.day + newsIdx) % news.length];
  const here = G.placeById(s.loc);
  const look = PLACE_LOOK[s.loc];
  const mood = moodOf(s);
  if (chatPlace !== s.loc) { chatPlace = s.loc; chat = ambientChat(s.loc); placePulled = 0; }
  pullPlaceChat();
  const typed = (document.getElementById('chatInput') as HTMLInputElement | null)?.value ?? '';
  $('placeCard').innerHTML = `<div class="pcHead"><span class="pcIcon" aria-hidden="true">${look ? look.icon : '📍'}</span><div><b>${esc(placeL(here.n))}</b><small>${esc(look ? flavourL(s.loc, look.flavour) : '')}</small></div><span class="mood" title="${esc(t('mood.' + mood.label))}">${mood.icon} ${esc(t('mood.' + mood.label))}</span>${s.loc !== 'home' ? `<button class="ghost" id="pcHome" title="${t('goHome')}" aria-label="${t('goHome')}">🏠</button>` : ''}</div>
    <ul class="chat" aria-label="Chat" aria-live="polite">${chat.slice(-3).map(c => `<li><b>${esc(c.from)}</b> ${esc(c.text)}</li>`).join('')}</ul>
    <form class="chatForm" id="chatForm"><input id="chatInput" maxlength="80" autocomplete="off" placeholder="${t('chatPh')}" aria-label="${t('chatPh')}"><button class="primary" type="submit">${t('chatSend')}</button></form>
    <div class="pcChips">${placeActions(s).map(a => `<button data-a="${a.id}">${a.icon} ${esc(actionText(a).label)}</button>`).join('')}</div>`;
  (document.getElementById('chatInput') as HTMLInputElement).value = typed;
  $('placeCard').querySelectorAll<HTMLButtonElement>('.pcChips button').forEach(bn => { bn.onclick = () => { if (idle) act(bn.dataset.a as string); }; });
  const home = document.getElementById('pcHome');
  if (home) home.onclick = () => { if (idle) showScenario(G.startTrip(s, 'home'), [], 'You head home.'); };
  $('chatForm').onsubmit = (e: Event) => {
    e.preventDefault();
    const input = document.getElementById('chatInput') as HTMLInputElement;
    const text = cleanMessage(input.value);
    if (!text) return;
    input.value = '';   // clear first: the screen below is redrawn and would otherwise keep the typed text
    chat.push({ from: 'You', text });
    // logged in with a public name: the message goes to the players at this place (the server room of the place); offline, a neighbour answers
    void placeChat(text).then(on => { if (!on) { chat.push(chatReply(s.loc, text)); renderOverlays(); } });
    if (s.tmp.chatDay !== s.day) {   // the first message of the day is a small kindness to yourself
      s.tmp.chatDay = s.day;
      G.apply(s, { stress: -2, ...(Math.random() < 0.25 ? { friends: 1 } : {}) });
      G.save(s); header();
    }
    renderOverlays();
    (document.getElementById('chatInput') as HTMLInputElement).focus();
  };
}

/* ---------- the real city: real streets and places at real scale, with routes and directions (round 153, realworld*.ts) ---------- */
let realCityClose: (() => void) | null = null, realCityOpening = false;
/** Closes the real city if it is open (before another view takes the screen). */
function closeRealCity(): void { if (!realCityClose) return; const c = realCityClose; realCityClose = null; c(); }
async function toggleRealCity(): Promise<void> {
  if (realCityClose) { closeRealCity(); applyView('iso'); return; }
  const osm = await import('./osm');
  const start = async (): Promise<void> => {
    if (realCityOpening) return; realCityOpening = true;
    try {
    osm.giveOsmConsent(); if (worldCtl) close3d(); if (realOn) closeRealMap(); applyView('3d');
    const [lat, lon] = (await import('./realmap')).CITY_CENTERS[s.city] ?? [55.7558, 37.6173];
    const m = await import('./realworld-ui');
    realCityClose = await m.openRealCity($('world3d'), s, { lat, lon }, { notify, act: a => { if (!idle) { notify(t('busyNow')); return; } act(a); }, close: () => void toggleRealCity(), onFail: msg => notify(`${t('realFail')} ${msg}`) });
    renderLayers();
    } finally { realCityOpening = false; }
  };
  if (osm.osmConsentGiven()) return start();
  applyView('3d'); const host = $('world3d'); host.querySelector('.realNotice')?.remove();
  const box = document.createElement('div'); box.className = 'realNotice'; box.setAttribute('role', 'dialog');
  box.innerHTML = `<h3>${esc(t('osmTitle'))}</h3><p>${esc(t('osmBody'))}</p><div class="row"><button class="primary" id="osmYes">${esc(t('osmLoad'))}</button><button class="ghost" id="osmNo">${esc(t('realNotNow'))}</button></div>`;
  host.appendChild(box);
  ($('osmYes') as HTMLButtonElement).onclick = () => { box.remove(); void start(); };
  ($('osmNo') as HTMLButtonElement).onclick = () => { box.remove(); applyView('iso'); };
}

/* ---------- real houses from the map in the 3D city (see osm.ts) ---------- */
async function loadRealHouses(): Promise<void> {
  const ctl = worldCtl; if (!ctl) return;
  notify(t('osmLoading'));
  try {
    const city3d = await (await import('./osm')).loadBuildings(s.city);
    if (worldCtl !== ctl) return;
    ctl.setRealBuildings(city3d); realHouses = true;
  } catch (e) { notify(`${t('osmFail')} ${String((e as Error)?.message || '')}`); }
  renderLayers(); renderW3Quests();
}
/** When the player has already agreed and this city's houses are kept on the device, they appear at once with no request. */
async function autoRealHouses(): Promise<void> {
  try { const osm = await import('./osm'); if (osm.osmConsentGiven() && osm.cachedBuildings(s.city)?.buildings.length) await loadRealHouses(); } catch { /* the invented houses stay */ }
}
async function toggleRealHouses(): Promise<void> {
  if (!worldCtl) return;
  if (realHouses) { realHouses = false; worldCtl.setRealBuildings(null); renderLayers(); renderW3Quests(); return; }
  const osm = await import('./osm');
  if (osm.osmConsentGiven() || osm.cachedBuildings(s.city)?.buildings.length) { osm.giveOsmConsent(); return loadRealHouses(); }
  const host = $('world3d');
  host.querySelector('.realNotice')?.remove();
  const box = document.createElement('div'); box.className = 'realNotice'; box.setAttribute('role', 'dialog');
  box.innerHTML = `<h3>${esc(t('osmTitle'))}</h3><p>${esc(t('osmBody'))}</p><div class="row"><button class="primary" id="osmYes">${esc(t('osmLoad'))}</button><button class="ghost" id="osmNo">${esc(t('realNotNow'))}</button></div>`;
  host.appendChild(box);
  ($('osmYes') as HTMLButtonElement).onclick = () => { osm.giveOsmConsent(); box.remove(); void loadRealHouses(); };
  ($('osmNo') as HTMLButtonElement).onclick = () => box.remove();
}

/* ---------- buy mode in the flat (see furniture.ts and furn-ui.ts) ---------- */
function furnUi(): { notify: (m: string) => void; changed: () => void; hide: () => void } { return { notify, changed: () => { G.save(s); header(); }, hide: () => toggleFurnish(false) }; }
/** The furniture code is a separate download, loaded when the buy mode is first opened (the 3D world needs it too). */
const furnLib = (): Promise<[typeof import('./furniture'), typeof import('./furn-ui')]> => Promise.all([import('./furniture'), import('./furn-ui')]);
function redrawFurn(): void { const box = document.querySelector<HTMLElement>('.furnPanel'); if (box && worldCtl) { const w = worldCtl; void furnLib().then(([, ui]) => { if (worldCtl === w && box.isConnected) ui.drawFurnPanel(box, s, w, furnUi()); }); } }
async function toggleFurnish(on = !furnOn): Promise<void> {
  if (!worldCtl || worldCtl.inside() !== 'home') return;
  furnOn = on; worldCtl.setFurnish(on);
  document.querySelector('.furnPanel')?.remove();
  if (on) { const skel = document.createElement('div'); skel.className = 'furnPanel'; skel.innerHTML = `<div class="furnSkel" aria-busy="true" aria-label="${esc(t('w3Loading'))}">${'<i></i>'.repeat(8)}</div>`; $('world3d').appendChild(skel); const [fm] = await furnLib(); skel.remove(); if (!worldCtl || worldCtl.inside() !== 'home') return; fm.repairFurn(s); const box = document.createElement('div'); box.className = 'furnPanel'; $('world3d').appendChild(box); redrawFurn(); }
  renderLayers();
}
async function furnished(id: string, i: number, j: number, rot: 0 | 1): Promise<void> {
  const [fm] = await furnLib(); const r = fm.placeFurn(s, id, i, j, rot); notify(r.msg);
  if (!r.ok) return;
  G.save(s); header(); worldCtl?.refreshRoom();
  worldCtl?.setPlacing((fm.furnOf(s).stock[id] ?? 0) > 0 ? id : null); redrawFurn();
}
async function pickedUp(uid: number): Promise<void> { const [fm] = await furnLib(); const r = fm.pickUp(s, uid); notify(r.msg); if (!r.ok) return; G.save(s); worldCtl?.refreshRoom(); redrawFurn(); }

/** The to-do chips over the 3D view (the same quests as the list under the map). */
const EMOTE_BUTTONS: [string, string, string][] = [['wave', '👋', 'Wave'], ['laugh', '😂', 'Laugh'], ['dance', '💃', 'Dance'], ['shrug', '🤷', 'Shrug'], ['brr', '🥶', 'Brr'], ['thumbs', '👍', 'Thumbs up'], ['clap', '👏', 'Clap']];
function renderW3Quests(): void {
  const host = document.getElementById('world3d'); if (!host) return;
  let box = host.querySelector<HTMLElement>('.w3Quests');
  if (!worldCtl) { box?.remove(); host.querySelector('.w3Gov')?.remove(); host.querySelector('.w3Emote')?.remove(); host.querySelector('.w3Wheel')?.remove(); host.querySelector('.w3Tools')?.remove(); return; }
  if (!box) { box = document.createElement('div'); box.className = 'w3Quests'; host.appendChild(box); }
  renderW3Needs(); renderW3Tools();
  // the gesture button: a row of seven gestures the player can make
  if (!host.querySelector('.w3Emote')) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'w3Emote'; b.textContent = '😊'; b.setAttribute('aria-label', t('emotes')); b.title = t('emotes');
    const wheel = document.createElement('div'); wheel.className = 'w3Wheel'; wheel.hidden = true; wheel.setAttribute('role', 'group'); wheel.setAttribute('aria-label', t('emotes'));
    wheel.innerHTML = EMOTE_BUTTONS.map(([id, icon, label]) => `<button type="button" data-emote="${id}" aria-label="${label}" title="${label}">${icon}</button>`).join('');
    b.onclick = () => { wheel.hidden = !wheel.hidden; };
    wheel.querySelectorAll<HTMLButtonElement>('[data-emote]').forEach(e => { e.onclick = () => { worldCtl?.emote(e.dataset.emote as never, 3); wheel.hidden = true; }; });
    host.append(b, wheel);
  }
  // this week's elected governor and their policy, as a banner over the city
  let gov = host.querySelector<HTMLElement>('.w3Gov'); if (!gov) { gov = document.createElement('button'); gov.className = 'w3Gov'; gov.setAttribute('type', 'button'); gov.onclick = () => void openCivic(); host.appendChild(gov); }
  { const g = governorOf(s), dec = decreeFor(s); gov.textContent = `🏛️ ${g ? g.name + ': ' : ''}${decreeL(dec.text)}`; }
  let folded = false; try { folded = localStorage.getItem('vrussia_quests_folded') === '1'; } catch { /* storage may be blocked */ }
  box.classList.toggle('folded', folded);
  box.innerHTML = `<button type="button" class="w3Fold" aria-expanded="${!folded}">${folded ? '⌄ ' + esc(t('questsShow')) : '⌃ ' + esc(t('questsHide'))}</button>` + (folded ? '' : quests(s).slice(0, 2).map(q => `<div class="w3q"><span aria-hidden="true">${q.icon}</span><div><b>${esc(q.title)}</b><small>${esc(q.sub)}</small>${q.progress !== undefined ? `<i class="qbar"><em style="width:${Math.round(Math.max(0, Math.min(1, q.progress)) * 100)}%"></em></i>` : ''}</div></div>`).join('')) + (realHouses ? `<div class="w3q osm"><span aria-hidden="true">🏘️</span><div><small>${esc(t('osmCredit'))}</small></div></div>` : '') + (traffic3d && worldCtl.traffic().jam ? `<div class="w3q jam"><span aria-hidden="true">🚗</span><div><b>${esc(t('goSlow'))}</b></div></div>` : '') + (worldCtl.saver() ? `<div class="w3q saver"><span aria-hidden="true">🔋</span><div><b>${esc(t('saverTitle'))}</b></div></div>` : '');
  if (folded) box.innerHTML = box.querySelector('.w3Fold')?.outerHTML ?? '';            // folded: only the button to open them again
  { const f = box.querySelector<HTMLButtonElement>('.w3Fold'); if (f) f.onclick = () => { try { localStorage.setItem('vrussia_quests_folded', f.getAttribute('aria-expanded') === 'true' ? '1' : '0'); } catch { /* storage may be blocked */ } renderW3Quests(); }; }
}
/** The meters in the corner of the 3D view: hunger, energy, hygiene, social contact, health and calm, with the chip for the most urgent trouble. */
function renderW3Needs(): void {
  const host = document.getElementById('world3d'); if (!host) return;
  let box = host.querySelector<HTMLElement>('.w3Needs');
  if (!worldCtl) { box?.remove(); return; }
  if (!box) { box = document.createElement('div'); box.className = 'w3Needs'; host.appendChild(box); }
  const n = needsOf(s), st = worldCtl.status();
  const m = (key: Meter, icon: string, label: string, v: number): string => `<button type="button" class="w3m" data-meter="${key}" title="${esc(label)} ${Math.round(v)}" aria-label="${esc(label)} ${Math.round(v)}"><i aria-hidden="true">${icon}</i><b><em style="width:${Math.max(4, Math.min(100, v))}%;background:${meterColor(v)}"></em></b></button>`;
  const w = warmthMeter(s, !!worldCtl?.inside());
  box.innerHTML = `${st ? `<div class="w3chip">${esc(st)}</div>` : ''}<div class="w3meters">${m('hunger', NEED_INFO.hunger.icon, t('need.hunger'), n.hunger)}${m('energy', '⚡', t('stat.energy'), s.energy)}${m('fun', NEED_INFO.fun.icon, t('need.fun'), n.fun)}${m('social', NEED_INFO.social.icon, t('need.social'), n.social)}${m('hygiene', NEED_INFO.hygiene.icon, t('need.hygiene'), n.hygiene)}${m('bladder', NEED_INFO.bladder.icon, t('need.bladder'), n.bladder)}${m('health', '❤️', t('stat.health'), s.health)}${m('calm', '😌', t('calm'), 100 - s.stress)}${w === null ? '' : m('warmth', '🧣', t('warmth'), w)}</div>`;
  box.querySelectorAll<HTMLButtonElement>('[data-meter]').forEach(b => { b.onclick = () => showMeter(b.dataset.meter as Meter); });
}
/** Why a meter is where it is and the fastest way to fill it. */
const METER_LABEL: Record<Meter, [string, string]> = { hunger: ['🍲', 'need.hunger'], energy: ['⚡', 'stat.energy'], fun: ['🎉', 'need.fun'], social: ['💬', 'need.social'], hygiene: ['🧼', 'need.hygiene'], bladder: ['🚽', 'need.bladder'], health: ['❤️', 'stat.health'], calm: ['😌', 'calm'], warmth: ['🧣', 'warmth'] };
function showMeter(key: Meter): void {
  const a = meterAdvice(s, key), [icon, label] = METER_LABEL[key];
  $('modalBody').innerHTML = `<div class="meterInfo"><h3>${icon} ${esc(t(label))} · ${Math.round(a.value)}</h3><div class="meterBar"><em style="width:${Math.max(3, Math.min(100, a.value))}%;background:${meterColor(a.value)}"></em></div><p>${esc(t(a.why))}</p><p class="fixLine">💡 ${esc(t(a.fix))}</p></div>`;
  $('modal').classList.remove('phoneMode'); $('modal').hidden = false;
}
/** The moodlets: what makes the mood what it is, each with its weight. */
function showMood(): void {
  const list = [...moodlets(s), ...[mealMoodlet(s), teaMoodlet(s)].filter((x): x is { key: string; v: number } => !!x)], sum = list.reduce((n, x) => n + x.v, 0);
  $('modalBody').innerHTML = `<div class="moodInfo"><h3>${esc(t('moodTitle'))} <span class="${sum >= 0 ? 'pos' : 'neg'}">${sum >= 0 ? '+' : ''}${sum}</span></h3>${list.length ? `<ul class="moodlets">${list.map(x => `<li class="${x.v >= 0 ? 'pos' : 'neg'}"><span>${esc(t(x.key))}</span><b>${x.v > 0 ? '+' : ''}${x.v}</b></li>`).join('')}</ul>` : `<p class="hint">${esc(t('moodNone'))}</p>`}</div>`;
  $('modal').classList.remove('phoneMode'); $('modal').hidden = false;
}
/** A short note when a need runs low (once until it is filled again). */
const lowNoted = new Set<string>();
function noteLowNeeds(): void {
  const n = needsOf(s), vals: [Meter, number][] = [['hunger', n.hunger], ['fun', n.fun], ['social', n.social], ['hygiene', n.hygiene], ['bladder', n.bladder], ['energy', s.energy]];
  for (const [k, v] of vals) { if (v <= 15 && !lowNoted.has(k)) { lowNoted.add(k); notify(`${METER_LABEL[k][0]} ${t(METER_LABEL[k][1])} ${t('lowNeed')}: ${t('lowTap')}`); } else if (v > 30) lowNoted.delete(k); }
}
/** The buttons on the right of the 3D view: a photo, turning the view, the keys, and going in or out of the place. */
function renderW3Tools(): void {
  const host = document.getElementById('world3d'); if (!host) return;
  let box = host.querySelector<HTMLElement>('.w3Tools');
  if (!worldCtl) { box?.remove(); return; }
  if (!box) { box = document.createElement('div'); box.className = 'w3Tools'; host.appendChild(box); }
  const inside = worldCtl.inside(), atHome = inside && s.loc === 'home';
  box.innerHTML = `<button type="button" data-tool="photo" title="${esc(t('photo'))}" aria-label="${esc(t('photo'))}">📷</button><button type="button" data-tool="rotate" title="${esc(t('rotate'))}" aria-label="${esc(t('rotate'))}">🔄</button><button type="button" data-tool="keys" title="${esc(t('keysTitle'))}" aria-label="${esc(t('keysTitle'))}">⌨️</button>${atHome ? `<button type="button" data-tool="toilet" title="${esc(t('toilet'))}" aria-label="${esc(t('toilet'))}">🚽</button>` : ''}<button type="button" class="door" data-tool="door">${esc(t(inside ? 'goOutside' : 'goInside'))}</button>`;
  box.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b => { b.onclick = () => {
    const k = b.dataset.tool;
    if (k === 'photo') { openPhotoMode(); return; }
    else if (k === 'rotate') worldCtl?.rotateView(1);
    else if (k === 'keys') $('keysBtn').click();
    else if (k === 'toilet') { const r = useToilet(s); notify(r.msg); if (r.ok) { G.save(s); renderW3Needs(); } }
    else if (k === 'door') { if (worldCtl?.inside()) worldCtl.leave(); else if (!worldCtl?.enter()) notify(t('noInside')); renderLayers(); renderW3Tools(); }
  }; });
}
/** The plot of the house being built shows in the 3D city at its stage, and changes when the builders finish a stage. */
let buildKey = '';
function syncBuild(): void {
  if (!worldCtl) return;
  const v = buildView(s), k = `${v.done}|${v.working}`;
  if (k !== buildKey) { buildKey = k; worldCtl.setBuild(v.done ? { done: v.done, working: v.working } : null); }
}
function updateMap(): void {
  syncBuild();
  renderW3Quests();
  realCtl?.update(s);
  if (worldCtl && w3City && w3City !== s.city) { close3d(); void open3d(false); }       // another city: draw it anew (round 151)
  worldCtl?.update(s);
  updateCity(s);
  renderOverlays();
  applyLayer();
}


const showHelp = (): void => void import('./help').then(h => { $('modalBody').innerHTML = lang() === 'ru' ? h.HELP_RU : h.HELP; $('modal').hidden = false; });

/** The job ladder: the rank, the pay of the rank, and how many more shifts bring the next one. */
function careerHtml(): string {
  if (!s.job) return `<div class="career"><b>💼 ${esc(t('careerTitle'))}</b><div class="sub">${esc(t('careerNone'))}</div></div>`;
  const v = careerView(s), j = G.jobById(s.job), pay = Math.round(j.pay * v.boost);
  const steps = RANKS.map((r, i) => `<li class="${i === v.level ? 'cur' : i < v.level ? 'done' : ''}">${i < v.level ? '✔' : i === v.level ? '▶' : '○'} ${esc(r)} <small>${THRESHOLDS[i]}+ ${esc(t('careerShifts'))}</small></li>`).join('');
  return `<div class="career"><b>💼 ${esc(t('careerTitle'))}: ${esc(j.name)} · ${esc(v.rank)}</b><div class="sub">${esc(t('careerPay'))}: ${esc(G.money(pay))} · ${v.shifts} ${esc(t('careerShifts'))}${v.left === null ? ` · ${esc(t('careerTop'))}` : ` · ${esc(t('careerNext'))}: ${v.left}`}</div><ul class="careerSteps">${steps}</ul></div>`;
}
function profileHtml(): string {
  const tier = s.merit >= 80 ? 'Laureate' : s.merit >= 40 ? 'Nominee' : s.merit >= 15 ? 'Active citizen' : 'Newcomer to the community';
  const done = G.goals.filter(g => g.done(s)).length;
  return `<div class="profile"><div class="row2"><div class="big">${s.icon}</div><div><h2 style="margin:0">${esc(s.name)}</h2><div class="sub">${esc(s.label)} · ${esc(s.city)} · ${esc(s.status)}</div>${dreamOf(s) ? `<div class="sub">${dreamOf(s)!.icon} ${esc(t('dreamGoal'))}: ${esc(dreamOf(s)!.label)} — ${esc(dreamOf(s)!.goal)}${s.flags.dreamDone ? ' ✔' : ''}</div>` : ''}<div class="sub">Home: ${esc(s.home)} · Day ${s.day + 1} · ${esc(t('diff.' + s.diff))}</div></div></div>
    ${careerHtml()}
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
  $('whoPic').innerHTML = bustHtml(s.look, s.worn, s.name);
  $('who').textContent = `${s.icon} ${s.name} — ${s.label}`;
  $('where').textContent = `${s.city} · ${s.job ? `${G.jobById(s.job).name} (${careerView(s).rank})` : svTitle(s) || t('unemployed')} · ${s.status}`;
  document.body.classList.toggle('night', s.slot === 2);                 // the evening: the design's night chrome (theme-kit.css)
  $('date').textContent = `${SEASON_ICON[seasonOf(G.dateOf(s).getMonth() + 1)][G.dateOf(s).getMonth() + 1 >= 9 && G.dateOf(s).getMonth() + 1 <= 11 ? 1 : 0]} ${d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${t('slot.' + s.slot)} · ${t('weather.' + s.weather)} ${(() => { const c = temperatureOf(s); return `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)}°C`; })()}`;
  const shown = G.money(s.money);
  const mb = $('moneyBox');
  if (mb.textContent !== shown) {
    const pm = prevHud.money;
    mb.textContent = shown;
    if (pm !== undefined && pm !== s.money) { mb.classList.remove('gain', 'loss'); void mb.offsetWidth; mb.classList.add(s.money > pm ? 'gain' : 'loss'); }
  }
  $('hud').innerHTML = hudHtml();
  { const m = moodOf(s), cold = coldWord(s); const mp = $('moodPill'); mp.textContent = cold ? `🥶 ${t(cold === 'Freezing' ? 'moodFreezing' : 'moodChilly')}` : `${m.icon} ${t('mood.' + m.label) === 'mood.' + m.label ? m.label : t('mood.' + m.label)}`; mp.className = 'pill mood-' + (m.label === 'Fine' ? 'ok' : m.label === 'Stressed' || m.label === 'Unwell' ? 'bad' : 'warn'); }
  $('achPill').textContent = `🏆 ${s.ach.length}/${G.ACHIEVEMENTS.length}`;
  prevHud = { money: s.money, energy: Math.round(s.energy), health: Math.round(s.health), stress: Math.round(s.stress), rep: Math.round(s.rep) };
  $('stats').innerHTML = STAT.map(([k, , c]) => `<div class="stat"><span>${t('stat.' + k)}<b>${Math.round(s[k] as number)}</b></span><div class="bar"><i style="width:${s[k]}%;background:${c}"></i></div></div>`).join('')
    + NEED_KEYS.map(k => { const v = needsOf(s)[k]; return `<div class="stat need"><span>${NEED_INFO[k].icon} ${t('need.' + k)}<b>${v}</b></span><div class="bar"><i style="width:${v}%;background:${meterColor(v)}"></i></div></div>`; }).join('')
    + `<div class="stat"><span>${t('strikes')}<b>${s.strikes}${s.status !== 'citizen' ? ' / 3' : ''}</b></span></div>`;
  renderW3Needs();

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
  $('checklist').innerHTML = cl.map(c => `<li class="${c.done ? 'done' : ''}">${c.done ? '✔' : '○'} ${esc(checkL(c.item.label))}</li>`).join('');
  $('goals').innerHTML = G.goals.map(g => `<li class="${g.done(s) ? 'done' : ''}">${g.done(s) ? '✔' : '○'} ${g.label}</li>`).join('');
}

/* ---------- the character creator on the title screen ---------- */
let draftLook: Look = { ...DEFAULT_LOOK };
let draftDream = '';
let lookTouched = false;
let draftWorn: Worn = {}, draftSample = '';
/** The shop items behind what a ready-made character wears, so that they are in the wardrobe too. */
const WORN_ITEMS: Record<string, string> = { gloves: 'mittens', bag: 'bag', thermals: 'thermals', sunglasses: 'sunglasses' };   // once the player has chosen anything, picking a character no longer resets the look

function renderCreator(): void {
  $('creatorPreview').innerHTML = `<div class="prevBody">${bodyHtml(draftLook, draftWorn, t('crPreview'))}</div>`;
  const NUMERIC = ['skin', 'hairStyle', 'hairColor', 'accent', 'height', 'bottomColor', 'shoeColor', 'eyes', 'build', 'face', 'eyeColor', 'facial', 'brows', 'nose', 'lips'];
  const swatches = (key: string, colors: string[], label: string): string => `<fieldset><legend>${esc(label)}</legend><div class="swatches">${colors.map((c, k) => `<button type="button" class="swatch" data-look="${key}" data-v="${k}" aria-label="${esc(label)} ${k + 1}" aria-pressed="${(draftLook as unknown as Record<string, unknown>)[key] === k}" style="background:${c}"></button>`).join('')}</div></fieldset>`;
  const choices = (key: string, items: { id: string | number; label: string }[], label: string): string => `<fieldset><legend>${esc(label)}</legend><div class="chipsRow">${items.map(x => `<button type="button" class="chipBtn" data-look="${key}" data-v="${x.id}" aria-pressed="${(draftLook as unknown as Record<string, unknown>)[key] === x.id}">${esc(LG(key, x.label))}</button>`).join('')}</div></fieldset>`;
  const idx = (names: readonly string[]): { id: number; label: string }[] => names.map((n, k) => ({ id: k, label: n }));
  const presets = `<fieldset><legend>${esc(t('crPreset'))}</legend><div class="chipsRow">${GROUPS.map(g => `<button type="button" class="chipBtn" data-group="${g.id}">${esc(L(g.label))}</button>`).join('')}</div><p class="hint">${esc(t('crPresetHint'))}</p></fieldset>`;
  const samples = `<fieldset><legend>${esc(t('crSamples'))}</legend><div class="chipsRow">${SAMPLES.map(x => `<button type="button" class="chipBtn" data-sample="${x.id}" aria-pressed="${draftSample === x.id}">${esc(L(x.label))}</button>`).join('')}</div></fieldset>`;
  const skins = `<fieldset><legend>${esc(t('crSkin'))}</legend><div class="swatches">${SKIN_ORDER.map(k => `<button type="button" class="swatch" data-look="skin" data-v="${k}" aria-label="${esc(t('crSkin'))} ${k + 1}" aria-pressed="${draftLook.skin === k}" style="background:${SKINS[k]}"></button>`).join('')}</div></fieldset>`;
  const eyeCols = `<fieldset><legend>${esc(t('crEyeColour'))}</legend><div class="swatches">${EYE_COLORS.map((c, k) => `<button type="button" class="swatch" data-look="eyeColor" data-v="${k}" aria-label="${esc(eyeL(EYE_COLOR_NAMES[k]))}" aria-pressed="${draftLook.eyeColor === k}" style="background:${c}"></button>`).join('')}</div></fieldset>`;
  const face = choices('build', idx(BUILDS), t('crBuild')) + choices('face', idx(FACES), t('crFace')) + eyeCols + choices('brows', idx(BROWS), t('crBrows')) + choices('nose', idx(NOSES), t('crNose')) + choices('lips', idx(LIPS), t('crLips')) + choices('facial', idx(FACIAL), t('crFacial'))
    + `<fieldset><legend>${esc(t('crFreckles'))}</legend><label class="chk"><input type="checkbox" id="crFreckles" ${draftLook.freckles ? 'checked' : ''}> ${esc(t('crFreckles'))}</label> <label class="chk"><input type="checkbox" id="crRosy" ${draftLook.rosy ? 'checked' : ''}> ${esc(t('crRosy'))}</label></fieldset>`;
  $('creatorControls').innerHTML = samples + presets + skins + face + choices('eyes', idx(EYES), t('crEyes')) + choices('height', idx(HEIGHTS), t('crHeight')) + choices('hairStyle', idx(HAIR_STYLES), t('crHair')) + `<fieldset><legend>${esc(t('crHairColor'))}</legend><div class="swatches">${HAIR_COLORS.map((c, k) => `<button type="button" class="swatch" data-look="hairColor" data-v="${k}" aria-label="${esc(L(HAIR_COLOR_NAMES[k]))}" title="${esc(L(HAIR_COLOR_NAMES[k]))}" aria-pressed="${draftLook.hairColor === k}" style="background:${c}"></button>`).join('')}</div></fieldset>`
    + choices('style', STYLES, t('crTop')) + swatches('accent', ACCENTS, t('crColour'))
    + choices('bottom', BOTTOMS, t('crBottom')) + swatches('bottomColor', BOTTOM_COLORS, t('crColour'))
    + choices('shoes', SHOES, t('crShoes')) + swatches('shoeColor', SHOE_COLORS, t('crColour'))
    + `<fieldset><legend>${esc(t('crDream'))}</legend><div class="dreams">${DREAMS.map(d => `<button type="button" class="dream" data-dream="${d.id}" aria-pressed="${draftDream === d.id}"><span aria-hidden="true">${d.icon}</span><b>${esc(L(d.label))}</b><small>${esc(L(d.blurb))}</small></button>`).join('')}</div></fieldset>`;
  $('creatorControls').querySelectorAll<HTMLButtonElement>('[data-look]').forEach(b => {
    b.onclick = () => {
      const key = b.dataset.look as string, raw = b.dataset.v as string;
      const v = NUMERIC.includes(key) ? Number(raw) : raw;
      draftLook = normalizeLook({ ...draftLook, [key]: v, ...(key === 'facial' ? { beard: v === 3 || v === 4 } : {}) });      // the facial hair choice replaces the old beard box
      lookTouched = true;
      renderCreator();
    };
  });
  $('creatorControls').querySelectorAll<HTMLButtonElement>('[data-group]').forEach(b => { b.onclick = () => { draftLook = applyGroup(draftLook, b.dataset.group as string); lookTouched = true; renderCreator(); }; });
  $('creatorControls').querySelectorAll<HTMLButtonElement>('[data-dream]').forEach(b => { b.onclick = () => { draftDream = draftDream === b.dataset.dream ? '' : (b.dataset.dream as string); renderCreator(); }; });
  ($('crFreckles') as HTMLInputElement).onchange = e => { draftLook = normalizeLook({ ...draftLook, freckles: (e.target as HTMLInputElement).checked }); lookTouched = true; renderCreator(); };
  ($('crRosy') as HTMLInputElement).onchange = e => { draftLook = normalizeLook({ ...draftLook, rosy: (e.target as HTMLInputElement).checked }); lookTouched = true; renderCreator(); };
  $('creatorControls').querySelectorAll<HTMLButtonElement>('[data-sample]').forEach(b => { b.onclick = () => { const x = SAMPLES.find(y => y.id === b.dataset.sample); if (!x) return; draftLook = normalizeLook({ ...DEFAULT_LOOK, ...x.look }); draftWorn = { ...x.worn }; draftSample = x.id; lookTouched = true; const ni = $<HTMLInputElement>('nameInput'); if (!ni.value.trim()) ni.value = x.name; renderCreator(); }; });
}

/** A short pop-up with a plain message. */
function notify(text: string): void {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function renderSoundBtn(): void {
  const on = soundOn();
  const b = $('soundBtn');
  b.textContent = on ? '🔊' : '🔇';
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', t(on ? 'soundOn' : 'soundOff'));
  b.title = t(on ? 'soundOn' : 'soundOff');
}

/** A short pop-up for newly earned achievements. */
function toast(list: G.Achievement[]): void {
  if (!list.length) return;
  play('chime');
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

/** When the player's dream comes true: a thank-you, a small boost to reputation, and a note in the journal. Only once. */
function showDream(label: string | null): void {
  if (!label) return;
  play('chime');
  notify(`${label} · ${t('dreamGoal')} ✔`);
}

/** Starts play; a foreigner who starts at home (prearrival.ts) first prepares the way to Russia. */
function begin(home: boolean): void {
  const go = (): void => { turn(); if (preferred3d()) void open3d(false); }, p = (s as { pre?: { done: boolean } }).pre;
  if (s.status !== 'citizen' && (p ? !p.done : home)) void import('./prearrival-ui').then(m => m.openPre(s, { notify, save: () => G.save(s), arrived: go })); else go();
}
/** The state-service job (service.ts) for the header, when the player has one. */
const svTitle = (x: State): string => { const v = (x as State & { service?: { title?: string; titleRu?: string } }).service; return (lang() === 'ru' ? v?.titleRu : v?.title) ?? ''; };
function turn(): void {
  beat(); noteLowNeeds();
  const news = afterTurn(s);                       // the rules of the turn (turn.ts): bills, holiday progress, the dream, achievements
  for (const line of news.notes) notify(line);
  showDream(news.dream);
  toast(news.achievements);
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

/** The phone: see phone-ui.ts. The game screen only provides what the phone needs from the rest of the page. */
/* The phone and the shop are separate downloads, fetched as soon as the page starts (see boot) so that they are ready when first opened. */
let phoneUi: typeof import('./phone-ui') | null = null, shopUi: typeof import('./shop-ui') | null = null;
const loadPhone = async (): Promise<typeof import('./phone-ui')> => (phoneUi ??= await import('./phone-ui'));
const loadShop = async (): Promise<typeof import('./shop-ui')> => (shopUi ??= await import('./shop-ui'));
function openPhoneScreen(): void {
  if (!phoneUi) { void loadPhone().then(openPhoneScreen); return; }
  phoneUi.openPhone({
    s, host: $('modalBody'), show: () => { $('modal').classList.add('phoneMode'); $('modal').hidden = false; }, close: () => { $('modal').hidden = true; },
    refresh: () => { G.save(s); header(); },
    openShop: () => openShopScreen(),
    startFlow: f => { idle = false; $('actions').innerHTML = ''; openFlow(s, $('stage'), f, () => turn()); },
    flights: () => showBooking(), journal: () => $('logBtn').click(), profile: () => $('profileBtn').click(), help: () => $('helpBtn').click(),
    scenario: sc => { if (idle) showScenario(sc, [], ''); else notify(t('busyNow')); },
  });
}

function openShopScreen(): void {
  if (!shopUi) { void loadShop().then(openShopScreen); return; }
  shopUi.openShop({ s, host: $('modalBody'), show: () => { $('modal').classList.remove('phoneMode'); $('modal').hidden = false; }, refresh: () => { G.save(s); header(); } });
}

/** The bottom menu. Home and Shop and Map use the normal actions, so they only work when the game is waiting for a choice. */
function dock(which: string): void {
  if (which !== 'phone') document.querySelectorAll<HTMLButtonElement>('#dock button').forEach(b => b.classList.toggle('on', b.dataset.dock === which));   // the chosen tab is dark (theme-kit.css)
  if (which === 'phone') return openPhoneScreen();
  if (which === 'home') {
    // as in the design: at home in the 3D city, Home takes you into your room
    if (view === '3d' && worldCtl && s?.loc === 'home' && !worldCtl.inside() && worldCtl.enter()) { renderLayers(); return; }
    document.getElementById('stage')?.scrollIntoView({ block: 'center' }); return focusFirst();
  }
  if (which === 'shop') return openShopScreen();
  if (view === '3d' && worldCtl && !worldCtl.inside()) { overview3d = !overview3d; worldCtl.setOverview(overview3d); document.getElementById('dockMap')?.setAttribute('aria-pressed', String(overview3d)); return; }
  if (!idle) return;
  act('travel');
}

/** A plain warning when stress or health is in the danger zone (see G.vitalsLevel). */
function vitalsWarning(): string {
  const v = G.vitalsLevel(s);
  if (v === 'burnout') return `<p class="err" role="alert">🔥 ${t('burnout')}</p>`;
  if (v === 'weak') return `<p class="warn" role="alert">🩹 ${t('weak')}</p>`;
  return '';
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
  $('stage').innerHTML = `<div class="cat">${t('slot.' + s.slot)}</div><h2>${t('whatNow')}</h2><p>${probs.length ? '⚠ ' + t('warning') + ': ' + probs.join('; ') + '.' : t('pick')}</p>${vitalsWarning()}${recentHtml()}`;
  idle = true;
  $('actions').innerHTML = G.actions.map(a => { const x = actionText(a); return `<button data-a="${a.id}"><span class="ic" aria-hidden="true">${a.icon}</span> <span class="lb">${x.label}</span><small>${x.hint}</small></button>`; }).join('');
  $('actions').querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.onclick = () => act(b.dataset.a as string); });
}

function showBooking(): void {
  idle = false;
  $('actions').innerHTML = '';
  // the booking site is its own download (round 150, to keep the first download under its budget)
  void import('./booking-ui').then(b => b.openBooking(s, $('stage'), () => turn()));
}

function act(id: string): void {
  beforeAction(s, id);                                                              // what the action counts for (turn.ts)
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
  // the scene in Russian where it has been translated (scenes-ru.ts), otherwise in English
  // a choice the player cannot pay for cannot be chosen (found in manual testing, round 150: a lawyer for 15,000 ₽ chosen with −12,634 ₽); one choice always stays open
  const costOf = (c: G.Choice): number => { const m = c.t.match(/\(([\d\s,]+)\s*₽\)/); return Math.max(c.fx?.money && c.fx.money < 0 ? -c.fx.money : 0, m ? Number(m[1].replace(/[\s,]/g, '')) : 0); };
  let cantPay = sc.choices.map(c => { const k = costOf(c); return k > 0 && s.money < k; }); if (cantPay.every(Boolean)) cantPay = cantPay.map(() => false);
  const R = sceneRu(sc.id), home = (x: string): string => x.replace(/\{home\}/g, homeRu(s.home));
  const title = R ? G.fill(home(R.title), s) : G.fill(sc.title, s);
  $('stage').innerHTML = `<div class="cat"><span aria-hidden="true">${ci}</span> ${esc(catRu(sc.cat))}</div><h2>${esc(title)}</h2>${pre ? `<p class="sub">${esc(pre)}</p>` : ''}${noteHtml(notes)}<p>${esc(R ? G.fill(home(R.text), s) : G.fill(sc.text, s))}</p>
    <div class="choices">${sc.choices.map((c, i) => { const poor = cantPay[i]; return `<button data-i="${i}"${poor ? ` disabled title="${esc(t('notEnoughMoney'))}"` : ''}>${esc(R?.choices[i] ? G.fill(home(R.choices[i][0]), s) : G.fill(c.t, s))}${poor ? ` <small>— ${esc(t('notEnoughMoney'))}</small>` : ''}</button>`; }).join('')}</div>`;
  $('stage').querySelectorAll<HTMLButtonElement>('.choices button').forEach(b => {
    b.onclick = () => {
      const res = G.choose(s, sc, Number(b.dataset.i));
      header();
      const after = R?.choices[Number(b.dataset.i)]?.[1];
      $('stage').innerHTML = `<div class="cat">${t('result')}</div><h2>${esc(title)}</h2><p>${esc(after ? G.fill(home(after), s) : res.msg)}</p>${noteHtml(res.notes)}${res.dayNotes.map(t => `<p class="sub">${esc(t)}</p>`).join('')}
        <div class="choices"><button class="primary" id="nextBtn">${t('next')}</button></div>`;
      $('nextBtn').onclick = res.ui === 'booking' ? showBooking : turn;
      play(soundForNotes(res.notes));
      toast(res.unlocked);
      focusFirst();
    };
  });
}

/* ---------- the online part (see cloud.ts): nothing below loads or sends anything unless the owner has set the two VITE_SUPABASE_ values ---------- */
const onlineOn = (): boolean => { const e = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {}; return !!e.VITE_API_URL || (!!e.VITE_SUPABASE_URL && !!e.VITE_SUPABASE_ANON_KEY); };
/** Runs something with the online client, quietly: a failure online must never stop the game. */
async function cloudDo(fn: (c: import('./cloud').OnlineClient) => unknown): Promise<void> {
  if (!onlineOn()) return;
  try { const c = (await import('./cloud')).cloud(); if (c) await fn(c); } catch { /* the game goes on offline */ }
}
let lastBeat = 0;
/* The place card's chat with the real players at the same place (round 150: it only ever answered with invented neighbours). */
let placePulled = 0;
async function placeChat(send?: string): Promise<boolean> {
  if (!onlineOn() || !s) return false;
  try {
    placePulled = Date.now();
    const lines = await (await import('./place-chat')).placeChat(s.city, s.loc, send, notify); if (!lines) return false;
    if (lines.length) { chat.push(...lines); if (!$('game').hidden) renderOverlays(); }
    return true;
  } catch { return false; }
}
/** Looks for new messages at the place now and then (at most every 15 seconds, only while the game is on screen). */
function pullPlaceChat(): void { if (Date.now() - placePulled > 15000 && !$('game').hidden) { placePulled = Date.now(); void placeChat(); } }
if (typeof window !== 'undefined') window.setInterval(pullPlaceChat, 15000);
// the online count and the player's own presence stay fresh while the game is open, not only when a turn is played (round 150: the count was wrong)
if (typeof window !== 'undefined') window.setInterval(() => { if (!$('game').hidden) beat(); }, 61000);
/** Tells the server where the player is, at most once a minute, and only when signed in with a public name. */
function beat(): void {
  if (!onlineOn() || Date.now() - lastBeat < 60000) return;
  lastBeat = Date.now(); const city = s.city, loc = s.loc;
  void cloudDo(async c => { if (c.session()?.username) await c.heartbeat(city, loc); const n = await c.online(); if (n.ok) { $('onlinePill').hidden = false; $('onlinePill').textContent = `● ${(n.data ?? 0).toLocaleString('en-US')} ${t('olOnline')}`; } });
}
/** After a login (or when the page opens with a session): the game on screen must be this account's. If the account has a save on the server and the
   game here is not its own, its own save is loaded; a game never played logged in is taken by an account that has no save yet; a game of another
   account is never uploaded (cloud-sync.ts checks the owner). Found in manual testing (round 150): one account's game was saved over another's. */
async function reconcileAccount(): Promise<void> {
  try {
    const cm = await import('./cloud'); const c = cm.cloud(); const me = c?.session()?.userId; if (!c || !me) return;
    const playing = !$('game').hidden && !!s;
    if (playing && s.owner === me) { void sync?.flush('login'); return; }
    const r = await c.load(); let st = r.ok && r.data ? r.data.state : null;
    if (!(st && st.version === 7 && typeof st.day === 'number' && st.docs)) st = null;
    // round 152: the device keeps one saved game, so it is never replaced by surprise.
    // A guest game being played stays on screen when the account has its own save (the player can load it with Online → Load);
    // a game of this account saved on the device that is further on than the server copy is kept and uploaded.
    if (playing && !s.owner) { if (st) { notify(t('olGuestKept')); return; } s.owner = me; G.save(s); void sync?.flush('login'); return; }
    const local = playing ? null : G.load();
    if (local && local.owner === me && (!st || local.day >= st.day)) { s = local; $('modal').hidden = true; stopOnline?.(); stopOnline = null; show('game'); turn(); notify(t('olYourGame')); void sync?.flush('login'); return; }
    if (st) { st.owner = me; s = st; G.save(s); $('modal').hidden = true; stopOnline?.(); stopOnline = null; show('game'); turn(); notify(t('olYourGame')); }
    else if (playing) notify(t('olNotYourGame'));
  } catch { /* offline: the game goes on here */ }
}
/* automatic saving to the server (cloud-sync.ts), started only when the online part is on */
let sync: import('./cloud-sync').Sync | null = null, homeOfPlayer: (() => { city: string; dwelling: string; design: import('./cloud').HomeDesign; stars: number } | null) | null = null;
async function startCloudSync(): Promise<void> {
  if (!onlineOn() || sync) return;
  try {
    const [cm, cs, hm] = await Promise.all([import('./cloud'), import('./cloud-sync'), import('./homes')]); const c = cm.cloud(); if (!c) return;
    homeOfPlayer = () => { if ($('game').hidden) return null; const x = s as unknown as { furn?: { placed?: { id: string; i: number; j: number; rot: 0 | 1 }[] }; reno?: { wall?: string; floor?: string } }; const it = hm.designOf(s); return { city: s.city, dwelling: hm.dwellingOf(s), design: { placed: (x.furn?.placed ?? []).map(p => ({ id: p.id, i: p.i, j: p.j, rot: p.rot })), wall: x.reno?.wall, floor: x.reno?.floor, w: it.w, d: it.d }, stars: hm.renoStars(s) }; };
    sync = cs.startSync({ cloud: c, state: () => ($('game').hidden ? null : s), home: homeOfPlayer });
    void reconcileAccount();                                            // the page may open with a session already
  } catch { /* the game goes on offline */ }
}
let stopOnline: (() => void) | null = null;
async function openOnline(link = ''): Promise<void> {
  const [cm, ui] = await Promise.all([import('./cloud'), import('./cloud-ui')]);
  if (link) ui.openAuthLink(link);
  stopOnline?.();
  stopOnline = ui.mountOnline($('modalBody'), { cloud: cm.cloud(), state: () => ($('game').hidden ? null : s), notify, home: () => homeOfPlayer?.() ?? null, status: () => sync?.status() ?? null, changed: () => { if (s) { G.save(s); header(); } }, onLoad: st => { const me = cm.cloud()?.session()?.userId; if (me) st.owner = me; s = st; G.save(s); $('modal').hidden = true; stopOnline?.(); stopOnline = null; show('game'); turn(); },
    onSignedIn: () => reconcileAccount(), beforeSignOut: async () => (s ? sync?.flush('logout') : undefined), onSignedOut: () => { lastBeat = 0; $('onlinePill').hidden = true; $('modal').hidden = true; stopOnline?.(); stopOnline = null; show('title'); notify(t('olLoggedOut')); } });
  $('modal').classList.remove('phoneMode'); $('modal').hidden = false;
}

function end(): void {
  const [title, text] = endingText(String(s.over), G.endings[s.over as G.EndingId] || ['The end', '']);
  G.clear();
  { const o = G.origins.find(x => x.label === s.label)?.id ?? '', city = s.city, ending = String(s.over), sc = G.score(s), days = s.day + 1; void cloudDo(async c => { if (c.session()?.username && (await c.submitScore(o, city, ending, sc, days)).ok) notify(t('olScoreSent')); }); }
  recordRun({ name: s.name, origin: G.origins.find(o => o.label === s.label)?.id ?? '', label: s.label, ending: String(s.over), score: G.score(s), days: s.day + 1, citizen: !!s.flags.naturalized || s.status === 'citizen', diff: s.diff, achievements: s.ach.length });
  $('end').innerHTML = `<div class="end"><div class="flagbar"><i></i><i></i><i></i></div><h1>${title}</h1><p>${text}</p>
    <div class="score">${G.score(s)}</div><p class="sub">${t('finalScore')}</p>
    <p>${t('dayWord')} ${s.day + 1} · ${G.money(s.money)} · ${s.strikes} ${t('strikesWord')} · ${s.label}</p>
    <ul style="list-style:none;padding:0">${G.goals.map(g => `<li>${g.done(s) ? '✔' : '○'} ${g.label}</li>`).join('')}</ul>
    <p>🏆 ${t('achievementsWord')}: ${s.ach.length} / ${G.ACHIEVEMENTS.length}</p>
    <div class="achgrid">${G.ACHIEVEMENTS.filter(a => s.ach.includes(a.id)).map(a => `<div class="ach on"><span>${a.icon}</span><b>${esc(a.title)}</b></div>`).join('')}</div>
    <pre class="sharebox" id="shareBox">${esc(shareText({ name: s.name, label: s.label, ending: String(s.over), score: G.score(s), days: s.day + 1, citizen: !!s.flags.naturalized || s.status === 'citizen', achievements: s.ach.length, achievementsTotal: G.ACHIEVEMENTS.length, diff: s.diff }))}</pre>
    <div class="row" style="justify-content:center"><button class="secondary" id="shareBtn">${t('shareBtn')}</button><button class="primary" id="againBtn">${t('playAgain')}</button></div><p class="sub" id="shareMsg" role="status" aria-live="polite"></p></div>`;
  show('end');
  $('shareBtn').onclick = () => { void copyText($('shareBox').textContent || '').then(ok => { $('shareMsg').textContent = ok ? t('shareDone') : t('shareFail'); }); };
  $('againBtn').onclick = () => show('title');
}

/* ---------- boot ---------- */
/** Resolves when the screens fetched after start (the phone and the shop) are ready; tests wait for it. */
export const uiReady = (): Promise<void> => Promise.all([loadPhone(), loadShop()]).then(() => undefined);
export function boot(): void {
  void loadPhone().catch(() => undefined); void loadShop().catch(() => undefined);
  void import('./law').catch(() => undefined); void import('./cyber').then(c => c.registerCyber()).catch(() => undefined); void import('./homelife').catch(() => undefined); void import('./lifeacts').catch(() => undefined);    // the law (law.ts) and life at home (homelife.ts): their daily rules
  document.querySelectorAll<HTMLButtonElement>('#dock button').forEach(b => { b.onclick = () => dock(b.dataset.dock as string); });
  renderSoundBtn();
  $('soundBtn').onclick = () => { setSound(!soundOn()); renderSoundBtn(); play('tap'); };
  $('keysBtn').onclick = () => { $('modalBody').innerHTML = `<h3>${t('keysTitle')}</h3><p>${t('keysBody')}</p>`; $('modal').hidden = false; };
  // every button click makes a small tap sound; buttons with data-sfx="none" stay quiet because they play their own
  document.addEventListener('click', e => { const b = (e.target as HTMLElement | null)?.closest('button'); if (b && !b.closest('#soundBtn') && !b.dataset.sfx) play('tap'); });
  $('plusBtn').onclick = () => { if (idle) act('money'); };
  $('cleanBtn').onclick = () => { const on = !$('game').classList.contains('clean'); $('game').classList.toggle('clean', on); $('cleanBtn').setAttribute('aria-pressed', String(on)); $('cleanBtn').textContent = t(on ? 'cleanOff' : 'clean'); };
  $('hallClear').onclick = () => { clearHall(); renderHall(); };
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
  $('startBtn').onclick = () => { try { if (!localStorage.getItem('vrussia_help_seen')) { localStorage.setItem('vrussia_help_seen', '1'); setTimeout(showHelp, 50); } } catch { /* storage may be blocked */ } s = G.newState(($<HTMLInputElement>('nameInput')).value.trim() || 'Player', selected, ($<HTMLSelectElement>('citySel')).value, ($<HTMLSelectElement>('diffSel')).value as G.Difficulty); s.look = normalizeLook(draftLook); if (draftSample) { s.worn = { ...draftWorn }; for (const [k, v] of Object.entries(draftWorn)) { const id = v === true ? WORN_ITEMS[k] : typeof v === 'string' ? v : ''; if (id) (s.inv ??= {})[id] = 1; } } if (draftDream && !(draftDream === 'citizen' && G.origins.find(o => o.id === selected)?.status === 'citizen')) { s.dream = draftDream; const dr = dreamOf(s); if (dr) G.apply(s, dr.boost); } void cloudDo(c => { const me = c.session()?.userId; if (me && !s.owner) { s.owner = me; G.save(s); } });   // a new game belongs to the account playing it
    show('game'); begin($<HTMLInputElement>('homeStart').checked); };
  $('continueBtn').onclick = () => { const saved = G.load(); if (saved) { s = saved; show('game'); begin(false); notify(t('loaded')); } };
  $('menuBtn').onclick = () => { if (confirm('Leave this game? Progress is saved automatically.')) show('title'); };
  $('moodPill').onclick = showMood; $('moodPill').setAttribute('role', 'button'); $('moodPill').tabIndex = 0;
  $('closeModal').onclick = () => { $('modal').hidden = true; stopOnline?.(); stopOnline = null; };
  $('adsBtn').onclick = () => void openAds();
  $('settingsBtn').onclick = openSettings; applySettings();
  $('drawerBtn').onclick = () => { const on = !$('game').classList.contains('drawer'); $('game').classList.toggle('drawer', on); $('drawerBtn').setAttribute('aria-expanded', String(on)); };
  $('randNameBtn').onclick = () => { $<HTMLInputElement>('nameInput').value = RUSSIAN_NAMES[Math.floor(Math.random() * RUSSIAN_NAMES.length)]; };
  $('onlineBtn').onclick = () => void openOnline(); $('onlineBtn2').onclick = () => void openOnline();
  // a link from one of the game's e-mails (confirm the address, a new password): the token is taken out of the address bar at once
  // (so it is not left in the history or copied by accident), and the Online screen opens on the right form
  const authLink = (): void => { const h = typeof location !== 'undefined' ? location.hash : ''; if (onlineOn() && /^#(verify|reset|forgot)=/.test(h)) { try { history.replaceState(null, '', location.pathname + location.search); } catch { /* old browsers keep it */ } void openOnline(h); } };
  authLink();
  if (typeof window !== 'undefined') window.addEventListener('hashchange', authLink);     // the link opened in a tab where the game was already running (found by playing, round 124)
  void cloudDo(c => c.bump('visits')); void startCloudSync();
  $('logBtn').onclick = () => {
    $('modalBody').innerHTML = '<h3>' + t('journalTitle') + '</h3><ul>' + (s.log.length ? s.log.map(l => `<li><b>${t('dayWord')} ${l.day + 1}</b> — ${esc(l.text)}</li>`).join('') : '<li>' + t('nothingYet') + '</li>') + '</ul>';
    $('modal').hidden = false;
  };
  renderAward();
  $('helpBtn').onclick = showHelp;
  $('profileBtn').onclick = () => { $('modalBody').innerHTML = profileHtml(); $('modal').hidden = false; };

  // when a pop-up opens, focus moves into it; when it closes, focus returns to where it was
  let lastFocus: HTMLElement | null = null;
  new MutationObserver(() => {
    if ($('modal').hidden) $('modal').classList.remove('phoneMode');
    if (!$('modal').hidden) { lastFocus = document.activeElement as HTMLElement | null; $('closeModal').focus(); }
    else if (lastFocus && document.contains(lastFocus)) { lastFocus.focus(); lastFocus = null; }
  }).observe($('modal'), { attributes: true, attributeFilter: ['hidden'] });

  // keyboard: 1-9 pick the numbered option, Enter continues, Escape closes the pop-up
  document.addEventListener('keydown', e => {
    const t = e.target as HTMLElement;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'Escape') { if (photo) closePhotoMode(); $('modal').hidden = true; return; }
    if (!$('modal').hidden || $('game').hidden) return;
    if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[a-z]$/i.test(e.key) && hotkey(e.key)) { e.preventDefault(); return; }
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
    } catch { alert(`That file is not a valid ${BRAND} save for this version.`); }
  };

  renderOrigins();
  show('title');
  refreshLanguage();
  applyTextStep(textStep());
  $('textBtn').onclick = () => { cycleTextStep(); }; $('textBtn2').onclick = () => { cycleTextStep(); };
  $('langBtn').onclick = toggleLanguage; $('langBtn2').onclick = toggleLanguage;
  if (lang() === 'ru') void loadRussian().then(fresh => { if (fresh) refreshLanguage(); });          // the Russian word lists are their own download
}
