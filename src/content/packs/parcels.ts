/* Parcels and online orders: eight scenes about marketplaces, pickup points, couriers and the post.
   Only general, widely known habits are used: ordering from a marketplace app, collecting the order at a pickup point with a code or QR,
   trying things on at the pickup point, returning goods through the app, parcels from the Russian Post with a notice slip, courier calls,
   and delivery to the entrance. No company names, prices or rules are quoted. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const P = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `parcel-${id}`, cat: 'shop', w: o.w ?? 1, title, text,
    req: (s: State) => s.phone >= 1 && (!o.req || o.req(s)),
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};
const hasBank = (s: State): boolean => Object.values(s.bank).some(Boolean);

P('order', 'A marketplace sale', 'An app shows a banner: "Sale! Up to 70 per cent off". Your basket already has a kettle, a lamp and a pair of boots you did not know you needed.',
  ['Buy only the kettle', 'It arrives in three days, works and costs less than in the shop.', { money: -1200, stress: -2, know: 1 }],
  ['Fill the basket', 'The boots do not fit, the lamp is the wrong colour and you spend a weekend returning things.', { money: -3500, stress: 4, energy: -6 }], { req: hasBank, w: 1.3 });
P('pickup', 'The pickup point', 'Your order is ready at a pickup point in a basement beside the pharmacy. The assistant asks for the code from the app and brings out four bags.',
  ['Open the bag and check it at the counter', 'Everything is as ordered. The assistant nods approvingly: "That is the right way."', { know: 1, stress: -2 }],
  ['Grab the bag and run', 'At home you discover that the lid is missing. You will need the app after all.', { stress: 4, energy: -3 }]);
P('tryon', 'Trying on at the pickup point', 'You ordered two sizes of the same jacket. The pickup point has a curtain in the corner and a queue behind you.',
  ['Try both quickly and keep one', 'The right size fits like a glove. The other goes back in the bag.', { know: 1, stress: -1, energy: -2 }],
  ['Take both home and decide later', 'You return one next week and get your money back after a few days.', { energy: -4, stress: 2 }], { w: 0.9 });
P('return', 'Returning an item', 'A pair of headphones stopped working after a week. The app has a button "Return" and a form with five reasons.',
  ['Fill in the form with a photo of the fault', 'A courier takes it, and a few days later the money returns to your card.', { money: 1500, know: 2, stress: -2, energy: -3 }],
  ['Throw them in a drawer', 'They sit in the drawer and judge you.', { stress: 2, money: -50 }], { req: hasBank, w: 1 });
P('post-notice', 'A slip from the post', 'A paper notice in the mailbox says a parcel is waiting at the post office. The slip is hand-written and the post office is across the district.',
  ['Go with a passport and wait in the queue', 'The queue is long but the parcel is waiting. The clerk checks the passport three times and hands it over with a smile.', { energy: -8, know: 1, stress: 2 }],
  ['Wait until the weekend', 'The parcel is returned to the sender on the last day. You wonder who sent it.', { stress: 3, money: -100 }], { w: 0.9 });
P('courier-call', 'The courier is calling', 'The courier calls and says in one breath: "I am at your entrance, the code is not working, which floor is it?"',
  ['Go down and meet him', 'Two minutes, a smile and a signature. The courier thanks you for not making him climb.', { energy: -2, rep: 1, stress: -1 }],
  ['Talk him through the entrance code', 'Eventually he finds the right button and reaches the fifth floor.', { stress: 3, energy: -2 }], { w: 1.1 });
P('fake-tracking', 'A message about a parcel you did not order', 'An SMS says your parcel is held at customs and asks you to pay a small fee through a link.',
  ['Delete it and check the real order list in the app', 'There is nothing in the app. You block the number and feel a little clever.', { know: 2, stress: -2 }],
  ['Click the link just to see', 'The page looks suspicious and you close it at once. A good moment to remember the scam rules.', { know: 1, stress: 6 }], { req: hasBank, w: 0.9 });
P('gift', 'A gift from afar', 'A relative from your home town has sent a parcel by post: jars, dried herbs, a woollen scarf and a letter. The box has travelled a week.',
  ['Open it slowly and call to say thank you', 'The scarf is itchy and perfect. The call lasts an hour.', { famLove: 6, stress: -8, energy: -2 }],
  ['Open it and send a message', 'A quick "thank you" and a photo. It is received with a heart.', { famLove: 2, stress: -3 }], { w: 1 });
