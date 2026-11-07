/* Live updates for the chat: a server-sent-events stream that says "there is something new in this room", never what it is. The page then asks for
   the new messages the ordinary way (GET /api/messages), where the SQL rules decide who may read what; so the stream cannot leak a message.
   One process, in memory: each player may keep a few streams open, each stream names at most 6 rooms, and a private room ("direct:a:b") is only
   delivered to its two players. When no stream is open, or the page cannot use one, the page's own timer still refreshes the chat. */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError } from './auth.js';
import type { SessionUser } from './auth.js';

export interface Sink { write(chunk: string): unknown; end(): unknown }
interface Sub { user: string; rooms: Set<string>; sink: Sink }

export const MAX_STREAMS_PER_PLAYER = 3;
export const MAX_ROOMS = 6;
const PLACE = /^place:[^:]{2,40}:[a-z0-9_]{2,20}$/;
const DIRECT = /^direct:([0-9a-f-]{36}):([0-9a-f-]{36})$/;
const CREW = /^crew:[0-9]{1,12}$/;

/** May this player listen for news of this room? (Only the shape and the players of a private room are checked here.) */
export function mayListen(user: string, room: string): boolean {
  if (PLACE.test(room) || CREW.test(room)) return true;
  const m = DIRECT.exec(room);
  return !!m && (m[1] === user || m[2] === user);
}

export class Live {
  private subs = new Set<Sub>();
  count(): number { return this.subs.size; }
  /** Starts a stream; the oldest one of a player who has too many is closed. Returns the function that stops it. */
  subscribe(user: string, rooms: string[], sink: Sink): () => void {
    const ok = [...new Set(rooms)].filter(r => mayListen(user, r)).slice(0, MAX_ROOMS);
    const mine = [...this.subs].filter(s => s.user === user);
    while (mine.length >= MAX_STREAMS_PER_PLAYER) { const old = mine.shift()!; this.drop(old); }
    const sub: Sub = { user, rooms: new Set(ok), sink };
    this.subs.add(sub);
    return () => { this.subs.delete(sub); };
  }
  private drop(s: Sub): void { this.subs.delete(s); try { s.sink.end(); } catch { /* already closed */ } }
  /** Says to everyone listening to the room that message `id` arrived. */
  publish(room: string, id: number): number {
    let n = 0;
    for (const s of [...this.subs]) if (s.rooms.has(room)) {
      try { s.sink.write(`event: msg\ndata: ${JSON.stringify({ room, id })}\n\n`); n++; } catch { this.subs.delete(s); }
    }
    return n;
  }
  ping(): void { for (const s of [...this.subs]) { try { s.sink.write(': ping\n\n'); } catch { this.subs.delete(s); } } }
  closeAll(): void { for (const s of [...this.subs]) this.drop(s); }
}

export async function liveRoutes(app: FastifyInstance, live: Live, need: (req: FastifyRequest) => SessionUser): Promise<void> {
  const timer = setInterval(() => live.ping(), 25_000); timer.unref();
  app.addHook('onClose', async () => { clearInterval(timer); live.closeAll(); });
  app.get('/api/live', async (req, reply) => {
    const u = need(req);
    const raw = String((req.query as { rooms?: string }).rooms ?? '');
    if (raw.length > 800) throw new AppError(400, 'invalid input');
    const rooms = raw.split(',').map(x => x.trim()).filter(Boolean);
    if (!rooms.length || rooms.some(r => !mayListen(u.userId, r))) throw new AppError(400, 'invalid input');
    const headers = { ...reply.getHeaders(), 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' };
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, headers as never);
    res.write('retry: 5000\n: open\n\n');
    const stop = live.subscribe(u.userId, rooms, res);
    req.raw.on('close', stop);
  });
}
