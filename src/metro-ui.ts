/* The metro map (or, in a city without a metro, the bus map): three coloured lines that meet at the centre, with a station for every place of the
   game and for every place to go (banya, park, café...). Tapping a station shows what is there and a button to go. The places themselves and their
   trips are the engine's; the visits are in venues.ts. The lines are a drawing for the game, not the real metro of any city. */
import type { State } from './engine';
import * as G from './engine';
import { VENUES, hasMetro, fareOf, closed, photosOf, TAXI } from './venues';
import { t, lang } from './i18n';
import { metroOf, metroRoute } from './metro-data';
import './i18n-life';

const esc = (x: string): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
/** The lines: each a colour and its stations, from one end to the other; every line passes through the centre. */
export const LINES: { id: string; color: string; name: string; ru: string; stations: string[] }[] = [
  { id: 'red', color: '#e0373f', name: 'Red line', ru: 'Красная линия', stations: ['airport', 'uni', 'library', 'center', 'home', 'banya', 'station'] },
  { id: 'blue', color: '#2f6fd6', name: 'Blue line', ru: 'Синяя линия', stations: ['hospital', 'clinic', 'cafe', 'center', 'bank', 'market', 'mall', 'cinema'] },
  { id: 'green', color: '#1f9d55', name: 'Green line', ru: 'Зелёная линия', stations: ['shelter', 'park', 'mfc', 'guvm', 'center', 'work', 'agency', 'dealer', 'gym'] },
  { id: 'yellow', color: '#d69e2e', name: 'Yellow line', ru: 'Жёлтая линия', stations: ['embankment', 'cathedral', 'center', 'stadium', 'tower', 'rink'] },
];
export const stationIds = (): string[] => [...new Set(LINES.flatMap(l => l.stations))];
const nameOf = (id: string, ru: boolean): { name: string; icon: string; venue: boolean } => {
  const v = VENUES.find(x => x.id === id); if (v) return { name: ru ? v.ru : v.name, icon: v.icon, venue: true };
  const p = G.PLACES.find(x => x.id === id); return { name: p ? p.n : id, icon: '', venue: false };
};

