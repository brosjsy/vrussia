// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mountCrew, crewRoom } from '../src/crew-ui';
import type { OnlineClient } from '../src/cloud';

const ok = <T>(data: T) => Promise.resolve({ ok: true, msg: '', data });
const flush = async (): Promise<void> => { for (let i = 0; i < 8; i++) await Promise.resolve(); await new Promise(r => setTimeout(r, 0)); };
const crew = { id: 5, name: 'Metro Circle', city: 'Moscow', role: 'owner' as const, members: [{ id: 'u1', username: 'anna', role: 'owner', online: true }, { id: 'u2', username: 'bakyt', role: 'member', online: false }] };
function fake(over: Record<string, unknown> = {}, adult = true, username: string | null = 'anna'): { c: OnlineClient; calls: string[] } {
  const calls: string[] = [];
  const c = {
    session: () => ({ userId: 'u1', username, adult, email: 'a@b.c', access: '', refresh: '', expires: 0 }),
    myCrew: vi.fn(() => ok({ crew: null, invites: [] })), createCrew: vi.fn((n: string) => { calls.push('create:' + n); return ok({ id: 5 }); }),
    inviteToCrew: vi.fn((f: string) => { calls.push('invite:' + f); return ok({ id: 1 }); }), answerCrewInvite: vi.fn((id: number, a: boolean) => { calls.push(`answer:${id}:${a}`); return ok({ ok: true }); }),
    leaveCrew: vi.fn(() => { calls.push('leave'); return ok({ ok: true }); }), kickFromCrew: vi.fn((u: string) => { calls.push('kick:' + u); return ok({ ok: true }); }),
    messages: vi.fn(() => ok([{ id: 2, sender: 'u2', username: 'bakyt', body: 'Hello <b>crew</b>' }])), send: vi.fn((r: string, t: string) => { calls.push(`send:${r}:${t}`); return ok(3); }),
    friends: vi.fn(() => ok([{ id: 'u3', username: 'kofi', mutual: true, online: true, city: null, place: null }, { id: 'u4', username: 'dina', mutual: false, online: false, city: null, place: null }, { id: 'u2', username: 'bakyt', mutual: true, online: false, city: null, place: null }])),
    live: vi.fn(() => () => undefined), ...over,
  };
  return { c: c as unknown as OnlineClient, calls };
}
const host = (): HTMLElement => { const el = document.createElement('div'); document.body.appendChild(el); return el; };

describe('the crew tab', () => {
  it('asks a player without a name or under 18 to wait, and offers to found a crew otherwise', async () => {
    let el = host(); mountCrew(el, fake({}, true, null).c, { notify: () => undefined })(); expect(el.textContent).toMatch(/public name/i);
    el = host(); mountCrew(el, fake({}, false).c, { notify: () => undefined })(); expect(el.textContent).toMatch(/18/);
    const { c, calls } = fake(); el = host(); const stop = mountCrew(el, c, { notify: () => undefined }); await flush();
    expect(el.querySelector('#crFound')).toBeTruthy();
    (el.querySelector('#crName') as HTMLInputElement).value = 'Metro Circle'; (el.querySelector('#crFound') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
    await flush(); expect(calls).toContain('create:Metro Circle'); stop();
  });
  it('shows invitations and answers them', async () => {
    const { c, calls } = fake({ myCrew: vi.fn(() => ok({ crew: null, invites: [{ id: 9, crew_id: 5, crew_name: 'Night Owls', inviter_name: 'kofi' }] })) });
    const el = host(); const stop = mountCrew(el, c, { notify: () => undefined }); await flush();
    expect(el.textContent).toContain('Night Owls'); (el.querySelector('[data-crew="yes:9"]') as HTMLButtonElement).click(); await flush(); expect(calls).toContain('answer:9:true'); stop();
  });
  it('shows the members, lets the owner invite a mutual friend who is not in yet and remove a member, and escapes chat text', async () => {
    const { c, calls } = fake({ myCrew: vi.fn(() => ok({ crew, invites: [] })) });
    const el = host(); const stop = mountCrew(el, c, { notify: () => undefined }); await flush();
    expect(el.textContent).toContain('Metro Circle'); expect(el.textContent).toContain('(2/12)'); expect(el.textContent).toContain('@bakyt');
    const options = Array.from(el.querySelectorAll('#crFriend option')).map(o => o.textContent); expect(options).toEqual(['@kofi']);
    expect(el.innerHTML).toContain('&lt;b&gt;crew&lt;/b&gt;'); expect(el.querySelector('#crChat b b')).toBeNull();
    (el.querySelector('#crInvite') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true })); await flush(); expect(calls).toContain('invite:u3');
    (el.querySelector('[data-crew="kick:u2"]') as HTMLButtonElement).click(); await flush(); expect(calls).toContain('kick:u2');
    (el.querySelector('#crText') as HTMLInputElement).value = 'Hi all'; (el.querySelector('#crSend') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true })); await flush();
    expect(calls).toContain(`send:${crewRoom(5)}:Hi all`);
    (el.querySelector('[data-crew="leave:0"]') as HTMLButtonElement).click(); await flush(); expect(calls).toContain('leave'); stop();
  });
  it('opens a live stream for the crew room only while the tab is on screen', async () => {
    const live = vi.fn(() => stopFn); const stopFn = vi.fn();
    const { c } = fake({ myCrew: vi.fn(() => ok({ crew, invites: [] })), live });
    const el = host(); const stop = mountCrew(el, c, { notify: () => undefined }); await flush();
    expect(live).toHaveBeenCalledWith(['crew:5'], expect.any(Function)); stop(); expect(stopFn).toHaveBeenCalled();
  });
});

describe('the table of crews', () => {
  it('is shown to a player without a crew and to one with a crew, with the points of each crew', async () => {
    const top = [{ id: 1, name: 'High Scorers', city: 'Moscow', members: '3', points: '12500' }, { id: 2, name: 'Quiet Ones', city: null, members: 1, points: 100 }];
    const a = fake({ topCrews: vi.fn(() => ok(top)) }); const el = host(); const stop = mountCrew(el, a.c, { notify: () => undefined }); await flush();
    expect(el.textContent).toContain('Top crews'); expect(el.textContent).toContain('High Scorers'); expect(el.textContent).toContain('12,500'); expect(el.textContent).toContain('3/12'); stop();
    const b = fake({ topCrews: vi.fn(() => ok(top)), myCrew: vi.fn(() => ok({ crew, invites: [] })) }); const el2 = host(); const stop2 = mountCrew(el2, b.c, { notify: () => undefined }); await flush();
    expect(el2.textContent).toContain('Top crews'); expect(el2.textContent).toContain('Quiet Ones'); stop2();
  });
});
