/* Trains between the regions: real lines with their real stops, the time and the distance, three kinds of train and the classes of travel.
   Research (round 124, 16 October 2026). Sources: Russian Wikipedia ("Сапсан (поезд)", "Ласточка (электропоезд)" with its table of routes,
   "Россия (поезд)"), English Wikipedia ("Trans-Siberian Railway", distances from the timetable of train 002), and travel/timetable pages for the
   long-distance trains (Moscow–Adler No. 104, Moscow–Kazan, "Arktika", Moscow–Arkhangelsk, "Yantar" to Kaliningrad through Lithuania).
   - `verified: true` lines: stops, kilometres and times as the sources give them (the sources disagree by minutes; rounded).
   - `verified: false` lines: the main stops are known but the kilometres and hours are estimates from the distance; the game says so.
   Timetables change: the game shows "about" times and its own prices (set near real 2026 levels: Sapsan from a few thousand roubles,
   platzkart much less than kupe, SV the most). Nothing here is a real booking. */

export type TrainKind = 'highspeed' | 'express' | 'night';
export type TrainClass = 'seat' | 'platzkart' | 'kupe' | 'sv';
export interface Stop { city: string; station: string; km: number }
export interface Line {
  id: string; name: string; ru: string; kind: TrainKind; stops: Stop[]; hours: number; verified: boolean;
  /** Something special about this line (a border, a ferry, a week on the train). */
  note?: string; noteRu?: string;
}

const s = (city: string, station: string, km: number): Stop => ({ city, station, km });

