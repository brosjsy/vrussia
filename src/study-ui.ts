/* The phone's Study and Home apps. Study: the six skills, the university's courses (enrol, go to a lecture, do homework, sit the exam) and today's
   five Russian words with a button that says each word aloud where the browser can. Home: where the player lives, the homes they can move to, and the
   utility bills with a Pay button. The rules are in study.ts and housing.ts; this file only draws them into the phone. */
import type { State, Scenario } from './engine';
import './i18n-life';
import * as G from './engine';
import { SKILLS, COURSES, skillOf, studyOf, cannotEnrol, enrol, current, lectureScenario, homework, examReady, passChance, sitExam, lessonOf, answerWord, lessonDone, russianLevel, UNIVERSITY, UNIVERSITY_RU } from './study';
import { RENTALS, rentIn, rentalOf, cannotMove, moveTo, tickBills, unpaid, payBills, homeOf, MAX_WARNINGS } from './housing';
import type { RentalId } from './housing';
import { homeInfo, dwellingOf } from './homes';
import { t, lang } from './i18n';
import { route, routeFare } from './trains';
import type { Route } from './trains';
import { tripScenario, classesFor } from './train-trip';
import { choresOf, hasWasher, planActive, cardName, LAUNDROMAT, PLAN_MONTH, WIFI_INSTALL, WIFI_MONTH, CARD_DEPOSIT } from './chores';
import { washClothes, topUpPhone, connectWifi, buyCard, topUpCard } from './chores-do';

const esc = (x: string): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
export interface AppDeps { back: () => void; refresh: () => void; scenario: (sc: Scenario) => void; random?: () => number; speak?: (word: string) => void }
const head = (title: string): string => `<div class="phHead"><button class="ghost" data-ap="back" aria-label="Back">‹ ${esc(t('phoneBack'))}</button><b>${esc(title)}</b></div>`;
const bar = (v: number): string => `<i class="qbar"><em style="width:${Math.max(0, Math.min(100, v))}%"></em></i>`;
/** Says a Russian word aloud with the browser's speech, if it has a Russian voice; otherwise does nothing. */
export function speakRu(word: string): void { try { const u = new SpeechSynthesisUtterance(word); u.lang = 'ru-RU'; u.rate = 0.85; window.speechSynthesis.speak(u); } catch { /* no speech here */ } }

