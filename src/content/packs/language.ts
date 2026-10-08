/* The Russian language in daily life: ten scenes about everyday misunderstandings and small victories.
   Only general, well-known features are used: patronymics in polite address, the formal "vy" and informal "ty",
   the Cyrillic alphabet, "spravka" (a certificate) and "zaverennaya kopiya" (a certified copy) in offices, regional accents,
   and the habit of answering "how are you?" honestly. Foreign-only scenes use who: ['foreigner']. No laws or amounts. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const L = (id: string, title: string, text: string, a: Pick2, b: Pick2, o: { foreign?: boolean; w?: number; req?: (s: State) => boolean } = {}): void => {
  S({
    id: `lang-${id}`, cat: 'social', w: o.w ?? 1, who: o.foreign ? ['foreigner'] : undefined, req: o.req, title, text,
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};

L('patronymic', 'The name and the middle name', 'A clerk calls you in. She addresses the man before you as "Ivan Petrovich" and looks at you expectantly: how should she address you?',
  ['Say your first name and your father\'s name', 'She writes it down with a nod. Politeness in Russia is built from these three names.', { know: 2, rep: 1, stress: -2 }],
  ['Say "just call me by my name"', 'She does, with a slightly puzzled smile.', { stress: 1 }]);
L('ty-vy', '"Ty" or "vy"?', 'You say "ty" to a senior colleague and the room goes quiet for a second. Russian has an informal "ty" and a formal "vy", and the border is not always obvious.',
  ['Apologise and switch to "vy"', 'He smiles: "Nothing, I understand." Next time it will be easier.', { know: 2, rep: 1, stress: 2 }],
  ['Keep using "ty"', 'He lets it go, but you feel that you have been placed in a category.', { rep: -1, stress: 3 }], { w: 1.1 });
L('cyrillic', 'Reading the signs', 'A street sign, a menu and a pharmacy box are all in Cyrillic. You can sound out half the letters, and some of the words turn out to be English in disguise: "МЕТРО", "КАФЕ", "ТАКСИ".',
  ['Spend ten minutes reading everything', 'You feel like a child and then like a detective. Signs start to make sense.', { know: 3, energy: -4, stress: -3 }],
  ['Use the phone translator', 'Faster, but you remember nothing.', { know: 1, stress: -1 }], { foreign: true, w: 1.3 });
L('spravka', '"Bring a certificate"', 'In an office you are told: "A certificate and a certified copy, then come back." You do not know exactly what the words mean, only that the clerk is already looking at the next person.',
  ['Ask her to write the two words down', 'She sighs and writes them. You look them up outside; the second day at the office is quick.', { know: 3, stress: 2, energy: -6 }],
  ['Nod and leave', 'You spend a day guessing and a week wondering.', { stress: 8, energy: -8 }], { foreign: true });
L('how-are-you', 'How are you?', 'A neighbour asks "Kak dela?" and you answer "fine". She tells you, kindly, that in Russia the question is sometimes meant seriously.',
  ['Answer honestly for once', 'Twenty minutes later she knows about your week and you know about her knees. You feel closer.', { friends: 2, stress: -6, energy: -4 }],
  ['Say "fine, thanks" and go', 'Polite and quick, though somehow lonelier.', { stress: 1 }]);
L('accent', 'Your accent', 'A shop assistant smiles when you speak and asks where you are from. It is friendly curiosity, but you sometimes wonder what comes next.',
  ['Tell her about your home town', 'She tells you where to buy the best spices in the city. A small local alliance.', { friends: 1, stress: -4, know: 1 }],
  ['Say "from here, now"', 'She laughs: "Then you are one of us."', { stress: -2, rep: 1 }], { foreign: true });
L('dialect', 'A word you do not know', 'A colleague from another region uses a local word and everyone nods. You were sure you knew Russian.',
  ['Ask what it means', 'It turns out nobody outside his region knows it either. Everyone laughs.', { know: 1, friends: 1, stress: -3 }],
  ['Pretend to understand', 'You nod and lose the thread of the conversation.', { stress: 2 }]);
L('forms-cyrillic', 'Filling in a form by hand', 'The form must be filled in capitals, in Cyrillic, with no corrections. You have one copy.',
  ['Fill it in slowly with a ruler', 'Perfect. The clerk is almost disappointed to find nothing wrong.', { energy: -8, stress: 3, know: 1 }],
  ['Rush it and cross something out', 'You start again with a new form and a new queue ticket.', { energy: -12, stress: 10 }], { foreign: true, w: 1.2 });
L('lesson', 'A free language club', 'A library advertises a free Russian conversation club on Thursdays: tea, simple texts and volunteers who are patient.',
  ['Go every Thursday', 'Slowly the sentences grow. You also make two friends and a homework habit.', { know: 3, friends: 2, energy: -8, stress: -4 }],
  ['Study with an app at home', 'Efficient and solitary.', { know: 2, energy: -6 }], { foreign: true, w: 1.2 });
L('poem', 'A line of poetry', 'A taxi driver recites a line of Pushkin about the road and asks if you know it. In Russia, a stranger quoting a poet is not unusual.',
  ['Admit that you do not, and ask for more', 'He recites for ten minutes and recommends a book. You get out with a new reading list.', { know: 2, stress: -5, energy: -2 }],
  ['Smile and say nothing', 'He quotes another line to the road itself.', { stress: -2 }]);
