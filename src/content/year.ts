/* One year in Russia: an anniversary scene on 1 September 2027 that sums up the first year. */
import { S, CAL, goals, money, checklistFor, ACHIEVEMENTS } from '../engine';
import type { State, Choice } from '../engine';

CAL.push({ m: 9, d: 1, id: 'cal_year1' });

/** A plain-language list of where the player stands, built only from the state. */
export function yearSummary(s: State): string[] {
  const done = goals.filter(g => g.done(s));
  const lines: string[] = [];
  lines.push(`Goals reached: ${done.length} of ${goals.length}${done.length ? ` (${done.slice(0, 3).map(g => g.label.toLowerCase()).join('; ')}${done.length > 3 ? '; ...' : ''})` : ''}.`);
  lines.push(`Status: ${s.status === 'citizen' ? (s.flags.naturalized ? 'a citizen of the Russian Federation, by naturalisation' : 'a Russian citizen') : s.flags.vnzh ? 'a permanent resident (VNZh)' : s.flags.rvp ? 'a temporary resident (RVP)' : s.status === 'student' ? 'a foreign student' : s.status === 'eaeu' ? 'an EAEU worker' : 'a labour migrant'}.`);
  lines.push(`Money: ${money(s.money)}${Number(s.tmp.debt) > 0 ? `, with ${money(Number(s.tmp.debt))} of debt still to pay` : ''}. Friends: ${s.friends}.`);
  if (s.partner) lines.push(`${s.flags.married ? 'Married to' : 'Together with'} ${s.partner.name}${s.kids ? `, with ${s.kids} child${s.kids > 1 ? 'ren' : ''}` : ''}.`);
  else if (s.kids) lines.push(`Raising ${s.kids} child${s.kids > 1 ? 'ren' : ''}.`);
  if (s.job) lines.push('You have a job.');
  if (s.biz) lines.push(`You run ${s.biz.name} (total profit ${money(s.biz.profit)}).`);
  if (s.flags.admitted) lines.push(`You are a student${Number(s.tmp.sessions) ? `, with an average of ${Number(s.tmp.gpa).toFixed(2)} after ${s.tmp.sessions} exam session(s)` : ''}.`);
  if (s.pet) lines.push(`Your dog ${s.pet.name} keeps you company.`);
  if (s.flags.award) lines.push('You received the community «Patriot» Award.');
  if (s.strikes) lines.push(`Legal strikes on record: ${s.strikes}.`);
  lines.push(`Achievements: ${s.ach.length} of ${ACHIEVEMENTS.length}.`);
  const open = checklistFor(s).filter(c => !c.done).length;
  if (open) lines.push(`Still open on the first-month checklist: ${open}.`);
  return lines;
}

S({
  id: 'cal_year1', cat: 'cal', free: true, title: 'One year in Russia', text: '', choices: [],
  build: (s: State) => {
    const pick = (t: string, msg: string, fx: Choice['fx']): Choice => ({ t, msg, fx });
    return {
      text: `It is 1 September, a year since you arrived. ${yearSummary(s).join(' ')}`,
      choices: [
        pick('Sit with a cup of tea and think it over', 'You write down three things you are proud of and one thing you want to change. The tea goes cold and you do not mind.', { stress: -12, merit: 2, know: 1 }),
        pick('Celebrate with friends', 'A table of salads, a cake with a single candle and a toast "to the next year". Somebody sings.', { money: -1500, stress: -14, friends: 1, rep: 2 }),
        pick('Make a plan for the second year', 'You list papers, money, people and dreams in four columns. The columns look possible.', { know: 3, stress: -6 }),
      ],
    };
  },
});
