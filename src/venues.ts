/* Places to go in the city that are not one of the game's main places: a banya, a park, a café, a cinema, a gym, an ice rink in winter, a library,
   and landmarks (an embankment, a cathedral, a stadium, a television tower) where the player can take a photo for their collection. A visit takes a
   part of the day like any other action, costs the ticket plus the fare, and fills needs and moods. The way there is the metro in the cities that have
   one and the bus elsewhere. All prices are invented game values, all names generic (no real brands). Pure: a visit is an ordinary scenario of the
   engine, so it goes through the same turn as everything else. */
import { bump } from './events';
import type { State, Scenario, Effects } from './engine';
import { needsOf } from './needs';
import type { NeedKey } from './needs';
import { payFare } from './chores';

export interface Venue {
  id: string; name: string; ru: string; icon: string; landmark?: boolean; price: number; months?: number[];
  fx: Effects; needs: Partial<Record<NeedKey, number>>; text: string; ru_text: string;
}
export const VENUES: Venue[] = [
  { id: 'banya', name: 'Banya', ru: 'Баня', icon: '🧖', price: 900, fx: { stress: -10, energy: 10, health: 1 }, needs: { hygiene: 100, fun: 25 }, text: 'A Russian bathhouse: the steam room, birch twigs, a cold plunge and tea after.', ru_text: 'Русская баня: парилка, берёзовый веник, холодная купель и чай после.' },
  { id: 'park', name: 'City park', ru: 'Городской парк', icon: '🌳', price: 0, fx: { stress: -6 }, needs: { fun: 20, social: 5 }, text: 'Paths under the trees, pigeons, a man selling kvass from a barrel.', ru_text: 'Дорожки под деревьями, голуби, продавец кваса у бочки.' },
  { id: 'cafe', name: 'Café', ru: 'Кафе', icon: '☕', price: 600, fx: { stress: -3 }, needs: { hunger: 40, social: 15, fun: 10 }, text: 'Soup of the day, a pastry and a window seat.', ru_text: 'Суп дня, пирожное и место у окна.' },
  { id: 'cinema', name: 'Cinema', ru: 'Кинотеатр', icon: '🎬', price: 450, fx: { stress: -4 }, needs: { fun: 35 }, text: 'A new comedy, popcorn, a hall half full.', ru_text: 'Новая комедия, попкорн, зал наполовину полон.' },
  { id: 'gym', name: 'Gym', ru: 'Спортзал', icon: '🏋️', price: 400, fx: { energy: -10, health: 3, stress: -5 }, needs: { hygiene: -10 }, text: 'An hour on the machines and the treadmill.', ru_text: 'Час на тренажёрах и беговой дорожке.' },
  { id: 'rink', name: 'Ice rink', ru: 'Каток', icon: '⛸️', price: 350, months: [12, 1, 2], fx: { health: 1, stress: -5 }, needs: { fun: 30, social: 10 }, text: 'Hired skates, music, hot tea from a stall.', ru_text: 'Коньки напрокат, музыка, горячий чай из ларька.' },
  { id: 'library', name: 'Library', ru: 'Библиотека', icon: '📚', price: 0, fx: { know: 2, stress: -3 }, needs: { fun: 5 }, text: 'A quiet reading room with a lamp on every desk.', ru_text: 'Тихий читальный зал с лампой на каждом столе.' },
  { id: 'embankment', name: 'River embankment', ru: 'Набережная', icon: '🌉', landmark: true, price: 0, fx: { stress: -5 }, needs: { fun: 15 }, text: 'Granite steps down to the water and a view of the bridges.', ru_text: 'Гранитные ступени к воде и вид на мосты.' },
  { id: 'cathedral', name: 'The old cathedral', ru: 'Старый собор', icon: '⛪', landmark: true, price: 200, fx: { stress: -4, know: 1 }, needs: { fun: 10 }, text: 'Golden domes, frescoes and a choir practising.', ru_text: 'Золотые купола, фрески и репетиция хора.' },
  { id: 'stadium', name: 'Stadium', ru: 'Стадион', icon: '🏟️', landmark: true, price: 1500, fx: { stress: -6 }, needs: { fun: 40, social: 15 }, text: 'A home match: scarves, songs and a late goal.', ru_text: 'Домашний матч: шарфы, песни и поздний гол.' },
  { id: 'tower', name: 'TV tower', ru: 'Телебашня', icon: '🗼', landmark: true, price: 800, fx: { stress: -3 }, needs: { fun: 20 }, text: 'The lift to the observation deck and the whole city below.', ru_text: 'Лифт на смотровую площадку и весь город внизу.' },
];
/** Cities with a metro; elsewhere the bus takes the player around. */
export const METRO_CITIES = ['Moscow', 'Saint Petersburg', 'Kazan', 'Yekaterinburg', 'Novosibirsk', 'Nizhny Novgorod', 'Samara'];
export const hasMetro = (city: string): boolean => METRO_CITIES.includes(city);
/** The fare one way: the metro or the bus. */
export const fareOf = (city: string): number => (hasMetro(city) ? 65 : 45);
export const TAXI = 450;

