// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { openBooking } from '../src/booking-ui';

const click = (id: string): void => { (document.getElementById(id) as HTMLElement).click(); };
const set = (id: string, v: string): void => { (document.getElementById(id) as HTMLInputElement).value = v; };

describe('airline booking website', () => {
  it('walks through every step and creates a booking', () => {
    const s = G.newState('Rustam', 'tajik');
    s.queue = []; s.money = 80000; s.bank.sber = true;
    const host = document.createElement('div'); document.body.appendChild(host);
    let booked = false;
    openBooking(s, host, b => { booked = b; });

    // step 1: validation then valid search
    click('next');
    expect(host.textContent).toContain('Please choose a destination');
    set('dest', 'dushanbe'); set('lead', '30'); set('stay', '7');
    click('next');
    // step 2: pick the cheapest night flight
    expect(host.textContent).toContain('Choose a flight');
    (host.querySelectorAll('input[name=fare]')[2] as HTMLInputElement).checked = true;
    click('next');
    // step 3: passenger details (validation of last name)
    click('next');
    expect(host.textContent).toContain('First and last name are required');
    set('first', 'Rustam'); set('last', 'Rahimov');
    click('next');
    // step 4: extras
    (document.getElementById('baggage') as HTMLInputElement).checked = true;
    click('next');
    // step 5: payment with Sber card
    expect(host.textContent).toContain('Sber card');
    click('next');
    // step 6: wrong code first, then correct code from the SMS
    expect(host.textContent).toContain('Enter the SMS code');
    set('code', '0000'); click('next');
    expect(host.textContent).toContain('Wrong code');
    const code = (host.querySelector('.sms') as HTMLElement).textContent!.match(/Code (\d{4})/)![1];
    set('code', code); click('next');
    // step 7: e-ticket
    expect(host.textContent).toContain('E-ticket');
    expect(s.booking?.passenger).toBe('RUSTAM RAHIMOV');
    expect(s.booking?.baggage).toBe(true);
    expect(s.money).toBeLessThan(80000);
    click('done');
    expect(booked).toBe(true);
  });

  it('declines payment with insufficient funds and without a bank only offers an agent', () => {
    const s = G.newState('Aisha', 'uzbek');
    s.queue = []; s.money = 1000;
    const host = document.createElement('div'); document.body.appendChild(host);
    openBooking(s, host, () => {});
    set('dest', 'tashkent'); set('lead', '14'); click('next');
    click('next'); set('last', 'Karimova'); click('next'); click('next');
    expect(host.textContent).toContain('You have no bank account');
    click('next');
    expect(host.textContent).toContain('Insufficient funds');
    expect(s.booking).toBeNull();
  });
});
