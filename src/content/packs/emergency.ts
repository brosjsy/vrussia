/* Emergencies and first help: eight scenes about who to call and what to do.
   Fact checked (web search, round 64): 112 is the single emergency number in Russia and is free from mobile and fixed phones; it does not replace
   the separate numbers: 101 fire, 102 police, 103 ambulance and 104 gas emergency from a mobile (01 to 04 from an old landline).
   The advice to leave a burning building by the stairs and not by the lift and to avoid switching lights on when a gas smell is present is standard
   rescuer and gas-service guidance, stated briefly and without detail. The first-aid scenes are general; they are not medical advice. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
/** The first choice is the right one: good for health and knowledge; the second is the common mistake. */
const E = (id: string, title: string, text: string, right: Pick2, wrong: Pick2, o: { w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `emerg-${id}`, cat: 'health', w: o.w ?? 0.8, req: o.req, title, text,
    choices: [{ t: right[0], r: () => O(right[1], right[2]) }, { t: wrong[0], r: () => O(wrong[1], wrong[2]) }],
  });
};

E('numbers', 'Which number?', 'A neighbour asks whether she should call 112, 101, 102 or 103 when someone falls ill. You realise you are not sure either.',
  ['Learn the numbers: 112 for everything, 103 for an ambulance', 'The single number 112 works free from any phone and the operator passes the call on. The separate numbers 101, 102, 103 and 104 are also free from a mobile.', { know: 3, stress: -3 }],
  ['Say "just google it when it happens"', 'In an emergency, nobody wants to search. You make a note to learn them.', { know: 1, stress: 2 }], { w: 1.4 });
E('operator', 'Calling with little Russian', 'Your neighbour has collapsed and the line to 112 is answered by a calm voice speaking quickly. Your Russian is limited.',
  ['Say the address and one word: "ambulance"', 'The operator repeats the address, asks one more question and sends help. Simple words are enough.', { know: 2, stress: 4, rep: 2, energy: -4 }],
  ['Hang up and look for a translator app', 'Precious minutes pass before you call again.', { stress: 10, rep: -1 }], { req: s => s.status !== 'citizen' });
E('fire', 'The smell of smoke on the stairs', 'In the evening you smell smoke in the stairwell. A neighbour shouts "Fire!" from two floors below.',
  ['Leave by the stairs, call 101 or 112, and knock on doors as you go', 'Everyone is out in the yard in five minutes. The fire crew arrives soon; a pan on a stove, quickly dealt with.', { know: 2, rep: 3, stress: 8, energy: -6 }],
  ['Take the lift to the ground floor', 'The lift stops between floors. Waiting is the longest wait of your life; the crew gets you out.', { stress: 20, health: -2, know: 1 }], { w: 0.5 });
E('gas', 'A smell of gas', 'In a flat with a gas stove you smell gas. A light switch is within your reach.',
  ['Open the windows, avoid switches and flames, and call 104 from outside', 'The gas service finds a worn connection and fixes it. The dispatcher thanks you for waiting outside.', { know: 3, rep: 2, stress: 6 }],
  ['Switch on the light to look for the source', 'Nothing happens, this time. The dispatcher scolds you on the phone.', { stress: 12, health: -1, know: 1 }], { w: 0.5 });
E('collapse', 'Someone collapses', 'A man in the metro sits down heavily and does not answer when you ask if he is all right.',
  ['Check that he is breathing, shout for help and call 103', 'People gather. Someone brings water, a doctor passenger takes over and the ambulance arrives.', { know: 2, rep: 3, stress: 8, energy: -5 }],
  ['Assume somebody else has called', 'Everybody assumes the same for a minute. You then call yourself.', { stress: 8, rep: 1 }], { w: 0.7 });
E('ice', 'A slip on the ice', 'In January you slip on a hidden patch of ice and your wrist hurts badly.',
  ['Go to the emergency room and get it checked', 'An X-ray shows a small fracture. A plaster, a prescription and three weeks of careful life.', { health: -3, money: -500, know: 1, stress: 4 }],
  ['Wrap it up and carry on', 'It hurts for a month. A doctor later says you were fortunate.', { health: -5, stress: 4 }], { w: 1 });
E('pharmacy', 'At the pharmacy counter', 'You have a heavy cold. The pharmacist offers a long list of medicines, some of which look very similar.',
  ['Ask her what is necessary and what is just expensive', 'She picks two simple things and tells you to drink warm liquids. The bill is small.', { health: 2, money: -400, know: 2, stress: -2 }],
  ['Buy everything recommended', 'A bag of boxes and a lighter wallet; the cold goes away on the usual schedule.', { health: 1, money: -2500, stress: 1 }], { w: 1 });
E('blackout', 'The lights go out', 'On a winter evening the whole street goes dark. The phone has 20 per cent battery.',
  ['Check the building chat and call the electricity service', 'Power is back in two hours; a neighbour shares candles and a thermos of tea.', { know: 1, friends: 1, stress: 3 }],
  ['Sit in the dark and wait', 'It works eventually. You regret not having a torch.', { stress: 6 }], { w: 0.6 });
