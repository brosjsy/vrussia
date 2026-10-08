/* The dacha: fourteen scenes about the summer house that many Russian families treat as a second home.
   Facts checked: the dacha season is May to September; a typical plot is about 600 square metres (six sotok);
   typical crops are potatoes, cucumbers, tomatoes, carrots, dill and berries; the banya is a staple; the suburban train (elektrichka) fills up at weekends. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const D = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { months?: number[]; owner?: boolean; w?: number } = {}): void => {
  S({
    id: `dacha-${id}`, cat: 'social', w: o.w ?? 1.1, months: o.months, title, text,
    req: (s: State) => !o.owner || s.housing === 'village' || !!s.flags.villageFlat,
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};

D('opening', 'Opening the dacha season', 'A colleague invites you to help open her dacha for the summer: unlock the shed, uncover the beds, find out what the winter did to the roof.',
  ['Go on Saturday with a spade', 'Dust, spiders and a cup of tea from a thermos on the porch. A good first day of summer.', { energy: -14, stress: -10, friends: 1, merit: 1 }],
  ['Say you have other plans', 'She sighs and asks again in June.', { stress: 1 }], { months: [4, 5], w: 1.6 });
D('potatoes', 'Planting potatoes', 'The traditional early-May task: potatoes go into the ground, and a whole family tries to explain what the right depth is.',
  ['Dig and plant with everyone', 'Rows, laughter and blisters. In autumn you will eat what you planted.', { energy: -18, stress: -8, health: 1, famLove: 2 }],
  ['Make the tea for the diggers', 'Respectable, light work. Nobody says anything.', { energy: -4, stress: -4, friends: 1 }], { months: [5] });
D('elektrichka', 'The Friday elektrichka', 'On Friday evening the suburban train is full of people with spades, seedlings, cool-boxes and cats in carriers.',
  ['Squeeze in and enjoy the show', 'Standing for an hour, you meet a man who knows everything about tomatoes.', { energy: -8, stress: -2, friends: 1, know: 1 }],
  ['Wait for the next train', 'It is just as crowded, but you get a seat by the window.', { energy: -4, stress: -3 }], { months: [5, 6, 7, 8, 9] });
D('sotki', 'Six sotok', 'A friend proudly shows you around his 600 square metres: "Six sotok! A real farm!" There are two tomato beds, an apple tree and a hammock.',
  ['Admire everything and ask questions', 'He talks about each tomato variety for twenty minutes. You leave with seedlings.', { know: 2, stress: -8, friends: 1 }],
  ['Just lie in the hammock', 'The best idea anyone has had all week.', { stress: -14, energy: 8 }], { months: [5, 6, 7, 8, 9] });
D('greenhouse', 'The greenhouse', 'The greenhouse is an oven in July. Tomatoes redden, cucumbers hang down like green fingers.',
  ['Water, pick and tie up the plants', 'You return with a bucket of vegetables and a farmer\'s tan.', { energy: -12, money: 600, stress: -6, health: 1 }],
  ['Leave it to the owner', 'You eat his tomatoes later anyway.', { stress: -3 }], { months: [6, 7, 8] });
D('mosquitoes', 'Mosquitoes at dusk', 'At eight o\'clock the sun sinks and the mosquitoes rise in clouds. Everyone on the porch swats and complains.',
  ['Light a smoky fire and sit by it', 'Smoke in your eyes, but nobody gets bitten. Stories begin.', { stress: -8, friends: 1, energy: -2 }],
  ['Retreat indoors and read', 'The mosquitoes tap on the window like critics.', { stress: -4, know: 1 }], { months: [6, 7] });
D('banya', 'The dacha banya', 'There is a small wooden banya at the end of the garden. The host stokes the stove and hands out birch twigs.',
  ['Steam properly and then jump in the cold water', 'Pink, giddy and perfectly calm.', { stress: -18, health: 2, energy: -4 }],
  ['Sit on the lower bench and chat', 'Heat is optional, conversation is not.', { stress: -10, friends: 1 }], { months: [5, 6, 7, 8, 9, 10], w: 1.4 });
D('fence', 'A dispute over the fence', 'Two neighbours argue about whose apple tree hangs over whose fence. Both look at you for a verdict.',
  ['Suggest sharing the apples and finishing the tea', 'The apples are divided, the fence stays, and they shake hands.', { rep: 3, merit: 2, stress: -3 }],
  ['Leave quietly', 'Wise, if cowardly.', { stress: 1 }], { months: [6, 7, 8] });
D('berries', 'Berries and jam', 'Raspberries, currants and strawberries are ripe, and a huge pot of jam stands on the stove with its sticky aroma.',
  ['Pick, stir and fill the jars', 'Twenty jars with handwritten labels. You are given three.', { energy: -10, stress: -8, money: 500, famLove: 1 }],
  ['Eat berries straight from the bush', 'Perfectly legitimate behaviour.', { stress: -6, health: 1 }], { months: [7, 8] });
D('shashlik', 'Shashlik by the fence', 'The host marinates meat since the morning. Everyone gives advice on the grill, the charcoal and how long to wait.',
  ['Take charge of the grill', 'Smoke, sparks and perfect skewers. You are given applause and a plate.', { energy: -6, stress: -10, rep: 3, friends: 1 }],
  ['Cut the vegetables', 'The most important job: you chop onions until your eyes weep.', { stress: -6, friends: 1 }], { months: [5, 6, 7, 8, 9] });
D('harvest', 'Harvest and pickling', 'In late August cucumbers, dill and garlic fill the kitchen. Jars, brine and old recipes are everywhere.',
  ['Pickle cucumbers with the family recipe', 'The kitchen smells of dill and garlic. In January you will thank yourself.', { energy: -10, stress: -6, know: 2, money: 400 }],
  ['Take a bag of fresh vegetables home', 'Generosity is its own reward.', { money: 300, stress: -4 }], { months: [8, 9], w: 1.4 });
D('closing', 'Closing the dacha for winter', 'In October the water is shut off, the pipes drained, the plants covered and the shed locked until spring.',
  ['Do it carefully with the owner', 'You sip tea on a bare porch, as leaves fall. The garden sleeps.', { energy: -10, stress: -6, friends: 1, merit: 1 }],
  ['Send your regards from the city', 'The garden sleeps without you.', {}], { months: [10] });
D('roof', 'A leaking roof', 'After a storm the ceiling of your village house drips. A bucket sings in the corner.',
  ['Fix it yourself with tar paper', 'Three hours on a ladder. It holds for a while, and you feel capable.', { energy: -14, money: -800, know: 2, stress: -2 }],
  ['Hire a local carpenter (₽6,000)', 'He arrives with a thermos and a grin. The roof is dry by evening.', { money: -6000, stress: -4 }], { owner: true, w: 1.8 });
D('firewood', 'Firewood for winter', 'The first frost reminds you that the stove in your village house needs wood. A neighbour sells a cartload.',
  ['Buy a load and stack it yourself', 'A tidy woodpile, an aching back and a cosy evening by the stove.', { money: -4000, energy: -14, stress: -10, health: 1 }],
  ['Buy less and plan to top up', 'A small pile and an optimistic mind.', { money: -1500, stress: 2 }], { months: [10, 11, 12, 1, 2], owner: true, w: 1.8 });
