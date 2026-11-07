/* The phone's Land & shop app. Four tabs: Plots (buy land, pay the land tax, ask for the building permit), Materials (order and see the stock and the deliveries),
   Designer (a grid of the plot: pick a piece up, drop it on a square; squares are buttons, so a keyboard and a screen reader work too) and Shop (open or close
   the finished building as a business). All rules are in land.ts; this file only draws and passes the player's choices on. */
import type { State } from './engine';
import * as L from './land';
import { lang } from './i18n';
import { playOk } from './sound';

const ru = (): boolean => lang() === 'ru';
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const rub = (n: number): string => `${Math.round(n).toLocaleString('en-US')} ₽`;
const W: Record<string, [string, string]> = {
  title: ['Land & shop', 'Земля и магазин'], back: ['‹ Back', '‹ Назад'], plots: ['Plots', 'Участки'], mats: ['Materials', 'Материалы'], design: ['Designer', 'Проектировщик'], shop: ['Shop', 'Магазин'],
  forSale: ['For sale in', 'Продаётся в'], mine: ['Your plots', 'Ваши участки'], buy: ['Buy', 'Купить'], housing: ['Housing', 'Жильё'], shopP: ['Shop', 'Магазин'], tax: ['Land tax due', 'Земельный налог к оплате'], pay: ['Pay', 'Оплатить'],
  permit: ['Ask for permit', 'Подать заявление'], granted: ['Permit granted', 'Разрешение есть'], asked: ['Waiting for the administration', 'Ждём администрацию'], taxYear: ['tax per year', 'налог в год'],
  order: ['Order', 'Заказать'], stock: ['In stock', 'На складе'], onway: ['On the way', 'В пути'], day: ['day', 'день'], hand: ['In your hand', 'В руке'], none: ['nothing', 'ничего'], drop: ['Tap a square to drop it. Tap a placed piece to pick it up.', 'Нажмите на клетку, чтобы поставить. Нажмите на поставленное, чтобы поднять.'],
  open: ['Open the shop', 'Открыть магазин'], close: ['Close the shop', 'Закрыть магазин'], name: ['Shop name', 'Название магазина'], noPlots: ['You have no plots yet. Buy one under Plots.', 'Участков пока нет. Купите на вкладке «Участки».'], choose: ['Choose a plot', 'Выберите участок'], bin: ['Put back', 'Убрать'],
  help: ['Everything here happens inside the game. Prices, sizes and waiting times are invented; the steps follow real life in a simplified way.', 'Всё происходит внутри игры. Цены, размеры и сроки придуманы; шаги упрощённо повторяют настоящие.'],
};
const w = (k: string): string => W[k]?.[ru() ? 1 : 0] ?? k;
const PN: Record<string, string> = { wall: 'Стена', door: 'Дверь', window: 'Окно', floor: 'Пол', counter: 'Прилавок', shelf: 'Полка', sign: 'Вывеска' };
const MN: Record<string, string> = { brick: 'Кирпич (пачка)', board: 'Половые доски (пачка)', timber: 'Брус', glass: 'Оконное стекло', door: 'Дверь', paint: 'Краска и доски для вывески' };
const pname = (p: L.PieceInfo): string => ru() ? PN[p.id] ?? p.name : p.name;
const mname = (m: L.Material): string => ru() ? MN[m.id] ?? m.name : m.name;

export interface LandDeps { back: () => void; refresh: () => void; notify: (m: string) => void }
type Tab = 'plots' | 'mats' | 'design' | 'shop';
const view: { tab: Tab; plot: number; hand: L.Piece | null } = { tab: 'plots', plot: 0, hand: null };

