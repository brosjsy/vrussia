/* A development page: the real city of the game on its own (?city=Moscow&lang=ru&q=МФЦ&go=1), with live OpenFreeMap tiles. Not part of the build. */
import '../src/style.css';
import * as G from '../src/engine';
import '../src/content';
import { setLang } from '../src/i18n';
import { CITY_CENTERS } from '../src/realmap';
import { openRealCity } from '../src/realworld-ui';
const q = new URLSearchParams(location.search); setLang(q.get('lang') === 'en' ? 'en' : 'ru');
const city = q.get('city') ?? 'Moscow', [lat, lon] = CITY_CENTERS[city] ?? CITY_CENTERS.Moscow;
const s = G.newState('Олег', 'student'); s.city = city;
const host = document.getElementById('host')!; host.id = 'world3d';
await openRealCity(host, s, { lat, lon }, { notify: m => console.log('notify', m), act: a => console.log('act', a), close: () => undefined, onFail: m => console.error('fail', m) });
const find = q.get('q');
if (find) { const input = document.querySelector<HTMLInputElement>('#realQ')!; input.value = find; input.dispatchEvent(new Event('input')); document.querySelector<HTMLButtonElement>('[data-realpoi]')?.click(); if (q.get('go')) document.querySelector<HTMLButtonElement>('#realGo')?.click(); }
