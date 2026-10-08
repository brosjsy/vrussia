/* Recurring characters: five people with five-step storylines. What you chose earlier changes how the story ends.
   Progress is stored in flags/marks: arc_<id>_<step>, plus "kind" flags set by individual choices. */
import { S, O } from '../engine';
import type { State, Effects, Choice } from '../engine';

export interface ArcChoice { t: string; msg: string; fx: Effects; flag?: string }
export interface ArcStep { months?: number[]; title: string; text: string | ((s: State) => string); choices: ArcChoice[] | ((s: State) => ArcChoice[]) }
export interface Arc { id: string; who?: string[]; start: (s: State) => unknown; gap: number; steps: ArcStep[] }

const key = (arc: string, i: number): string => `arc_${arc}_${i}`;
export const has = (s: State, f: string): boolean => !!s.flags[f];
const toList = (f: Effects['flag']): string[] => (f === undefined ? [] : Array.isArray(f) ? f : [f]);

export function addArc(arc: Arc): void {
  arc.steps.forEach((st, i) => {
    S({
      id: key(arc.id, i), cat: 'arc', who: arc.who, w: 25, months: st.months, title: st.title, text: '', choices: [],
      req: (s: State) => (i === 0
        ? !!arc.start(s) && !s.flags[key(arc.id, 0)]
        : !!s.flags[key(arc.id, i - 1)] && !s.flags[key(arc.id, i)] && s.day >= (s.marks[key(arc.id, i - 1)] ?? 0) + arc.gap),
      build: (s: State) => ({
        text: typeof st.text === 'string' ? st.text : st.text(s),
        choices: (typeof st.choices === 'function' ? st.choices(s) : st.choices).map((c): Choice => ({
          t: c.t,
          r: () => O(c.msg, { ...c.fx, flag: [key(arc.id, i), ...(c.flag ? [c.flag] : []), ...toList(c.fx.flag)], mark: key(arc.id, i) }),
        })),
      }),
    });
  });
}

/* ---------------- 1. Timur, the roommate ---------------- */
addArc({
  id: 'timur', who: ['foreigner'], start: s => s.day > 10 && s.rent > 0, gap: 8, steps: [
    { title: 'Timur moves in', text: 'A new roommate arrives with a duffel bag, a rice cooker and a big smile. "I am Timur. I work nights. I promise I am quiet."', choices: [
      { t: 'Share dinner with him', msg: 'Plov from his rice cooker, tea from yours. By midnight you are friends.', fx: { friends: 1, stress: -6, money: -300 }, flag: 'timur_close' },
      { t: 'Agree on house rules first', msg: 'Rules on a sheet of paper: dishes, quiet hours, guests. He signs with a flourish.', fx: { stress: -2, know: 1 } }] },
    { title: 'Late-night calls to his mother', text: 'Every night at 2 a.m. Timur whispers into his phone. You hear a mother\'s voice, tinny and warm, asking if he has eaten.', choices: [
      { t: 'Offer him the kitchen so he can talk freely', msg: 'He is moved. The next day there is a pot of lagman waiting for you.', fx: { rep: 2, stress: -4, energy: 6 }, flag: 'timur_close' },
      { t: 'Ask him to talk quietly', msg: 'He nods and speaks in whispers. Awkward but fine.', fx: { stress: 2 } }] },
    { title: 'Timur loses his night job', text: 'Timur sits on his bunk, staring at his phone. "They let me go. I do not know how I will pay my share this week."', choices: [
      { t: 'Lend him ₽5,000', msg: 'He promises to repay every rouble and means it.', fx: { money: -5000, stress: 2 }, flag: 'timur_lent' },
      { t: 'Help him look for a job instead', msg: 'You spend an evening on job sites and send his resume to three employers.', fx: { energy: -8, know: 1, merit: 1 }, flag: 'timur_helped' },
      { t: 'Say you cannot help right now', msg: 'He swallows his pride and says "no problem". The room is quiet for days.', fx: { stress: 6, rep: -2 }, flag: 'timur_cold' }] },
    { title: 'Timur finds work', text: s => (has(s, 'timur_cold') ? 'Timur came back with a new job at a warehouse. He nods at you, polite but distant.' : 'Timur bursts in, waving his phone. "I have a job! A real one, with a contract!"'), choices: s => [
      { t: has(s, 'timur_lent') ? 'Accept his repayment with a grin' : 'Congratulate him', msg: has(s, 'timur_lent') ? 'He gives you the money in an envelope with a thank-you note written in two languages.' : 'He hugs you, nearly lifting you off the floor.', fx: has(s, 'timur_lent') ? { money: 5200, rep: 3, friends: 1 } : { stress: -6, friends: 1 } },
      { t: 'Invite him to celebrate', msg: 'Tea, cake and a toast to "the first contract".', fx: { money: -600, stress: -10, friends: 1 } }] },
    { title: 'Timur moves on', text: 'A cousin in another city has a flat and a job offer. Timur packs his bag. "Thank you for everything," he says, and hands you the rice cooker.', choices: s => [
      { t: 'Hug him and promise to visit', msg: has(s, 'timur_close') ? 'You keep your promise: a year later you eat plov in his new kitchen. Friends for life.' : 'You wave from the doorway. A good chapter closes.', fx: { friends: has(s, 'timur_close') ? 2 : 1, stress: -4, famLove: 1 } },
      { t: 'Keep the rice cooker and cook for yourself', msg: 'Every time you cook, you think of him.', fx: { know: 1, stress: -4 } }] },
  ],
});