export function landHtml(s: State, flash = ''): string {
  L.settle(s);
  const land = L.landOf(s);
  if (!land.plots.some(p => p.id === view.plot)) view.plot = land.plots[0]?.id ?? 0;
  const plot = L.plotOf(s, view.plot);
  const tabs = (['plots', 'mats', 'design', 'shop'] as Tab[]).map(k => `<button type="button" role="tab" class="svChip${view.tab === k ? ' on' : ''}" aria-selected="${view.tab === k}" data-lt="${k}">${esc(w(k === 'plots' ? 'plots' : k === 'mats' ? 'mats' : k === 'design' ? 'design' : 'shop'))}</button>`).join('');
  const picker = land.plots.length > 1 ? `<label class="laSearch">${esc(w('choose'))} <select id="ltPlot">${land.plots.map(p => `<option value="${p.id}" ${p.id === view.plot ? 'selected' : ''}>${esc(p.city)}, ${esc(p.district)} · ${L.m2(p)} m²</option>`).join('')}</select></label>` : '';
  let body = '';
  if (view.tab === 'plots') {
    const due = L.taxDue(s);
    body = `<h3>${esc(w('forSale'))} ${esc(s.city)}</h3><ul class="svVacs">${L.offersFor(s).filter(o => !land.plots.some(p => p.offer === o.id)).map(o => `<li class="svVac"><span class="svIc">${o.purpose === 'home' ? '🏡' : '🏪'}</span><div><b>${esc(o.district)} · ${o.cols * o.rows * L.CELL_M2} m²</b><div class="svTags"><span>${esc(o.purpose === 'home' ? w('housing') : w('shopP'))}</span><span class="svPay">${rub(o.price)}</span></div><button type="button" class="ghost small" data-lbuy="${esc(o.id)}">${esc(w('buy'))}</button></div></li>`).join('')}</ul>
      <h3>${esc(w('mine'))}</h3>${land.plots.length ? `<ul class="svVacs">${land.plots.map(p => `<li class="svVac"><span class="svIc">${p.purpose === 'home' ? '🏡' : '🏪'}</span><div><b>${esc(p.city)}, ${esc(p.district)} · ${L.m2(p)} m²</b><div class="svTags"><span>${rub(L.taxPerYear(p))} ${esc(w('taxYear'))}</span></div>
        ${p.permit === 'granted' ? `<small>✔ ${esc(w('granted'))}</small>` : p.permit === 'asked' ? `<small>⏳ ${esc(w('asked'))}</small>` : `<button type="button" class="ghost small" data-lpermit="${p.id}">${esc(w('permit'))}</button>`}</div></li>`).join('')}</ul>` : `<p class="hint">${esc(w('noPlots'))}</p>`}
      ${due > 0 ? `<p>${esc(w('tax'))}: <b>${rub(due)}</b> <button type="button" class="ghost small" data-ltax="1">${esc(w('pay'))}</button></p>` : ''}`;
  } else if (view.tab === 'mats') {
    body = `<ul class="svVacs">${L.MATERIALS.map(m => `<li class="svVac"><span class="svIc">${m.icon}</span><div><b>${esc(mname(m))}</b><div class="svTags"><span class="svPay">${rub(m.price)}</span><span>${esc(w('stock'))}: ${land.stock[m.id] || 0}</span></div>
      <form class="chatForm" data-lord="${m.id}"><input inputmode="numeric" maxlength="2" value="5" aria-label="${esc(mname(m))}"><button type="submit" class="ghost small">${esc(w('order'))}</button></form></div></li>`).join('')}</ul>
      ${land.orders.length ? `<h3>${esc(w('onway'))}</h3><ul class="hint">${land.orders.map(o => `<li>${o.qty} × ${esc(mname(L.matById(o.item) as L.Material))} · ${esc(w('day'))} ${o.arriveDay + 1}</li>`).join('')}</ul>` : ''}`;
  } else if (view.tab === 'design') {
    if (!plot) body = `<p class="hint">${esc(w('noPlots'))}</p>`;
    else {
      const chk = L.inspect(plot);
      body = `<div class="ltPal" role="toolbar">${L.PIECES.map(p => `<button type="button" class="svChip${view.hand === p.id ? ' on' : ''}" data-lhand="${p.id}" aria-pressed="${view.hand === p.id}" title="${esc(Object.entries(p.needs).map(([k, n]) => `${n} × ${mname(L.matById(k) as L.Material)}`).join(', '))}">${p.icon} ${esc(pname(p))} <small>${Object.entries(p.needs).map(([k]) => land.stock[k] || 0).join('/')}</small></button>`).join('')}</div>
        <p class="hint">${esc(w('hand'))}: ${view.hand ? esc(pname(L.pieceById(view.hand) as L.PieceInfo)) : esc(w('none'))}. ${esc(w('drop'))}</p>
        <div class="ltGrid" style="grid-template-columns:repeat(${plot.cols},1fr)">${Array.from({ length: plot.cols * plot.rows }, (_, k) => { const i = k % plot.cols, j = Math.floor(k / plot.cols), c = L.cellAt(plot, i, j); return `<button type="button" class="ltCell${c ? ' ' + c.id : ''}" data-lcell="${i},${j}" aria-label="${i + 1},${j + 1} ${c ? esc(pname(c)) : '·'}">${c ? c.icon : ''}</button>`; }).join('')}</div>
        <ul class="hint">${chk.problems.map(x => `<li>${esc(x)}</li>`).join('') || `<li>✔ ${chk.room} m²/4 · ${chk.counters} ${esc(ru() ? 'прилавков' : 'counters')} · ${chk.shelves} ${esc(ru() ? 'полок' : 'shelves')}</li>`}</ul>`;
    }
  } else {
    if (!plot) body = `<p class="hint">${esc(w('noPlots'))}</p>`;
    else body = plot.shop ? `<p>🏪 <b>${esc(plot.shop)}</b></p><button type="button" class="ghost" data-lclose="${plot.id}">${esc(w('close'))}</button>`
      : `<form class="chatForm" id="ltShop"><input id="ltName" maxlength="30" placeholder="${esc(w('name'))}" aria-label="${esc(w('name'))}"><button type="submit" class="primary">${esc(w('open'))} (${rub(L.CASH_REGISTER)})</button></form><p class="hint">${esc(ru() ? 'Нужны: закрытое здание с дверью, прилавок, полка и вывеска, регистрация в России и онлайн-касса (54-ФЗ).' : 'You need: a closed building with a door, a counter, a shelf and a sign, registration in Russia, and an online cash register (54-FZ).')}</p>`;
  }
  return `<div class="svc"><div class="phHead"><button class="ghost" data-lback="1">${esc(w('back'))}</button><b>🏗️ ${esc(w('title'))}</b></div>${flash ? `<p class="phNote" role="status">${esc(flash)}</p>` : ''}<p class="hint">${esc(w('help'))}</p>
    <div class="svChips" role="tablist">${tabs}</div>${view.tab === 'design' || view.tab === 'shop' ? picker : ''}${body}<p class="hint">${esc(ru() ? 'Деньги' : 'Money')}: ${rub(s.money)}</p></div>`;
}