export const LINES: Line[] = [
  { id: 'sapsan', name: 'Sapsan', ru: 'Сапсан', kind: 'highspeed', hours: 4, verified: true,
    stops: [s('Moscow', 'Leningradsky station', 0), s('Tver', 'Tver', 167), s('Bologoye', 'Bologoye-Moskovskoye', 331), s('Saint Petersburg', 'Moskovsky station', 650)],
    note: 'Some trains also stop at Vyshny Volochyok, Okulovka or Chudovo.', noteRu: 'Некоторые поезда останавливаются и в Вышнем Волочке, Окуловке или Чудове.' },
  { id: 'lastochka-nn', name: 'Lastochka', ru: 'Ласточка', kind: 'express', hours: 3.9, verified: true,
    stops: [s('Moscow', 'Kursky / Vostochny station', 0), s('Vladimir', 'Vladimir', 191), s('Kovrov', 'Kovrov', 252), s('Dzerzhinsk', 'Dzerzhinsk', 400), s('Nizhny Novgorod', 'Moskovsky station', 439)] },
  { id: 'lastochka-kursk', name: 'Lastochka', ru: 'Ласточка', kind: 'express', hours: 5.9, verified: true,
    stops: [s('Moscow', 'Kursky station', 0), s('Serpukhov', 'Serpukhov', 99), s('Tula', 'Tula-1-Kurskaya', 194), s('Oryol', 'Oryol', 382), s('Kursk', 'Kursk', 536)] },
  { id: 'lastochka-kostroma', name: 'Lastochka', ru: 'Ласточка', kind: 'express', hours: 4.1, verified: true,
    stops: [s('Moscow', 'Yaroslavsky station', 0), s('Rostov Veliky', 'Rostov-Yaroslavsky', 224), s('Yaroslavl', 'Yaroslavl-Glavny', 282), s('Kostroma', 'Kostroma', 375)] },
  { id: 'lastochka-pskov', name: 'Lastochka', ru: 'Ласточка', kind: 'express', hours: 3.4, verified: true,
    stops: [s('Saint Petersburg', 'Baltiysky station', 0), s('Gatchina', 'Gatchina-Varshavskaya', 45), s('Luga', 'Luga', 140), s('Pskov', 'Pskov-Passazhirsky', 274)] },
  { id: 'lastochka-karelia', name: 'Lastochka', ru: 'Ласточка', kind: 'express', hours: 11.4, verified: true,
    stops: [s('Petrozavodsk', 'Petrozavodsk', 0), s('Lodeynoye Pole', 'Lodeynoye Pole', 160), s('Chudovo', 'Chudovo', 330), s('Veliky Novgorod', 'Veliky Novgorod', 410), s('Pskov', 'Pskov-Passazhirsky', 721)],
    note: 'The longest Lastochka day trip: over 11 hours.', noteRu: 'Самая долгая дневная «Ласточка»: больше 11 часов.' },
  { id: 'lastochka-perm', name: 'Lastochka', ru: 'Ласточка', kind: 'express', hours: 4.8, verified: true,
    stops: [s('Yekaterinburg', 'Yekaterinburg-Passazhirsky', 0), s('Pervouralsk', 'Pervouralsk', 46), s('Kungur', 'Kungur', 280), s('Perm', 'Perm-2', 381)] },
  { id: 'lastochka-tyumen', name: 'Lastochka', ru: 'Ласточка', kind: 'express', hours: 4.6, verified: true,
    stops: [s('Yekaterinburg', 'Yekaterinburg-Passazhirsky', 0), s('Kamyshlov', 'Kamyshlov', 137), s('Talitsa', 'Talitsa', 215), s('Tyumen', 'Tyumen', 324)] },
  { id: 'lastochka-sochi', name: 'Lastochka', ru: 'Ласточка', kind: 'express', hours: 5.1, verified: true,
    stops: [s('Krasnodar', 'Krasnodar-1', 0), s('Goryachy Klyuch', 'Goryachy Klyuch', 60), s('Tuapse', 'Tuapse', 137), s('Lazarevskoye', 'Lazarevskaya', 184), s('Sochi', 'Sochi', 217), s('Adler', 'Adler', 240)] },
  { id: 'rossiya', name: 'Rossiya (No. 2)', ru: '«Россия» (№ 2)', kind: 'night', hours: 166, verified: true,
    stops: [s('Moscow', 'Yaroslavsky station', 0), s('Yaroslavl', 'Yaroslavl-Glavny', 281), s('Kirov', 'Kirov', 957), s('Perm', 'Perm-2', 1436), s('Yekaterinburg', 'Yekaterinburg-Passazhirsky', 1816),
      s('Tyumen', 'Tyumen', 2144), s('Omsk', 'Omsk-Passazhirsky', 2712), s('Novosibirsk', 'Novosibirsk-Glavny', 3335), s('Krasnoyarsk', 'Krasnoyarsk-Passazhirsky', 4098), s('Irkutsk', 'Irkutsk-Passazhirsky', 5185),
      s('Ulan-Ude', 'Ulan-Ude', 5642), s('Chita', 'Chita-2', 6199), s('Khabarovsk', 'Khabarovsk-1', 8493), s('Vladivostok', 'Vladivostok', 9289)],
    note: 'About a week on the train (162 to 166 hours) and seven time zones; daily since 2020.', noteRu: 'Около недели в пути (162–166 часов) и семь часовых поясов; ежедневно с 2020 года.' },
  { id: 'south', name: 'Moscow – Adler (double-decker)', ru: 'Москва — Адлер (двухэтажный)', kind: 'night', hours: 23.7, verified: false,
    stops: [s('Moscow', 'Kazansky station', 0), s('Ryazan', 'Ryazan-2', 198), s('Voronezh', 'Voronezh-1', 590), s('Rostov-on-Don', 'Rostov-Glavny', 1150), s('Krasnodar', 'Krasnodar-1', 1430), s('Tuapse', 'Tuapse', 1570), s('Sochi', 'Sochi', 1650), s('Adler', 'Adler', 1675)],
    note: 'Daily, about 23¾ hours; the main stops are known, the kilometres are estimates.', noteRu: 'Ежедневно, около 23¾ часа; главные остановки известны, километры — оценка.' },
  { id: 'kazan', name: 'Moscow – Kazan', ru: 'Москва — Казань', kind: 'night', hours: 11.5, verified: false,
    stops: [s('Moscow', 'Kazansky station', 0), s('Murom', 'Murom-1', 300), s('Arzamas', 'Arzamas-2', 410), s('Kanash', 'Kanash', 640), s('Kazan', 'Kazan-Passazhirskaya', 793)],
    note: '793 km overnight (about 11 hours); the stops differ from train to train.', noteRu: '793 км за ночь (около 11 часов); остановки у поездов разные.' },
  { id: 'arktika', name: 'Arktika', ru: '«Арктика»', kind: 'night', hours: 35.4, verified: false,
    stops: [s('Moscow', 'Leningradsky station', 0), s('Tver', 'Tver', 167), s('Bologoye', 'Bologoye', 331), s('Volkhovstroy', 'Volkhovstroy', 760), s('Kem', 'Kem', 1350), s('Murmansk', 'Murmansk', 1967)],
    note: 'North past the Arctic Circle: about a day and a half.', noteRu: 'На север за Полярный круг: около полутора суток.' },
  { id: 'pomorye', name: 'Moscow – Arkhangelsk', ru: 'Москва — Архангельск', kind: 'night', hours: 21, verified: false,
    stops: [s('Moscow', 'Yaroslavsky station', 0), s('Yaroslavl', 'Yaroslavl-Glavny', 282), s('Vologda', 'Vologda-1', 494), s('Nyandoma', 'Nyandoma', 830), s('Arkhangelsk', 'Arkhangelsk-Gorod', 1133)] },
  { id: 'yantar', name: 'Yantar (to Kaliningrad)', ru: '«Янтарь» (в Калининград)', kind: 'night', hours: 21, verified: false,
    stops: [s('Moscow', 'Belorussky station', 0), s('Smolensk', 'Smolensk-Tsentralny', 419), s('Minsk', 'Minsk (Belarus)', 750), s('Chernyshevskoye', 'Chernyshevskoye (border)', 1150), s('Kaliningrad', 'Kaliningrad-Passazhirsky', 1280)],
    note: 'Crosses Belarus and then Lithuania without stopping. Russian citizens need the transit document УПД-ЖД (asked for with the ticket, at least 28 hours before); other passports need a Lithuanian transit permit, so in the game they fly.', noteRu: 'Идёт через Беларусь и затем Литву без остановок. Гражданам России нужен транзитный документ УПД-ЖД (оформляется с билетом, не позже чем за 28 часов); с другим паспортом нужно литовское разрешение на транзит, поэтому в игре — только самолёт.' },
  // the rest of the game's cities: real directions, times estimated from the distance
  { id: 'volga', name: 'Moscow – Samara – Ufa – Chelyabinsk', ru: 'Москва — Самара — Уфа — Челябинск', kind: 'night', hours: 30, verified: false,
    stops: [s('Moscow', 'Kazansky station', 0), s('Ryazan', 'Ryazan-2', 198), s('Penza', 'Penza-1', 710), s('Syzran', 'Syzran-1', 960), s('Samara', 'Samara', 1100), s('Ufa', 'Ufa', 1560), s('Chelyabinsk', 'Chelyabinsk-Glavny', 1940)] },
  { id: 'tolyatti', name: 'Samara – Tolyatti', ru: 'Самара — Тольятти', kind: 'express', hours: 2, verified: false, stops: [s('Samara', 'Samara', 0), s('Tolyatti', 'Togliatti', 100)] },
  { id: 'saratov', name: 'Moscow – Saratov', ru: 'Москва — Саратов', kind: 'night', hours: 15, verified: false, stops: [s('Moscow', 'Paveletsky station', 0), s('Ryazan', 'Ryazan-1', 200), s('Tambov', 'Tambov-1', 480), s('Saratov', 'Saratov-1', 860)] },
  { id: 'volgograd', name: 'Moscow – Volgograd', ru: 'Москва — Волгоград', kind: 'night', hours: 19, verified: false, stops: [s('Moscow', 'Paveletsky station', 0), s('Michurinsk', 'Michurinsk-Voronezhsky', 400), s('Gryazi', 'Gryazi-Voronezhskiye', 470), s('Volgograd', 'Volgograd-1', 1070)] },
  { id: 'caucasus', name: 'Rostov – Grozny – Makhachkala', ru: 'Ростов — Грозный — Махачкала', kind: 'night', hours: 19, verified: false,
    stops: [s('Rostov-on-Don', 'Rostov-Glavny', 0), s('Armavir', 'Armavir-Rostovsky', 300), s('Mineralnye Vody', 'Mineralnye Vody', 490), s('Grozny', 'Grozny', 760), s('Gudermes', 'Gudermes', 795), s('Makhachkala', 'Makhachkala', 950)] },
  { id: 'ulyanovsk', name: 'Moscow – Ulyanovsk', ru: 'Москва — Ульяновск', kind: 'night', hours: 15, verified: false, stops: [s('Moscow', 'Kazansky station', 0), s('Ryazan', 'Ryazan-2', 198), s('Ruzayevka', 'Ruzayevka', 620), s('Ulyanovsk', 'Ulyanovsk-Tsentralny', 890)] },
  { id: 'izhevsk', name: 'Kazan – Izhevsk', ru: 'Казань — Ижевск', kind: 'night', hours: 7, verified: false, stops: [s('Kazan', 'Kazan-Passazhirskaya', 0), s('Agryz', 'Agryz', 300), s('Izhevsk', 'Izhevsk', 380)] },
  { id: 'altai', name: 'Novosibirsk – Barnaul', ru: 'Новосибирск — Барнаул', kind: 'express', hours: 4, verified: false, stops: [s('Novosibirsk', 'Novosibirsk-Glavny', 0), s('Berdsk', 'Berdsk', 30), s('Barnaul', 'Barnaul', 230)] },
  { id: 'yakutia', name: 'Neryungri – Nizhny Bestyakh (Yakutsk)', ru: 'Нерюнгри — Нижний Бестях (Якутск)', kind: 'night', hours: 21, verified: false,
    stops: [s('Neryungri', 'Neryungri-Passazhirskaya', 0), s('Tommot', 'Tommot', 380), s('Yakutsk', 'Nizhny Bestyakh (across the Lena)', 810)],
    note: 'The railway ends on the other bank of the Lena: a ferry in summer, the ice road in winter, a hard few weeks in between.', noteRu: 'Железная дорога заканчивается на другом берегу Лены: летом паром, зимой ледовая переправа, а в межсезонье — трудно.' },
  { id: 'bam-link', name: 'Khabarovsk – Neryungri', ru: 'Хабаровск — Нерюнгри', kind: 'night', hours: 36, verified: false, stops: [s('Khabarovsk', 'Khabarovsk-1', 0), s('Tynda', 'Tynda', 1300), s('Neryungri', 'Neryungri-Passazhirskaya', 1480)] },
  { id: 'pskov-night', name: 'Moscow – Pskov', ru: 'Москва — Псков', kind: 'night', hours: 12, verified: false, stops: [s('Moscow', 'Leningradsky station', 0), s('Tver', 'Tver', 167), s('Dno', 'Dno', 560), s('Pskov', 'Pskov-Passazhirsky', 730)] },
  { id: 'novgorod-night', name: 'Moscow – Veliky Novgorod', ru: 'Москва — Великий Новгород', kind: 'night', hours: 8.5, verified: false, stops: [s('Moscow', 'Leningradsky station', 0), s('Tver', 'Tver', 167), s('Veliky Novgorod', 'Veliky Novgorod', 590)] },
  { id: 'murmansk-spb', name: 'Saint Petersburg – Murmansk', ru: 'Санкт-Петербург — Мурманск', kind: 'night', hours: 27, verified: false, stops: [s('Saint Petersburg', 'Ladozhsky station', 0), s('Petrozavodsk', 'Petrozavodsk', 400), s('Kem', 'Kem', 860), s('Kandalaksha', 'Kandalaksha', 1150), s('Murmansk', 'Murmansk', 1450)] },
];

