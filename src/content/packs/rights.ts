/* Know your rights: seven short scenes for newcomers, based on guides for international students (HSE "Guide on Encounters with the Police",
   the Sechenov guide): carry the original passport, migration card and registration slip; ask the grounds for a check; ask for an interpreter;
   you may refuse to sign what you do not understand or agree with and refuse to give explanations; you may tell family or friends about a detention
   within three hours; a personal search is recorded and done with two witnesses. Learning them (the leaflet scene) makes the polite option in later
   police checks work better. This is a game summary, not legal advice. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects | ((s: State) => Effects)];
const fx = (f: Effects | ((s: State) => Effects), s: State): Effects => (typeof f === 'function' ? f(s) : f);
const K = (id: string, title: string, text: string, a: Pick2, b: Pick2, w = 1.2): void => {
  S({
    id: `right-${id}`, cat: 'police', who: ['foreigner'], w, title, text,
    choices: [{ t: a[0], r: s => O(a[1], fx(a[2], s)) }, { t: b[0], r: s => O(b[1], fx(b[2], s)) }],
  });
};

S({
  id: 'right-leaflet', cat: 'police', who: ['foreigner'], w: 6, req: (s: State) => !s.flags.knowsRights, title: 'A leaflet about your rights',
  text: 'In the international office a leaflet from the university legal clinic lies on the table: "What to do if the police ask for your documents". It has a checklist and the phone numbers of your embassy and a volunteer lawyer.',
  choices: [
    { t: 'Read it carefully and keep it in your bag', r: () => O('You learn what to carry (original passport, migration card, registration), that you may ask the grounds for a check, ask for an interpreter, and refuse to sign what you do not understand. You photograph the phone numbers.', { flag: 'knowsRights', know: 3, stress: -4 }) },
    { t: 'Take it and read it later', r: () => O('It stays in the bag until it is too crumpled to read.', { stress: 1 }) },
  ],
});

K('carry', 'Only a photo of the passport', 'At a metro entrance an officer asks for documents. You have a photo of your passport on your phone but the original is at home.',
  ['Show the photo and explain politely', 'The officer says that foreigners must carry the original, migration card and registration. He lets you off with a warning, this time.', (s: State) => (Math.random() < 0.5 ? { stress: 8 } : { stress: 12, money: -2000, strike: s.docs.reg > 0 ? 0 : 1 })],
  ['Call a flatmate to bring the original to the station', 'It takes forty minutes and a lot of explaining, but nothing is written down.', { stress: 8, energy: -8, friends: 0 }]);
K('grounds', 'Why are you asking?', 'An officer stops you in the street and asks for documents. You are not sure that he has any reason.',
  ['Show the documents and politely ask the grounds for the check', 'He says there was a complaint about a person who looks similar. He thanks you, checks the documents and lets you go.', { stress: 4, rep: 2, know: 1 }],
  ['Refuse to show anything', 'This turns a two-minute check into an hour at the station.', { stress: 14, energy: -8, strike: 1 }]);
K('interpreter', 'The protocol in fast Russian', 'An officer starts writing a protocol and reads it out very fast. You understand about a third.',
  ['Say clearly that you need an interpreter', 'They call one. It takes an hour, but you understand everything you are asked to sign.', { stress: 6, energy: -8, know: 2 }],
  ['Nod and sign', 'You sign something you did not understand. Your stomach sinks as you leave.', { stress: 12, money: -3000, strike: 1 }]);
K('sign', 'A paper to sign', 'You are asked to sign a statement. It says you agree with the violation, which you do not.',
  ['Refuse to sign what you disagree with and write down your objection', 'The officer sighs, adds your comment to the record and lets you go. You also ask for a copy.', { stress: 6, know: 2, rep: 1 }],
  ['Sign to get out quickly', 'You are home in ten minutes with a fine you could have contested.', { stress: 10, money: -4000 }], 1.4);
K('call', 'Detained for a few hours', 'After a check you are taken to the station. Nobody tells you how long it will last, and your phone is switched off. (A university guide for international students says you may ask to tell a family member or a friend about your detention within three hours.)',
  ['Ask politely to tell a friend or family member where you are, and to contact your consulate', 'Within three hours a friend knows where you are and a volunteer lawyer calls the station. They let you go in the evening.', { stress: 10, rep: 1, know: 2 }],
  ['Say nothing and wait', 'Five hours of silence on a plastic chair. You are released at midnight with a pale face.', { stress: 20, energy: -14 }], 1.0);
K('search', 'A search of your bag', 'An officer opens your bag and starts to take things out in the street, with nobody else around.',
  ['Calmly ask for two witnesses and for it to be written down', 'The officer pauses. Two bystanders are called, a short record is made and nothing is found.', { stress: 6, know: 2 }],
  ['Let him go through everything', 'He finds your lunch, your charger and a lot of embarrassment.', { stress: 10, rep: -1 }]);
