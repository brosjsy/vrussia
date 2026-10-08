// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { flows } from '../src/forms';
import { openFlow, openOnlineMenu } from '../src/forms-ui';

const TEXT: Record<string, string> = { pay: '2500', phone: '9161234567', inn: '123456789012', addr: 'Moscow, Lenina 1', cn: 'Misha', w: 'Ivan', pname: 'Tester', who: 'Tester', dob: '2026-09-01' };

function prepare(id: string, s: G.State): void {
  s.money = 500000; s.docs.reg = 400; s.docs.patent = 100;
  if (id === 'uni') s.day = 280;
  if (id === 'zags') s.partner = { name: 'Anna', kind: 'citizen', love: 80 };
  if (id === 'kg') s.kids = 1;
  if (id === 'migr') { s.flags.rutest = true; s.flags.rvpGround = true; }
  if (id === 'doctor') s.flags.insured = true;
  if (id === 'biz') { s.know = 80; s.flags.rvp = true; }
  if (id === 'fines') { s.tmp.fines = 4000; s.tmp.fineDay = s.day; s.bank.sber = true; }
}

function fillAndNext(host: HTMLElement): void {
  host.querySelectorAll<HTMLInputElement>('input:not([type=radio]):not([type=checkbox])').forEach(el => {
    el.value = el.id === 'code' ? (host.querySelector('.sms b') as HTMLElement).textContent! : TEXT[el.id] ?? 'Test';
  });
  host.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach(el => { el.checked = true; });
  (document.getElementById('ffNext') as HTMLElement).click();
}

describe('online services', () => {
  it('lists all fourteen services', () => { expect(flows.length).toBe(14); });

  for (const flow of flows) {
    it(`${flow.title} can be completed`, () => {
      const s = G.newState('Tester', 'tajik');
      s.queue = [];
      prepare(flow.id, s);
      expect(flow.available(s), flow.id).toBeNull();
      const host = document.createElement('div'); document.body.appendChild(host);
      let done = false;
      openFlow(s, host, flow, d => { done = !!d; });
      let guard = 0;
      while (document.getElementById('ffNext') && guard++ < 12) {
        // a wrong name on the train form must be rejected first
        if (flow.id === 'rzd' && host.textContent!.includes('Passenger name')) {
          (document.getElementById('pname') as HTMLInputElement).value = 'Nobody';
          (document.getElementById('ffNext') as HTMLElement).click();
          expect(host.textContent).toContain('must match your passport');
        }
        fillAndNext(host);
      }
      expect(document.getElementById('ffDone'), `${flow.id} result screen`).not.toBeNull();
      expect(s.log[0].text.startsWith(flow.title)).toBe(true);
      document.getElementById('ffDone')!.click();
      expect(done).toBe(true);
    });
  }

  it('the online menu disables unavailable services', () => {
    const s = G.newState('T', 'moscow'); s.queue = [];
    const host = document.createElement('div'); document.body.appendChild(host);
    openOnlineMenu(s, host, () => {});
    expect(host.querySelectorAll('button[disabled]').length).toBeGreaterThan(0);
    expect(host.textContent).toContain('You need a partner first');
  });
});