/* ---------------- fares and comfort ---------------- */
/** Roubles per kilometre, by kind of train and class (the game's prices). */
const RATE: Record<TrainKind, Partial<Record<TrainClass, number>>> = {
  highspeed: { seat: 6.5 },
  express: { seat: 3.4 },
  night: { platzkart: 2.4, kupe: 4.6, sv: 9.5 },
};
export const CLASSES_OF = (k: TrainKind): TrainClass[] => Object.keys(RATE[k]) as TrainClass[];
export const CLASS_NAME: Record<TrainClass, [string, string]> = { seat: ['Seat', 'Сидячий'], platzkart: ['Platzkart (open berths)', 'Плацкарт'], kupe: ['Kupe (4-berth compartment)', 'Купе'], sv: ['SV (2-berth sleeper)', 'СВ'] };

export interface Journey { line: Line; from: Stop; to: Stop; km: number; hours: number }
/** Every direct train from one of the game's cities to another, in both directions. */
export function journeys(from: string, to: string): Journey[] {
  const out: Journey[] = [];
  for (const line of LINES) {
    const a = line.stops.findIndex(x => x.city === from), b = line.stops.findIndex(x => x.city === to);
    if (a < 0 || b < 0 || a === b) continue;
    const km = Math.abs(line.stops[b].km - line.stops[a].km), total = line.stops[line.stops.length - 1].km;
    out.push({ line, from: line.stops[a], to: line.stops[b], km, hours: Math.max(0.5, Math.round((line.hours * km / total) * 10) / 10) });
  }
  return out.sort((x, y) => x.hours - y.hours);
}
/** The cities of a list (the game's cities) that can be reached from a city by one direct train. */
export function reachable(from: string, cities: readonly string[]): string[] {
  return cities.filter(c => c !== from && journeys(from, c).length > 0);
}
/** The best way with at most one change (for cities with no direct train). */
export function withChange(from: string, to: string): { first: Journey; second: Journey; via: string } | null {
  let best: { first: Journey; second: Journey; via: string } | null = null;
  const hubs = new Set(LINES.flatMap(l => l.stops.map(x => x.city)));
  for (const via of hubs) {
    if (via === from || via === to) continue;
    const a = journeys(from, via)[0], b = journeys(via, to)[0];
    if (a && b && (!best || a.hours + b.hours < best.first.hours + best.second.hours)) best = { first: a, second: b, via };
  }
  return best;
}
export const fareOf = (j: Journey, cls: TrainClass): number | null => { const r = RATE[j.line.kind][cls]; return r ? Math.max(300, Math.round((j.km * r) / 10) * 10) : null; };
/** Game days a trip takes: a day trip in the same day, a night train one day per 24 hours started. */
export const daysOf = (hours: number): number => (hours <= 12 ? 0 : Math.ceil(hours / 24));
/** How tiring a class is per day on the train (energy), and how stressful. */
export const COMFORT: Record<TrainClass, { energy: number; stress: number }> = { seat: { energy: -10, stress: 2 }, platzkart: { energy: -14, stress: 3 }, kupe: { energy: -6, stress: -2 }, sv: { energy: -2, stress: -5 } };
/** Why this traveller cannot take this train (null when they can). Kaliningrad by train needs the Lithuanian transit rules. */
export function cannotRide(status: string, j: Journey): string | null {
  if (j.line.id === 'yantar' && status !== 'citizen') return 'With a foreign passport the transit through Lithuania needs a permit you do not have: fly to Kaliningrad instead.';
  return null;
}

