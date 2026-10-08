/* The first year with a baby: nurse visits, vaccinations, the childcare allowance, sleepless nights, the first winter.
   Real details used: the clinic nurse's first home visit is within three days of discharge; the national calendar gives hepatitis B at birth,
   BCG at 3-7 days and DTP at 3, 4.5 and 6 months; the childcare allowance until 1.5 years is 40% of average earnings, paid to one parent. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const B = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { w?: number; req?: (s: State) => unknown; months?: number[] } = {}): void => {
  S({
    id: `baby-${id}`, cat: 'love', w: o.w ?? 1.2, months: o.months, title, text,
    req: (s: State) => s.kids > 0 && (!o.req || !!o.req(s)),
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};

B('nurse', 'The nurse visits', 'Within three days of leaving the maternity hospital, a nurse from the children\'s clinic rings your bell with a bag, a scale and a long list of questions. Later a paediatrician comes too.',
  ['Ask everything on your list', 'She weighs the baby, shows you how to bathe and swaddle, and leaves her phone number. You feel less alone.', { know: 2, stress: -8 }],
  ['Let her do her check and listen', 'She is quick and kind. You will remember half of what she said.', { stress: -3, know: 1 }], { w: 4 });
B('vaccine', 'Vaccination day', 'The national calendar gives vaccines at birth, in the first week, and again at 3, 4.5 and 6 months. Today it is the three-month check at the polyclinic.',
  ['Go on time with the card and wait in the queue', 'The nurse is quick, the baby cries for a minute and then falls asleep on your shoulder.', { energy: -8, stress: 4, health: 1, famLove: 1 }],
  ['Ask the paediatrician to explain every shot first', 'Twenty minutes of calm explanations. You leave sure of your decision.', { know: 2, energy: -10, stress: 2 }], { w: 3 });
B('sleepless', 'Sleepless nights', 'Three nights in a row the baby wakes every ninety minutes. The kettle is your best friend.',
  ['Take turns with your partner', 'You sleep four hours in a block. It feels like a holiday.', { energy: 12, stress: -4, love: 3 }, ],
  ['Do it alone and push through', 'You are a zombie at work and the world looks slightly underwater.', { energy: -22, stress: 12, health: -2 }]);
B('allowance', 'The childcare allowance', 'A colleague says that the working parent of a child under one and a half years can receive a monthly allowance of 40% of average earnings, paid to one parent only.',
  ['Apply through your employer and the portal', 'Forms, certificates, a birth certificate copy and a bank account. A month later the first payment arrives (simplified in the game: a fixed weekly amount).', { stress: 3, know: 2, run: st => { if (!st.flags.childAllowance) { st.flags.childAllowance = true; st.allow += 1800; } } }],
  ['Skip the paperwork', 'You tell yourself it is not worth the queue. Your partner shakes their head.', { stress: 4 }],
  { w: 6, req: s => !!s.job && !s.flags.childAllowance && s.status === 'citizen' });
B('firstsmile', 'The first real smile', 'At six in the morning the baby looks at you and smiles for the first time. It is not gas. You are almost sure.',
  ['Wake your partner to see it', 'The smile has gone, but the moment stays with both of you.', { love: 5, stress: -12 }],
  ['Just keep looking', 'You hold your breath until the baby falls asleep.', { stress: -10, famLove: 2 }], { w: 2 });
B('solids', 'First solid foods', 'At six months the paediatrician suggests starting solids: a teaspoon of puree, a lot of mess and a bib.',
  ['Cook the puree yourself', 'Steamed pumpkin and a blender. Half ends up on the wall.', { money: -300, stress: -4, know: 1, energy: -4 }],
  ['Buy jars from the pharmacy', 'Easy and clean, and the baby makes a face of deep suspicion.', { money: -800, stress: -2 }], { w: 1.6 });
B('stroller', 'A stroller in the snow', 'Pavements are covered in snow and the stroller has the wrong wheels. The entrance has five steps.',
  ['Ask a neighbour to help carry it', 'Two minutes later a stranger lifts it and says "of course". Neighbours are useful.', { rep: 2, stress: -2 }],
  ['Use a baby carrier instead', 'Your back complains, the baby sleeps against your chest, and you cross the courtyard like an expert.', { energy: -6, stress: -4, love: 1 }], { months: [11, 12, 1, 2, 3], w: 2 });
B('winterwear', 'The first winter', 'The baby needs an overall, a hat, mittens and a blanket, and a surprising number of layers.',
  ['Buy a proper winter set (₽6,000)', 'Warm, soft, slightly too large. The baby will grow into it by February.', { money: -6000, stress: -4, health: 1 }],
  ['Borrow from a friend with a bigger baby', 'A bag of second-hand clothes arrives with a note: "pass it on afterwards".', { money: 0, stress: -2, friends: 1, merit: 1 }], { months: [10, 11, 12, 1, 2], w: 2.4 });
B('nanny', 'Nursery, nanny or grandparents?', 'You are going back to work soon. Someone has to look after the baby for eight hours a day.',
  ['Hire a nanny (₽20,000 a month)', 'A kind woman in her fifties who sings old lullabies. The baby adores her.', { money: -5000, stress: -8, love: 2 }],
  ['Ask the grandparents to help', 'They arrive with six bags of food and firm views on feeding. It works, mostly.', { famLove: 8, stress: -2, love: -1 }], { w: 1.4 });
B('teeth', 'The first tooth', 'The baby chews everything, drools constantly and cries at night. A tooth is on its way.',
  ['Cool teething ring and patience', 'Two days later: a tiny white edge and a proud, toothless grin.', { stress: 3, energy: -6, famLove: 1 }],
  ['Ask the paediatrician about it', 'She says it is normal and shows you how to massage the gums.', { know: 2, stress: -3 }]);
B('grandma', 'Grandmother visits', 'Your mother (or your partner\'s) arrives with a huge bag, a cooked chicken and a lot of advice.',
  ['Listen politely and accept the help', 'The flat is cleaner than it has been for weeks. You sleep three hours straight.', { energy: 14, famLove: 6, stress: -8 }],
  ['Politely explain that things have changed', 'A short silence and then a nod. She still cooks the chicken.', { famLove: 1, stress: 2 }], { w: 1.4 });
B('steps', 'First steps', 'The baby lets go of the sofa, takes three wobbly steps and falls into your arms.',
  ['Cheer as if it were a national holiday', 'The neighbours hear the shouting and wonder what happened. Nothing matters but this.', { stress: -14, love: 3, famLove: 3 }],
  ['Film it for the family chat', 'Thirty-eight hearts and a message from Grandpa: "Genius, like his father".', { famLove: 6, stress: -8 }], { w: 1.4 });
B('chat', 'The parents\' chat', 'A messenger group of local parents buzzes with advice on colic, cough syrup and the best playground.',
  ['Join and ask your question', 'Fourteen answers in ten minutes, three of them contradictory, one very good.', { know: 2, friends: 1, stress: -3 }],
  ['Mute it', 'Silence. You miss the useful tip about the free clinic day.', { stress: -2 }], { w: 1.2 });
B('playground', 'The playground', 'A small playground in the courtyard, with swings, a sandbox and mothers, fathers and grandmothers on benches comparing notes.',
  ['Join the benches', 'Within an hour you know three secrets about the neighbourhood and the best baby sleep trick.', { friends: 1, know: 1, stress: -6 }],
  ['Push the swing and keep to yourself', 'A quiet hour in the fresh air.', { stress: -6, health: 1 }], { w: 1.6 });
