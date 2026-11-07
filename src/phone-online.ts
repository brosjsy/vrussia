/* The phone's link to the game's own server: the permanent number, texts between players, and the small messages that set up an audio call.
   Everything here is "just an act" inside the game: nothing reaches a real phone network. The session is the HttpOnly cookie of the account, so no token is
   handled here. A function never throws: it returns { ok, ... } with a plain sentence for the player. The fetch is injected so the tests need no network. */
import { apiFromEnv } from './api-client';
import { parseNumber, formatNumber } from './phonenumber';

export interface Text { id: number; body: string; mine: boolean; other: string; created_at: string }
export interface Signal { id: number; kind: 'offer' | 'answer' | 'ice' | 'hangup' | 'decline'; data: string; from: string }
export type Reply<T> = { ok: true; value: T } | { ok: false; why: string };

/** Plain words for what the server says (its own short codes) and for the cases where there is no server or no login. */
export function phoneWhy(code: string): string {
  const words: Record<string, string> = {
    'chat is for adults': 'Texts and calls between players are for adults (18+). Say you are an adult in your profile first.', language: 'Please keep it polite: that word is not allowed.',
    'contact details': 'No phone numbers, e-mail addresses or @handles in a text: players talk inside the game.', 'slow down': 'Slow down a little, then try again.', 'daily limit': 'That is enough texts for today.',
    blocked: 'This person does not take messages from you.', 'no such number': 'No player has that number.', 'bad length': 'A text is 1 to 160 characters.', 'no profile': 'Choose your public name on the Online screen first.',
    'not signed in': 'Log in on the Online screen to text and call other players.', 'invalid input': 'That does not look right.',
  };
  return words[code] ?? 'The online service is not reachable now. Try again later.';
}

export class PhoneOnline {
  constructor(private readonly base: string | null = apiFromEnv(), private readonly f: typeof fetch = (input, init) => fetch(input, init)) {}
  get available(): boolean { return !!this.base; }

  private async go<T>(method: string, path: string, body?: unknown): Promise<Reply<T>> {
    if (!this.base) return { ok: false, why: 'Texts and calls between players need the online service, which this copy of the game does not have.' };
    try {
      const res = await this.f(this.base + path, { method, credentials: 'include', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      let json: unknown = null; try { json = await res.json(); } catch { json = null; }
      if (res.status === 401) return { ok: false, why: phoneWhy('not signed in') };
      if (!res.ok) return { ok: false, why: phoneWhy(String((json as { error?: string } | null)?.error ?? '')) };
      return { ok: true, value: json as T };
    } catch { return { ok: false, why: phoneWhy('') }; }
  }

  /** The player's number from the server (made once, kept for ever), written as +7 0XXX XXXX-XX-XX. */
  async number(): Promise<Reply<string>> {
    const r = await this.go<{ digits: string }>('GET', '/api/phone/number');
    if (!r.ok) return r;
    return parseNumber(r.value.digits) ? { ok: true, value: formatNumber(r.value.digits) } : { ok: false, why: phoneWhy('') };
  }
  /** Sends a text to a number typed in any way. The number is checked here too (shape and check digit) so a typo is caught before the server. */
  async send(to: string, body: string): Promise<Reply<number>> {
    const d = parseNumber(to);
    if (!d) return { ok: false, why: 'That is not a number of the game: +7, then 0, then 11 more digits (the last one is a check digit).' };
    const text = body.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!text) return { ok: false, why: phoneWhy('bad length') };
    const r = await this.go<{ id: number | string }>('POST', '/api/phone/texts', { to: d, body: text });
    return r.ok ? { ok: true, value: Number(r.value.id) } : r;
  }
  async texts(after = 0): Promise<Reply<Text[]>> {
    const r = await this.go<{ id: number | string; body: string; mine: boolean; other: string | null; created_at: string }[]>('GET', `/api/phone/texts?after=${Math.max(0, Math.floor(after))}`);
    if (!r.ok) return r;
    return { ok: true, value: r.value.map(t => ({ id: Number(t.id), body: String(t.body), mine: !!t.mine, other: t.other && parseNumber(t.other) ? formatNumber(t.other) : '', created_at: String(t.created_at) })).reverse() };
  }
  async report(id: number): Promise<Reply<true>> { const r = await this.go<unknown>('POST', `/api/phone/texts/${Math.floor(id)}/report`, {}); return r.ok ? { ok: true, value: true } : r; }
  async block(number: string): Promise<Reply<true>> {
    const d = parseNumber(number); if (!d) return { ok: false, why: 'That is not a number of the game.' };
    const r = await this.go<unknown>('POST', '/api/phone/block', { number: d }); return r.ok ? { ok: true, value: true } : r;
  }
  async signal(to: string, kind: Signal['kind'], data = ''): Promise<Reply<true>> {
    const d = parseNumber(to); if (!d) return { ok: false, why: 'That is not a number of the game.' };
    const r = await this.go<unknown>('POST', '/api/phone/signal', { to: d, kind, data: data.slice(0, 8000) }); return r.ok ? { ok: true, value: true } : r;
  }
  /** The signals waiting for this player (each is deleted by the server when read). */
  async signals(): Promise<Reply<Signal[]>> {
    const r = await this.go<{ id: number | string; kind: Signal['kind']; data: string; from: string | null }[]>('GET', '/api/phone/signal');
    if (!r.ok) return r;
    return { ok: true, value: r.value.filter(x => x.from && parseNumber(x.from)).map(x => ({ id: Number(x.id), kind: x.kind, data: String(x.data), from: formatNumber(x.from as string) })) };
  }
  /** "My data": erases the texts and call signals of this player on the server. */
  async erase(): Promise<Reply<true>> { const r = await this.go<unknown>('DELETE', '/api/phone/data'); return r.ok ? { ok: true, value: true } : r; }
}
