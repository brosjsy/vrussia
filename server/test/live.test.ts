import { describe, it, expect } from 'vitest';
import { Live, mayListen, MAX_STREAMS_PER_PLAYER, MAX_ROOMS } from '../src/live.js';

const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222', C = '33333333-3333-3333-3333-333333333333';
const sink = () => { const got: string[] = []; let ended = false; return { got, get ended() { return ended; }, write: (s: string) => { got.push(s); }, end: () => { ended = true; } }; };

describe('live chat updates', () => {
  it('lets a player listen to place rooms and to their own private rooms only', () => {
    expect(mayListen(A, 'place:Moscow:cafe')).toBe(true);
    expect(mayListen(A, `direct:${A}:${B}`)).toBe(true);
    expect(mayListen(C, `direct:${A}:${B}`)).toBe(false);
    expect(mayListen(A, 'crew:12')).toBe(true);
    for (const bad of ['', 'x', 'place:', 'place:Moscow:', 'direct:a:b', 'crew:abc', 'place:Moscow:caf e']) expect(mayListen(A, bad), bad).toBe(false);
  });
  it('tells listeners that something arrived, with the room and the id and nothing else', () => {
    const live = new Live(), s = sink(), o = sink();
    live.subscribe(A, ['place:Moscow:cafe'], s); live.subscribe(B, ['place:Kazan:cafe'], o);
    expect(live.publish('place:Moscow:cafe', 7)).toBe(1);
    expect(s.got).toEqual(['event: msg\ndata: {"room":"place:Moscow:cafe","id":7}\n\n']); expect(o.got).toEqual([]);
  });
  it('never delivers a private room to a third player, even one who asks for it', () => {
    const live = new Live(), s = sink(); live.subscribe(C, [`direct:${A}:${B}`], s);
    expect(live.publish(`direct:${A}:${B}`, 1)).toBe(0); expect(s.got).toEqual([]);
  });
  it('limits the streams of one player and the rooms of one stream, and stops cleanly', () => {
    const live = new Live(), sinks = Array.from({ length: MAX_STREAMS_PER_PLAYER + 2 }, () => sink());
    sinks.forEach(x => live.subscribe(A, ['place:Moscow:cafe'], x));
    expect(live.count()).toBe(MAX_STREAMS_PER_PLAYER); expect(sinks[0]!.ended).toBe(true);
    const many = sink(); const stop = live.subscribe(B, Array.from({ length: MAX_ROOMS + 4 }, (_, i) => `place:Moscow:r${i}x`), many);
    live.publish(`place:Moscow:r${MAX_ROOMS + 1}x`, 1); expect(many.got).toEqual([]);
    stop(); live.closeAll(); expect(live.count()).toBe(0);
  });
  it('drops a stream that fails to write', () => {
    const live = new Live(); live.subscribe(A, ['place:Moscow:cafe'], { write: () => { throw new Error('closed'); }, end: () => undefined });
    expect(live.publish('place:Moscow:cafe', 1)).toBe(0); expect(live.count()).toBe(0);
  });
});