type S = State & { photos?: string[] };
const clamp = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));
const month = (s: State): number => new Date(new Date(2026, 8, 1).getTime() + s.day * 864e5).getMonth() + 1;
export const photosOf = (s: State): string[] => { const x = s as S; if (!Array.isArray(x.photos)) x.photos = []; return x.photos; };
/** Why a venue cannot be visited now, or null. */
export function closed(s: State, v: Venue): string | null {
  if (v.months && !v.months.includes(month(s))) return 'Only in winter.';
  if (s.money < v.price + fareOf(s.city)) return 'Not enough money for the ticket and the fare.';
  return null;
}
/** A visit as a scenario of the engine: two ways to get there (public transport, or a taxi that is dearer and less tiring). It takes a part of the day. */
export function visitScenario(s: State, id: string, ru = false): Scenario | null {
  const v = VENUES.find(x => x.id === id); if (!v || closed(s, v)) return null;
  const go = (how: 'public' | 'taxi'): Effects => {
    const fare = how === 'taxi' ? TAXI : 0;                        // public transport is paid in run: from the transport card if there is one (chores.ts)
    return { ...v.fx, money: -(v.price + fare), energy: (v.fx.energy ?? 0) + (how === 'taxi' ? 0 : -4), run: st => {
      if (how === 'public') payFare(st, fareOf(st.city));
      const n = needsOf(st); for (const [k, d] of Object.entries(v.needs) as [NeedKey, number][]) n[k] = clamp(n[k] + d);
      if (v.landmark) { const p = photosOf(st); if (!p.includes(v.id)) p.push(v.id); bump(st, 'landmark'); }
      bump(st, v.id);                                                         // holiday tasks: the park, the café, the embankment (events.ts)
    } };
  };
  const title = ru ? v.ru : v.name, metro = hasMetro(s.city);
  const first = v.landmark && !photosOf(s).includes(v.id);
  const tail = first ? (ru ? ' Вы делаете фото для своей коллекции.' : ' You take a photo for your collection.') : '';
  return {
    id: `venue_${v.id}`, cat: 'city', title: `${v.icon} ${title}`, text: (ru ? v.ru_text : v.text) + (v.price ? (ru ? ` Билет: ${v.price} ₽.` : ` Ticket: ${v.price} roubles.`) : ''), dynamic: true,
    choices: [
      { t: metro ? (ru ? `На метро (${fareOf(s.city)} ₽)` : `By metro (${fareOf(s.city)} roubles)`) : (ru ? `На автобусе (${fareOf(s.city)} ₽)` : `By bus (${fareOf(s.city)} roubles)`), r: () => ({ msg: (ru ? 'Вы проводите там время.' : 'You spend some time there.') + tail, fx: go('public') }) },
      { t: ru ? `На такси (${TAXI} ₽)` : `By taxi (${TAXI} roubles)`, r: () => ({ msg: (ru ? 'Такси довозит до входа.' : 'The taxi drops you at the door.') + tail, fx: go('taxi') }) },
    ],
  };
}