export interface MetroDeps { goPlace: (id: string) => void; visit: (id: string) => void; close: () => void }
/** Draws the map into `host`; a tapped station shows a card with a button to go. */
export function openMetro(host: HTMLElement, s: State, d: MetroDeps): void {
  const ru = lang() === 'ru', metro = hasMetro(s.city);
  let picked: string | null = null;
  let plan: { from: string; to: string } = { from: '', to: '' };
  // each line is a straight line through the centre at its own angle; the centre is shared
  const W = 460, H = 420, C = { x: W / 2, y: H / 2 }, R = 185;
  const pos = new Map<string, { x: number; y: number }>([['center', C]]);
  LINES.forEach((l, li) => {
    const a = (li / LINES.length) * Math.PI, ci = l.stations.indexOf('center'), n = l.stations.length;
    l.stations.forEach((st, k) => { if (st === 'center') return; const f = (k - ci) / Math.max(ci, n - 1 - ci); pos.set(st, { x: C.x + Math.cos(a) * R * f, y: C.y + Math.sin(a) * R * f }); });
  });
  const draw = (): void => {
    const lines = LINES.map(l => `<polyline points="${l.stations.map(st => `${pos.get(st)!.x.toFixed(1)},${pos.get(st)!.y.toFixed(1)}`).join(' ')}" fill="none" stroke="${l.color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    const dots = stationIds().map(id => { const p = pos.get(id)!, nm = nameOf(id, ru), here = id === s.loc; return `<g class="st${here ? ' here' : ''}${picked === id ? ' picked' : ''}" data-st="${id}" role="button" tabindex="0" aria-label="${esc(nm.name)}"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${id === 'center' ? 9 : 6.5}" fill="#fff" stroke="#1e2235" stroke-width="${here ? 4 : 2.5}"/><text x="${(p.x + (p.x > W - 120 ? -9 : 9)).toFixed(1)}" y="${(p.y + (stationIds().indexOf(id) % 2 ? 15 : -7)).toFixed(1)}" font-size="10" text-anchor="${p.x > W - 120 ? 'end' : 'start'}">${nm.icon ? nm.icon + ' ' : ''}${esc(nm.name)}</text></g>`; }).join('');
    let card = '';
    if (picked) {
      const nm = nameOf(picked, ru), v = VENUES.find(x => x.id === picked);
      if (v) { const why = closed(s, v), shot = v.landmark ? (photosOf(s).includes(v.id) ? ` · 📷 ${esc(t('mtShot'))}` : ` · 📷 ${esc(t('mtPhoto'))}`) : ''; card = `<div class="mtCard"><b>${v.icon} ${esc(nm.name)}</b><p>${esc(ru ? v.ru_text : v.text)}</p><p class="sub">${esc(t('mtTicket'))}: ${v.price ? esc(G.money(v.price)) : esc(t('actFree'))} · ${esc(t(metro ? 'mtMetroFare' : 'mtBusFare'))} ${esc(G.money(fareOf(s.city)))} · 🚕 ${esc(G.money(TAXI))}${shot}</p>${why ? `<p class="why">${esc(why)}</p>` : ''}<button type="button" class="primary" data-mt="go"${why ? ' disabled' : ''}>${esc(t('mtGo'))}</button></div>`; }
      else card = `<div class="mtCard"><b>${esc(nm.name)}</b>${picked === s.loc ? `<p class="sub">${esc(t('mtHere'))}</p>` : `<button type="button" class="primary" data-mt="go">${esc(t('mtGo'))}</button>`}</div>`;
    }
    host.innerHTML = `<div class="metro"><h3>${metro ? 'Ⓜ' : '🚌'} ${esc(t(metro ? 'mtTitle' : 'mtBus'))} · ${esc(s.city)}</h3><p class="sub">${esc(t('mtHint'))}</p>
      <svg class="mtMap" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t(metro ? 'mtTitle' : 'mtBus'))}">${lines}${dots}</svg>
      <div class="mtLegend">${LINES.map(l => `<span><i style="background:${l.color}"></i>${esc(ru ? l.ru : l.name)}</span>`).join('')}</div>${card}
      <p class="sub">📷 ${esc(t('mtCollection'))}: ${photosOf(s).length}/${VENUES.filter(v => v.landmark).length}</p>${realHtml()}</div>`;
    host.querySelectorAll<SVGGElement>('[data-st]').forEach(g => { const pick = (): void => { picked = g.dataset.st ?? null; draw(); }; g.addEventListener('click', pick); g.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Enter') pick(); }); });
    const pf = host.querySelector<HTMLSelectElement>('#mtFrom'), pt = host.querySelector<HTMLSelectElement>('#mtTo');
    if (pf && pt) { const upd = (): void => { plan = { from: pf.value, to: pt.value }; draw(); host.querySelector<HTMLElement>('.mtReal')?.setAttribute('open', ''); }; pf.onchange = upd; pt.onchange = upd; }
    const go = host.querySelector<HTMLButtonElement>('[data-mt="go"]'); if (go && picked) go.onclick = () => { const id = picked as string; d.close(); if (VENUES.some(v => v.id === id)) d.visit(id); else d.goPlace(id); };
  };
  /** The real metro of the city (metro-data.ts): every line with its stations, and a planner between any two real stations. */
  const realHtml = (): string => {
    const m = metroOf(s.city); if (!m) return '';
    const all = Array.from(new Set(m.lines.flatMap(l => l.stations))).sort();
    const opts = (sel: string): string => `<option value="">—</option>${all.map(st => `<option${st === sel ? ' selected' : ''}>${esc(st)}</option>`).join('')}`;
    const r = plan.from && plan.to ? metroRoute(s.city, plan.from, plan.to) : null;
    const result = r ? `<ol class="mtPlan">${r.legs.map(g => `<li><i style="background:${g.line.color}"></i><b>${esc(g.line.num)} ${esc(g.line.name)}</b>: ${esc(g.stops[0])} → ${esc(g.stops[g.stops.length - 1])} · ${g.stops.length - 1} ${esc(t('mtStops'))}</li>`).join('')}</ol><p class="sub">≈ ${r.minutes} ${esc(t('mtMinutes'))}</p>` : plan.from && plan.to && plan.from !== plan.to ? `<p class="sub">${esc(t('mtNoRoute'))}</p>` : '';
    return `<details class="mtReal"${plan.from || plan.to ? ' open' : ''}><summary>${esc(t('mtReal'))} · ${m.lines.length} ${esc(t('mtLines'))}, ${all.length} ${esc(t('mtStations'))}</summary>
      <div class="mtPlanner"><label>${esc(t('mtFrom'))}<select id="mtFrom">${opts(plan.from)}</select></label><label>${esc(t('mtTo'))}<select id="mtTo">${opts(plan.to)}</select></label></div>${result}
      <ul class="mtLines">${m.lines.map(l => `<li><details><summary><i style="background:${l.color}"></i><b>${esc(l.num)}</b> ${esc(l.name)} · ${l.stations.length}${l.ring ? ' ⟳' : ''}</summary><p class="sub">${l.stations.map(esc).join(' · ')}</p></details></li>`).join('')}</ul>
      <p class="sub">${esc(t('mtSource'))}</p></details>`;
  };
  draw();
}