/* ---------------- routes across the network (changes allowed) ---------------- */
export const CHANGE_HOURS = 2;
export interface Route { legs: Journey[]; hours: number; km: number }
/** The fastest way between two cities, changing trains where needed (about two hours per change). Null when there is no railway. */
export function route(from: string, to: string): Route | null {
  if (from === to) return null;
  const cities = Array.from(new Set(LINES.flatMap(l => l.stops.map(x => x.city))));
  if (!cities.includes(from) || !cities.includes(to)) return null;
  const best = new Map<string, { hours: number; legs: Journey[] }>([[from, { hours: 0, legs: [] }]]);
  const open = new Set([from]);
  while (open.size) {
    let cur = ''; let h = Infinity; for (const c of open) { const b = best.get(c)!.hours; if (b < h) { h = b; cur = c; } }
    open.delete(cur); if (cur === to) break;
    const here = best.get(cur)!;
    for (const next of cities) {
      if (next === cur) continue;
      const j = journeys(cur, next)[0]; if (!j) continue;
      const cost = here.hours + j.hours + (here.legs.length ? CHANGE_HOURS : 0);
      if (cost < (best.get(next)?.hours ?? Infinity)) { best.set(next, { hours: cost, legs: [...here.legs, j] }); open.add(next); }
    }
  }
  const r = best.get(to); if (!r) return null;
  return { legs: r.legs, hours: Math.round(r.hours * 10) / 10, km: r.legs.reduce((a, j) => a + j.km, 0) };
}
/** The fare of a whole route in a class: each leg in the chosen class if the train has it, else in its cheapest class. */
export function routeFare(r: Route, cls: TrainClass): number {
  return r.legs.reduce((sum, j) => sum + (fareOf(j, cls) ?? Math.min(...CLASSES_OF(j.line.kind).map(c => fareOf(j, c) as number))), 0);
}
