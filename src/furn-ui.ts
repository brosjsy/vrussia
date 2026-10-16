/* The buy mode of the flat: a catalogue panel over the 3D view with a tab for each kind of furniture, cards with the size, the stars and the price, and
   a bar for the piece that is being put down (turn it, or cancel). The rules are in furniture.ts; this file only draws and connects them. */
import type { State } from './engine';
import * as G from './engine';
import { FURN_CATS, furnById, furnOf, buyFurn, totalStars, catalogue, undoBuy, sellBack, toggleWish, onWishlist, UNDO_MS } from './furniture';
import type { Sort } from './furniture';
import type { FurnCat } from './furniture';
import { designOf, homeInfo, dwellingOf, renovate, FLOORS, WALLS, LIGHTS, WINDOWS, currentLook, renoStars } from './homes';
import type { RenoKind } from './homes';
import { viewOf as buildView, startNext, STAGES } from './build';
import { t } from './i18n';
import type { World3dHandle } from './world3d';

export interface FurnUi { notify: (m: string) => void; changed: () => void; hide: () => void }
let cat: FurnCat | 'home' = 'design';
const esc = (x: string): string => x.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const stars = (n?: number): string => (n ? '★'.repeat(n) : '');

/** The Home tab: what the home is like, the renovations that can be bought, and the house the player can build. */
function homeHtml(s: State): string {
  const info = homeInfo(dwellingOf(s)), it = designOf(s), look = currentLook(s), v = buildView(s);
  const row = (kind: RenoKind, label: string, list: { id: string; name: string; price: number }[], now: string): string =>
    `<div class="rnRow"><b>${esc(label)}</b><div class="rnChips">${list.map(x => `<button type="button" class="rnChip" data-reno="${kind}:${x.id}" aria-pressed="${x.id === now}">${kind === 'wall' ? `<i class="rnSwatch" style="background:${x.id}"></i>` : ''}${esc(x.name)}<small>${x.id === now ? esc(t('hmNow')) : x.price ? esc(G.money(x.price)) : esc(t('actFree'))}</small></button>`).join('')}</div></div>`;
  const stage = STAGES.map((st, i) => `<li class="${i < v.done ? 'done' : i === v.done ? 'cur' : ''}">${i < v.done ? '✔' : i === v.done ? (v.working ? '⏳' : '▶') : '○'} ${esc(st.name)} <small>${esc(G.money(st.cost))}${st.days ? ` · ${st.days} ${esc(t('cvDays'))}` : ''}</small></li>`).join('');
  const button = v.finished ? `<p class="cvMine">🏠 ${esc(t('hmBuilt'))}</p>` : v.working ? `<p class="furnHint">⏳ ${esc(t('hmWorking'))}: ${v.daysLeft} ${esc(t(v.daysLeft === 1 ? 'cvDay' : 'cvDays'))}</p>` : `<button type="button" class="primary" id="hmBuild">${esc(v.next?.name ?? '')} · ${esc(G.money(v.next?.cost ?? 0))}</button>`;
  return `<div class="homeTab"><div class="homeCard"><b>${esc(info.name)}</b><span class="sub">${it.w} × ${it.d} m · ★ ${renoStars(s)}</span><p class="sub">${esc(info.blurb)}</p></div>
    <h4>${esc(t('hmReno'))}</h4>${row('floor', t('hmFloor'), FLOORS, look.floorStyle)}${row('wall', t('hmWalls'), WALLS, it.wall)}${row('light', t('hmLight'), LIGHTS, look.lights)}${row('windows', t('hmWindows'), WINDOWS, look.windows)}
    <h4>${esc(t('hmBuildTitle'))}</h4><p class="sub">${esc(t('hmBuildBody'))}</p><ul class="stageList">${stage}</ul>${button}</div>`;
}

/** Draws the panel into `box` (an element over the 3D view). Call again after anything changes. */
/* what the catalogue shows: a search word, the sort order, only owned things or the wishlist; a purchase waiting for "yes"; the last purchase that can still be undone */
let q = '', sort: Sort = 'cheap', onlyOwned = false, onlyWish = false, asking: string | null = null, undoTimer = 0;

