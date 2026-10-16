// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as G from '../src/engine';
import '../src/content';
import { contactsFor, phoneBlock, replyFor, chatBonus, callScript, transfer, canReceive, TRANSFER_MAX } from '../src/phone';

const fresh = (origin = 'moscow'): G.State => { const s = G.newState('T', origin); s.queue = []; s.bank = { sber: true }; s.money = 50000; return s; };

describe('the phone number and the phone data', () => {
  it('a number looks like a Russian mobile number, is stable, and differs between players', () => {
    const a = G.phoneOf(fresh()).number, b = G.phoneOf(fresh()).number;
    expect(a).toMatch(/^\+7 9\d\d \d\d\d-\d\d-\d\d$/);
    expect(a).toBe(b);
    const other = G.newState('Other', 'tajik');
    expect(G.phoneOf(other).number).not.toBe(a);
    expect(G.numberFrom('x')).toBe(G.numberFrom('x'));
  });
  it('the phone data survives a save and load, and old saves without it get a fresh one', () => {
    const s = fresh(); G.addChat(s, 'mum', 'me', 'hello'); G.recTx(s, 'test', -100);
    const copy = JSON.parse(JSON.stringify(s)) as G.State;
    expect(G.phoneOf(copy).chats.mum[0].text).toBe('hello');
    const old = JSON.parse(JSON.stringify(s)) as G.State; delete old.ph;
    expect(G.phoneOf(old).number).toMatch(/^\+7 /);
  });
  it('chats, calls and the money history are capped', () => {
    const s = fresh();
    for (let i = 0; i < 100; i++) { G.addChat(s, 'mum', 'me', 'x' + i); G.addCall(s, 'Mum', 'out'); G.recTx(s, 't' + i, -1); }
    expect(G.phoneOf(s).chats.mum.length).toBe(G.CHAT_MAX);
    expect(G.phoneOf(s).calls.length).toBe(G.CALL_MAX);
    expect(G.phoneOf(s).tx.length).toBe(G.TX_MAX);
    expect(G.phoneOf(s).tx[0].label).toBe('t99');           // newest first
    G.recTx(s, 'zero', 0); expect(G.phoneOf(s).tx[0].label).toBe('t99');   // no row for nothing
  });
  it('the game records money changes in the history by itself', () => {
    const s = fresh(); s.day = 10;
    const sc = G.get('shop_troika', s) as G.Scenario;
    G.choose(s, sc, 0);
    expect(G.phoneOf(s).tx.some(t => t.label.includes('Transport card') && t.amount < 0)).toBe(true);
  });
});

describe('contacts and when the phone works', () => {
  it('the phone book follows your life', () => {
    const s = fresh(); s.bank = {}; s.rent = 0; s.job = null; s.friends = 0; s.partner = null;
    expect(contactsFor(s).map(c => c.id)).toEqual(['mum', 'taxi', '112']);
    s.rent = 20000; s.job = 'courier'; s.friends = 2; s.bank = { sber: true }; s.partner = { name: 'Anna', kind: 'citizen', love: 50 }; s.flags.arc_valentina_0 = true;
    expect(contactsFor(s).map(c => c.id)).toEqual(expect.arrayContaining(['mum', 'partner', 'friend', 'landlord', 'work', 'bank', 'valentina', 'taxi', '112']));
    expect(new Set(contactsFor(s).map(c => c.number)).size).toBe(contactsFor(s).length);
  });
  it('a broken phone blocks everything; a newcomer also needs a SIM card; a citizen does not', () => {
    const s = fresh('tajik'); s.phone = 1; s.flags.sim = false;
    expect(phoneBlock(s)).toContain('SIM');
    s.flags.sim = true; expect(phoneBlock(s)).toBeNull();
    s.phone = 0; expect(phoneBlock(s)).toContain('broken');
    const c = fresh('moscow'); c.phone = 1; expect(phoneBlock(c)).toBeNull();
  });
});

describe('chats and calls', () => {
  it('replies depend on who it is and what you say', () => {
    const by = (id: string): ReturnType<typeof contactsFor>[number] => contactsFor((() => { const s = fresh(); s.rent = 1; s.job = 'courier'; return s; })()).find(c => c.id === id) as never;
    expect(replyFor(by('landlord'), 'when is the rent due?', () => 0)).toContain('Saturday');
    expect(replyFor(by('bank'), 'what is my code?', () => 0)).toContain('never ask');
    expect(replyFor(by('work'), 'I am sick', () => 0)).toContain('doctor');
    expect(replyFor(by('mum'), 'thanks', () => 0)).toBe('You are welcome!');
    expect(replyFor(by('mum'), 'hello', () => 0)).toContain('eaten');
  });
  it('the first chat of the day with family helps a little, a second one does not', () => {
    const s = fresh(); const mum = contactsFor(s)[0];
    expect(chatBonus(s, mum)).toEqual({ famLove: 1, stress: -1 });
    expect(chatBonus(s, mum)).toBeNull();
    s.day++; expect(chatBonus(s, mum)).not.toBeNull();
  });
  it('calls: family helps once a day, emergency is informative, and no call has a big cost', () => {
    const s = fresh(); const cs = contactsFor(s);
    const mum = cs.find(c => c.id === 'mum')!, em = cs.find(c => c.id === '112')!;
    expect(callScript(s, mum).fx).toEqual({ famLove: 3, stress: -5 });
    expect(callScript(s, mum).fx).toEqual({});
    expect(callScript(s, em).lines[0]).toContain('112');
    expect(callScript(s, em).fx.money ?? 0).toBe(0);
  });
});

