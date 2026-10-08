/* Long-distance trains: nine scenes about travelling across Russia by rail.
   Fact checked (web search, round 56): the Trans-Siberian line from Moscow to Vladivostok is about 9,300 km long (sources give 9,288 or 9,289)
   and crosses many time zones (one source says eight); the full ride takes about a week. The scenes use "about nine thousand
   three hundred kilometres" and "about a week". The two classes (open-plan "platzkart" and four-berth "kupe"), the carriage attendant
   (provodnitsa), tea in glass holders and platform sellers are everyday railway culture, described without real ticket prices (the game costs are made up). */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const R = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `rail-${id}`, cat: 'life', w: o.w ?? 0.9, req: o.req, title, text,
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};
const money = (n: number) => (s: State): boolean => s.money >= n;

R('platzkart', 'Platzkart or kupe?', 'You are planning a long trip by train. A friend swears by the open-plan carriage, "platzkart": cheap, noisy and full of stories. The four-berth compartment, "kupe", has a door.',
  ['Take platzkart', 'Forty people, a baby, a guitar and a man who shares his chicken. You arrive with three new contacts.', { money: -2500, friends: 2, energy: -12, stress: -2 }],
  ['Take kupe', 'A closed door and three quiet strangers. You sleep well.', { money: -5500, energy: -4, stress: -5 }], { req: money(6000), w: 1.2 });
R('attendant', 'The carriage attendant', 'The attendant, the "provodnitsa", stands at the door of the carriage and checks every ticket and passport as if each were a rare document.',
  ['Greet her politely and ask about the boiler', 'She shows you where the hot water is and where the bedding is kept. You are now a regular.', { know: 1, stress: -3, rep: 1 }],
  ['Walk straight to your seat', 'You find the water yourself in the end. She watches without comment.', { stress: 1 }]);
R('tea', 'Tea in a glass holder', 'On the table of the carriage the tea comes in a glass in a metal holder, and the train swings gently as it moves through the evening.',
  ['Ask for tea and watch the fields', 'Birches, villages, a dog on a station platform. Time stops being measured in hours.', { stress: -10, energy: 4, money: -80 }],
  ['Sleep through the afternoon', 'You wake up in another region.', { energy: 10, stress: -3 }]);
R('platform', 'Platform sellers', 'The train stops for twenty minutes and local people line the platform with pies, smoked fish, potatoes and berries.',
  ['Buy potatoes and a pie', 'The potatoes are hot and the pie is better than any restaurant. You return just in time.', { money: -300, stress: -6, energy: 8, health: 1 }],
  ['Stay in the carriage', 'The smell reaches you anyway.', { stress: 1 }], { w: 1.1 });
R('neighbour', 'The neighbour on the lower berth', 'An elderly man on the lower berth starts a conversation with the sentence "And where are you going, young person?"',
  ['Tell him your story', 'Three hours and one boiled egg later, he has told you about his life and given you advice you will think about for years.', { know: 2, friends: 1, stress: -6, energy: -4 }],
  ['Pretend to sleep', 'He starts the same conversation with the person opposite.', { stress: -1 }]);
R('time-zones', 'Another time zone', 'The tickets and the station clocks use Moscow time, but outside the window it is clearly night. The Trans-Siberian line, about nine thousand three hundred kilometres from Moscow to Vladivostok, crosses many time zones.',
  ['Learn the rules from the timetable', 'It takes a while, but you finally work out when you will really arrive.', { know: 2, stress: -2, energy: -2 }],
  ['Follow the carriage clock', 'Your body protests but the day goes on.', { energy: -6, stress: 3 }], { w: 0.8 });
R('missed-train', 'Left on the platform', 'At a long stop you wander to look at the station and the train begins to move. Your phone and wallet are on the train.',
  ['Run and jump onto the last carriage', 'The attendant opens the door with a face that says everything. You catch your breath for an hour.', { energy: -14, stress: 15, health: -1 }],
  ['Find the station manager', 'He calls ahead and the next train takes you to the next stop, where your things wait. It costs a day.', { energy: -10, stress: 12, money: -600, know: 2 }], { w: 0.4 });
R('night', 'Night in the carriage', 'It is 3 a.m. The carriage is quiet except for the wheels, a distant snore and the light of a lamp on the table.',
  ['Stand by the window for an hour', 'Dark forest, then a town with a few yellow lights. The world is big.', { stress: -8, know: 1, energy: -3 }],
  ['Go back to sleep', 'The wheels sing a lullaby.', { energy: 8 }]);
R('arrival', 'Arrival', 'The train slows down. The attendant opens the doors and the first breath of a new city smells of coal, rain and something sweet.',
  ['Step out and take a deep breath', 'A trip of days ends in a minute. Your legs remember the ground.', { stress: -8, energy: -2, know: 1 }],
  ['Rush to the taxi rank', 'Efficient, but you missed the moment.', { stress: 1, money: -300 }]);
