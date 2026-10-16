/* The shop screen: a portrait of the player, category tabs and a grid of items with a Buy button.
   Everything the screen does goes through shop.ts; this file only draws and wires buttons. */
import * as G from './engine';
import type { State } from './engine';
import { CATALOG, CATEGORIES, buy, unavailable, wardrobe, wear, wearing, tierOf } from './shop';
import { advice, warmthMeter, OUTER_WARMTH, HAT_WARMTH } from './warmth';
import { lang } from './i18n';
import type { ShopCat } from './shop';
import { bodyHtml } from './figure';
import { play } from './sound';
import { t } from './i18n';

const esc = (x: string): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export interface ShopDeps { s: State; host: HTMLElement; show: () => void; refresh: () => void }

const TIER: Record<string, [string, string]> = { budget: ['market stall', 'рынок'], mid: ['mall', 'торговый центр'], premium: ['boutique', 'бутик'] };
const tierText = (i: { price: number; slot?: string; id: string }): string => { const w = i.slot === 'outer' ? OUTER_WARMTH[i.id] : i.slot === 'hat' ? HAT_WARMTH[i.id] : 0; return TIER[tierOf(i)][lang() === 'ru' ? 1 : 0] + (w ? ` · 🔥 ${w}` : ''); };
const fxText = (fx: G.Effects): string => {
  const parts: string[] = [];
  if (fx.energy) parts.push(`${fx.energy > 0 ? '+' : ''}${fx.energy} ${t('stat.energy')}`);
  if (fx.stress) parts.push(`${fx.stress > 0 ? '+' : ''}${fx.stress} ${t('stat.stress')}`);
  if (fx.health) parts.push(`+${fx.health} ${t('stat.health')}`);
  if (fx.clothes) parts.push(`+${fx.clothes} ${t('stat.clothes')}`);
  if (fx.rep) parts.push(`+${fx.rep} ${t('stat.rep')}`);
  if (fx.know) parts.push(`+${fx.know} ${t('stat.know')}`);
  if (fx.famLove) parts.push(`+${fx.famLove} ${t('stat.famLove')}`);
  return parts.join(' · ');
};

export function openShop(d: ShopDeps): void {
  const { s, host } = d;
  let cat: ShopCat | 'wardrobe' = 'clothes';
  let flash = '';

  const draw = (): void => {
    const items = cat === 'wardrobe' ? wardrobe(s) : CATALOG.filter(i => i.cat === cat);
    host.innerHTML = `<div class="shop"><div class="shopHead"><div class="shopMe">${bodyHtml(s.look, s.worn, s.name)}</div><div><b>${esc(s.name)}</b><div class="sub">${esc(t('shopMoney'))}: <b>${esc(G.money(s.money))}</b></div><div class="sub">${esc(t('stat.clothes'))}: ${Math.round(s.clothes)}</div></div></div>
      ${flash ? `<p class="phNote" role="status">${esc(flash)}</p>` : ''}
      <p class="sub weatherTip">${(() => { const a = advice(s), m = warmthMeter(s); return esc(a.line) + (m === null ? '' : ` · 🧣 ${m}/100`); })()}</p>
      <div class="tabs shopTabs" role="tablist">${CATEGORIES.map(c => `<button role="tab" data-cat="${c.id}" aria-selected="${c.id === cat}">${c.icon} ${esc(c.label)}</button>`).join('')}<button role="tab" data-cat="wardrobe" aria-selected="${cat === 'wardrobe'}">👚 ${esc(t('shopWardrobe'))}</button></div>
      <ul class="shopGrid">${cat === 'wardrobe' && !items.length ? `<li class="hint">${esc(t('shopWardrobeEmpty'))}</li>` : ''}${items.map(i => { if (cat === 'wardrobe') { const on = wearing(s, i); return `<li class="item"><span class="itemIcon" aria-hidden="true">${i.icon}</span><b>${esc(i.name)}</b><small>${esc(i.blurb)}</small><div class="priceRow"><span class="price">${on ? '✔' : ''}</span><button class="${on ? '' : 'primary'}" data-wear="${i.id}">${esc(i.slot && on ? t('shopTakeOff') : on ? t('shopWorn') : t('shopWear'))}</button></div></li>`; } const why = unavailable(s, i); return `<li class="item ${why ? 'off' : ''}"><span class="itemIcon" aria-hidden="true">${i.icon}</span><b>${esc(i.name)}</b><small>${esc(i.blurb)}</small><small class="fx">${esc(fxText(i.fx))}</small>${i.cat === 'clothes' ? `<small class="tier">${esc(tierText(i))}</small>` : ''}<div class="priceRow"><span class="price">${esc(G.money(i.price))}</span><button class="primary" data-buy="${i.id}" ${why ? `disabled title="${esc(why)}"` : ''}>${esc(why && why.startsWith('You already') ? t('shopOwned') : t('shopBuy'))}</button></div></li>`; }).join('')}</ul></div>`;
    flash = '';
    host.querySelectorAll<HTMLButtonElement>('button[data-cat]').forEach(b => { b.onclick = () => { cat = b.dataset.cat as ShopCat | 'wardrobe'; draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('button[data-wear]').forEach(b => { b.onclick = () => { const r = wear(s, b.dataset.wear as string); flash = r.message; play(r.ok ? 'pop' : 'error'); if (r.ok) d.refresh(); draw(); }; });
    host.querySelectorAll<HTMLButtonElement>('button[data-buy]').forEach(b => {
      b.onclick = () => {
        const r = buy(s, b.dataset.buy as string);
        flash = r.message;
        play(r.ok ? 'coin' : 'error');
        if (r.ok) d.refresh();
        draw();
      };
    });
  };

  d.show();
  draw();
}
