/* Little things to do with the things in a room. Tap a chair, a plant, a television or a guitar and a card lists what can be done with it: each activity has a
   name, a number of seconds, a price (often free) and what it gives (a little company, a calmer mind, a bite to eat). They take no part of the day, so to keep
   them small, no more than three can be done in each part of the day. The idea (an object that offers timed activities with tags such as "+Social") came from
   watching another life game's home screen; the objects, the activities, the numbers and the Russian flavour are ours. Pure functions over the game state. */
import type { State } from './engine';
import { needsOf } from './needs';
import type { NeedKey } from './needs';

export type Tag = NeedKey | 'calm' | 'energy' | 'mind';
export interface Activity { id: string; name: string; secs: number; cost: number; give: Partial<Record<Tag, number>>; pose: 'talk' | 'sit' | 'wash' | 'idle' }
export interface Thing { key: string; name: string; icon: string; flavour: string; list: Activity[] }

const A = (id: string, name: string, secs: number, cost: number, give: Activity['give'], pose: Activity['pose'] = 'idle'): Activity => ({ id, name, secs, cost, give, pose });

/** Things that offer activities, by what they are: the kind of a piece in a room (chair, tv, plant...) or the id of a bought piece. */
export const THINGS: Thing[] = [
  { key: 'chair', name: 'Chair', icon: '💺', flavour: 'Every kitchen in Russia has one more chair than guests.', list: [A('gossip', 'Gossip on the phone', 7, 0, { social: 8 }, 'talk'), A('tea', 'Sit with a cup of tea', 12, 20, { calm: 2, hunger: 4 }, 'sit')] },
  { key: 'table', name: 'Table', icon: '🍽️', flavour: 'Where the family argues, eats and decides.', list: [A('breakfast', 'Bread, butter and tea', 15, 60, { hunger: 14, calm: 1 }, 'sit'), A('cards', 'Play patience', 10, 0, { calm: 2, mind: 1 }, 'sit')] },
  { key: 'plant', name: 'House plant', icon: '🌿', flavour: 'It survived the last winter. So can you.', list: [A('water', 'Water the plant', 6, 0, { calm: 1 }), A('talk-plant', 'Tell it about your day', 8, 0, { social: 4, calm: 1 }, 'talk')] },
  { key: 'tv', name: 'Television', icon: '📺', flavour: 'Always on, even when nobody is watching.', list: [A('news', 'Watch the evening news', 14, 0, { calm: 1 }, 'sit'), A('series', 'An old comedy film', 20, 0, { calm: 3, social: 2 }, 'sit')] },
  { key: 'window', name: 'Window', icon: '🌆', flavour: 'The courtyard below is never empty.', list: [A('look', 'Look at the courtyard', 6, 0, { calm: 1, social: 2 })] },
  { key: 'rug', name: 'Rug', icon: '🧶', flavour: 'Soft, and older than you.', list: [A('stretch', 'Stretch on the rug', 8, 0, { energy: 3, calm: 1 })] },
  { key: 'item', name: 'Gadget', icon: '🔌', flavour: 'It hums quietly.', list: [A('fiddle', 'Fiddle with it', 5, 0, { calm: 1 })] },
  // pieces from the furniture catalogue
  { key: 'guitar', name: 'Guitar', icon: '🎸', flavour: 'Three chords are enough for a courtyard.', list: [A('strum', 'Play three chords', 12, 0, { calm: 3, social: 3 }, 'sit'), A('song', 'Sing a song from your village', 16, 0, { social: 6, calm: 2 }, 'sit')] },
  { key: 'piano', name: 'Upright piano', icon: '🎹', flavour: 'Somebody on the floor below always knows the tune.', list: [A('scales', 'Play scales', 10, 0, { mind: 2, calm: 2 }, 'sit'), A('waltz', 'Play a waltz', 18, 0, { calm: 4, social: 2 }, 'sit')] },
  { key: 'easel', name: 'Easel', icon: '🎨', flavour: 'A blank canvas is a day off.', list: [A('paint', 'Paint the courtyard', 18, 40, { calm: 4, mind: 1 })] },
  { key: 'aquarium', name: 'Aquarium', icon: '🐠', flavour: 'The fish do not ask about your papers.', list: [A('feed', 'Feed the fish', 6, 20, { calm: 2 }), A('watch', 'Watch the fish', 14, 0, { calm: 3 }, 'sit')] },
  { key: 'console', name: 'Games console', icon: '🎮', flavour: 'Just one more level.', list: [A('play', 'Play a football game', 20, 0, { calm: 2, social: 3 }, 'sit')] },
  { key: 'chess', name: 'Chess table', icon: '♟️', flavour: 'Every yard has a grandfather who never loses.', list: [A('match', 'Play a game of chess', 16, 0, { mind: 2, social: 4 }, 'sit')] },
  { key: 'samovar', name: 'Samovar', icon: '☕', flavour: 'It takes a long time, and that is the point.', list: [A('tea', 'Make tea in the samovar', 14, 30, { hunger: 6, calm: 3, social: 2 }, 'sit')] },
  { key: 'bath-tub', name: 'Bathtub', icon: '🛁', flavour: 'The hot water is on, for once.', list: [A('soak', 'Have a long hot bath', 20, 0, { hygiene: 40, calm: 3 }, 'wash')] },
  { key: 'sauna-barrel', name: 'Banya barrel', icon: '🧖', flavour: 'Steam, a birch broom and honest talk.', list: [A('steam', 'Steam with a birch broom', 24, 0, { hygiene: 35, calm: 5, social: 2 }, 'sit')] },
  { key: 'heater', name: 'Electric heater', icon: '🔥', flavour: 'It ticks as it warms.', list: [A('warm', 'Warm your hands', 6, 0, { calm: 1 })] },
  { key: 'pouf', name: 'Bean bag', icon: '🔴', flavour: 'Sinks slowly.', list: [A('sink', 'Sink in and scroll', 10, 0, { calm: 2, social: 3 }, 'sit')] },
  { key: 'cat-bed', name: 'Cat basket', icon: '🐱', flavour: 'Empty, as the cat sleeps elsewhere.', list: [A('cat', 'Stroke the cat', 8, 0, { calm: 3, social: 2 })] },
  { key: 'dog-bed', name: 'Dog bed', icon: '🐶', flavour: 'Warm from a dog that left a minute ago.', list: [A('dog', 'Play with the dog', 10, 0, { calm: 3, social: 3 })] },
];