/* ---------------- 2. Babushka Valya ---------------- */
addArc({
  id: 'valya', start: s => s.day > 14, gap: 10, steps: [
    { title: 'Babushka Valya and the pie', text: 'The old woman from flat 12 knocks with a plate of cabbage pirozhki. "You look thin, dear. Eat."', choices: [
      { t: 'Thank her and chat on the doorstep', msg: 'She tells you the story of the building since 1971. You promise to come for tea.', fx: { stress: -6, rep: 2, friends: 1 }, flag: 'valya_close' },
      { t: 'Accept the pie and say you are busy', msg: 'The pie is delicious. The guilt is not.', fx: { energy: 6, stress: 1 } }] },
    { title: 'Valya needs medicine', text: 'Valya calls you through the door: her knees hurt and she cannot reach the pharmacy. "Only if it is not a trouble."', choices: [
      { t: 'Go to the pharmacy for her', msg: 'You return with ointment and drops. She pays you in jam and blessings.', fx: { money: -400, merit: 4, rep: 3 }, flag: 'valya_close' },
      { t: 'Show her how to order delivery on her phone', msg: 'It takes an hour, but she can now order her own medicine. She is proud of herself.', fx: { know: 1, merit: 3, stress: -2 } }] },
    { title: 'Valya falls', text: 'You hear a thud and a faint "help". Her door is unlocked; she lies on the kitchen floor, conscious but pale.', choices: [
      { t: 'Call 103 and stay with her', msg: 'The ambulance takes her to the hospital. You hold her hand until the doors close.', fx: { merit: 8, rep: 6, stress: 12 }, flag: 'valya_saved' },
      { t: 'Call a neighbour and 103 together', msg: 'Three of you in the corridor, one calling the ambulance, one fetching her pills. She will be fine.', fx: { merit: 6, rep: 5, stress: 8 }, flag: 'valya_saved' }] },
    { title: 'Valya comes home', text: 'After two weeks in hospital, Valya returns, thinner and frailer, but in good spirits. She invites you for tea and a story.', choices: [
      { t: 'Visit her with flowers', msg: 'She tells you about her husband, a driver, and the dance where they met in 1968.', fx: { stress: -10, famLove: 2, merit: 3, money: -300 }, flag: 'valya_close' },
      { t: 'Send a card and call her', msg: 'She is touched by the card and hangs it on the fridge.', fx: { stress: -3, rep: 1 } }] },
    { title: 'Valya\'s gift', text: s => (has(s, 'valya_close') ? 'Valya presses a worn notebook into your hands: her recipes, written over fifty years. "For someone who keeps a house warm."' : 'Valya leaves a jar of cherry jam outside your door with a note: "Thank you for the kindness."'), choices: [
      { t: 'Thank her and promise to cook from it', msg: 'The first recipe, "Valya\'s pirozhki", comes out almost perfect. You cry a little.', fx: { know: 2, stress: -8, rep: 4, merit: 3 } },
      { t: 'Offer to help her with the shopping every week', msg: 'It becomes a Saturday ritual. The building has a new rhythm.', fx: { merit: 6, rep: 5, friends: 1 } }] },
  ],
});

