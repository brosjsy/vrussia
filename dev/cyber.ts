/* A development page: the Cyber app of the phone on its own (?lang=ru|en), for screenshots. Not part of the build. */
import '../src/style.css';
import * as G from '../src/engine';
import '../src/content';
import { setLang } from '../src/i18n';
import { openCyber } from '../src/cyber-ui';
import { answer, todaysRound, protect } from '../src/cyber';
const q = new URLSearchParams(location.search); setLang(q.get('lang') === 'en' ? 'en' : 'ru');
const s = G.newState('Олег', 'student'); s.bank.sber = true; s.day = 12;
const r = todaysRound(s); answer(s, r[0], true); protect(s, 'selfban');
openCyber(document.getElementById('host')!, s, { back: () => undefined, refresh: () => undefined, notify: () => undefined });
