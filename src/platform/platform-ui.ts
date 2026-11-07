/* The platform screens and the glue between them and the game: the "More" menu, the privacy banner and the My data page, the first-run tutorial, the
   learning report (print or save as PDF), the checklist, the sources, class mode, the daily game, community packs, the result card, anonymous usage
   numbers and error reports. The game (ui.ts) calls `initPlatform` once and the few `on…` hooks; everything else lives here. The logic of each part
   is in its own file next to this one and is tested without a browser. */
import * as G from '../engine';
import type { State } from '../engine';
import { apiFromEnv } from '../api-client';
import { lang } from '../i18n';
import { download, cardPng, cardSpec } from './card';
import { SOURCES, sourcesHtml, topicsOf, forTags } from './citations';
import { analyticsAllowed, eraseLocalData, exportLocalData, getConsent, needsBanner, setConsent } from './consent';
import * as cls from './classroom';
import * as daily from './daily';
import { applyA11y, loadA11y, saveA11y } from './a11y';
import { needsReview } from './locale-review';
import { LOCALES, currentLocale, isExtra, savedLocale, setLocale, useOverlays } from './locale';
import type { Locale } from './locale';
import { Tour, TOUR_STEPS, findTarget, resetTour, shouldAutoStart } from './onboarding';
import { TEMPLATE, addPack, loadStored, removePack, storedPacks } from './packs';
import { pf } from './pf-text';
import { buildReport, isEmpty, printableHtml } from './report';
import { Flags, Telemetry } from './telemetry';
import type { Entry } from './guide';
import { byId } from './citations';
import { Soundscape, moodFor } from './audio';
import { newWins, nextStep, takeHint } from './ftue';
import { setSfxLevel, setSound, soundOn, play } from '../sound';
import { factor, learn, loadProfile, saveProfile, wellbeing } from './personalise';