/* ---------------- 3. Aigul, study partner ---------------- */
addArc({
  id: 'aigul', start: s => s.know >= 12 && s.day > 20, gap: 9, steps: [
    { title: 'A study partner called Aigul', text: 'In the library a girl with three highlighters asks if she can share your table. "I am Aigul. I am hopeless at statistics."', choices: [
      { t: 'Offer to study together', msg: 'You trade notes and jokes. Silence in the library has never been so loud.', fx: { know: 3, friends: 1, stress: -4 }, flag: 'aigul_close' },
      { t: 'Let her sit but keep to yourself', msg: 'She nods. Both of you work in silence.', fx: { know: 1 } }] },
    { title: 'Exam week together', text: 'Aigul calls at midnight: "I will fail tomorrow! Please, just one hour?" Your own revision is not finished either.', choices: [
      { t: 'Spend the hour with her', msg: 'You both pass. You swear never to leave things so late again.', fx: { know: 3, energy: -10, friends: 1, rep: 2 }, flag: 'aigul_close' },
      { t: 'Say you cannot, wish her luck', msg: 'She passes anyway. She says "no problem" in a small voice.', fx: { know: 1, stress: 2 } }] },
    { title: 'Aigul is struggling', text: 'Aigul confesses she is thinking of dropping out: money, homesickness and a flat that is too cold.', choices: [
      { t: 'Listen and help her apply for a hardship grant', msg: 'The form is long but the grant comes through. Aigul stays.', fx: { merit: 5, rep: 4, energy: -8 }, flag: 'aigul_helped' },
      { t: 'Cheer her up with a night out', msg: 'Pancakes, karaoke and terrible singing. She laughs for the first time in weeks.', fx: { money: -1200, stress: -8, friends: 1 } },
      { t: 'Tell her to push through', msg: 'She nods stiffly. You cannot tell if it helped.', fx: { stress: 4 } }] },
    { title: 'Aigul\'s family', text: s => (has(s, 'aigul_helped') ? 'Aigul invites you to her family\'s home for the weekend: "My mother wants to thank you in person."' : 'Aigul invites you to her sister\'s birthday: "It would mean a lot."'), choices: [
      { t: 'Go and bring a gift', msg: 'A table with twenty dishes, six grandmothers and a toast in your honour.', fx: { money: -1200, stress: -14, friends: 2, rep: 3 } },
      { t: 'Politely decline', msg: 'She smiles. "Maybe next time."', fx: { stress: 2 } }] },
    { title: 'Graduation day', text: 'Caps, flowers and exams behind you. Aigul runs across the lawn and hugs you.', choices: s => [
      { t: 'Take a photo together', msg: has(s, 'aigul_close') ? 'The photo sits on your desk for years. You still send each other a message on every anniversary.' : 'A good photo of a good friend.', fx: { friends: 1, stress: -10, know: 2 } },
      { t: 'Promise to start a study group', msg: 'The group grows to twelve people and lasts all year.', fx: { merit: 5, friends: 2, know: 2 } }] },
  ],
});

/* ---------------- 4. Mr. Petrov, the landlord ---------------- */
addArc({
  id: 'petrov', start: s => s.rent > 0 && s.housing === 'rented' && s.day > 25, gap: 12, steps: [
    { title: 'The landlord drops in', text: 'Mr. Petrov, in a worn jacket, checks the radiators and the kitchen tap. "Everything in order?" he asks, running a finger along the shelf.', choices: [
      { t: 'Show him the flat proudly', msg: 'He nods slowly. "Rare. Most tenants wreck the place."', fx: { rep: 3, stress: -2 }, flag: 'petrov_trust' },
      { t: 'Ask him to give notice before coming', msg: 'He frowns, then agrees. "Fair enough."', fx: { know: 1, stress: 2 } }] },
    { title: 'The rent goes up', text: 'A message from Mr. Petrov: "From next month, ₽500 more per week. Prices are going up everywhere."', choices: s => [
      { t: 'Negotiate politely, mention your good record', msg: 'He grumbles and settles for ₽250 more.', fx: { rep: 2, know: 1, setRent: s.rent + 250 }, flag: 'petrov_trust' },
      { t: 'Accept without comment', msg: 'He is pleased. Your wallet is not.', fx: { stress: 3, setRent: s.rent + 500 } },
      { t: 'Refuse and threaten to move', msg: 'He looks away. "Then move." You keep the old rent for now, but the atmosphere is cold.', fx: { stress: 8, rep: -2 } }] },
    { title: 'A burst pipe at midnight', text: 'Water pours from under the sink. You call Mr. Petrov at 1 a.m. He answers on the first ring.', choices: [
      { t: 'Shut the valve and wait for him', msg: 'He arrives with a toolbox and a thermos. By 3 a.m. it is fixed.', fx: { stress: 4, rep: 2 }, flag: 'petrov_trust' },
      { t: 'Call a plumber yourself (₽4,000)', msg: 'It works, and he later refunds half. "You solve problems. I like that."', fx: { money: -2000, rep: 3 }, flag: 'petrov_trust' }] },
    { title: 'A six-month offer', text: s => (has(s, 'petrov_trust') ? 'Mr. Petrov offers: "Sign for six months and I will lower the rent by ₽300 a week. I would rather have a good tenant than a high price."' : 'Mr. Petrov offers a standard contract at the current price.'), choices: s => [
      { t: 'Sign the longer contract', msg: has(s, 'petrov_trust') ? 'A proper lease, a stamp and a handshake. Your rent drops and so does your worry.' : 'A proper lease and a stamp. At least it is in writing.', fx: { stress: -6, rep: 2, ...(has(s, 'petrov_trust') ? { setRent: Math.max(0, s.rent - 300) } : {}) }, flag: 'petrov_lease' },
      { t: 'Keep it flexible', msg: 'You keep your freedom, he keeps his price.', fx: { stress: 1 } }] },
    { title: 'He is selling the flat', text: 'Mr. Petrov calls with news: his daughter needs money for a flat of her own. He offers you first refusal.', choices: [
      { t: 'Ask about the price and a mortgage', msg: 'He gives you a fair price and an honest list of the flat\'s flaws. You thank him and go home to think.', fx: { know: 3, stress: 4 } },
      { t: 'Start looking for another place', msg: 'You thank him for the years and start a viewing list.', fx: { stress: 4, energy: -4 } }] },
  ],
});

