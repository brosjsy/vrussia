/* The phone's Kitchen app: the cooking challenge of cook.ts. A list of every dish with its picture (by cuisine, by kind, a search by name or
   ingredient, suggestions on top), then the shelf (pick what the dish needs), the preparation and cooking questions one at a time (each answer
   explained at once; a hint costs a little), and the result: stars, the picture, the mistakes and why, what to cook next. */
import type { State } from './engine';
import * as C from './cook';
import { ING, CUISINES, TYPES } from './cook-data';
import { dishSvg } from './cook-art';
import { lang } from './i18n';
import { checkAchievements } from './engine';
import { homeOf, washDishes } from './homelife';
/** The Russian texts, loaded with the Kitchen (their own small download). */
let RU: Record<string, string> = {};

const W: Record<string, [string, string]> = {
  title: ['Kitchen', 'Кухня'], all: ['All', 'Все'], search: ['Dish or ingredient', 'Блюдо или продукт'], cook: ['Cook it', 'Готовить'], back: ['Back', 'Назад'],
  shelf: ['Take from the shelf what this dish needs', 'Возьмите с полки то, что нужно для блюда'], have: ['at home', 'есть дома'], next: ['Next', 'Дальше'],
  start: ['Start cooking', 'Начать готовить'], hint: ['Hint (costs a point)', 'Подсказка (минус балл)'], right: ['Right.', 'Верно.'], wrong: ['Not like that.', 'Не так.'],
  finish: ['Serve', 'Подать'], again: ['Cook something else', 'Приготовить другое'], shopping: ['Shopping', 'Покупки'], forgot: ['Forgot', 'Забыли'], extra: ['Did not belong', 'Лишнее'],
  rank: ['Cook', 'Повар'], cooked: ['dishes cooked', 'блюд приготовлено'], leftovers: ['Eat leftovers from the fridge', 'Съесть остатки из холодильника'], none: ['Nothing matches.', 'Ничего не найдено.'],
  next3: ['Try next', 'Попробуйте ещё'], mistakes: ['What went wrong', 'Что пошло не так'], danger: ['danger to health', 'опасно для здоровья'], serve: ['Serving', 'Подача'], loading: ['Opening the cookbook...', 'Открываем кулинарную книгу...'],
  more: ['Show more', 'Показать ещё'], tab_all: ['All dishes', 'Все блюда'], tab_fridge: ['What I have', 'Что есть дома'], tab_book: ['My recipe book', 'Мои рецепты'], tab_kit: ['My kitchen', 'Моя кухня'], buy: ['Buy', 'Купить'], wash: ['Wash the dishes first', 'Сначала помыть посуду'], where: ['Where to shop', 'Где покупать'], haggle: ['Haggle with the seller', 'Поторговаться'], inFridge: ['in the fridge', 'в холодильнике'],
  thrown: ['Gone off and thrown away', 'Испортилось и выброшено'], fridgeNow: ['In the fridge (use the oldest first)', 'В холодильнике (сначала самое старое)'], days: ['days', 'дн.'], lastDay: ['use today', 'съесть сегодня'], wasted: ['Food thrown away so far', 'Выброшено продуктов на'], guests: ['Friends who would come round this week', 'Друзья, которые могут прийти на этой неделе'], eatsAll: ['eats everything', 'ест всё'],
  safeOnly: ['Show only dishes all of them can eat', 'Только блюда, которые могут есть все'], callHome: ['Call home for a family recipe (once a week)', 'Позвонить домой за семейным рецептом (раз в неделю)'], share_family: ['Feed the family', 'Накормить семью'], freeHint: ['Hint (free: the family recipe)', 'Подсказка (бесплатно: семейный рецепт)'], stamps: ['Cuisines cooked (a medal at ten dishes)', 'Кухни мира (медаль за десять блюд)'], owned: ['You have it', 'Есть'],
  kitHint: ['Beyond the hob, the pot and the pan. An owned flat, a house or the family home has an oven; in a rented room or dorm a tabletop oven is bought.', 'Кроме плиты, кастрюли и сковороды. В своей квартире, доме или у семьи есть духовка; в съёмной комнате или общежитии покупают мини-печь.'],
  seasonCheap: ['Summer: fresh vegetables, fruit and herbs are cheap now.', 'Лето: свежие овощи, фрукты и зелень сейчас дешёвые.'], seasonDear: ['Winter and spring: fresh vegetables and fruit are dear (hothouse and imported); roots and staples are not.', 'Зима и весна: свежие овощи и фрукты дорогие (тепличные и привозные); корнеплоды и бакалея — нет.'],
  diet: ['Diet', 'Питание'], fridgeQ: ['What do you have? (separate with commas)', 'Что у вас есть? (через запятую)'], fridgeHint: ['Type what is in your fridge: the dishes that need the least shopping come first.', 'Впишите, что есть в холодильнике: сначала блюда, для которых меньше всего докупать.'],
  toBuy: ['To buy', 'Докупить'], allHave: ['You have everything', 'Всё есть'], times: ['times', 'раз'], bookEmpty: ['Nothing cooked yet.', 'Пока ничего не приготовлено.'],
  share_partner: ['Serve it to your partner', 'Угостить партнёра'], share_guests: ['Invite friends round', 'Позвать друзей'], share_neighbours: ['Take a plate to the neighbours', 'Отнести соседям'], avoid: ['The usual mistake', 'Частая ошибка'], cuisine: ['Cuisine', 'Кухня'], how: ['What is the right way?', 'Как правильно?'], kind: ['Kind of dish', 'Тип блюда'], minutes: ['min', 'мин'], level: ['Level', 'Уровень'],
};
const ru = (): boolean => lang() === 'ru';
const w = (k: string): string => W[k]?.[ru() ? 1 : 0] ?? k;
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const nm = (d: C.DishInfo): string => (ru() ? d.ru : d.name);
const ing = (k: string): string => `${ING[k][2]} ${esc(ING[k][ru() ? 1 : 0])}`;
/** A Kitchen text in the player's language. */
const T = (t: string): string => (ru() ? RU[t] ?? C.MSG_RU.get(t) ?? t : t);
/** A question's title: "🥩 Pork" or "2. The broth", in the player's language. */
function titleOf(t: string): string {
  if (!ru()) return t;
  const m = t.match(/^(\d+)\. (.*)$/); if (m) return `${m[1]}. ${T(m[2])}`;
  const k = Object.keys(ING).find(x => `${ING[x][2]} ${ING[x][0]}` === t); return k ? `${ING[k][2]} ${ING[k][1]}` : t;
}
/** The result in words. */
function outMsg(o: C.Outcome, d: C.DishInfo): string {
  if (!ru()) return o.msg;
  return (o.ill ? `${d.ru} выглядело нормально, но ночью желудок сказал другое: пищевое отравление. Причины — в ошибках ниже.`
    : o.stars === 3 ? `${d.ru}: идеально. Все просят рецепт.` : o.stars === 2 ? `${d.ru}: хорошо. Кое-что в следующий раз можно лучше.`
    : o.stars === 1 ? `${d.ru}: съедобно. Могло быть гораздо лучше.` : `${d.ru}: не получилось. Почему — ниже; попробуйте ещё раз.`) + (o.daily && !o.ill ? ' Блюдо дня: двойной опыт.' : '') + (o.tired ? ' Слишком устали: обожгли палец о сковородку (готовьте отдохнувшими).' : '');
}
const stars = (n: number): string => '★'.repeat(n) + '☆'.repeat(3 - n);

