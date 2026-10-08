/* The apartment block: ten scenes about the stairwell (podyezd), neighbours and the management company.
   Only general, widely known features are used: intercom codes, a lift that breaks, the residents' group chat,
   the management company (UK), a house meeting of owners and the autumn clean-up day (subbotnik).
   Quiet hours differ by region, so the scenes do not state exact times. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const B = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { months?: number[]; w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `building-${id}`, cat: 'social', w: o.w ?? 1.1, months: o.months, title, text,
    req: (s: State) => !o.req || o.req(s),
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};

B('intercom', 'The intercom code', 'A courier stands at the door of your block and cannot get in. The entrance code on the paper note is rubbed off.',
  ['Come down and let him in', 'He thanks you three times. Your dinner arrives hot.', { energy: -3, stress: -2, rep: 1 }],
  ['Tell him the code over the phone', 'He is in within a minute. Neighbours would call this "trust".', { stress: -1 }]);
B('lift', 'The lift is out of order', 'A handwritten sign on the lift: "Not working. Repair soon." Your flat is on the ninth floor and you are carrying shopping.',
  ['Climb with the bags', 'Nine floors later you know exactly how fit you are.', { energy: -16, health: 1, stress: 4 }],
  ['Leave half downstairs with a neighbour', 'A neighbour watches the bags and you chat on the stairs. Both of you complain about the management company.', { energy: -8, friends: 1, stress: -2 }]);
B('chat', 'The residents\' group chat', 'There are 214 unread messages in the building chat. The topic: who parked across the entrance, again.',
  ['Mute it', 'Peace. You will find out about everything a week later.', { stress: -4 }],
  ['Join the argument', 'You get a lot of opinions and one friendly neighbour who agrees with you.', { stress: 5, friends: 1, energy: -3 }]);
B('meeting', 'The house meeting', 'A notice on the door invites owners and residents to a meeting about the courtyard fence. Chairs in the courtyard, a man with a folder, a lot of shouting.',
  ['Attend and listen', 'Three hours later the fence is neither approved nor rejected. You know everyone\'s name.', { energy: -10, know: 2, friends: 2, stress: 3 }],
  ['Skip it', 'The result is decided without you.', { stress: -2 }], { months: [4, 5, 6, 9, 10] });
B('uk', 'The management company', 'A receipt arrives with a new line on it: "adjustment". You are not sure what is being adjusted.',
  ['Go to the office and ask', 'A tired clerk explains the line and corrects one number. You leave with a stamped copy.', { energy: -8, know: 2, money: 300, stress: 3 }],
  ['Pay it and move on', 'Peaceful and slightly more expensive.', { money: -400, stress: -2 }]);
B('drill', 'Drilling next door', 'It is Saturday morning and a drill is working through the wall. You know the neighbours are renovating for the third year in a row.',
  ['Knock on the door politely', 'The neighbour apologises and promises to stop by lunchtime. He does, mostly.', { stress: -3, friends: 1 }],
  ['Put on headphones', 'Not elegant, but quiet enough.', { stress: 3, energy: -3 }]);
B('babushka', 'The bench by the entrance', 'The older women on the bench at the entrance have noticed you. "New? Which flat? Are you married?"',
  ['Stop and chat', 'You leave knowing the history of every flat in the block and with a jar of pickled cucumbers.', { friends: 2, know: 2, stress: -4, energy: -3 }],
  ['Say hello and keep walking', 'Polite. They will still discuss you for a week.', { stress: 1 }]);
B('leak', 'Water through the ceiling', 'A brown stain spreads across your ceiling. The flat above has a burst pipe and nobody answers the door.',
  ['Call the emergency service of the UK', 'A plumber arrives in an hour and shuts the riser. You photograph everything for the insurance talk later.', { energy: -10, stress: 8, money: -500 }],
  ['Run upstairs and bang on every door', 'You find the right neighbour on the third try; he is on holiday and his son comes in pyjamas.', { energy: -8, stress: 6, friends: 1 }], { w: 0.8 });
B('subbotnik', 'The autumn clean-up day', 'A flyer in the lift invites everyone to a clean-up day: rakes, bags, and a free tea afterwards.',
  ['Join in', 'You rake leaves beside people who have lived here for decades. Afterwards, tea in plastic cups.', { energy: -10, friends: 2, stress: -6, merit: 1 }],
  ['Watch from the window', 'Nobody asks you to come again, nor to stay away.', { stress: 1 }], { months: [4, 10] , w: 1.5 });
B('parcel', 'The neighbour\'s parcel', 'The courier left a neighbour\'s parcel with you. The neighbour is nowhere to be found.',
  ['Leave a note on their door', 'They collect it in the evening with a bar of chocolate.', { friends: 1, stress: -2 }],
  ['Keep it until the weekend', 'It sits by your door and looks at you.', { stress: 2 }]);
