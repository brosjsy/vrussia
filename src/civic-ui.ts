/* The city hall screen: this week's policy and who chose it, the open election with its candidates and how the count stands, a vote button (only in person at
   the polling station) and the way to stand as a candidate. The rules are in election.ts; this file only draws and connects them. */
import type { State } from './engine';
import * as G from './engine';
import { DECREES } from './decrees';
import { decreeFor, governorOf, standings, openWeek, daysLeft, vote, run, civicOf, POLLING_PLACE, RUN_FEE, ALLOWANCE } from './election';
import { t } from './i18n';

const esc = (x: string): string => x.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const policyText = (id: string): string => DECREES.find(d => d.id === id)?.text ?? '';
const pct = (x: number): string => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
let chosenPolicy = '';

/** The whole screen as HTML. */
export function civicHtml(s: State): string {
  const dec = decreeFor(s), gov = governorOf(s), week = openWeek(s), st = standings(s, week), civic = civicOf(s);
  const here = s.loc === POLLING_PLACE, voted = st.youVoted, onBallot = !!civic.ran[String(week)];
  const left = daysLeft(s), closes = left === 0 ? t('cvToday') : `${left} ${t(left === 1 ? 'cvDay' : 'cvDays')}`;
  const rows = st.rows.slice(0, 8).map(r => `<li class="cvRow${r.you ? ' you' : ''}"><div class="cvTop"><b>${esc(r.name)}</b> <small>${esc(r.party)}</small><span class="cvPct">${pct(r.share)}</span></div><div class="cvBar"><i style="width:${Math.round(r.share * 100 * 2.2)}%"></i></div><div class="cvSlogan">“${esc(r.slogan)}” · ${esc(policyText(r.policy))}</div>${voted === r.id ? `<div class="cvMine">✔ ${esc(t('cvYourVote'))}</div>` : (!voted && here ? `<button type="button" class="cvVote" data-cand="${r.id}">${esc(t('cvVote'))}</button>` : '')}</li>`).join('');
  const options = [0, 1, 2, 3].map(i => DECREES[(hashPick(s, i)) % DECREES.length]);
  if (!chosenPolicy || !options.some(o => o.id === chosenPolicy)) chosenPolicy = options[0].id;
  const runBox = onBallot
    ? `<p class="cvMine">🗳️ ${esc(t('cvOnBallot'))}: ${esc(policyText(civic.ran[String(week)].policy))}</p>`
    : `<div class="cvRun"><b>${esc(t('cvRunTitle'))}</b><p class="sub">${esc(t('cvRunBody').replace('{fee}', G.money(RUN_FEE)).replace('{pay}', G.money(ALLOWANCE)))}</p><label>${esc(t('cvPlatform'))}<select id="cvPolicy">${options.map(o => `<option value="${o.id}"${o.id === chosenPolicy ? ' selected' : ''}>${esc(o.text)}</option>`).join('')}</select></label><button type="button" id="cvRun" class="primary">${esc(t('cvRun'))} · ${esc(G.money(RUN_FEE))}</button></div>`;
  return `<div class="civic"><h2>🏛️ ${esc(t('cvTitle'))}</h2>
    <div class="cvNow"><small>${esc(t('cvThisWeek'))}</small><b>${esc(dec.text)}</b>${gov ? `<div class="sub">${esc(t('cvElected'))}: ${esc(gov.name)}${gov.you ? ` (${esc(t('cvYou'))})` : ''} · ${esc(gov.party)}</div>` : `<div class="sub">${esc(t('cvFirstWeek'))}</div>`}</div>
    <h3>${esc(t('cvNext'))}</h3><p class="sub">${esc(t('cvCloses'))}: ${esc(closes)} · ${esc(t('cvVotes'))}: ${st.total.toLocaleString('en-US')}</p>
    ${here ? '' : `<p class="warn">📍 ${esc(t('cvGoThere'))}</p>`}
    <ul class="cvList">${rows}</ul>
    ${runBox}</div>`;
}
const hashPick = (s: State, i: number): number => { let h = 2166136261; const t = `${s.name}|${s.city}|${openWeek(s)}|${i}`; for (let k = 0; k < t.length; k++) h = Math.imul(h ^ t.charCodeAt(k), 16777619) >>> 0; return h; };

/** Wires the buttons of the screen inside `root`. `again` is called after anything changed (it should draw the screen again and refresh the money). */
export function wireCivic(root: HTMLElement, s: State, ui: { notify: (m: string) => void; again: () => void }): void {
  root.querySelectorAll<HTMLButtonElement>('.cvVote').forEach(b => { b.onclick = () => { const r = vote(s, b.dataset.cand as string); ui.notify(r.msg); ui.again(); }; });
  const sel = root.querySelector<HTMLSelectElement>('#cvPolicy'); if (sel) sel.onchange = () => { chosenPolicy = sel.value; };
  const go = root.querySelector<HTMLButtonElement>('#cvRun'); if (go) go.onclick = () => { const r = run(s, sel?.value ?? chosenPolicy); ui.notify(r.msg); ui.again(); };
}
