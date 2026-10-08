/* Getting around: metro etiquette, the Moscow rings and diameters, minibuses, trams, scooters, airport trains.
   Moscow facts used: MCC (ring railway) opened 10 September 2016; MCD (diameters) opened 21 November 2019. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const METRO_CITIES = ['Moscow', 'Saint Petersburg', 'Kazan', 'Yekaterinburg', 'Novosibirsk', 'Samara', 'Nizhny Novgorod'];
const metro = (s: State): boolean => METRO_CITIES.includes(s.city);
const moscow = (s: State): boolean => s.city === 'Moscow';

const T = (id: string, title: string, text: string, a: Pick2, b: Pick2, req: (s: State) => unknown = () => true, w = 1): void => {
  S({ id: `tr-${id}`, cat: 'life', req, w, title, text, choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }] });
};

/* ---------------- metro etiquette ---------------- */
T('escalator', 'Which side of the escalator?', 'You step onto the metro escalator and stop in the middle. Behind you somebody sighs loudly.',
  ['Move to the right and let people pass on the left', 'Everyone flows around you. The unwritten rule is simple: stand right, walk left.', { know: 2, stress: -2 }],
  ['Stay where you are', 'A man with a briefcase squeezes past and mutters. You learn the rule the hard way.', { stress: 4, rep: -1 }], metro, 1.2);
T('rush-escalator', 'Rush-hour announcement', 'At 8:40 a voice on the loudspeaker asks everyone to stand on both sides of the escalator. People look confused.',
  ['Stand on the left like everyone else', 'The crowd moves smoothly. Safety first when it is crowded.', { know: 1, stress: -1 }],
  ['Walk up the left anyway', 'You are stopped by a wall of coats and a stern attendant.', { stress: 5 }], metro);
T('seat', 'Giving up your seat', 'The train is crowded. An older woman with two bags gets on at the next station and stands near you.',
  ['Offer her your seat', 'She says thank you three times and tells you which station is best for the market.', { rep: 3, stress: -3, merit: 1 }],
  ['Pretend to read your phone', 'You feel her presence all the way to the next stop.', { stress: 3, rep: -1 }], metro, 1.3);
T('backpack', 'A backpack in a crowded carriage', 'In the crush you realise your large backpack is hitting the people behind you.',
  ['Take it off and hold it in front of you', 'Several people nod. It is a small courtesy that makes the ride calmer.', { rep: 2, stress: -2 }],
  ['Leave it on, there is no room', 'A few elbows remind you.', { stress: 3 }], metro);
T('direction', 'The wrong direction', 'You fall asleep for two stops and wake up going away from your destination.',
  ['Get off, cross the platform and take the other train', 'It costs twenty minutes. You use the time to read the station names aloud.', { energy: -4, know: 1 }],
  ['Ride to the terminus and come back', 'You see the end of the line, which is a very quiet place.', { energy: -6, stress: 2 }], metro);
T('exit', 'Which exit?', 'Your station has eight exits and the street signs are small. A map app says "go north".',
  ['Look for the exit plan on the wall', 'The plan shows streets, malls and bus stops. You surface at exactly the right door.', { know: 2, stress: -3 }],
  ['Take the nearest exit and hope', 'You come out on the wrong side of a six-lane road.', { energy: -8, stress: 4 }], metro);
T('platform', 'Mind the gap', 'The recorded voice says "Stand clear of the closing doors". A tourist holds the door with his bag.',
  ['Gently remind him to step back', 'He apologises. The train leaves on time.', { rep: 1, stress: -1 }],
  ['Squeeze in beside him', 'The doors close on your coat for a moment. Embarrassing.', { stress: 4 }], metro);
T('artwork', 'A station like a palace', 'You exit a station with chandeliers and mosaics and realise you have walked past them for weeks.',
  ['Stop and look up for five minutes', 'Mosaics of workers, pilots and wheat. A guard smiles: "Everybody does this once."', { know: 2, merit: 1, stress: -6 }],
  ['Walk on, you are late', 'The ceiling will wait.', {}], metro, 0.8);

/* ---------------- Moscow rings and diameters ---------------- */
T('mcc', 'The Moscow Central Circle', 'A colleague tells you to use the MCC, the 54-kilometre ring railway that opened in 2016, to avoid the crowded centre.',
  ['Try the ring for your next trip', 'Overground, daylight and a map on the door. You transfer between metro lines without going downtown.', { know: 3, stress: -4, energy: 2 }],
  ['Stay with the usual metro line', 'Familiar but crowded.', { stress: 2 }], moscow, 1.4);
T('mcd', 'The Central Diameters', 'You need to go to a town in the suburbs. A map app suggests the MCD (Central Diameters), launched in 2019, which run like a metro across the city and out into the region.',
  ['Take the diameter train', 'Frequent trains, a clear map and a view of birch woods. You pay with your usual card.', { know: 3, stress: -4, money: -60 }],
  ['Take a suburban train the old way', 'Slower, with a paper timetable and a dozen stops.', { energy: -6, stress: 3 }], moscow, 1.3);