interface View { stage: 'list' | 'shelf' | 'q' | 'done'; tab: 'all' | 'fridge' | 'book' | 'kit'; safe?: boolean; fridge: string; cuisine: string; type: string; q: string; shown: number; dish?: string; ch?: C.Challenge; picked: string[]; qi: number; answers: C.Answer[]; hint: boolean; freeHint?: boolean; fb?: { ok: boolean; why: string }; out?: C.Outcome }
const view: View = { stage: 'list', tab: 'all', fridge: '', cuisine: 'all', type: 'all', q: '', shown: 40, picked: [], qi: 0, answers: [], hint: false };
export function resetCookView(): void { Object.assign(view, { stage: 'list', tab: 'all', fridge: '', cuisine: 'all', type: 'all', q: '', shown: 40, dish: undefined, ch: undefined, picked: [], qi: 0, answers: [], hint: false, fb: undefined, out: undefined }); }

const card = (s: State, d: C.DishInfo, why?: string): string => { const best = C.cookOf(s).best[d.id], lock = C.lockedWhy(s, d);
  return `<li class="ckCard"><button type="button" data-ck="open:${d.id}" aria-label="${esc(nm(d))}">${dishSvg(d, 84)}<span><b>${esc(nm(d))}</b><small>${CUISINES[d.cuisine][2]} ${esc(CUISINES[d.cuisine][ru() ? 1 : 0])} · ${d.minutes} ${w('minutes')} · ${'●'.repeat(d.level)}${best !== undefined ? ` · ${stars(best)}` : ''}${lock ? ' · 🔒' : ''}</small>${why ? `<em>${esc(why)}</em>` : ''}</span></button></li>`; };

