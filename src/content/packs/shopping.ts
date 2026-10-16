/* Shopping: ten scenes about supermarkets, markets, returns and loyalty cards.
   Fact checked (web search, round 67): under Article 25 of the Consumer Protection Law (No. 2300-1) a non-food product of proper quality can
   be exchanged for a similar one within 14 days, not counting the day of purchase, if it does not fit by shape, size, style, colour or
   configuration, provided it has not been used and its look, seals and labels are kept; a Government list of goods that cannot be exchanged
   (Decree of 31 December 2020 No. 2463) includes medicines, personal hygiene items, perfumery, underwear and technically complex
   appliances with a warranty. The scenes use only that and say "in general". The other scenes are everyday shopping culture. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const H = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `shopping-${id}`, cat: 'shop', w: o.w ?? 1, req: o.req, title, text,
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};
const hasPhone = (s: State): boolean => s.phone >= 1;

H('loyalty', 'The loyalty card', 'At the till the cashier asks, in one breath: "Do you have the card? The app? A bag? Do you want to collect points?"',
  ['Install the shop\'s app and take the card', 'A discount on the first basket and a stream of notifications. You use it in the end.', { money: 200, know: 1, stress: 2 }],
  ['Say "no, thank you" four times', 'The cashier smiles and moves on. You pay full price and escape.', { money: -150, stress: -1 }], { req: hasPhone, w: 1.3 });
H('sticker', 'The yellow sticker', 'In the evening, a shop worker puts yellow discount stickers on bread, milk and ready meals that will expire tomorrow. A small group of regulars is already waiting.',
  ['Join the regulars and grab a loaf and a pie', 'Half-price dinner, and a wink from the lady next to you.', { money: 250, friends: 1, stress: -2 }],
  ['Pay full price for fresh bread', 'It tastes the same and costs twice as much.', { money: -150 }]);
H('selfcheck', 'The self-checkout', 'A self-checkout machine announces "Unexpected item in the bagging area" for the third time. A queue forms behind you.',
  ['Wave to the attendant', 'She arrives with a card and a sigh. In two seconds it works.', { stress: 2, know: 1 }],
  ['Move to a manual till', 'Slower and calmer. The cashier says "you wouldn\'t believe how many people do that".', { stress: -1, energy: -2 }]);
H('market', 'Bargaining at the market', 'At a covered market a seller of honey asks for 900 for a jar. People around you taste, nod, and bargain gently.',
  ['Taste and bargain politely', 'You get a jar and a spoonful of something else for free, at a little less than the first price.', { money: -700, stress: -4, know: 1 }],
  ['Pay the first price', 'The seller is pleased. You feel the story was not so friendly after all.', { money: -900, stress: 1 }], { w: 0.9 });
H('weigh', 'Weigh it yourself', 'In the vegetable section of the supermarket you must weigh tomatoes at a scale and print a label before you go to the till.',
  ['Learn the scale and print the label', 'Number, tomatoes, label. You come out with a perfect bag and a small win.', { know: 1, stress: -1 }],
  ['Leave it to the cashier', 'She sends you back; the queue sighs.', { stress: 4 }], { w: 0.9 });
H('exchange', 'The jacket does not fit', 'A week ago you bought a jacket that turns out to be one size too small. You still have the tag and the receipt. In general, a non-food item of proper quality may be exchanged within 14 days, not counting the day of purchase, if it has not been used.',
  ['Go back with the receipt and the tag', 'The clerk checks the label and finds a bigger size. A polite exchange.', { know: 2, stress: -3, energy: -4 }],
  ['Keep it and hope to lose weight', 'The jacket waits in the cupboard.', { stress: 2, money: -50 }], { w: 1 });
H('no-return', 'Underwear and the list of non-returnable items', 'You bought something in a pharmacy and a pair of socks, and change your mind. The clerk points to the sign: certain categories, such as medicines, personal hygiene items and underwear, are not exchangeable.',
  ['Read the sign and learn the rule', 'You keep the items and make a note: try things on in the shop next time.', { know: 2, money: -300, stress: 2 }],
  ['Argue with the clerk', 'She stays calm and friendly; the list is on the wall.', { stress: 6, rep: -1 }], { w: 0.8 });
H('receipt', 'The receipt', 'At the end of a small purchase the cashier tucks the receipt into your bag without a word. A friend says: "Always keep it. And scan the QR code if it needs to be checked."',
  ['Keep receipts for big purchases', 'A year later a warranty claim goes smoothly because you found the receipt.', { know: 2, stress: -3 }],
  ['Throw it in the bin', 'Clean pockets and a lesson learned later.', { stress: 1 }], { w: 0.9 });
H('bags', 'Bring your own bag', 'The cashier asks if you need a bag. At home there are already thirty of them under the sink.',
  ['Bring a fabric bag', 'The shopping fits. A small win and a small reputation as an eco person.', { rep: 1, stress: -1 }],
  ['Buy a new bag, again', 'It is cheap and it ends up under the sink.', { money: -10 }], { w: 0.6 });
H('sbp-qr', 'Paying by QR code', 'At a small market stall there is no card reader, only a printed QR code stuck to the counter. The seller says "by phone, please".',
  ['Scan and pay with your banking app', 'A second later the seller\'s phone says "payment received". Easy and cash-free.', { know: 1, stress: -2 }],
  ['Look for an ATM', 'You find one at the other end of the street and pay in cash.', { energy: -5, money: -100 }], { req: s => Object.values(s.bank).some(Boolean) && hasPhone(s), w: 1.1 });
