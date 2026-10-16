// @vitest-environment jsdom
import { it, expect } from 'vitest';
import * as G from '../src/engine';
import '../src/content';
import { openMetro } from '../src/metro-ui';

it('the metro screen shows the real metro of the city and plans a ride between two real stations', () => {
  const s = G.newState('T', 'moscow'); s.queue = []; s.city = 'Saint Petersburg';
  const host = document.body.appendChild(document.createElement('div'));
  openMetro(host, s, { goPlace: () => undefined, visit: () => undefined, close: () => undefined });
  const real = host.querySelector('.mtReal')!; expect(real.textContent).toMatch(/6 lines, 74 stations/);                   // 75 places on the lines; Tekhnologichesky Institut is one station on two lines
  expect(host.querySelectorAll('.mtLines > li')).toHaveLength(6);
  const from = host.querySelector<HTMLSelectElement>('#mtFrom')!; from.value = 'Devyatkino'; from.dispatchEvent(new Event('change'));
  const to = host.querySelector<HTMLSelectElement>('#mtTo')!; to.value = 'Gorny Institut'; to.dispatchEvent(new Event('change'));
  const plan = host.querySelector('.mtPlan')!; expect(plan.textContent).toMatch(/Kirovsko-Vyborgskaya: Devyatkino →/); expect(plan.textContent).toMatch(/Pravoberezhnaya/);
  expect(host.querySelector('.mtReal')!.hasAttribute('open')).toBe(true);
  s.city = 'Omsk'; openMetro(host, s, { goPlace: () => undefined, visit: () => undefined, close: () => undefined }); expect(host.querySelector('.mtReal')).toBeNull();
});