export function drawFurnPanel(box: HTMLElement, s: State, world: World3dHandle, ui: FurnUi): void {
  const fs = furnOf(s), placing = world.placing();
  const items = cat === 'home' ? [] : catalogue(s, { cat, q, sort, owned: onlyOwned, wish: onlyWish });
  box.classList.toggle('placing', !!placing);          // while a piece is being placed only the bar shows, so the floor can be seen
  const ask = asking ? furnById(asking) : undefined, last = fs.last && Date.now() - fs.last.at < UNDO_MS ? fs.last : undefined;
  const bar = placing
    ? `<div class="furnBar" role="status"><b>${esc(furnById(placing.id)?.name ?? '')}</b><span class="${placing.ok ? 'ok' : 'bad'}">${esc(t(placing.ok ? 'fuFits' : 'fuNoFit'))}</span><button type="button" id="fuRot">↻ ${esc(t('fuRotate'))}</button><button type="button" id="fuCancel">✕ ${esc(t('fuCancel'))}</button>${last ? `<button type="button" id="fuUndo">↶ ${esc(t('fuUndo'))}</button>` : ''}</div>`
    : ask ? `<div class="furnBar furnAsk" role="alertdialog" aria-label="${esc(t('fuConfirm'))}"><span class="fic" aria-hidden="true">${ask.icon}</span><b>${esc(t('fuBuyFor').replace('{name}', ask.name).replace('{price}', G.money(ask.price)))}</b><button type="button" class="primary" id="fuYes">${esc(t('fuYes'))}</button><button type="button" id="fuNo">${esc(t('fuCancel'))}</button></div>`
    : last ? `<div class="furnBar" role="status"><b>${esc(furnById(last.id)?.name ?? '')}</b><span>${esc(t('fuBought'))}</span><button type="button" id="fuUndo">↶ ${esc(t('fuUndo'))}</button></div>`
    : `<p class="furnHint">${esc(t('fuHint'))}</p>`;
  const filters = cat === 'home' ? '' : `<div class="furnFilters"><input type="search" id="fuQ" placeholder="${esc(t('fuSearch'))}" value="${esc(q)}" aria-label="${esc(t('fuSearch'))}"><select id="fuSort" aria-label="${esc(t('fuSort'))}">${(['cheap', 'dear', 'stars'] as Sort[]).map(o => `<option value="${o}"${o === sort ? ' selected' : ''}>${esc(t('fuSort.' + o))}</option>`).join('')}</select><button type="button" class="fuChip" id="fuOwned" aria-pressed="${onlyOwned}">${esc(t('fuOwned'))}</button><button type="button" class="fuChip" id="fuWishes" aria-pressed="${onlyWish}">♥ ${esc(t('fuWishlist'))}</button></div>`;
  box.innerHTML = `<div class="furnHead"><b>${esc(t('fuCatalogue'))}</b><span class="furnMoney">${esc(G.money(s.money))}</span><span class="furnStars" title="${esc(t('fuStars'))}">★ ${totalStars(s)}</span><button type="button" id="fuHide">${esc(t('fuHide'))}</button></div>
    <div class="furnTabs" role="tablist"><button type="button" role="tab" data-cat="home" aria-selected="${cat === 'home'}">🏠 ${esc(t('hmTab'))}</button>${FURN_CATS.map(c => `<button type="button" role="tab" data-cat="${c.id}" aria-selected="${c.id === cat}">${c.icon} ${esc(t('fuCat.' + c.id) === 'fuCat.' + c.id ? c.label : t('fuCat.' + c.id))}</button>`).join('')}</div>
    ${bar}${filters}
    ${cat === 'home' ? homeHtml(s) : ''}
    ${cat !== 'home' && !items.length ? `<p class="furnHint">${esc(t('fuNothing'))}</p>` : ''}
    <ul class="furnGrid">${items.map(f => {
      const have = fs.stock[f.id] ?? 0, poor = s.money < f.price && !have, wish = onWishlist(s, f.id);
      return `<li><button type="button" class="furnCard${poor ? ' poor' : ''}" data-id="${f.id}" aria-label="${esc(f.name)}, ${f.wall ? 'wall' : `${f.w} by ${f.d}`}, ${esc(G.money(f.price))}"><span class="fsz">${f.wall ? t('fuWall') : `${f.w}×${f.d}`}</span><span class="fst">${stars(f.stars)}</span><span class="fic" aria-hidden="true">${f.icon}</span><span class="fnm">${esc(f.name)}</span><span class="fpr">${have ? `${esc(t('fuInStock'))} ${have}` : esc(G.money(f.price))}</span></button><button type="button" class="fuWish" data-wish="${f.id}" aria-pressed="${wish}" aria-label="${esc(t('fuWishlist'))}">${wish ? '♥' : '♡'}</button>${have ? `<button type="button" class="fuSell" data-sell="${f.id}">${esc(t('fuSell'))} ${esc(G.money(Math.floor(f.price / 2)))}</button>` : ''}</li>`;
    }).join('')}</ul>`;
  const redraw = (): void => drawFurnPanel(box, s, world, ui);
  box.querySelector<HTMLButtonElement>('#fuHide')!.onclick = () => ui.hide();
  box.querySelectorAll<HTMLButtonElement>('button[data-reno]').forEach(b => { b.onclick = () => { const [kind, val] = (b.dataset.reno as string).split(':') as [RenoKind, string]; const r = renovate(s, kind, kind === 'wall' ? (b.dataset.reno as string).slice(5) : val); ui.notify(r.msg); if (r.ok) { ui.changed(); world.refreshRoom(); } redraw(); }; });
  const bb = box.querySelector<HTMLButtonElement>('#hmBuild'); if (bb) bb.onclick = () => { const r = startNext(s); ui.notify(r.msg); if (r.ok) { ui.changed(); const v = buildView(s); world.setBuild({ done: v.done, working: v.working }); } redraw(); };
  box.querySelectorAll<HTMLButtonElement>('button[data-cat]').forEach(b => { b.onclick = () => { cat = b.dataset.cat as FurnCat | 'home'; asking = null; redraw(); }; });
  const rot = box.querySelector<HTMLButtonElement>('#fuRot'); if (rot) rot.onclick = () => { world.rotatePlacing(); redraw(); };
  const cancel = box.querySelector<HTMLButtonElement>('#fuCancel'); if (cancel) cancel.onclick = () => { world.setPlacing(null); redraw(); };
  // nothing is paid before the player says yes; for ten seconds afterwards the purchase can be taken back
  const yes = box.querySelector<HTMLButtonElement>('#fuYes'); if (yes) yes.onclick = () => {
    const id = asking; asking = null; if (!id) return;
    const r = buyFurn(s, id); ui.notify(r.msg); if (!r.ok) { redraw(); return; }
    ui.changed(); world.setPlacing(id); redraw();
    clearTimeout(undoTimer); undoTimer = window.setTimeout(() => { if (box.isConnected) redraw(); }, UNDO_MS + 50);
  };
  const no = box.querySelector<HTMLButtonElement>('#fuNo'); if (no) no.onclick = () => { asking = null; redraw(); };
  const undo = box.querySelector<HTMLButtonElement>('#fuUndo'); if (undo) undo.onclick = () => { const r = undoBuy(s); ui.notify(r.msg); if (r.ok) { if (world.placing()) world.setPlacing(null); ui.changed(); world.refreshRoom(); } redraw(); };
  const qi = box.querySelector<HTMLInputElement>('#fuQ'); if (qi) qi.oninput = () => { q = qi.value; const pos = qi.selectionStart; redraw(); const again = box.querySelector<HTMLInputElement>('#fuQ'); if (again) { again.focus(); if (pos !== null) again.setSelectionRange(pos, pos); } };
  const so = box.querySelector<HTMLSelectElement>('#fuSort'); if (so) so.onchange = () => { sort = so.value as Sort; redraw(); };
  const ow = box.querySelector<HTMLButtonElement>('#fuOwned'); if (ow) ow.onclick = () => { onlyOwned = !onlyOwned; redraw(); };
  const wl = box.querySelector<HTMLButtonElement>('#fuWishes'); if (wl) wl.onclick = () => { onlyWish = !onlyWish; redraw(); };
  box.querySelectorAll<HTMLButtonElement>('[data-wish]').forEach(b => { b.onclick = () => { toggleWish(s, b.dataset.wish as string); ui.changed(); redraw(); }; });
  box.querySelectorAll<HTMLButtonElement>('[data-sell]').forEach(b => { b.onclick = () => { const r = sellBack(s, b.dataset.sell as string); ui.notify(r.msg); if (r.ok) ui.changed(); redraw(); }; });
  box.querySelectorAll<HTMLButtonElement>('.furnCard').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.id as string, f = furnById(id); if (!f) return;
      if ((furnOf(s).stock[id] ?? 0) < 1) {
        if (s.money < f.price) { ui.notify(t('fuPoor')); return; }
        asking = id; redraw(); return;                                         // ask first: "Buy it for ...?"
      }
      world.setPlacing(id); redraw();
    };
  });
}
/** For tests: forget the catalogue's filters and any question waiting. */
export function resetFurnPanel(): void { q = ''; sort = 'cheap'; onlyOwned = false; onlyWish = false; asking = null; cat = 'design'; }