/* ---------------- 5. Rustam, the caretaker ---------------- */
addArc({
  id: 'rustam', start: s => s.day > 30 && s.rent > 0, gap: 9, steps: [
    { title: 'The caretaker\'s advice', text: 'Rustam, the building\'s caretaker (dvornik), is clearing the entrance. "You are new here. Come, I will tell you how the city works."', choices: [
      { t: 'Listen to his tips', msg: 'Where the cheap shop is, which bus never comes, who to call when the heating fails.', fx: { know: 3, rep: 2, stress: -3 }, flag: 'rustam_close' },
      { t: 'Thank him and hurry on', msg: 'He waves and returns to his shovel.', fx: {} }] },
    { title: 'A snow shovel', text: 'It snowed all night. Rustam is alone with a mountain of snow in front of the building.', choices: [
      { t: 'Help him clear the entrance', msg: 'An hour of shovelling; hot tea from his thermos afterwards.', fx: { energy: -14, merit: 4, rep: 4, friends: 1 }, flag: 'rustam_close' },
      { t: 'Thank him from the window with a wave', msg: 'He waves back with a shovel. Quiet respect.', fx: { rep: 1 } }] },
    { title: 'A tip about a job', text: 'Rustam mentions that his cousin runs a small firm that needs a reliable person. "I can put in a word."', choices: [
      { t: 'Ask him to introduce you', msg: 'A short meeting and a trial day. Rustam\'s word counts for a lot.', fx: { know: 1, rep: 2, stress: -3, money: 1500 }, flag: 'rustam_job' },
      { t: 'Thank him but decline', msg: 'He nods: "Another time then."', fx: {} }] },
    { title: 'Rustam\'s daughter\'s wedding', text: s => (has(s, 'rustam_close') ? 'Rustam gives you a card, embossed in gold: "Come to my daughter\'s wedding. You are family now."' : 'Rustam invites everybody in the building to his daughter\'s wedding.'), choices: [
      { t: 'Go with a gift envelope (₽3,000)', msg: 'Three hundred guests, two hundred dishes, one very loud band. You dance until you cannot feel your feet.', fx: { money: -3000, stress: -16, friends: 2, rep: 4, merit: 2 } },
      { t: 'Send a card and a small gift', msg: 'He thanks you warmly, a little sorry not to see you.', fx: { money: -800, rep: 1 } }] },
    { title: 'Rustam hangs up the shovel', text: 'After twenty years Rustam is retiring to his village. A farewell for the whole building is arranged on the stairs.', choices: s => [
      { t: 'Give a farewell speech', msg: has(s, 'rustam_close') ? 'You tell the story of the first snowstorm. Half the building cries. He hands you his old shovel: "Look after the entrance."' : 'You say a few words. Rustam smiles and shakes your hand.', fx: { merit: 6, rep: 6, stress: -8 } },
      { t: 'Organise a collection for a gift', msg: 'Three hundred roubles from each flat buys a new coat. He wears it on the train home.', fx: { merit: 8, rep: 4, money: -300, friends: 1 } }] },
  ],
});
