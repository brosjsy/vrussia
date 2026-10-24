/* The Kitchen's online challenge on the screen: today's dish for every player (cook.ts, dishOfRealDay), the table of the day's best from the server,
   and sending the player's score after cooking it (only when logged in). Its own small download, loaded with the Kitchen. */
import * as C from './cook';
import type { OnlineClient } from './cloud';
import type { CookTable } from './api-client';
import { lang } from './i18n';

const ru = (): boolean => lang() === 'ru';
const esc = (x: unknown): string => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const W: Record<string, [string, string]> = {
  title: ["Today's online challenge", 'Онлайн-задание дня'], players: ['players today', 'игроков сегодня'], player: ['player today', 'игрок сегодня'], none: ['Nobody has cooked it yet today: be the first.', 'Сегодня его ещё никто не готовил: будьте первым.'],
  you: ['Your place', 'Ваше место'], login: ['Log in (🌐) to put your score on the table.', 'Войдите (🌐), чтобы ваш результат попал в таблицу.'], cook: ['Cook it', 'Готовить'],
  offline: ['The table is online only.', 'Таблица есть только онлайн.'], sent: ['Sent to today\'s table: your place is', 'Отправлено в таблицу дня: ваше место'],
};
const w = (k: string): string => W[k][ru() ? 1 : 0];
async function client(): Promise<OnlineClient | null> { try { return (await import('./cloud')).cloud(); } catch { return null; } }

/** Fills the panel: today's dish and its table. `open` starts cooking the dish. */
export async function fillPanel(el: HTMLElement, open: (id: string) => void): Promise<void> {
  const d = C.dishOfRealDay(); if (!d) return;
  const c = await client(), r = c?.cookToday ? await c.cookToday(d.id).catch(() => null) : null, t: CookTable | null = r?.ok && r.data ? r.data : null;
  const signedIn = !!(c && (c as { session?: () => unknown }).session?.());
  el.innerHTML = `<div class="ckOnline"><b>🏆 ${esc(w('title'))}: ${esc(ru() ? d.ru : d.name)}</b>${t ? ` <small>· ${t.count} ${esc(w(t.count === 1 ? 'player' : 'players'))}</small>` : ''}
    ${t ? (t.top.length ? `<ol>${t.top.map(x => `<li>${esc(x.username)} · ${x.score}% ${'★'.repeat(x.stars)}</li>`).join('')}</ol>` : `<p class="hint">${esc(w('none'))}</p>`) : `<p class="hint">${esc(w('offline'))}</p>`}
    ${t?.mine ? `<p>${esc(w('you'))}: <b>${t.mine.place}</b> (${t.mine.score}%)</p>` : !signedIn ? `<p class="hint">${esc(w('login'))}</p>` : ''}
    <button type="button" class="ghost small" data-cko="${esc(d.id)}">${esc(w('cook'))}</button></div>`;
  el.querySelector<HTMLButtonElement>('[data-cko]')!.onclick = () => open(d.id);
}
/** After cooking: sends the score when the dish is today's and the player is logged in. The message to show, or null. */
export async function sendIfToday(dish: string, o: C.Outcome): Promise<string | null> {
  if (C.dishOfRealDay()?.id !== dish || !o.ok) return null;
  const c = await client(); if (!c?.sendCookScore || !(c as { session?: () => unknown }).session?.()) return null;
  const r = await c.sendCookScore(dish, o.score, o.stars).catch(() => null); if (!r?.ok) return null;
  const t = c.cookToday ? await c.cookToday(dish).catch(() => null) : null;
  return t?.ok && t.data?.mine ? `${w('sent')} ${t.data.mine.place}.` : null;
}
