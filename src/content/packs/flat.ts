/* Renting and running a flat: ten scenes about heating, hot water, meters, deposits and landlords.
   Fact checked (web search, round 53): under the utilities rules (Government Decree No. 354 of 6 May 2011) the heating period must
   start no later than the day after five days in a row when the average daily outside temperature is below +8 C, and it may end
   after five days in a row above +8 C; local authorities may switch heating on earlier. Debates about changing the rule were seen
   in the press, so the scenes say "under the rules in force when the game was written". Other scenes are general life. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const F = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { months?: number[]; w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `flat-${id}`, cat: 'home', w: o.w ?? 1, months: o.months, req: o.req, title, text,
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};
const renter = (s: State): boolean => s.housing === 'rented';

F('heating-on', 'The radiators are still cold', 'It is October and the mornings are frosty. Under the rules in force when the game was written, heating must start after five days in a row when the average daily temperature is below +8 °C; the neighbours are already asking when it will come.',
  ['Wait a few days and use a heater', 'On the sixth cold day the radiators begin to creak and warm up. The heater goes back into the cupboard.', { money: -150, stress: 3, health: -1 }],
  ['Call the management company\'s hotline', 'You get a recorded message and then a real person: "The temperature has not yet been long enough. Soon."', { stress: 2, know: 1, energy: -3 }], { months: [9, 10] });
F('heating-off', 'The heating ends', 'In April the radiators go cold overnight. The rules allow switching them off after five days in a row above +8 °C, and the evening air is still sharp.',
  ['Wear a sweater and wait for spring', 'A week later the sun does the job. You no longer notice.', { stress: 1 }],
  ['Buy an electric heater for the cold evenings', 'Warm, cosy and the electricity bill rises a little.', { money: -1200, stress: -3 }], { months: [4, 5] });
F('hot-water', 'No hot water this summer', 'A notice in the lift: hot water will be off for planned maintenance, two weeks in summer. Many people in Russian cities know this ritual.',
  ['Boil water in a saucepan like everyone else', 'You wash in a basin and learn the exact time it takes to heat a pan.', { energy: -6, stress: 4 }],
  ['Stay with a friend for the two weeks', 'You are hosted with tea and mild teasing. The shower is hot.', { friends: 1, stress: -2, money: -300 }], { months: [6, 7, 8], w: 1.3 });
F('meters', 'The meter readings', 'A reminder app says that the water meter readings must be sent this week. The meter hides behind a pipe under the sink.',
  ['Send the readings now', 'Done in ten minutes; the receipt next month is a little smaller.', { money: 200, know: 1, stress: -2, energy: -3 }],
  ['Forget it', 'The management company calculates by the average instead, and it is not in your favour.', { money: -400, stress: 3 }]);
F('receipt', 'The single payment receipt', 'A single payment document arrives for the flat: heating, water, electricity, the lift, the "major repairs fund". One line is higher than last month.',
  ['Check each line and ask', 'It was a mistake, corrected after a polite email. You feel quietly victorious.', { know: 2, money: 300, stress: -2, energy: -5 }],
  ['Pay without looking', 'It is paid and the world is calm, but you wonder about that line.', { money: -300 }]);
F('viewing', 'Viewing a flat', 'An advert says "no agents, near the metro". At the viewing the owner explains all the rules of the flat in the first ten minutes: no parties, no pets, shoes off.',
  ['Agree and take the flat', 'The rules are strict and the neighbours are kind. A fair deal.', { money: -400, stress: -4, know: 1 }],
  ['Keep looking', 'You see three more flats; one has a wallpaper that has seen a lot.', { energy: -10, stress: 3, know: 1 }], { req: renter });
F('deposit', 'The deposit', 'The owner asks for a deposit equal to one month\'s rent and promises to return it at the end. You ask for a written agreement; he looks mildly offended.',
  ['Insist on a written agreement', 'He signs after a pause. In a year you are glad.', { know: 2, stress: 2, rep: 1 }],
  ['Trust his word', 'It works out this time. The lesson is learnt by someone else.', { stress: 1 }], { req: renter });
F('landlord-visit', 'The owner drops by', 'The landlord rings: "I will pop in tomorrow to check the pipes." He arrives with a bag of apples and checks everything, including the cupboards.',
  ['Show him round and offer tea', 'He leaves in good mood and the rent stays the same for another year.', { rep: 2, stress: -2, energy: -4 }],
  ['Say you are not at home', 'He sighs and comes back at the weekend.', { stress: 3 }], { req: renter });
F('cold-flat', 'A cold flat in winter', 'In January the radiators are lukewarm and the room is 16 degrees. You feel your breath near the window.',
  ['Write a complaint to the management company', 'Within days a plumber bleeds the air from the radiators. Real warmth.', { know: 2, stress: -4, energy: -5 }],
  ['Seal the window with tape and a blanket', 'Not elegant but a warm night.', { money: -200, energy: -4, stress: 1 }], { months: [12, 1, 2], w: 1.4 });
F('upstairs-water', 'The neighbour above has a sink problem', 'Brown water drips from the light fitting in the corridor. The neighbour above says "Oh, thank you for telling me" and goes to find the plumber.',
  ['Photograph the damage and write a note for the record', 'The neighbour pays for the repair without drama; the note was enough.', { know: 2, money: 400, stress: 2 }],
  ['Just wipe the floor', 'A peaceful evening. The ceiling will tell its story later.', { energy: -4, stress: 2 }], { w: 0.7 });
