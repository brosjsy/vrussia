/* The place card's chat with the real players at the same place (round 150: it only ever answered with invented neighbours). Its own small download,
   loaded with the online part, so the first download stays small. */
import { cloud, placeRoom } from './cloud';

let key = '', seen = 0;
/** Sends a message to the place's room (if given) and reads what is new there. Null when the player cannot chat online (offline, not logged in, under 18). */
export async function placeChat(city: string, place: string, send: string | undefined, notify: (m: string) => void): Promise<{ from: string; text: string }[] | null> {
  const c = cloud(); const me = c?.session(); if (!c || !me?.adult || !me.username) return null;
  const room = placeRoom(city, place); if (room !== key) { key = room; seen = 0; }
  if (send) { const r = await c.send(room, send); if (!r.ok) notify(r.msg); }
  const m = await c.messages(room, seen); if (!m.ok || !m.data?.length || key !== room) return [];
  const out: { from: string; text: string }[] = [];
  for (const x of m.data.slice().sort((a, b) => a.id - b.id)) { seen = Math.max(seen, x.id); if (x.sender !== me.userId) out.push({ from: '@' + x.username, text: x.body }); }
  return out;
}
