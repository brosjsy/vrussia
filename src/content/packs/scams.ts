/* Phone and online fraud: eight scenes about the schemes that people in Russia are warned about all the time.
   Only widely repeated patterns are used (a "bank security" call asking for an SMS code, a fake courier link,
   a request for a Gosuslugi code, a "safe account", a marketplace buyer's link, a fake boss in a messenger,
   a mobile-number renewal call, an "investment" chat). No amounts or laws are quoted.
   The rule of the pack: a player with more knowledge (know) has a better chance to see through the trick. */
import { S, O, RU } from '../../engine';
import type { Effects, State, Outcome } from '../../engine';

const { gamble } = RU.util;
type Pick2 = [label: string, msg: string, fx: Effects];

/** A scam never takes more than 60% of what the player has (at least 300), so one bad call cannot end the game by itself. */
const capLoss = (s: State, fx: Effects): Effects => (fx.money && fx.money < 0 ? { ...fx, money: -Math.min(-fx.money, Math.max(300, Math.floor(Math.max(0, s.money) * 0.6))) } : fx);

/** A scene where one choice is the trap: it is safe for the well-informed and costly for the rest. */
const T = (id: string, title: string, text: string, trap: Pick2, loss: Pick2, safe: Pick2, o: { w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `scam-${id}`, cat: 'life', w: o.w ?? 0.9, title, text, req: o.req,
    choices: [
      { t: trap[0], r: (s: State): Outcome => gamble(0.15 + s.know / 150, O(trap[1], trap[2]), O(loss[1], capLoss(s, loss[2]))) },
      { t: safe[0], r: () => O(safe[1], safe[2]) },
    ],
  });
};
const hasBank = (s: State): boolean => Object.values(s.bank).some(Boolean);

T('bank-call', 'A call from "bank security"', 'A calm voice says your account is under attack and asks for the code from the SMS "to cancel the transfer".',
  ['Read out the code', 'Halfway through the code you hesitate and hang up. It was a scam; you were lucky.', { stress: 6, know: 2 }],
  ['Read out the code', 'The code was the one that confirms a transfer. The money is gone before you finish the call.', { money: -9000, stress: 18, know: 3 }],
  ['Hang up and call the number on the back of your card', 'The real bank says there is no problem. Banks never ask for codes.', { stress: -3, know: 3 }], { req: hasBank });
T('courier-link', 'A parcel you did not order', 'An SMS says a courier cannot deliver and asks you to follow a link and enter your card number "to confirm the address".',
  ['Open the link', 'The page looks strange and you close it before typing anything.', { stress: 3, know: 1 }],
  ['Open the link', 'You type the card details. A few minutes later the card is emptied.', { money: -6000, stress: 15, know: 3 }],
  ['Delete the message', 'You check the real tracking in the shop\'s app: nothing is on its way.', { know: 2, stress: -2 }], { req: hasBank });
T('gosuslugi-code', 'A code from Gosuslugi', 'Someone calls from the "post office" and asks you to read out the code from an SMS to "extend your parcel storage".',
  ['Read it out', 'You stop yourself at the last digit. The code was for logging into your Gosuslugi account.', { stress: 5, know: 2 }],
  ['Read it out', 'Hours later the account sends a loan application you never made. You spend a week undoing it.', { money: -2000, stress: 20, know: 3, energy: -15 }],
  ['Say you will go to the post office in person', 'The caller hangs up. Nobody ever asked for that code again.', { know: 2, stress: -2 }]);
T('safe-account', 'The "safe account"', 'A man introduces himself as an investigator and says your money must be moved to a "safe account" right now, and that you must not tell anyone.',
  ['Follow his instructions', 'The word "secret" makes you stop. You put the phone down and call your family.', { stress: 8, know: 3, famLove: 1 }],
  ['Follow his instructions', 'You move the money. There is no investigator and no safe account.', { money: -15000, stress: 25, know: 4 }],
  ['Say you will talk to the bank in person', 'The line goes quiet and then dead. Real officials do not rush people.', { know: 3, stress: -4 }], { req: hasBank, w: 0.8 });
T('buyer-link', 'A very keen buyer', 'You have posted something for sale online. A buyer wants to pay at once and sends a link "to receive the money safely".',
  ['Open the buyer\'s link and enter your card', 'The page asks for the card number and the expiry date, which is wrong for receiving money; you close it.', { know: 2, stress: 2 }],
  ['Open the buyer\'s link and enter your card', 'There is nothing to receive. The card is charged instead.', { money: -4000, stress: 12, know: 3 }],
  ['Meet in person or use the platform\'s own payment', 'Slower, but the buyer vanishes and your money stays where it was.', { know: 2, stress: -1 }], { req: hasBank });
T('fake-boss', 'A message from "the director"', 'A new contact with your director\'s photo writes in a messenger: urgent task, transfer a payment now, no questions.',
  ['Do what the message says', 'The tone is too rushed. You call the real director, who knows nothing.', { stress: 5, know: 2, rep: 1 }],
  ['Do what the message says', 'The payment goes to a stranger. The real director is not pleased.', { money: -7000, stress: 18, rep: -4, know: 3 }],
  ['Call the director on the number you already have', 'It was fake. The director thanks you for checking.', { rep: 2, know: 2, stress: -2 }], { req: s => !!s.job });
T('number-renewal', 'Your phone number "expires"', 'A voice says your SIM card contract ends today and you must confirm a code or you will lose your number.',
  ['Give them the code', 'You hesitate: nobody loses a number like this. You hang up.', { stress: 4, know: 2 }],
  ['Give them the code', 'The code logs someone into your accounts. Several password resets follow.', { money: -1500, stress: 16, know: 3, energy: -10 }],
  ['Check with the operator\'s app', 'Everything is fine. You block the number.', { know: 2, stress: -3 }]);
T('invest-chat', 'The investment chat', 'You are added to a chat where members post screenshots of huge profits from an "expert" trading signals.',
  ['Send a small deposit to try', 'The "expert" asks for more; you stop and realise everyone in the chat is the same account.', { money: -500, know: 3, stress: 4 }],
  ['Send a small deposit to try', 'The first withdrawal "works", so you send a lot more. Then the chat is deleted.', { money: -12000, stress: 22, know: 4 }],
  ['Leave the chat', 'Easy money did not exist yesterday and does not today.', { know: 2, stress: -2 }], { req: hasBank, w: 0.8 });