describe('bank transfers', () => {
  const to = (s: G.State, id: string): ReturnType<typeof contactsFor>[number] => contactsFor(s).find(c => c.id === id) as never;
  it('a valid transfer to family costs the amount and warms the family', () => {
    const s = fresh(); const r = transfer(s, to(s, 'mum'), '5,000');
    expect(r.ok).toBe(true); expect(r.fx.money).toBe(-5000); expect(r.fx.famLove).toBeGreaterThan(0);
    expect(r.message).toContain('5,000');
  });
  it('refuses everything that is not valid, and changes nothing when it does', () => {
    const s = fresh(); const mum = to(s, 'mum');
    for (const bad of ['', 'abc', '-5', '0', '1.5', String(TRANSFER_MAX + 1), '999999']) { const r = transfer(s, mum, bad); expect(r.ok, bad).toBe(false); expect(r.fx).toEqual({}); }
    expect(transfer(s, mum, '60000').message).toContain('only have');
    expect(canReceive(to(s, '112'))).toBe(false); expect(transfer(s, to(s, '112'), '10').ok).toBe(false);
    const noBank = fresh(); noBank.bank = {}; expect(transfer(noBank, to(noBank, 'mum'), '10').message).toContain('bank account');
    const noSim = fresh('tajik'); noSim.flags.sim = false; expect(transfer(noSim, to(noSim, 'mum'), '10').message).toContain('SIM');
  });
});

describe('the phone in the page', () => {
  it('shows the number, chats with Mum, calls her, sends money and shows it in the history', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    window.confirm = () => true;
    const { boot } = await import('../src/ui');
    boot(); await (await import('../src/ui')).uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = 'Caller';
    document.getElementById('startBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
    const body = (): HTMLElement => document.getElementById('modalBody') as HTMLElement;
    const click = (sel: string): void => { (body().querySelector(sel) as HTMLButtonElement).click(); };

    document.getElementById('dockPhone')!.click();
    expect(body().querySelector('.phoneNum')!.textContent).toMatch(/\+7 9\d\d \d\d\d-\d\d-\d\d/);

    // messages: open the thread with Mum, write, get an answer
    click('[data-sys="messages"]'); click('[data-chat="mum"]');
    (body().querySelector('#phChatInput') as HTMLInputElement).value = 'hello mum <b>';
    body().querySelector('#phChatForm')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    expect(body().querySelectorAll('.bubbles .b.me').length).toBe(1);
    expect(body().querySelectorAll('.bubbles .b.them').length).toBe(1);
    expect(body().querySelector('.bubbles b')).toBeNull();               // no markup came through
    click('[data-go="messages"]'); click('[data-go="home"]');

    // calls
    click('[data-sys="phone"]'); expect(body().querySelectorAll('.contact').length).toBeGreaterThan(2);
    click('[data-call="mum"]'); expect(body().querySelector('.callLines')!.textContent).toContain('eaten');
    click('[data-go="contacts"]'); expect(body().querySelector('.recents')!.textContent).toContain('Mum');
    click('[data-go="home"]');

    // bank without an account: a message and a button that opens the account website
    click('[data-sys="bank"]');
    expect(body().textContent).toContain('no bank account');
    expect(body().querySelector('#phTransfer')).toBeNull();
    document.getElementById('closeModal')!.click();

    // give the player an account and some money through the saved game, then come back to it
    const saved = JSON.parse(localStorage.getItem('vrussia_save') as string);
    saved.bank = { sber: true }; saved.money = 50000;
    localStorage.setItem('vrussia_save', JSON.stringify(saved));
    document.getElementById('menuBtn')!.click();
    document.getElementById('continueBtn')!.click();
    for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();

    document.getElementById('dockPhone')!.click();
    click('[data-sys="bank"]');
    expect(body().querySelector('.bal b')!.textContent).toMatch(/₽/);
    const form = body().querySelector('#phTransfer') as HTMLFormElement;
    expect(form).toBeTruthy();
    (body().querySelector('#phAmount') as HTMLInputElement).value = '1000';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));   // first press asks to confirm
    expect(body().querySelector('.phNote')).toBeNull();
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));   // second press sends
    expect(body().querySelector('.phNote')!.textContent).toContain('Sent');
    expect(body().querySelector('.txs')!.textContent).toContain('Transfer to Mum');
    // an invalid amount is explained and nothing is sent
    (body().querySelector('#phAmount') as HTMLInputElement).value = 'lots';
    (body().querySelector('#phTransfer') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    expect(body().querySelector('.phNote')!.textContent).toContain('whole roubles');
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  }, 60000);
});