/** How many little things can be done in one part of the day. */
export const PER_SLOT = 3;
export const thingFor = (key: string): Thing | undefined => THINGS.find(t => t.key === key);
export const keyFor = (kind: string, furnId?: string): string | null => (furnId && thingFor(furnId) ? furnId : thingFor(kind) ? kind : null);

const slotNo = (s: State): number => s.day * 3 + s.slot;
interface Budget { slot: number; n: number }
const budgetOf = (s: State): Budget => { const t = s.tmp as Record<string, string | number>; if (t.actSlot !== slotNo(s)) { t.actSlot = slotNo(s); t.actN = 0; } return { slot: t.actSlot as number, n: Number(t.actN) }; };
/** How many little things are still allowed in this part of the day. */
export const leftNow = (s: State): number => PER_SLOT - budgetOf(s).n;

export interface Done { ok: boolean; msg: string; secs: number; pose: Activity['pose'] }
const clamp = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));

/** Does one activity of a thing: pays the price, gives what it gives, and counts against the three of this part of the day. */
export function doActivity(s: State, key: string, activityId: string): Done {
  const th = thingFor(key), a = th?.list.find(x => x.id === activityId);
  if (!th || !a) return { ok: false, msg: 'There is nothing to do with that.', secs: 0, pose: 'idle' };
  if (leftNow(s) <= 0) return { ok: false, msg: 'Enough little things for now: the day goes on.', secs: 0, pose: 'idle' };
  if (s.money < a.cost) return { ok: false, msg: 'Not enough money.', secs: 0, pose: 'idle' };
  s.money -= a.cost;
  const n = needsOf(s), g = a.give;
  for (const k of ['hunger', 'hygiene', 'social', 'fun'] as NeedKey[]) if (g[k]) n[k] = clamp(n[k] + (g[k] as number));
  n.fun = clamp(n.fun + 10);                                  // a little activity is a little fun
  if (g.calm) s.stress = Math.max(0, s.stress - g.calm);
  if (g.energy) s.energy = Math.min(100, s.energy + g.energy);
  if (g.mind) s.know = Math.min(100, s.know + g.mind * 0.1);
  (s.tmp as Record<string, string | number>).actN = budgetOf(s).n + 1;
  return { ok: true, msg: `${a.name}.`, secs: a.secs, pose: a.pose };
}

/** The little tags shown on a card, like "+Social" or "+Calm". */
export function tagsOf(a: Activity): string[] {
  const label: Record<Tag, string> = { hunger: 'Food', hygiene: 'Clean', social: 'Social', fun: 'Fun', bladder: 'Toilet', calm: 'Calm', energy: 'Energy', mind: 'Mind' };
  return (Object.keys(a.give) as Tag[]).filter(k => (a.give[k] ?? 0) > 0).map(k => `+${label[k]}`);
}