export interface Host {
  state: () => State | null;
  notify: (m: string) => void;
  /** Chooses a character, difficulty and city on the title screen. */
  usePreset: (origin: string, diff: string, city: string) => void;
  /** Presses Start. */
  startNow: () => void;
  cycleText: () => number;
  /** Draws the page again in the language now in use. */
  refresh: () => void;
}
export interface Platform {
  openHub: () => void;
  willTour: () => boolean;
  relabel: () => void;
  onRunStart: (s: State) => void;
  onRunEnd: (s: State) => void;
  onScenario: (id: string) => void;
  onError: (msg: string, where: string) => void;
  decorateEnd: (end: HTMLElement, s: State) => void;
  /** Lite mode on: the flat map instead of the 3D world. */
  lite: () => boolean;
  renderTitle: () => void;
  flags: Flags;
  telemetry: Telemetry;
  audio: Soundscape;
  /** One look at the game: the next step, tips, wins and the mood of the sound (runs by itself every 1.5 seconds; tests call it). */
  tick: () => void;
}

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const esc = (s: unknown): string => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const isRu = (): boolean => lang() === 'ru';
const CONTACT = String((import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_CONTACT ?? '');
const BUILD = String((import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_BUILD ?? '2.0');

export function initPlatform(host: Host): Platform {
  const base = apiFromEnv();
  const net: cls.Net = { base };
  const telemetry = new Telemetry({ base, build: BUILD });
  const flags = new Flags(typeof localStorage !== 'undefined' ? localStorage : null, typeof location !== 'undefined' ? location.search : '');
  void flags.refresh(base);
  const saved = savedLocale();
  if (saved && !isExtra(saved)) { if (setLocale(saved)) host.refresh(); }
  else if (saved) void Promise.all([import('./locale-data'), import('./locale-more'), import('./pf-text')]).then(([d, m, p]) => { useOverlays({ ...d.OVERLAY, ...m.MORE_UI }); p.usePfDicts(m.MORE_PF); setLocale(saved); host.refresh(); relabel(); });       // Uzbek, Tajik and Kyrgyz are a small download of their own
  applyA11y(loadA11y());
  try { loadStored(); } catch { /* a stored pack that no longer fits is skipped */ }
  let tour: Tour | null = null;
  const audio = new Soundscape();
  setSfxLevel(audio.mix.sfx);
  let known: Set<string> | null = null;
  const profile = loadProfile();
  let lastSc: { cat: string; before: number } | null = null, learned = 0;
  G.setWeightHook((sc, st, illegal) => factor(profile, sc, st, illegal));
  let pendingDaily: string | null = null;

  const open = (html: string): HTMLElement => {
    const body = $('modalBody'); body.innerHTML = html; $('modal').classList.remove('phoneMode'); $('modal').hidden = false; return body;
  };
  const back = (): string => `<button type="button" class="ghost back" data-pf="hub">← ${esc(pf('hubTitle'))}</button>`;
  const wire = (root: HTMLElement): void => {
    root.querySelectorAll<HTMLElement>('[data-pf]').forEach(b => { b.onclick = () => go(b.dataset.pf as string); });
  };
  const go = (screen: string): void => {
    ({ hub: openHub, lang: openLang, guide: openGuide, sound: openSound, privacy: openPrivacy, terms: openTerms, tour: replayTour, report: openReport, sources: openSources, cls: openClass, daily: openDaily, packs: openPacks, a11y: openA11y } as Record<string, () => void>)[screen]?.();
  };

  /* ---------- the menu ---------- */
  function openHub(): void {
    const items: [string, string, string][] = [
      ['🌍', 'lang', pf('hubLang')], ['💬', 'guide', pf('hubGuide')], ['🔊', 'sound', pf('hubSound')], ['🔒', 'privacy', pf('hubPrivacy')], ['🎓', 'tour', pf('hubTour')], ['📋', 'report', pf('hubReport')], ['📚', 'sources', pf('hubSources')],
      ['🏫', 'cls', pf('hubClass')], ['📅', 'daily', pf('hubDaily')], ['🧩', 'packs', pf('hubPack')], ['♿', 'a11y', pf('hubA11y')], ['📜', 'terms', pf('hubTerms')],
    ];
    const hidden = (k: string): boolean => (k === 'cls' && !flags.isOn('classes')) || (k === 'daily' && !flags.isOn('daily')) || (k === 'packs' && !flags.isOn('packs'));
    wire(open(`<div class="hub"><h3>🧰 ${esc(pf('hubTitle'))}</h3>${items.filter(i => !hidden(i[1])).map(i => `<button type="button" data-pf="${i[1]}"><span aria-hidden="true">${i[0]}</span> ${esc(i[2])}</button>`).join('')}</div>`));
  }

  /* ---------- the guide ---------- */
  async function openGuide(topic = ''): Promise<void> {
    const { ENTRIES, ask } = await import('./guide');
    const ru = isRu(), chip = (e: Entry): string => `<button type="button" class="ghost" data-topic="${esc(e.id)}">${esc(ru ? e.q.ru : e.q.en)}</button>`;
    const body = open(`<div class="hub">${back()}<h3>💬 ${esc(pf('guideTitle'))}</h3>
      <form id="gdForm" class="row"><input class="pfInput" id="gdQ" maxlength="200" placeholder="${esc(pf('guidePh'))}" aria-label="${esc(pf('guideTitle'))}" autocomplete="off"><button type="submit" class="primary">${esc(pf('guideAsk'))}</button></form>
      <div id="gdOut" role="status" aria-live="polite"></div>
      <h4>${esc(pf('guideTopics'))}</h4><div class="hub" id="gdTopics">${ENTRIES.map(chip).join('')}</div></div>`);
    wire(body);
    const show = (e: Entry | undefined, others: Entry[], found: boolean): void => {
      const out = $('gdOut');
      if (!e || !found) { out.innerHTML = `<div class="pfBlock"><p>${esc(pf('guideNone'))}</p>${others.length ? others.map(chip).join('') : ''}</div>`; }
      else out.innerHTML = `<div class="pfBlock"><h4>${esc(ru ? e.q.ru : e.q.en)}</h4><p>${esc(ru ? e.a.ru : e.a.en)}</p><p class="sub">${esc(pf('guideFrom'))}. ${esc(pf('guideSure'))}</p>${e.src.length ? srcHtml(e.src.map(byId).filter((x): x is import('./citations').Source => !!x)) : ''}${others.length ? `<p class="sub">${esc(pf('guideRelated'))}:</p>${others.map(chip).join('')}` : ''}</div>`;
      out.querySelectorAll<HTMLElement>('[data-topic]').forEach(b => { b.onclick = () => { const t = ENTRIES.find(x => x.id === b.dataset.topic); show(t, [], true); }; });
    };
    $('gdForm').onsubmit = ev => { ev.preventDefault(); const q = ($('gdQ') as HTMLInputElement).value.trim(); if (!q) return; const a = ask(q); telemetry.track('guide_ask', { found: a.found, topic: a.entry?.id ?? 'none' }); show(a.entry, a.others, a.found); };
    body.querySelectorAll<HTMLElement>('#gdTopics [data-topic]').forEach(b => { b.onclick = () => { const t = ENTRIES.find(x => x.id === b.dataset.topic); show(t, [], true); }; });
    if (topic) show(ENTRIES.find(x => x.id === topic), [], true);
  }

  /* ---------- sound and music ---------- */
  function openSound(): void {
    const m = audio.mix;
    const body = open(`<div class="hub">${back()}<h3>🔊 ${esc(pf('hubSound'))}</h3>
      <label class="setOpt"><input type="checkbox" id="snSfx"${soundOn() ? ' checked' : ''}> ${esc(pf('sndSfx'))}</label>
      <label class="setOpt">${esc(pf('sndSfxVol'))} <input type="range" id="snSfxV" min="0" max="100" value="${Math.round(m.sfx * 100)}"></label>
      <label class="setOpt"><input type="checkbox" id="snMus"${m.musicOn ? ' checked' : ''}> ${esc(pf('sndMusic'))}</label>
      <label class="setOpt">${esc(pf('sndMusicVol'))} <input type="range" id="snMusV" min="0" max="100" value="${Math.round(m.music * 100)}"></label>
      <p class="sub">${esc(pf('sndNote'))}</p></div>`);
    wire(body);
    ($('snSfx') as HTMLInputElement).onchange = e => { setSound((e.target as HTMLInputElement).checked); if ((e.target as HTMLInputElement).checked) play('pop'); };
    ($('snSfxV') as HTMLInputElement).oninput = e => { const v = Number((e.target as HTMLInputElement).value) / 100; audio.setMix({ sfx: v }); setSfxLevel(v); };
    ($('snSfxV') as HTMLInputElement).onchange = () => play('pop');
    ($('snMus') as HTMLInputElement).onchange = e => { audio.start(); audio.setMix({ musicOn: (e.target as HTMLInputElement).checked }); };
    ($('snMusV') as HTMLInputElement).oninput = e => { audio.start(); audio.setMix({ music: Number((e.target as HTMLInputElement).value) / 100 }); };
  }

  /* ---------- the first minutes: the next step, tips, wins, and the mood of the sound ---------- */
  const startAudio = (): void => { if (soundOn()) audio.start(); };
  document.addEventListener('pointerdown', startAudio, { once: true }); document.addEventListener('keydown', startAudio, { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) audio.pause(); else if (soundOn()) audio.resume(); });
  function tick(): void {
    const s = host.state(), bar = document.getElementById('nextStep');
    if (!soundOn()) audio.pause(); else if (!document.hidden) audio.resume();
    if (!s) { if (bar) bar.hidden = true; known = null; if (audio.started) audio.setMood('calm'); return; }
    const n = s.over ? null : nextStep(s);
    if (bar) {
      bar.hidden = !n;
      if (n) { const ru = isRu(); bar.innerHTML = `🎯 <b>${esc(pf('nextLabel'))}:</b> ${esc(ru ? n.label.ru : n.label.en)}${n.daysLeft !== null ? ` <span class="sub">(${n.daysLeft} ${esc(pf('nextDays'))})</span>` : ''} <button type="button" class="ghost" data-why="${esc(n.topic)}">${esc(pf('nextWhy'))}</button>`; bar.querySelector<HTMLElement>('[data-why]')!.onclick = e => openGuide((e.currentTarget as HTMLElement).dataset.why); }
    }
    if (audio.started && soundOn()) { audio.setMood(moodFor({ loc: s.loc, slot: s.slot, weather: s.weather, stress: s.stress, health: s.health, energy: s.energy, strikes: s.strikes }), s.weather); audio.setMuffle(s.health < 25); }
    if (document.getElementById('tour') || !$('modal').hidden) return;
    const r = newWins(s, known); known = r.known;
    for (const w of r.wins) { host.notify(`🎉 ${w.first ? pf('winFirst') : pf('winDone')}: ${isRu() ? w.text.ru : w.text.en}`); if (soundOn()) audio.stinger(w.first ? 'win' : 'level'); telemetry.track('win', { id: w.id }); }
    const h = r.wins.length ? null : takeHint(s);
    if (h) { host.notify(`💡 ${pf('hintTitle')}: ${isRu() ? h.text.ru : h.text.en}`); if (soundOn()) audio.stinger('warn'); }
  }
  if (typeof setInterval === 'function') setInterval(tick, 1500);

  /* ---------- language ---------- */
  function openLang(): void {
    const cur = currentLocale();
    const body = open(`<div class="hub">${back()}<h3>🌍 ${esc(pf('hubLang'))}</h3><fieldset class="pfBlock">${LOCALES.map(l => `<label class="setOpt"><input type="radio" name="loc" value="${l.id}"${l.id === cur ? ' checked' : ''}> ${esc(l.native)} <small>${esc(l.english)}</small></label>`).join('')}</fieldset><p class="sub">${esc(pf('langNote'))}</p>${needsReview(cur) ? `<p class="sub" id="langUnreviewed">${esc(pf('langUnreviewed'))}</p>` : ''}</div>`);
    wire(body);
    body.querySelectorAll<HTMLInputElement>('input[name="loc"]').forEach(i => { i.onchange = () => { setLocale(i.value as Locale); location.reload(); }; });       // the page reloads and boot fetches the language it needs
  }

  /* ---------- privacy, terms, my data ---------- */
  async function openTerms(): Promise<void> { const p = await import('./policy'); wire(open(back() + p.policyHtml(p.terms(isRu(), CONTACT), esc))); }
  async function openPrivacy(): Promise<void> {
    const p = await import('./policy'), c = getConsent();
    const body = open(`<div class="hub">${back()}</div>${p.policyHtml(p.privacyPolicy(isRu(), CONTACT), esc)}
      <div class="pfBlock"><h4>🔐 ${esc(pf('myData'))}</h4>
        <label class="setOpt"><input type="checkbox" id="pfAn"${c?.analytics ? ' checked' : ''}> ${esc(pf('analyticsOn'))}</label><p class="sub">${esc(pf('analyticsNote'))}</p>
        <div class="row"><button type="button" id="pfDl">${esc(pf('dlLocal'))}</button><button type="button" id="pfEr">${esc(pf('eraseLocal'))}</button>${base ? `<button type="button" id="pfSv">${esc(pf('dlServer'))}</button>` : ''}</div>
        ${base ? `<p class="sub">${esc(pf('deleteAcc'))}</p>` : ''}<p class="pfMsg" id="pfMsg" role="status" aria-live="polite"></p></div>
      <p><button type="button" class="ghost" data-pf="terms">${esc(pf('hubTerms'))}</button></p>`);
    wire(body);
    const msg = (t: string, ok = true): void => { const m = $('pfMsg'); m.textContent = t; m.className = 'pfMsg ' + (ok ? 'ok' : 'bad'); };
    ($('pfAn') as HTMLInputElement).onchange = e => { setConsent((e.target as HTMLInputElement).checked); };
    $('pfDl').onclick = () => download(new Blob([JSON.stringify(exportLocalData(), null, 2)], { type: 'application/json' }), 'vrussia-my-data.json');
    $('pfEr').onclick = () => { if (confirm(pf('eraseSure'))) { msg(`${pf('erased')}: ${eraseLocalData()}`); } };
    const sv = document.getElementById('pfSv');
    if (sv) sv.onclick = async () => {
      try {
        const r = await fetch(base + '/api/account/export', { credentials: 'include' });
        if (!r.ok) { msg(r.status === 401 ? pf('classLogin') : String(r.status), false); return; }
        download(new Blob([JSON.stringify(await r.json(), null, 2)], { type: 'application/json' }), 'vrussia-account-data.json');
      } catch { msg('offline', false); }
    };
  }
  function showBanner(): void {
    if (document.getElementById('consent') || !needsBanner()) return;
    const el = document.createElement('div'); el.id = 'consent'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', pf('cbTitle'));
    el.innerHTML = `<h2>🔒 ${esc(pf('cbTitle'))}</h2><p>${esc(pf('cbBody'))}</p><div class="row"><button type="button" class="primary" id="cbYes">${esc(pf('cbYes'))}</button><button type="button" id="cbNo">${esc(pf('cbNo'))}</button><button type="button" class="ghost" id="cbMore">${esc(pf('cbMore'))}</button></div>`;
    document.body.appendChild(el);
    $('cbYes').onclick = () => { setConsent(true); el.remove(); };
    $('cbNo').onclick = () => { setConsent(false); el.remove(); };
    $('cbMore').onclick = () => void openPrivacy();
  }

  /* ---------- the tutorial ---------- */
  function endTour(): void { document.querySelectorAll('.tourHi').forEach(e => e.classList.remove('tourHi')); document.getElementById('tour')?.remove(); document.removeEventListener('keydown', tourKey, true); }
  function tourKey(e: KeyboardEvent): void { if (e.key === 'Escape' && tour?.active && document.getElementById('tour')) { e.stopPropagation(); tour.skip(); telemetry.track('tour_skip', { step: tour.step }); endTour(); } }
  function drawTour(): void {
    document.querySelectorAll('.tourHi').forEach(e => e.classList.remove('tourHi'));
    const step = tour?.current; if (!tour || !step) { endTour(); return; }
    const t = tour;
    let el = document.getElementById('tour');
    if (!el) { el = document.createElement('div'); el.id = 'tour'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false'); el.setAttribute('aria-labelledby', 'tourT'); document.body.appendChild(el); document.addEventListener('keydown', tourKey, true); }
    el.innerHTML = `<div class="dots" aria-hidden="true">${TOUR_STEPS.map((_, i) => `<i class="${i === t.step ? 'on' : ''}"></i>`).join('')}</div><h2 id="tourT">${esc(pf(`tour.${step.key}.t`))} <small class="sub">${t.step + 1} ${esc(pf('tourOf'))} ${t.total}</small></h2><p>${esc(pf(`tour.${step.key}.b`))}</p>
      <div class="row"><button type="button" class="ghost" id="tourSkip">${esc(pf('tourSkip'))}</button><span>${t.step > 0 ? `<button type="button" id="tourBack">${esc(pf('tourBack'))}</button> ` : ''}<button type="button" class="primary" id="tourNext">${esc(pf(t.last ? 'tourDone' : 'tourNext'))}</button></span></div>`;
    const target = findTarget(step.sel); target?.classList.add('tourHi'); try { target?.scrollIntoView({ block: 'nearest', behavior: 'auto' }); } catch { /* ignore */ }
    $('tourSkip').onclick = () => { t.skip(); telemetry.track('tour_skip', { step: t.step }); endTour(); };
    $('tourNext').onclick = () => { const had = t.last; t.next(); if (had) telemetry.track('tour_done'); drawTour(); };
    document.getElementById('tourBack')?.addEventListener('click', () => { t.back(); drawTour(); });
    ($('tourNext') as HTMLButtonElement).focus({ preventScroll: true });
  }
  function startTour(): void { endTour(); tour = new Tour(); drawTour(); }
  function replayTour(): void { resetTour(); $('modal').hidden = true; if ($('game').hidden) { host.notify(pf('hubTour') + ': ' + pf('tourSkip').toLowerCase() + ' → ' + pf('start')); } else startTour(); }

  /* ---------- the learning report, the checklist, the result card ---------- */
  const labels = (): import('./report').Labels => ({ title: pf('repTitle'), done: pf('repDone'), mistakes: pf('repMistakes'), next: pf('repNext'), sources: pf('repSources'), day: lang() === 'ru' ? 'День' : 'Day', none: '—', note: pf('srcNote'), never: pf('srcNever'), checked: pf('srcChecked'), old: pf('srcOld'), open: pf('srcOpen') });
  const srcHtml = (list: readonly import('./citations').Source[]): string => sourcesHtml(list, isRu(), { never: pf('srcNever'), checked: pf('srcChecked'), old: pf('srcOld'), open: pf('srcOpen') }, esc);
  function printReport(s: State): void {
    const rep = buildReport(s); rep.score = G.score(s);
    const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    f.onload = () => { try { f.contentWindow?.focus(); f.contentWindow?.print(); } catch { /* the browser refused to print */ } setTimeout(() => f.remove(), 60_000); };
    f.srcdoc = printableHtml(rep, isRu(), labels(), esc, srcHtml);
    document.body.appendChild(f);
    telemetry.track('report_print');
  }
  async function saveCard(s: State): Promise<void> {
    const blob = await cardPng(cardSpec({ name: s.name, label: s.label, ending: s.over ? String(s.over) : 'time', score: G.score(s), days: s.day + 1, citizen: !!s.flags.naturalized || s.status === 'citizen', achievements: s.ach.length, achievementsTotal: G.ACHIEVEMENTS.length, diff: s.diff }, isRu()));
    if (blob) { download(blob, 'vrussia-result.png'); telemetry.track('card_save'); } else host.notify('Could not draw the card in this browser.');
  }
  function openReport(): void {
    const s = host.state();
    if (!s) { wire(open(`<div class="hub">${back()}<p>${esc(pf('repNone'))}</p></div>`)); return; }
    const rep = buildReport(s), ru = isRu(), txt = (i: { en: string; ru: string }): string => esc(ru ? i.ru : i.en);
    const body = open(`<div class="hub">${back()}<h3>📋 ${esc(pf('repTitle'))}</h3>${isEmpty(rep) ? `<p class="sub">${esc(pf('repNone'))}</p>` : ''}
      <div class="pfBlock"><h4>✔ ${esc(pf('repDone'))}</h4><ul class="pfList ok">${rep.done.map(i => `<li>${txt(i)}</li>`).join('') || '<li>—</li>'}</ul></div>
      <div class="pfBlock"><h4>⚠ ${esc(pf('repMistakes'))}</h4><ul class="pfList">${rep.mistakes.map(i => `<li>${txt(i)}</li>`).join('') || '<li>—</li>'}</ul></div>
      <div class="pfBlock"><h4>☐ ${esc(pf('repNext'))}</h4><ul class="pfList">${rep.steps.map(i => `<li>${i.done ? '☑' : '☐'} ${txt(i)}</li>`).join('')}</ul></div>
      <div class="pfBlock"><h4>📚 ${esc(pf('repSources'))}</h4>${srcHtml(rep.sources)}</div>
      <div class="row"><button type="button" class="primary" id="pfPrint">🖨 ${esc(pf('repPrint'))}</button>${flags.isOn('share_card') ? `<button type="button" id="pfCard">🖼 ${esc(pf('repCard'))}</button>` : ''}</div></div>`);
    wire(body); telemetry.track('report_view');
    $('pfPrint').onclick = () => printReport(s);
    document.getElementById('pfCard')?.addEventListener('click', () => void saveCard(s));
  }
  function openSources(): void {
    const s = host.state(), mine = s ? new Set(forTags(topicsOf(s)).map(x => x.id)) : new Set<string>();
    const list = [...SOURCES].sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)));
    wire(open(`<div class="hub">${back()}<h3>📚 ${esc(pf('srcTitle'))}</h3><p class="sub">${esc(pf('srcNote'))}</p>${srcHtml(list)}</div>`));
  }

  /* ---------- class mode ---------- */
  function openClass(): void {
    const m = cls.membership();
    const body = open(`<div class="hub">${back()}<h3>🏫 ${esc(pf('classTitle'))}</h3>
      ${m ? `<div class="pfBlock"><h4>${esc(pf('classIn'))}: ${esc(m.name)}</h4>${m.assignment.note ? `<p>${esc(pf('classAssign'))}: ${esc(m.assignment.note)}</p>` : ''}<p class="sub">${esc(m.nickname)} · ${esc(m.code)}</p><button type="button" id="clLeave">${esc(pf('classLeave'))}</button></div>`
      : `<div class="pfBlock"><h4>${esc(pf('classJoin'))}</h4><label>${esc(pf('classCode'))}<input class="pfInput" id="clCode" maxlength="6" autocomplete="off" autocapitalize="characters"></label><label>${esc(pf('classNick'))}<input class="pfInput" id="clNick" maxlength="20" autocomplete="off"></label><button type="button" class="primary" id="clJoin">${esc(pf('classJoinBtn'))}</button></div>`}
      <p class="pfMsg" id="clMsg" role="status" aria-live="polite"></p>
      <details class="pfBlock"><summary>${esc(pf('classTeacher'))}</summary><div id="clTeach"></div></details></div>`);
    wire(body);
    const msg = (t: string, ok = true): void => { const e = $('clMsg'); e.textContent = t; e.className = 'pfMsg ' + (ok ? 'ok' : 'bad'); };
    document.getElementById('clLeave')?.addEventListener('click', () => { cls.leave(); openClass(); });
    document.getElementById('clJoin')?.addEventListener('click', async () => {
      const r = await cls.join(net, ($('clCode') as HTMLInputElement).value, ($('clNick') as HTMLInputElement).value);
      if (!r.ok) { msg(r.msg === 'no such class' ? pf('classBad') : r.msg, false); return; }
      applyAssignment(r.data!.assignment); telemetry.track('class_join'); openClass();
    });
    drawTeacher($('clTeach'));
  }
  async function drawTeacher(root: HTMLElement): Promise<void> {
    if (!base) { root.innerHTML = `<p class="sub">${esc(pf('classLogin'))}</p>`; return; }
    const list = await cls.myClasses(net);
    if (!list.ok) { root.innerHTML = `<p class="sub">${esc(pf('classLogin'))}</p>`; return; }
    root.innerHTML = `<h4>${esc(pf('classNew'))}</h4><label>${esc(pf('className'))}<input class="pfInput" id="tcName" maxlength="60"></label><label>${esc(pf('classNote'))}<input class="pfInput" id="tcNote" maxlength="300"></label>
      <label>${esc(G.origins.length ? 'Character' : '')}<select id="tcOrigin" class="pfInput"><option value="">—</option>${G.origins.map(o => `<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('')}</select></label>
      <button type="button" class="primary" id="tcMake">${esc(pf('classNew'))}</button><p class="pfMsg" id="tcMsg" role="status" aria-live="polite"></p>
      ${(list.data ?? []).map(c => `<div class="pfBlock"><h4>${esc(c.name)} <span class="codeBig">${esc(c.code)}</span></h4><p class="sub">${c.results} ${esc(pf('classPupils').toLowerCase())}</p><button type="button" data-res="${esc(c.code)}">${esc(pf('classPupils'))}</button> <button type="button" class="ghost" data-del="${esc(c.code)}">${esc(pf('packRemove'))}</button><div data-out="${esc(c.code)}"></div></div>`).join('')}`;
    $('tcMake').onclick = async () => {
      const name = ($('tcName') as HTMLInputElement).value, note = ($('tcNote') as HTMLInputElement).value.trim(), origin = ($('tcOrigin') as HTMLSelectElement).value;
      const r = await cls.createClass(net, name, { ...(note ? { note } : {}), ...(origin ? { origin } : {}) });
      const m = $('tcMsg'); m.textContent = r.ok ? `${pf('classMade')} ${r.data!.code}` : r.msg; m.className = 'pfMsg ' + (r.ok ? 'ok' : 'bad');
      if (r.ok) setTimeout(() => void drawTeacher(root), 1500);
    };
    root.querySelectorAll<HTMLButtonElement>('[data-res]').forEach(b => { b.onclick = async () => {
      const code = b.dataset.res as string, out = root.querySelector<HTMLElement>(`[data-out="${code}"]`) as HTMLElement, r = await cls.results(net, code);
      if (!r.ok || !r.data) { out.textContent = r.msg; return; }
      out.innerHTML = r.data.length ? `<table class="pfTable"><tr><th>#</th><th>${esc(pf('classNick'))}</th><th>${esc(pf('repDone'))}</th><th>${esc(pf('repMistakes'))}</th><th>🏆</th></tr>${r.data.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.nickname)}</td><td>${x.learned.done.length}</td><td>${x.learned.mistakes.length}</td><td class="n">${x.score}</td></tr>`).join('')}</table><button type="button" class="ghost" data-csv="${esc(code)}">CSV</button>` : `<p class="sub">${esc(pf('classNoResults'))}</p>`;
      out.querySelector<HTMLElement>('[data-csv]')?.addEventListener('click', () => download(new Blob([cls.resultsCsv(r.data!)], { type: 'text/csv' }), `class-${code}.csv`));
    }; });
    root.querySelectorAll<HTMLButtonElement>('[data-del]').forEach(b => { b.onclick = async () => { if (confirm(pf('eraseSure'))) { await cls.removeClass(net, b.dataset.del as string); void drawTeacher(root); } }; });
  }
  function applyAssignment(a: cls.Assignment): void {
    if (a.origin || a.diff || a.city) host.usePreset(a.origin ?? G.origins[0].id, a.diff ?? 'normal', a.city ?? '');
  }

  /* ---------- the daily game, the season ---------- */
  const todayPreset = (): daily.Preset => daily.presetFor(daily.dateKey(), G.origins.map(o => o.id), G.CITIES);
  function dailyHtml(): string {
    const p = todayPreset(), r = daily.record(), season = daily.seasonOfDate(), o = G.origins.find(x => x.id === p.origin);
    return `${season ? `<p class="season">🎉 ${esc(pf('dailySeason'))}: <b>${esc(isRu() ? season.ru : season.en)}</b> — ${esc(isRu() ? season.noteRu : season.noteEn)}</p>` : ''}
      <p><b>📅 ${esc(pf('dailyToday'))}</b> (${esc(p.date)}): ${esc(o?.icon ?? '')} ${esc(o?.label ?? p.origin)} · ${esc(p.diff)} · ${esc(p.city)}</p>
      <p class="sub">${esc(pf('dailyStreak'))}: ${daily.liveStreak(r, p.date)}${r.best[p.date] ? ` · ${esc(pf('dailyBest'))}: ${r.best[p.date]}` : ''}</p>
      <button type="button" class="primary" id="dailyPlay">${esc(pf('dailyPlay'))}</button>`;
  }
  function renderTitle(): void {
    const box = document.getElementById('dailyBox'); if (!box) return;
    const m = cls.membership();
    box.hidden = !flags.isOn('daily') && !m;
    box.innerHTML = (m ? `<p class="season">🏫 ${esc(m.name)} — ${esc(m.nickname)}${m.assignment.note ? ': ' + esc(m.assignment.note) : ''}</p>` : '') + (flags.isOn('daily') ? dailyHtml() : '');
    document.getElementById('dailyPlay')?.addEventListener('click', playDaily);
  }
  function playDaily(): void {
    const p = todayPreset(); pendingDaily = p.date; host.usePreset(p.origin, p.diff, p.city); $('modal').hidden = true; host.startNow();
  }
  function openDaily(): void {
    const body = open(`<div class="hub">${back()}<h3>📅 ${esc(pf('dailyTitle'))}</h3><div class="pfBlock">${dailyHtml()}</div></div>`);
    wire(body); document.getElementById('dailyPlay')?.addEventListener('click', playDaily);
  }

  /* ---------- community packs ---------- */
  function openPacks(): void {
    const packs = storedPacks();
    const body = open(`<div class="hub">${back()}<h3>🧩 ${esc(pf('packTitle'))}</h3><p>${esc(pf('packBody'))}</p>
      <label class="pfBlock">${esc(pf('packChoose'))}<input type="file" id="pkFile" accept=".json,application/json" class="pfInput"></label>
      <div class="row"><button type="button" id="pkTpl">${esc(pf('packTemplate'))}</button></div><div id="pkMsg" class="pfMsg" role="status" aria-live="polite"></div>
      ${packs.length ? `<h4>${esc(pf('packLoaded'))}</h4><ul class="pfList">${packs.map(p => `<li>${esc(p.name)} (${p.scenarios.length}) <button type="button" class="ghost" data-rm="${esc(p.id)}">${esc(pf('packRemove'))}</button></li>`).join('')}</ul>` : ''}</div>`);
    wire(body);
    $('pkTpl').onclick = () => download(new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: 'application/json' }), 'vrussia-pack-template.json');
    ($('pkFile') as HTMLInputElement).onchange = async e => {
      const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
      const r = addPack(await f.text()), m = $('pkMsg');
      if (r.ok) { m.className = 'pfMsg ok'; m.textContent = `${pf('packOk')}: ${r.count}`; telemetry.track('pack_add', { n: r.count }); setTimeout(openPacks, 900); }
      else { m.className = 'pfMsg bad'; m.innerHTML = `${esc(pf('packBad'))}:<ul>${r.problems.slice(0, 12).map(p => `<li>${esc(p)}</li>`).join('')}</ul>`; }
    };
    body.querySelectorAll<HTMLButtonElement>('[data-rm]').forEach(b => { b.onclick = () => { removePack(b.dataset.rm as string); openPacks(); }; });
  }

  /* ---------- accessibility and speed ---------- */
  function openA11y(): void {
    const a = loadA11y();
    const body = open(`<div class="hub">${back()}<h3>♿ ${esc(pf('hubA11y'))}</h3>
      <label class="setOpt"><input type="checkbox" id="a11Lite"${a.lite ? ' checked' : ''}> ${esc(pf('hubLite'))}</label><p class="sub">${esc(pf('liteNote'))}</p>
      <label class="setOpt"><input type="checkbox" id="a11Con"${a.contrast ? ' checked' : ''}> ${esc(pf('hubContrast'))}</label>
      <label class="setOpt"><input type="checkbox" id="a11Per"${profile.on ? ' checked' : ''}> ${esc(pf('personalOn'))}</label><p class="sub">${esc(pf('personalNote'))}</p>
      <div class="row"><button type="button" id="a11Text">Aa — ${esc(pf('hubBigText'))}</button></div></div>`);
    wire(body);
    const save = (): void => { const n = { lite: ($('a11Lite') as HTMLInputElement).checked, contrast: ($('a11Con') as HTMLInputElement).checked }; saveA11y(n); applyA11y(n); };
    ($('a11Lite') as HTMLInputElement).onchange = () => { save(); host.notify(pf('liteNote')); };
    ($('a11Con') as HTMLInputElement).onchange = save;
    ($('a11Per') as HTMLInputElement).onchange = e => { profile.on = (e.target as HTMLInputElement).checked; saveProfile(profile); };
    $('a11Text').onclick = () => host.cycleText();
  }

  /* ---------- the buttons in the page ---------- */
  function relabel(): void {
    try { document.documentElement.lang = currentLocale(); } catch { /* no document */ }       // the page language is the one shown, also for Uzbek, Tajik and Kyrgyz
    document.querySelectorAll<HTMLElement>('[data-pf-label]').forEach(b => { b.textContent = `🧰 ${pf(b.dataset.pfLabel as string)}`; });
    renderTitle();
  }
  const bind = (): void => { document.querySelectorAll<HTMLElement>('[data-pf-open]').forEach(b => { b.onclick = openHub; }); };
  bind(); relabel(); showBanner();

  return {
    openHub, relabel, renderTitle, flags, telemetry, audio, tick, lite: () => loadA11y().lite,
    willTour: () => flags.isOn('tour') && shouldAutoStart(),
    onRunStart(s) {
      if (pendingDaily) { s.tmp.daily = Number(pendingDaily.replace(/-/g, '')); pendingDaily = null; }
      telemetry.track('run_start', { origin: G.origins.find(o => o.label === s.label)?.id ?? 'custom', diff: s.diff, daily: !!s.tmp.daily, lang: currentLocale() });
      if (flags.isOn('tour') && shouldAutoStart()) setTimeout(() => { if (shouldAutoStart() && host.state()) startTour(); }, 800);       // asked again when the time comes: the player may have skipped it, or left the game, meanwhile
    },
    onRunEnd(s) {
      const score = G.score(s), ending = String(s.over);
      telemetry.track('run_end', { ending, days: s.day + 1, score, citizen: !!s.flags.naturalized || s.status === 'citizen' });
      if (s.tmp.daily) { const d = String(s.tmp.daily); daily.finish(score, undefined, `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`); }
      void telemetry.flush();
      if (cls.membership() && (ending === 'time' || ending === 'hospital' || ending === 'deported' || ending === 'debt')) {
        void cls.sendResult(net, { origin: G.origins.find(o => o.label === s.label)?.id ?? 'custom', ending, score, days: s.day + 1 }, buildReport(s)).then(r => { if (r.ok) host.notify(pf('classSent')); });
      }
    },
    onScenario: id => {
      telemetry.track('scenario', { id });
      const st = host.state(), sc = G.scenarios.find(x => x.id === id);
      if (!st || !sc) return;
      if (lastSc) { learn(profile, lastSc.cat, lastSc.before, wellbeing(st)); if (++learned % 10 === 0) saveProfile(profile); }
      lastSc = { cat: sc.cat, before: wellbeing(st) };
    },
    onError: (msg, where) => { telemetry.error(msg, where); },
    decorateEnd(end, s) {
      const row = document.createElement('div'); row.className = 'row'; row.style.justifyContent = 'center';
      row.innerHTML = `<button type="button" class="ghost" id="pfEndRep">📋 ${esc(pf('hubReport'))}</button>${flags.isOn('share_card') ? `<button type="button" class="ghost" id="pfEndCard">🖼 ${esc(pf('repCard'))}</button>` : ''}`;
      end.querySelector('.end')?.appendChild(row);
      $('pfEndRep').onclick = openReport;
      document.getElementById('pfEndCard')?.addEventListener('click', () => void saveCard(s));
    },
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    const p = (window as unknown as { __platform?: Platform }).__platform;
    const st = (window as unknown as { __state?: () => State | null }).__state?.();
    if (p && st && !st.over) { p.telemetry.track('session_end', { day: st.day + 1 }); void p.telemetry.flush(); }
  });
}
export { analyticsAllowed };
