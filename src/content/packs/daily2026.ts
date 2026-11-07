/* The daily-life scenes (money, home, transport, health, food, work, customs, school), registered from the data in daily2026-data.ts and
   daily2026b-data.ts. Foreigner-only ones carry who: ['foreigner']; the others are for everybody. */
import { S, O } from '../../engine';
import type { State } from '../../engine';
import { DAILY } from './daily2026-data';
import { DAILY_B } from './daily2026b-data';
import { DAILY_C } from './daily2026c-data';
import { DAILY_D } from './daily2026d-data';
import { DAILY_E } from './daily2026e-data';

const REQ: Record<string, (s: State) => unknown> = { 'day-lecture-ru': s => s.status === 'student', 'day2-school-test': s => s.kids > 0 };
/** The conditions named by the `req` key of the third part of the scenes. */
export const REQ_KEYS: Record<string, (s: State) => unknown> = {
  flat: s => Number(s.tmp.flatmates) > 0, kazan: s => s.city === 'Kazan', yekat: s => s.city === 'Yekaterinburg', novosib: s => s.city === 'Novosibirsk', vlad: s => s.city === 'Vladivostok',
  migrant: s => s.status === 'migrant', student: s => s.status === 'student', vnzh: s => !!s.flags.vnzh && !s.flags.naturalized, married: s => !!s.flags.married, kids: s => s.kids > 0,
};

const conditionOf = (d: { id: string; req?: string }): ((s: State) => unknown) | undefined => REQ[d.id] ?? (d.req ? REQ_KEYS[d.req] : undefined);

for (const d of [...DAILY, ...DAILY_B, ...DAILY_C, ...DAILY_D, ...DAILY_E] as { id: string; cat: string; foreigner?: boolean; req?: string; title: string; text: string; ch: [string, string, Parameters<typeof O>[1]][] }[]) S({
  id: d.id, cat: d.cat, w: 1, title: d.title, text: d.text, ...(d.foreigner ? { who: ['foreigner'] } : {}), ...(conditionOf(d) ? { req: conditionOf(d) } : {}),
  choices: d.ch.map(c => ({ t: c[0], r: () => O(c[1], c[2]) })),
});
