/* A train trip to another city as a scene of the game: choose the class, pay, spend the hours or days on board (a scene from the train on
   the way), and arrive living in the new city. Moving works as the game's other moves do: a foreigner must register again in the new city. */
import type { State, Scenario, Effects } from './engine';
import { route, routeFare, cannotRide, daysOf, COMFORT, CLASSES_OF, CLASS_NAME } from './trains';
import type { Route, TrainClass } from './trains';

const RAIL_SCENES = ['rail-platzkart', 'rail-attendant', 'rail-tea', 'rail-platform', 'rail-neighbour'];
/** The classes a whole route can be travelled in (night trains: platzkart, kupe, SV; day trains: a seat). */
export const classesFor = (r: Route): TrainClass[] => Array.from(new Set(r.legs.flatMap(j => CLASSES_OF(j.line.kind))));

/** Why this trip is not possible now (null when it is). */
export function cannotTravel(s: State, to: string, cls: TrainClass): string | null {
  if (to === s.city) return 'You are already here.';
  const r = route(s.city, to); if (!r) return 'There is no railway between these cities.';
  for (const j of r.legs) { const why = cannotRide(s.status, j); if (why) return why; }
  if (!classesFor(r).includes(cls)) return 'This train has no such class.';
  if (s.money < routeFare(r, cls)) return `The tickets cost ${routeFare(r, cls).toLocaleString('en-US')} roubles.`;
  return null;
}

/** The effects of riding to a city (applied by the scene below; tests use it directly). */
export function tripEffects(s: State, to: string, cls: TrainClass): Effects {
  const r = route(s.city, to) as Route, days = daysOf(r.hours), c = COMFORT[cls];
  return {
    money: -routeFare(r, cls), city: to, loc: 'station', setDocs: s.status === 'citizen' ? undefined : { reg: 0 },
    energy: c.energy * Math.max(1, days), stress: c.stress * Math.max(1, days) + (r.legs.length - 1) * 2, skip: days,
    queue: days >= 1 ? RAIL_SCENES[(s.day + to.length) % RAIL_SCENES.length] : undefined,
  };
}

export function tripScenario(s: State, to: string, ru = false): Scenario | null {
  const r = route(s.city, to); if (!r) return null;
  const legs = r.legs.map(j => `${ru ? j.line.ru : j.line.name}: ${j.from.station} → ${j.to.station}`).join(' · ');
  const when = r.hours < 1.5 ? (ru ? 'около часа' : 'about an hour') : r.hours < 24 ? (ru ? `около ${Math.round(r.hours)} ч` : `about ${Math.round(r.hours)} hours`) : (ru ? `около ${Math.round(r.hours / 24 * 10) / 10} суток` : `about ${Math.round(r.hours / 24 * 10) / 10} days`);
  return {
    id: `train_${to}`, cat: 'travel', dynamic: true,
    title: `🚆 ${s.city} → ${to}`,
    text: (ru ? `${when}, ${r.km.toLocaleString('ru-RU')} км. ${r.legs.length > 1 ? `Пересадок: ${r.legs.length - 1}. ` : ''}` : `${when}, ${r.km.toLocaleString('en-US')} km. ${r.legs.length > 1 ? `${r.legs.length - 1} change${r.legs.length > 2 ? 's' : ''}. ` : ''}`) + legs,
    choices: [
      ...classesFor(r).map(cls => {
        const why = cannotTravel(s, to, cls), fare = routeFare(r, cls);
        return { t: `${CLASS_NAME[cls][ru ? 1 : 0]} · ${fare.toLocaleString(ru ? 'ru-RU' : 'en-US')} ₽${why ? ` (${why})` : ''}`,
          r: (st: State) => { const w = cannotTravel(st, to, cls); return w ? { msg: w, fx: {} } : { msg: ru ? `Вы садитесь в поезд. Через ${when} — ${to}.` : `You board the train. In ${when}: ${to}.`, fx: tripEffects(st, to, cls) }; } };
      }),
      { t: ru ? 'Не сейчас' : 'Not now', r: () => ({ msg: ru ? 'Вы откладываете поездку.' : 'You put the trip off.', fx: {} }) },
    ],
  } as unknown as Scenario;
}
