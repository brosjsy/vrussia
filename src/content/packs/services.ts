/* Small neighbourhood services: eight scenes about the places people use every few months.
   A barber, a shoe repair stall, a key-cutting booth, a tailor's studio, a dry cleaner, a phone-screen repair kiosk, a laundromat and a
   copy shop. General everyday life only: no laws, no company names, and the prices are invented game values. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const V = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `svc-${id}`, cat: 'life', w: o.w ?? 0.9, req: o.req, title, text,
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};

V('barber', 'The barber', 'A small barbershop at the corner has a cat on the windowsill and a sign "Walk-ins welcome". The barber asks: "As usual?" although you have never been here.',
  ['Say "the usual" and trust him', 'You leave with a decent haircut and a warm feeling of being a regular.', { money: -700, rep: 1, stress: -4, clothes: 1 }],
  ['Show him a photo', 'He studies it for a long time and says it will be "close". It is.', { money: -700, stress: -2, clothes: 1 }], { w: 1.1 });
V('shoes', 'The shoe repair stall', 'The sole of your boot has come away. At a stall in the underpass a man in an apron looks at it for two seconds. "Fifteen minutes."',
  ['Wait and watch', 'He glues, presses and polishes. The boots are better than new and you hear a story about the 1990s.', { money: -500, clothes: 3, stress: -3, know: 1 }],
  ['Buy new boots instead', 'Expensive, but that is that.', { money: -4500, clothes: 6, stress: 1 }], { w: 1 });
V('keys', 'Duplicating a key', 'You have lost your spare key and the landlord says "make a copy". There is a key-cutting booth next to the metro, with a machine that screams.',
  ['Have two copies cut', 'A shower of metal sparks and two shiny keys in two minutes.', { money: -300, stress: -3 }],
  ['Make one and hope', 'You lose it within a week.', { money: -150, stress: 4 }], { w: 1 });
V('tailor', 'The tailor\'s studio', 'Your only decent jacket is a size too big. A tailor in a basement studio pins it, tuts, and pins again.',
  ['Have it taken in', 'A week later it fits like it was made for you.', { money: -1500, clothes: 6, rep: 1, stress: -2 }],
  ['Wear it as it is', 'The sleeves cover your hands. People say it is "oversize style".', { stress: 1 }], { w: 0.9 });
V('dry-clean', 'The dry cleaner', 'A friend\'s wine has met your coat. The dry cleaner looks at the stain, at you, and says: "It will come out. Probably."',
  ['Leave it for three days', 'The coat is clean and smells faintly of citrus. A good decision.', { money: -900, clothes: 2, stress: -3 }],
  ['Wash it at home', 'The stain fades but the colour does too.', { clothes: -2, stress: 2 }], { w: 0.8 });
V('screen', 'The phone-screen kiosk', 'You dropped your phone and the screen is a spider\'s web. A kiosk in the mall offers "repair while you wait, one year warranty".',
  ['Repair it at the kiosk', 'Forty minutes later the phone is almost like new and the warranty paper is in your pocket.', { money: -3500, stress: -4, know: 1 }],
  ['Live with the cracks', 'You cut your thumb twice and your phone looks like a map.', { stress: 4 }], { req: s => s.phone >= 1, w: 0.9 });
V('laundromat', 'The laundromat', 'The washing machine at home has broken. A self-service laundromat opens at the end of the street, and a woman at the next machine offers you detergent.',
  ['Wash there for an evening', 'Two hours, tea from a vending machine and a long conversation about the price of everything.', { money: -400, friends: 1, stress: -3, energy: -3 }],
  ['Wash in the bath by hand', 'Your arms ache and your jeans are cleaner than they have been in months.', { energy: -10, stress: 2 }], { w: 0.8 });
V('copy', 'The copy shop', 'An office asks for a "notarised-looking" copy of your documents. At a copy shop the girl behind the counter says: "Black and white or colour? How many sets? Do you need them stapled?"',
  ['Ask for three sets stapled', 'Nine pages, a stapler and a polite thank you. The office does not ask for another set.', { money: -250, stress: -2, know: 1 }],
  ['Take one and hope', 'The office asks for two more copies. You return.', { money: -100, energy: -5, stress: 4 }], { w: 1 });