export function openStudy(host: HTMLElement, s: State, d: AppDeps): void {
  const ru = lang() === 'ru'; let flash = '';
  const draw = (): void => {
    const b = studyOf(s), c = current(s), e = b.course, f = flash; flash = '';
    const skills = SKILLS.map(k => `<div class="skRow"><span>${k.icon} ${esc(ru ? k.ru : k.name)}</span>${bar(skillOf(s, k.id))}<b>${skillOf(s, k.id)}</b></div>`).join('');
    const course = c && e ? `<div class="jobCard"><span class="msgIcon">🎓</span><div><b>${esc(ru ? c.ru : c.name)}</b><small>${esc(t('stLectures'))} ${e.lectures}/${c.lectures} · ${esc(t('stHomework'))} ${e.homework}/${c.homework}</small>${examReady(s) ? `<small>${esc(t('stChance'))}: ${Math.round(passChance(s) * 100)}%</small>` : ''}</div></div>
      <div class="row">${e.lectures < c.lectures ? `<button type="button" class="primary" data-ap="lecture">${esc(t('stLecture'))}</button>` : ''}${e.homework < c.homework ? `<button type="button" class="secondary" data-ap="hw">${esc(t('stDoHw'))}</button>` : ''}${examReady(s) ? `<button type="button" class="primary" data-ap="exam">${esc(t('stExam'))}</button>` : ''}</div>`
      : `<ul class="msgs">${COURSES.map(x => { const why = cannotEnrol(s, x.id), done = b.certs.includes(x.id); return `<li class="jobCard"><div><b>${esc(ru ? x.ru : x.name)}${done ? ' ✔' : ''}</b><small>${esc(G.money(x.fee))} · ${x.lectures} ${esc(t('stLectures'))} · ${x.homework} ${esc(t('stHomework'))}</small>${why && !done ? `<small class="why">${esc(why)}</small>` : ''}</div>${done ? '' : `<button type="button" class="primary" data-enrol="${x.id}"${why ? ' disabled' : ''}>${esc(t('stEnrol'))}</button>`}</li>`; }).join('')}</ul>`;
    const lesson = lessonOf(s), doneN = lessonDone(s), doneSet = new Set(b.lesson && b.lesson.day === s.day ? b.lesson.done : []);
    const words = lesson.map((w, i) => `<li class="word${doneSet.has(i) ? ' done' : ''}"><button type="button" class="ghost say" data-say="${esc(w.ru)}" aria-label="${esc(t('stSay'))} ${esc(w.ru)}">🔊</button><b lang="ru">${esc(w.ru)}</b>${doneSet.has(i) ? `<span>= ${esc(w.en)}</span>` : `<span class="opts">${w.options.map(o => `<button type="button" class="chipBtn" data-word="${i}" data-ans="${esc(o)}">${esc(o)}</button>`).join('')}</span>`}</li>`).join('');
    host.innerHTML = `<div class="phone sub study">${head(t('phoneStudy'))}${f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''}
      <p class="sub">${esc(ru ? UNIVERSITY_RU : UNIVERSITY)} · ${esc(t('stLevel'))}: <b>${esc(russianLevel(s))}</b> · ${esc(t('stCerts'))}: ${b.certs.length}</p>
      <h3>${esc(t('stSkills'))}</h3><div class="skills">${skills}</div><h3>${esc(t('stCourses'))}</h3>${course}
      <h3>🗣️ ${esc(t('stWords'))} <small>${doneN}/5</small></h3><ul class="words">${words}</ul></div>`;
    wire();
  };
  const wire = (): void => {
    host.querySelectorAll<HTMLButtonElement>('[data-enrol]').forEach(b => { b.onclick = () => { const r = enrol(s, b.dataset.enrol as string); flash = r.msg; if (r.ok) d.refresh(); draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-word]').forEach(b => { b.onclick = () => { const r = answerWord(s, Number(b.dataset.word), b.dataset.ans as string); flash = r.msg; if (r.ok) d.refresh(); draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-say]').forEach(b => { b.onclick = () => (d.speak ?? speakRu)(b.dataset.say as string); });
    host.querySelectorAll<HTMLButtonElement>('[data-ap]').forEach(b => { b.onclick = () => {
      const a = b.dataset.ap;
      if (a === 'back') return d.back();
      if (a === 'lecture') { const sc = lectureScenario(s, ru); if (sc) d.scenario(sc); return; }
      if (a === 'hw') { const r = homework(s); flash = r.msg; if (r.ok) d.refresh(); return draw(); }
      if (a === 'exam') { const r = sitExam(s, (d.random ?? Math.random)()); flash = r.msg; d.refresh(); return draw(); }
    }; });
  };
  draw();
}

export function openHousing(host: HTMLElement, s: State, d: AppDeps): void {
  const ru = lang() === 'ru'; let flash = tickBills(s).join(' ');
  const draw = (): void => {
    const now = rentalOf(s), info = homeInfo(dwellingOf(s)), bills = unpaid(s), f = flash; flash = '';
    const sum = bills.reduce((n, b) => n + b.amount, 0), worst = Math.max(0, ...bills.map(b => b.warnings));
    const ladder = RENTALS.map(r => { const why = cannotMove(s, r.id), rent = rentIn(r, s.city), here = now?.id === r.id; return `<li class="jobCard${here ? ' here' : ''}"><span class="msgIcon">${r.icon}</span><div><b>${esc(ru ? r.ru : r.name)}${here ? ` · ${esc(t('hsHere'))}` : ''}</b><small>${esc(G.money(rent))} ${esc(t('hsWeek'))} · ${r.size} m² · ${esc(t('hsDeposit'))} ${esc(G.money(rent * 2))}</small>${why && !here ? `<small class="why">${esc(why)}</small>` : ''}</div>${here ? '' : `<button type="button" class="primary" data-move="${r.id}"${why ? ' disabled' : ''}>${esc(t('hsMove'))}</button>`}</li>`; }).join('');
    host.innerHTML = `<div class="phone sub housing">${head(t('phoneHousing'))}${f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''}
      <div class="homeCard"><b>${esc(now ? (ru ? now.ru : now.name) : info.name)}</b><span class="sub">${esc(t('hsRent'))}: ${esc(G.money(s.rent))} ${esc(t('hsWeek'))}</span></div>
      <h3>🧾 ${esc(t('hsBills'))}</h3>${now ? (bills.length ? `<p class="${worst ? 'phWarn' : 'sub'}">${esc(t('hsDue'))}: <b>${esc(G.money(sum))}</b>${worst ? ` · ⚠️ ${esc(t('hsWarnings'))} ${worst}/${MAX_WARNINGS}` : ''}</p><button type="button" class="primary" data-ap="pay">${esc(t('hsPay'))}</button>` : `<p class="sub">${esc(t('hsNoBills'))}</p>`) : `<p class="sub">${esc(t('hsNoUtilities'))}</p>`}
      <h3>${esc(t('hsLadder'))}</h3><ul class="msgs">${ladder}</ul><p class="sub">${esc(t('hsHint'))}</p>
      <p class="sub">${esc(t('hsHistory'))}: ${homeOf(s).bills.filter(b => b.paid).length}</p></div>`;
    host.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(b => { b.onclick = () => { const r = moveTo(s, b.dataset.move as RentalId); flash = r.msg; if (r.ok) { tickBills(s); d.refresh(); } draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-ap]').forEach(b => { b.onclick = () => { if (b.dataset.ap === 'back') return d.back(); const r = payBills(s); flash = r.msg; if (r.ok) d.refresh(); draw(); }; });
  };
  draw();
}

/** The phone's Daily life app (chores.ts): clothes, the mobile plan, home internet and the city transport card, each with one button. */
export function openChores(host: HTMLElement, s: State, d: AppDeps): void {
  const ru = lang() === 'ru'; let flash = '';
  const draw = (): void => {
    const c = choresOf(s), f = flash; flash = '';
    const card = c.card && c.card.city === s.city ? c.card : null;
    host.innerHTML = `<div class="phone sub chores">${head(t('chTitle'))}${f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''}
      <ul class="msgs">
        <li class="jobCard"><span class="msgIcon">👕</span><div><b>${esc(t('chClothes'))}</b>${bar(c.clothes)}<div class="row"><button type="button" class="secondary" data-ch="washHome"${hasWasher(s) && s.loc === 'home' ? '' : ' disabled'}>${esc(t('chWashHome'))}</button>${hasWasher(s) ? (s.loc === 'home' ? '' : `<small>${esc(t('chOnlyHome'))}</small>`) : `<small>${esc(t('chNoWasher'))}</small>`}<button type="button" class="secondary" data-ch="laundromat">${esc(t('chLaundromat'))} · ${esc(G.money(LAUNDROMAT))}</button></div></div></li>
        <li class="jobCard"><span class="msgIcon">📶</span><div><b>${esc(t('chPlan'))}</b><small>${planActive(s) ? `${esc(t('chPlanUntil'))} ${c.planUntil + 1}` : esc(t('chPlanOff'))}</small><div class="row"><button type="button" class="secondary" data-ch="plan">${esc(t('chTopUp'))} · ${esc(G.money(PLAN_MONTH))}</button></div></div></li>
        <li class="jobCard"><span class="msgIcon">🌐</span><div><b>${esc(t('chWifi'))}</b><small>${esc(t(c.wifi ? 'chWifiOn' : 'chWifiOff'))}</small>${c.wifi ? '' : `<div class="row"><button type="button" class="secondary" data-ch="wifi">${esc(t('chConnect'))} · ${esc(G.money(WIFI_INSTALL + WIFI_MONTH))}</button></div>`}</div></li>
        <li class="jobCard"><span class="msgIcon">🎫</span><div><b>${esc(cardName(s.city, ru))}</b><small>${card ? esc(G.money(card.balance)) : esc(t('chCardNone'))}</small><div class="row">${card ? `<button type="button" class="secondary" data-ch="top">${esc(t('chCardTop'))}</button>` : `<button type="button" class="secondary" data-ch="card">${esc(t('chCardBuy'))} · ${esc(G.money(CARD_DEPOSIT))}</button>`}</div></div></li>
      </ul></div>`;
    host.querySelectorAll<HTMLButtonElement>('[data-ap]').forEach(b => { b.onclick = () => d.back(); });
    host.querySelectorAll<HTMLButtonElement>('[data-ch]').forEach(b => { b.onclick = () => {
      const k = b.dataset.ch, r = k === 'washHome' ? washClothes(s, 'home') : k === 'laundromat' ? washClothes(s, 'laundromat') : k === 'plan' ? topUpPhone(s, 1) : k === 'wifi' ? connectWifi(s) : k === 'card' ? buyCard(s) : topUpCard(s, 500);
      flash = r.msg; if (r.ok) d.refresh(); draw();
    }; });
  };
  draw();
}

/** The phone's Trains app (trains.ts, train-trip.ts): every city of the game the railway reaches from here, fastest first, with the time,
    the distance, the changes and the cheapest fare; each route opens to show its trains and their real stops; a button starts the trip. */
export function openTrains(host: HTMLElement, s: State, d: AppDeps): void {
  const ru = lang() === 'ru';
  const rows = G.CITIES.filter(c => c !== s.city).map(c => ({ c, r: route(s.city, c) })).filter((x): x is { c: string; r: Route } => !!x.r).sort((a, b) => a.r.hours - b.r.hours);
  const time = (h: number): string => (h < 24 ? (ru ? `${Math.round(h * 10) / 10} ч` : `${Math.round(h * 10) / 10} h`) : (ru ? `${Math.round(h / 24 * 10) / 10} сут` : `${Math.round(h / 24 * 10) / 10} days`));
  const cheapest = (r: Route): number => Math.min(...classesFor(r).map(cl => routeFare(r, cl)));
  host.innerHTML = `<div class="phone sub trains">${head(t('trTitle'))}<p class="sub">${esc(t('trFrom'))} <b>${esc(s.city)}</b> · ${esc(t('trHint'))}</p>
    <ul class="msgs">${rows.map(({ c, r }) => `<li class="jobCard"><span class="msgIcon">${r.legs.some(j => j.line.kind === 'highspeed') ? '🚄' : r.legs.every(j => j.line.kind === 'express') ? '🚆' : '🛏️'}</span><div>
      <b>${esc(c)}</b><small>${esc(time(r.hours))} · ${r.km.toLocaleString(ru ? 'ru-RU' : 'en-US')} ${ru ? 'км' : 'km'} · ${r.legs.length > 1 ? esc(`${r.legs.length - 1} ${t('trChanges')}`) : esc(t('trDirect'))} · ${esc(t('trFromPrice'))} ${esc(G.money(cheapest(r)))}</small>
      <details><summary>${esc(t('trStops'))}</summary>${r.legs.map(j => { const a = j.line.stops.indexOf(j.from), b = j.line.stops.indexOf(j.to), part = (a < b ? j.line.stops.slice(a, b + 1) : j.line.stops.slice(b, a + 1).reverse()); return `<p class="sub"><b>${esc(ru ? j.line.ru : j.line.name)}</b>${j.line.verified ? '' : ` · <i>${esc(t('trApprox'))}</i>`}: ${part.map(x => esc(x.station)).join(' → ')}${j.line.note ? `<br>${esc((ru ? j.line.noteRu : j.line.note) ?? '')}` : ''}</p>`; }).join('')}</details>
      <div class="row"><button type="button" class="secondary" data-go="${esc(c)}">${esc(t('trGo'))}</button></div></div></li>`).join('')}</ul></div>`;
  host.querySelectorAll<HTMLButtonElement>('[data-ap]').forEach(b => { b.onclick = () => d.back(); });
  host.querySelectorAll<HTMLButtonElement>('[data-go]').forEach(b => { b.onclick = () => { const sc = tripScenario(s, b.dataset.go as string, ru); if (sc) d.scenario(sc); }; });
}
