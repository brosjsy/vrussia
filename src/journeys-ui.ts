/* The drawing of journeys (journeys.ts): a small map of the city with the route as numbered stops joined by arrows, and under it the flowchart of
   steps (done, now, later) with a button that walks to the place of the step that is next. */
import type { State } from './engine';
import { PLACES, placeById } from './engine';
import { lang } from './i18n';
import { placeL } from './i18n-words';
import { JOURNEYS, journeyById, walkThrough, routePlaces, finished } from './journeys';

export interface JourneyDeps { close: () => void; go: (placeId: string) => void; canGo: () => boolean }
const esc = (x: string): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const COLOR = { done: 'var(--ok,#2fa36b)', now: 'var(--accent,#3b6fe0)', later: 'var(--mute,#8a94ad)' };

/** The map: all places as small dots, the route as a dashed line with arrows, the stops numbered, and a ring where the player stands. */
function mapSvg(s: State, id: string, ru: boolean): string {
  const j = journeyById(id); if (!j) return '';
  const steps = walkThrough(s, j), path = routePlaces(s, j);
  const pt = (pid: string): { x: number; y: number } => { const p = placeById(pid); return { x: p.x, y: p.y }; };
  const dots = PLACES.map(p => `<circle cx="${p.x}" cy="${p.y}" r="1.6" fill="var(--line,#cdd3e6)"/><text x="${p.x}" y="${p.y + 5}" font-size="3.2" text-anchor="middle" fill="var(--mute,#7a849c)">${esc(placeL(p.n))}</text>`).join('');
  const line = path.length > 1 ? `<polyline points="${path.map(p => `${pt(p).x},${pt(p).y}`).join(' ')}" fill="none" stroke="${COLOR.now}" stroke-width="1" stroke-dasharray="2.5 1.8" marker-mid="url(#arr)" marker-end="url(#arr)"/>` : '';
  const stops: string[] = [];
  for (const x of steps) {
    if (!x.step.place) continue;
    const q = pt(x.step.place);
    if (stops.some(t => t.includes(`data-p="${x.step.place}"`))) continue;
    stops.push(`<g data-p="${x.step.place}"><circle cx="${q.x}" cy="${q.y}" r="4.2" fill="${COLOR[x.state]}"/><text x="${q.x}" y="${q.y + 1.4}" font-size="4.2" font-weight="700" text-anchor="middle" fill="#fff">${x.n}</text></g>`);
  }
  const me = pt(s.loc);
  return `<svg class="jMap" viewBox="0 0 100 100" role="img" aria-label="${esc(ru ? 'Карта маршрута' : 'Route map')}" style="width:100%;max-height:340px;background:var(--card2,#eef1fa);border-radius:12px">
    <defs><marker id="arr" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="${COLOR.now}"/></marker></defs>
    ${dots}${line}<circle cx="${me.x}" cy="${me.y}" r="6" fill="none" stroke="${COLOR.now}" stroke-width=".8"/><text x="${me.x}" y="${me.y - 7.5}" font-size="3.4" text-anchor="middle" fill="${COLOR.now}">${ru ? 'вы здесь' : 'you are here'}</text>${stops.join('')}</svg>`;
}

export function openJourneys(host: HTMLElement, s: State, d: JourneyDeps, start?: string | null): void {
  const ru = lang() === 'ru', tx = (b: [string, string]): string => (ru ? b[1] : b[0]);
  const list = (): void => {
    host.innerHTML = `<div class="phone sub journeys"><div class="phHead"><button class="ghost" data-j="close">‹ ${ru ? 'Закрыть' : 'Close'}</button><b>🗺️ ${ru ? 'Маршруты' : 'Routes'}</b></div>
      <p class="sub">${ru ? 'Выберите, что вы хотите сделать. Игра покажет путь по городу и шаги.' : 'Choose what you want to do. The game shows the way across the city and the steps.'}</p>
      <ul class="msgs">${JOURNEYS.map(j => { const f = finished(s, j); return `<li><button class="thread" data-j="open" data-id="${j.id}"><span class="msgIcon">${f ? '✅' : j.icon}</span><div><b>${esc(tx(j.title))}</b><small>${walkThrough(s, j).filter(x => x.state === 'done').length} / ${walkThrough(s, j).length}</small></div></button></li>`; }).join('')}</ul></div>`;
    wire();
  };
  const open = (id: string): void => {
    const j = journeyById(id); if (!j) return list();
    const steps = walkThrough(s, j), cur = steps.find(x => x.state === 'now');
    const goBtn = cur?.step.place && cur.step.place !== s.loc && d.canGo() ? `<button type="button" class="primary" data-j="go" data-p="${cur.step.place}">🚶 ${ru ? 'Идти:' : 'Go to'} ${esc(placeL(placeById(cur.step.place).n))}</button>` : '';
    const here = cur?.step.place && cur.step.place === s.loc ? `<p class="phNote">📍 ${ru ? 'Вы уже на месте. Войдите в здание или выберите действие.' : 'You are already here. Go inside or pick an action.'}</p>` : '';
    host.innerHTML = `<div class="phone sub journeys"><div class="phHead"><button class="ghost" data-j="list">‹ ${ru ? 'Все маршруты' : 'All routes'}</button><b>${j.icon} ${esc(tx(j.title))}</b></div>
      ${mapSvg(s, id, ru)}
      <ol class="jFlow" style="list-style:none;padding:0;margin:12px 0">${steps.map((x, i) => `<li style="display:flex;gap:10px;align-items:flex-start;margin:0 0 6px"><span aria-hidden="true" style="min-width:26px;height:26px;border-radius:50%;background:${COLOR[x.state]};color:#fff;display:grid;place-items:center;font-weight:700">${x.state === 'done' ? '✓' : x.n}</span>
        <div style="flex:1;padding:6px 10px;border:1px solid var(--line,#d4daee);border-radius:10px;${x.state === 'now' ? 'border-color:var(--accent,#3b6fe0);' : ''}opacity:${x.state === 'later' ? .7 : 1}"><b>${x.step.icon} ${esc(tx(x.step.title))}</b>${x.step.place ? ` <small>📍 ${esc(placeL(placeById(x.step.place).n))}</small>` : ` <small>📱 ${ru ? 'в телефоне' : 'in the phone'}</small>`}<br><small>${esc(tx(x.step.note))}</small></div></li>${i < steps.length - 1 ? '<li aria-hidden="true" style="margin:-2px 0 4px 8px;color:var(--mute)">↓</li>' : ''}`).join('')}</ol>
      ${finished(s, j) ? `<p class="phNote">🎉 ${ru ? 'Готово! Все шаги выполнены.' : 'Done! Every step is complete.'}</p>` : ''}${here}${goBtn}</div>`;
    wire(id);
  };
  const wire = (id?: string): void => {
    host.querySelectorAll<HTMLButtonElement>('[data-j]').forEach(b => { b.onclick = () => {
      const a = b.dataset.j;
      if (a === 'close') return d.close();
      if (a === 'list') return list();
      if (a === 'open') return open(b.dataset.id as string);
      if (a === 'go' && b.dataset.p) { d.go(b.dataset.p); return; }
      if (id) open(id);
    }; });
  };
  if (start && journeyById(start)) open(start); else list();
}