function listHtml(s: State): string {
  const C0 = C.cookOf(s), r = C.rankOf(s), diet = C.dietOf(s), list = C.search(view.q, view.cuisine, view.type, diet).filter(d => !view.safe || C.guestsOf(s).every(g => !g.need || C.safeFor(d, g.need))), done = Object.keys(C0.count).length;
  const chips = (cur: string, key: string, label: string, items: [string, string][]): string => `<label class="laSearch">${esc(label)}<select data-cksel="${key}">${[['all', w('all')] as [string, string], ...items].map(([id, t]) => `<option value="${id}"${cur === id ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const sug = !view.q && view.cuisine === 'all' && view.type === 'all' ? C.suggest(s).filter(x => !view.safe || C.guestsOf(s).every(g => !g.need || C.safeFor(x.d, g.need))) : [];
  const tabs = `<div class="svChips">${(['all', 'fridge', 'book', 'kit'] as const).map(t => `<button type="button" class="svChip${view.tab === t ? ' on' : ''}" data-ck="tab:${t}">${esc(w('tab_' + t))}</button>`).join('')}</div>`;
  const dietSel = `<label class="laSearch">${esc(w('diet'))}<select data-cksel="diet">${(Object.keys(C.DIETS) as C.Diet[]).map(k => `<option value="${k}"${diet === k ? ' selected' : ''}>${esc(C.DIETS[k][ru() ? 1 : 0])}</option>`).join('')}</select></label>`;
  const head = `<div class="svc ckApp"><p class="lwHeat"><span>${esc(w('rank'))}: <b>${esc((ru() ? C.TITLES_RU : C.TITLES)[r])}</b></span><b>${done}/${C.DISHES.length} ${esc(w('cooked'))}</b></p>${tabs}`;
  if (view.tab === 'fridge') { const fr = C.fridgeOf(s), inFr = fr.items.map(x => x.k), keys = [...new Set([...C.ingredientsIn(view.fridge), ...inFr])], found = keys.length ? C.fromIngredients(keys, 8, diet) : [];
    return `${head}${fr.thrown.length ? `<p class="phNote">🗑️ ${esc(w('thrown'))}: ${fr.thrown.map(ing).join(', ')}</p>` : ''}${fr.items.length ? `<p class="hint">🧊 ${esc(w('fridgeNow'))}: ${fr.items.map(x => `${ing(x.k)} (${x.left > 0 ? `${x.left} ${esc(w('days'))}` : esc(w('lastDay'))})`).join(', ')}</p>` : ''}${C.cookOf(s).wasted ? `<p class="hint">${esc(w('wasted'))}: ${C.cookOf(s).wasted!.toLocaleString('en-US')} ₽</p>` : ''}<label class="laSearch">${esc(w('fridgeQ'))}<input type="search" id="ckF" value="${esc(view.fridge)}" placeholder="potato, egg, onion"></label>${keys.length ? `<p class="hint">${keys.map(ing).join(', ')}</p>` : ''}
      ${found.length ? `<ul class="ckList">${found.map(x => card(s, x.d, x.missing.length ? `${w('toBuy')}: ${x.missing.map(k => ING[k][ru() ? 1 : 0]).join(', ')}` : w('allHave'))).join('')}</ul>` : `<p class="hint">${esc(w(keys.length ? 'none' : 'fridgeHint'))}</p>`}</div>`; }
  if (view.tab === 'kit') { const have = C.kitOf(s);
    return `${head}<p class="hint">${esc(w('kitHint'))}</p><ul class="svVacs">${Object.entries(C.KIT).map(([k, v]) => `<li class="svVac"><span class="svIc">${have.includes(k) ? '✅' : '🛒'}</span><div><b>${esc(v[ru() ? 1 : 0])}</b><div class="svTags"><span class="svPay">${v[2].toLocaleString('en-US')} ₽</span></div>${have.includes(k) ? `<small>${esc(w('owned'))}</small>` : `<button type="button" class="ghost small" data-ck="kit:${k}">${esc(w('buy'))}</button>`}</div></li>`).join('')}</ul>${C.seasonOf(s, 'tomato') !== 1 ? `<p class="hint">${esc(w(C.seasonOf(s, 'tomato') < 1 ? 'seasonCheap' : 'seasonDear'))}</p>` : ''}</div>`; }
  if (view.tab === 'book') { const mine = C.DISHES.filter(d => C0.count[d.id]).sort((a, b) => (C0.best[b.id] ?? 0) - (C0.best[a.id] ?? 0));
    const st = C.stampsOf(s);
    return `${head}${st.length ? `<p class="hint">${esc(w('stamps'))}: ${st.length}/${Object.keys(CUISINES).filter(cu => C.DISHES.some(x => x.cuisine === cu)).length}</p><div class="svChips">${st.map(x => `<span class="svChip${x.master ? ' on' : ''}">${x.master ? '🏅' : CUISINES[x.cuisine][2]} ${esc(CUISINES[x.cuisine][ru() ? 1 : 0])} ${x.done}/${x.total}</span>`).join('')}</div>` : ''}${mine.length ? `<ul class="ckList">${mine.map(d => card(s, d, `${C0.count[d.id]} ${w('times')}`)).join('')}</ul>` : `<p class="hint">${esc(w('bookEmpty'))}</p>`}</div>`; }
  return `${head}
    ${C.leftoversLeft(s) ? `<button type="button" class="ghost small" data-ck="eat">🍱 ${esc(w('leftovers'))} (${C.leftoversLeft(s)})</button>` : ''}
    <details class="ckGuests"><summary>👥 ${esc(w('guests'))}</summary><ul>${C.guestsOf(s).map(g => `<li><b>${esc(g.name)}</b>${g.need ? `: ${esc(C.NEED_TEXT[g.need][ru() ? 1 : 0])}` : `: ${esc(w('eatsAll'))}`}</li>`).join('')}</ul>
      <label class="ckCheck"><input type="checkbox" id="ckSafe"${view.safe ? ' checked' : ''}> ${esc(w('safeOnly'))}</label></details>
    <div id="ckOnline"></div>
    <button type="button" class="ghost small" data-ck="call">📞 ${esc(w('callHome'))}</button>
    <label class="laSearch">${esc(w('search'))}<input type="search" id="ckQ" value="${esc(view.q)}"></label>
    <div class="ckRow">${chips(view.cuisine, 'cu', w('cuisine'), Object.entries(CUISINES).filter(([id]) => C.DISHES.some(d => d.cuisine === id)).map(([id, c]) => [id, `${c[2]} ${ru() ? c[1] : c[0]}`]))}
    ${chips(view.type, 'ty', w('kind'), Object.entries(TYPES).map(([id, t]) => [id, ru() ? t.ru : t.name]))}</div>${dietSel}
    ${sug.length ? `<ul class="ckList">${sug.map(x => card(s, x.d, x.why)).join('')}</ul><hr>` : ''}
    ${list.length ? `<ul class="ckList">${list.slice(0, view.shown).map(d => card(s, d)).join('')}</ul>${list.length > view.shown ? `<button type="button" class="ghost small" data-ck="more">${esc(w('more'))} (${list.length - view.shown})</button>` : ''}` : `<p class="hint">${esc(w('none'))}</p>`}</div>`;
}
function shelfHtml(s: State): string {
  const ch = view.ch!, d = ch.dish, have = new Set(C.cookOf(s).pantry), fresh = C.cookOf(s).fresh ?? {}, { cost } = C.shoppingOf(s, view.picked), why = C.cannotCookDish(s, d.id, view.picked);
  return `<div class="svc ckApp"><div class="ckHero">${dishSvg(d, 150)}<div><h3>${esc(nm(d))}</h3><p class="hint">${esc(ru() ? TYPES[d.type].ru : TYPES[d.type].name)} · ${d.minutes} ${w('minutes')} · ${esc(w('level'))} ${d.level}</p></div></div>
    <p><b>${esc(w('shelf'))}</b></p><div class="ckShelf">${ch.shelf.map(k => `<button type="button" class="ckIng${view.picked.includes(k) ? ' on' : ''}" aria-pressed="${view.picked.includes(k)}" data-ck="pick:${k}">${ing(k)}${have.has(k) ? ` <small>(${esc(w('have'))})</small>` : fresh[k] !== undefined ? ` <small>(${esc(w('inFridge'))})</small>` : ''}</button>`).join('')}</div>
    <label class="laSearch">${esc(w('where'))}<select data-cksel="shop">${(Object.keys(C.SHOPS) as C.Shop[]).map(k => `<option value="${k}"${(C.cookOf(s).shop ?? 'shop') === k ? ' selected' : ''}>${esc(C.SHOPS[k][ru() ? 1 : 0])}</option>`).join('')}</select></label>
    ${C.cookOf(s).shop === 'market' ? `<button type="button" class="ghost small" data-ck="haggle">🤝 ${esc(w('haggle'))}</button>` : ''}
    <p>${esc(w('shopping'))}: <b>${cost.toLocaleString('en-US')} ₽</b></p>
    ${why && view.picked.length ? `<small class="why">${esc(T(why))}</small>` : ''}${homeOf(s).dishes >= 20 ? `<button type="button" class="ghost small" data-ck="wash">🧽 ${esc(w('wash'))}</button>` : ''}<p class="ckRow"><button type="button" class="ghost" data-ck="list">‹ ${esc(w('back'))}</button><button type="button" data-ck="start"${view.picked.length && !why ? '' : ' disabled'}>${esc(w('start'))}</button></p></div>`;
}
function qHtml(s: State): string {
  const ch = view.ch!, q = ch.questions[view.qi], fb = view.fb, n = ch.questions.length, a = view.answers.find(x => x.qi === view.qi);
  const hintIdx = view.hint ? q.options.findIndex(o => o.ok) : -1;
  return `<div class="svc ckApp"><p class="lwHeat"><span>${esc(nm(ch.dish))}</span><meter min="0" max="${n}" value="${view.qi}"></meter><b>${view.qi + 1}/${n}</b></p>
    <h3>${esc(titleOf(q.title))}</h3><p>${esc(q.stage === 'cook' ? w('how') : T(q.q))}${q.danger ? ` <small class="ckDanger">⚠ ${esc(w('danger'))}</small>` : ''}</p>
    <div class="ckOpts">${q.options.map((o, i) => `<button type="button" class="ckOpt${a?.chosen === i ? (o.ok ? ' ok' : ' bad') : ''}${hintIdx === i && !a ? ' hinted' : ''}${a && o.ok ? ' ok' : ''}" data-ck="ans:${i}"${a ? ' disabled' : ''}>${esc(T(o.t))}</button>`).join('')}</div>
    ${fb ? `<p class="ckFb ${fb.ok ? 'ok' : 'bad'}" role="status"><b>${esc(fb.ok ? w('right') : w('wrong'))}</b> ${esc(fb.why)}</p><button type="button" data-ck="next">${esc(view.qi + 1 < n ? w('next') : w('finish'))}</button>`
      : `<button type="button" class="ghost small" data-ck="hint"${view.hint ? ' disabled' : ''}>💡 ${esc(w(C.cookOf(s).freeHint ? 'freeHint' : 'hint'))}</button>`}</div>`;
}
function doneHtml(s: State): string {
  const o = view.out!, d = view.ch!.dish;
  return `<div class="svc ckApp"><div class="ckHero">${dishSvg(d, 170)}<div><h3>${esc(nm(d))}</h3><p class="ckStars" aria-label="${o.stars} of 3">${stars(o.stars)}</p><p>${o.score}% · ${o.cost.toLocaleString('en-US')} ₽</p></div></div>
    <p class="phNote" role="status">${esc(outMsg(o, d))}</p>
    ${o.forgot.length ? `<p>${esc(w('forgot'))}: ${o.forgot.map(ing).join(', ')}</p>` : ''}${o.wrongPicks.length ? `<p>${esc(w('extra'))}: ${o.wrongPicks.map(ing).join(', ')}</p>` : ''}
    ${o.mistakes.length ? `<h4>${esc(w('mistakes'))}</h4><ul class="ckMis">${o.mistakes.map(m => `<li${m.danger ? ' class="danger"' : ''}><b>${esc(titleOf(m.title))}</b>: ${esc(T(m.chose))}. <i>${esc(T(m.why))}</i></li>`).join('')}</ul>` : ''}
    <p><b>${esc(w('serve'))}:</b> ${esc(T(TYPES[d.type].serve))}</p>
    ${o.stars >= 1 ? `<p class="ckRow">${(['family', 'partner', 'guests', 'neighbours'] as const).filter(x => (x !== 'partner' || s.partner) && (x !== 'family' || s.kids > 0)).map(x => `<button type="button" class="ghost small" data-ck="share:${x}">${esc(w('share_' + x))}</button>`).join('')}</p>` : ''}
    <h4>${esc(w('next3'))}</h4><ul class="ckList">${C.similar(d.id, 3).map(x => card(s, x)).join('')}</ul>
    <button type="button" data-ck="list">${esc(w('again'))}</button></div>`;
}
export function cookHtml(s: State): string {
  if (!C.DISHES.length) return `<p class="hint">${esc(w('loading'))}</p>`;
  return view.stage === 'shelf' && view.ch ? shelfHtml(s) : view.stage === 'q' && view.ch ? qHtml(s) : view.stage === 'done' && view.out ? doneHtml(s) : listHtml(s);
}
/** Starts a dish: its shelf. */
function openDish(s: State, id: string): boolean {
  const ch = C.challengeOf(id, String(s.day)); if (!ch) return false;
  Object.assign(view, { stage: 'shelf', dish: id, ch, picked: [], qi: 0, answers: [], hint: false, fb: undefined }); return true;
}
export function wireCook(host: HTMLElement, s: State, d: { notify: (m: string) => void; again: () => void }): void {
  const q = host.querySelector<HTMLInputElement>('#ckQ');
  const on = host.querySelector<HTMLElement>('#ckOnline');
  if (on) void import('./cook-online').then(m => m.fillPanel(on, id => { if (openDish(s, id)) d.again(); })).catch(() => { /* offline */ });
  const sf = host.querySelector<HTMLInputElement>('#ckSafe'); if (sf) sf.onchange = () => { view.safe = sf.checked; d.again(); };
  const f = host.querySelector<HTMLInputElement>('#ckF');
  if (f) f.oninput = () => { view.fridge = f.value; const at = f.selectionStart; d.again(); const f2 = host.querySelector<HTMLInputElement>('#ckF'); if (f2) { f2.focus(); f2.setSelectionRange(at, at); } };
  if (q) q.oninput = () => { view.q = q.value; view.shown = 40; const at = q.selectionStart; d.again(); const q2 = host.querySelector<HTMLInputElement>('#ckQ'); if (q2) { q2.focus(); q2.setSelectionRange(at, at); } };
  host.querySelectorAll<HTMLSelectElement>('[data-cksel]').forEach(el => { el.onchange = () => { if (el.dataset.cksel === 'shop') C.cookOf(s).shop = el.value as C.Shop; else if (el.dataset.cksel === 'cu') view.cuisine = el.value; else if (el.dataset.cksel === 'diet') C.cookOf(s).diet = el.value as C.Diet; else view.type = el.value; view.shown = 40; d.again(); }; });
  host.querySelectorAll<HTMLButtonElement>('[data-ck]').forEach(b => { b.onclick = () => {
    const [act, arg] = (b.dataset.ck as string).split(':');
    if (act === 'wash') d.notify(washDishes(s).msg); else if (act === 'haggle') d.notify(C.haggle(s).msg); else if (act === 'call') d.notify(C.callHome(s).msg); else if (act === 'tab') view.tab = arg as View['tab']; else if (act === 'kit') d.notify(C.buyKit(s, arg).msg); else if (act === 'share') d.notify(C.share(s, view.ch!.dish.id, arg as C.Share).msg);
    else if (act === 'cu') view.cuisine = arg; else if (act === 'ty') view.type = arg; else if (act === 'more') view.shown += 40;
    else if (act === 'list') { view.stage = 'list'; view.out = undefined; }
    else if (act === 'eat') d.notify(C.eatLeftovers(s).msg);
    else if (act === 'open') { if (!openDish(s, arg)) return; host.scrollTop = 0; }
    else if (act === 'pick') view.picked = view.picked.includes(arg) ? view.picked.filter(k => k !== arg) : [...view.picked, arg];
    else if (act === 'start') { view.stage = 'q'; view.qi = 0; }
    else if (act === 'hint') { view.hint = true; if (C.cookOf(s).freeHint) { C.cookOf(s).freeHint = false; view.freeHint = true; } }
    else if (act === 'ans') { const qq = view.ch!.questions[view.qi], o = qq.options[Number(arg)]; view.answers.push({ qi: view.qi, chosen: Number(arg), hint: view.hint && !view.freeHint }); view.freeHint = false; const bad = qq.options.find(x => !x.ok); view.fb = { ok: o.ok, why: o.ok ? (bad?.why ? `${w('avoid')}: ${T(bad.t).toLowerCase()}. ${T(bad.why)}` : '') : T(o.why ?? '') }; }
    else if (act === 'next') { view.fb = undefined; view.hint = false; if (view.qi + 1 < view.ch!.questions.length) view.qi++; else { view.out = C.cook(s, view.ch!, view.picked, view.answers); view.stage = 'done'; const dish = view.ch!.dish.id, out = view.out;
      void import('./cook-online').then(m => m.sendIfToday(dish, out)).then(msg => { if (msg) { d.notify(msg); d.again(); } }).catch(() => { /* offline */ }); } }
    for (const a of checkAchievements(s)) d.notify(`🏆 ${a.title}: ${a.text}`);
    d.again();
  }; });
}
export function openCook(host: HTMLElement, s: State, d: { back: () => void; refresh: () => void; notify: (m: string) => void }): void {
  let flash = '';
  const draw = (): void => {
    const f = flash; flash = '';
    host.innerHTML = `<div class="phone sub svcApp"><div class="phHead"><button class="ghost" data-ckback aria-label="Back">‹</button><b>🍳 ${esc(w('title'))}</b></div>${f ? `<p class="phNote" role="status">${esc(f)}</p>` : ''}${cookHtml(s)}</div>`;
    host.querySelector<HTMLButtonElement>('[data-ckback]')!.onclick = () => { if (view.stage === 'list') d.back(); else { view.stage = 'list'; draw(); } };
    wireCook(host, s, { notify: m => { const t = T(m); flash = t; d.notify(t); }, again: () => { d.refresh(); draw(); } });
  };
  draw();
  if (!C.DISHES.length) void C.loadDishes().then(draw);
  if (!Object.keys(RU).length) void import('./cook-ru').then(m => { RU = m.RU; draw(); });
}