export function openLand(host: HTMLElement, s: State, d: LandDeps): void {
  let flash = '';
  const draw = (): void => { host.innerHTML = landHtml(s, flash); flash = ''; wire(); };
  const done = (r: L.Result): void => { playOk(r.ok); flash = r.msg; if (r.ok) d.refresh(); draw(); };
  function wire(): void {
    host.querySelector<HTMLButtonElement>('[data-lback]')!.onclick = () => d.back();
    host.querySelectorAll<HTMLButtonElement>('[data-lt]').forEach(b => { b.onclick = () => { view.tab = b.dataset.lt as Tab; draw(); }; });
    const pick = host.querySelector<HTMLSelectElement>('#ltPlot'); if (pick) pick.onchange = () => { view.plot = Number(pick.value); draw(); };
    host.querySelectorAll<HTMLButtonElement>('[data-lbuy]').forEach(b => { b.onclick = () => { const r = L.buyPlot(s, b.dataset.lbuy as string); if (r.ok) view.plot = L.landOf(s).plots.at(-1)?.id ?? view.plot; done(r); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-lpermit]').forEach(b => { b.onclick = () => done(L.askPermit(s, Number(b.dataset.lpermit))); });
    host.querySelectorAll<HTMLButtonElement>('[data-ltax]').forEach(b => { b.onclick = () => done(L.payTax(s)); });
    host.querySelectorAll<HTMLFormElement>('form[data-lord]').forEach(f => { f.onsubmit = e => { e.preventDefault(); done(L.orderMaterial(s, f.dataset.lord as string, Number((f.querySelector('input') as HTMLInputElement).value))); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-lhand]').forEach(b => { b.onclick = () => { view.hand = view.hand === b.dataset.lhand ? null : b.dataset.lhand as L.Piece; draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('[data-lcell]').forEach(b => {
      b.onclick = () => {
        const [i, j] = (b.dataset.lcell as string).split(',').map(Number), plot = L.plotOf(s, view.plot); if (!plot) return;
        if (L.cellAt(plot, i, j)) { const r = L.lift(s, plot.id, i, j); if (r.ok && r.piece) view.hand = r.piece; return done(r); }     // pick up: the piece is now in the hand
        if (!view.hand) { flash = ru() ? 'Сначала выберите деталь.' : 'Choose a piece first.'; return draw(); }
        done(L.drop(s, plot.id, view.hand, i, j));
      };
    });
    const sf = host.querySelector<HTMLFormElement>('#ltShop'); if (sf) sf.onsubmit = e => { e.preventDefault(); done(L.openShop(s, view.plot, (host.querySelector('#ltName') as HTMLInputElement).value)); };
    host.querySelectorAll<HTMLButtonElement>('[data-lclose]').forEach(b => { b.onclick = () => done(L.closeShop(s, Number(b.dataset.lclose))); });
  }
  draw();
}