T('aeroexpress', 'The airport train', 'You need to get to the airport. Taxis are expensive and the roads are jammed.',
  ['Take the airport express train from a central station', 'Thirty-five minutes, clean seats, no traffic. You arrive calm.', { money: -600, stress: -6, energy: 2 }],
  ['Take a taxi', 'Faster in theory; in practice an hour in traffic.', { money: -3000, stress: 6 }], moscow, 0.9);
T('transfer', 'Interchanges', 'The map shows a transfer between two stations with different names, connected by a long underground passage.',
  ['Follow the colour-coded signs', 'Walk, walk, escalator: you reach the other line in six minutes.', { know: 2, energy: -3 }],
  ['Ask someone for directions', 'A student walks you all the way there, talking about her thesis.', { friends: 1, stress: -2 }], moscow);

/* ---------------- bus, tram, minibus ---------------- */
T('marshrutka', 'The marshrutka', 'A shared minibus pulls over. The driver shouts the route: "Metro, hospital, market!"',
  ['Pay the driver and say your stop out loud', 'You pass money hand to hand to the front and the change returns the same way. "Next stop, please!" and the bus stops.', { money: -45, know: 2, stress: -2 }],
  ['Wait for a bus with a ticket machine', 'A comfortable ride, twenty minutes later.', { energy: 2, money: -60 }]);
T('tram', 'A tram in the snow', 'The tram creaks slowly through the snow. Windows are frosted and the driver announces stops in a tired voice.',
  ['Sit by the heater and count the stops', 'You feel like a character in an old film.', { stress: -6, energy: 4 }],
  ['Get off and walk to warm up', 'Five minutes in the cold feels longer than the tram.', { energy: -5, health: 1 }], s => ['snow', 'frost'].includes(s.weather), 1.4);
T('validator', 'The card did not read', 'You tap your travel card at the gate and the light turns red. The queue behind you grows.',
  ['Step aside, try again, then ask the attendant', 'She reloads the card in a minute and waves you through.', { stress: 3, know: 1 }],
  ['Pay a single fare in cash instead', 'It costs more, but the queue moves on.', { money: -90, stress: 2 }], metro);
T('night', 'The last bus', 'You miss the last metro. A night bus leaves in forty minutes, a taxi is three times the price.',
  ['Wait for the night bus with a thermos of tea', 'A quiet bench, a few other night-owls and a conductor who calls everyone "dear".', { energy: -8, money: -60, stress: 2 }],
  ['Call a taxi', 'Home in fifteen minutes, a lighter wallet.', { money: -1500, stress: -3 }], metro);
T('scooter', 'An electric scooter', 'In summer, rental scooters stand at every corner. A friend says it is the fastest way across the park.',
  ['Rent one and keep to the bike lane', 'A quick breeze and a smile. You return it on time.', { money: -250, stress: -6, energy: 2 }],
  ['Skip it, walking is fine', 'You walk, you think, you arrive.', { energy: -3, health: 1 }], s => ['clear', 'heat'].includes(s.weather), 1.1);
T('bike', 'City bike', 'A bike-sharing station stands next to your door and the weather is mild.',
  ['Cycle to your errand', 'Fifteen minutes through side streets, wind in your face.', { money: -120, stress: -6, health: 1 }],
  ['Take public transport', 'Warmer and more predictable.', { money: -60 }], s => ['clear', 'rain', 'heat'].includes(s.weather));
T('conductor', 'A tram conductor', 'On an old tram a conductor walks through the carriage selling tickets and asks, "Did you pay, young person?"',
  ['Show your ticket', 'She nods and moves on.', { stress: -1 }],
  ['Pay her in cash', 'She tears a paper ticket and says "have a good trip".', { money: -50, stress: -2 }]);
T('taxi-app', 'Surge pricing', 'A snowstorm begins and the taxi app doubles its prices. Your phone shows three minutes to wait.',
  ['Wait ten minutes for the surge to calm', 'The price falls to normal. Patience pays.', { energy: -2, stress: 2 }],
  ['Pay the double price', 'Home quickly, but your wallet complains.', { money: -1200, stress: -2 }], s => ['snow', 'frost', 'rain'].includes(s.weather));
T('train-suburban', 'The suburban train', 'To visit a friend outside the city you take a suburban train (elektrichka) with wooden-looking seats and vendors selling gloves and ice cream.',
  ['Sit by the window and enjoy the ride', 'Villages, birch trees, level crossings. A vendor sells you a warm pie.', { money: -150, stress: -8, know: 1 }],
  ['Spend the ride on your phone', 'You miss the best bit of the view.', { stress: -2 }]);
T('timetable', 'The timetable you cannot read', 'The paper timetable at the stop is a grid of numbers with letters and footnotes.',
  ['Ask the driver or check a maps app', 'The driver reads it for you: the bus comes every 20 minutes on weekdays, hourly on Sundays.', { know: 2, stress: -2 }],
  ['Wait and see', 'Forty minutes later a bus arrives. It is the wrong one.', { energy: -6, stress: 4 }]);
