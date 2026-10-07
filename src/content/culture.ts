/* Culture, history, traditions and community life — the «Patriot» Award track.
   "Merit" is earned by learning, taking part and helping others. */
import { RU } from '../engine';
import type { State, Outcome, Choice, Effects } from '../engine';

const { O } = RU.util;
const S = RU.S;
const C = (t: string, msg: string, fx: Effects): Choice => ({ t, msg, fx });

/* ---------- Quizzes: three answers, true facts ---------- */
function quiz(id: string, title: string, q: string, opts: [string, string, string], correct: number, fact: string): void {
  S({
    id: `quiz-${id}`, cat: 'culture', w: 1.4, title, text: q,
    choices: opts.map((o, i) => ({
      t: o,
      r: (): Outcome => i === correct
        ? O(`Correct! ${fact}`, { know: 3, merit: 3, stress: -3 })
        : O(`Not quite. ${fact}`, { know: 1, merit: 1 }),
    })),
  });
}
quiz('moscow', 'History: Moscow\'s birthday', 'A guide at a museum asks: in which year is Moscow first mentioned in the chronicles?', ['1147', '1703', '1812'], 0, 'Moscow is first mentioned in 1147, in connection with Prince Yuri Dolgoruky.');
quiz('spb', 'History: the city on the Neva', 'Who founded Saint Petersburg in 1703?', ['Ivan the Terrible', 'Peter the Great', 'Catherine the Great'], 1, 'Peter the Great founded it as a "window to Europe" on the Neva river.');
quiz('gagarin', 'Space: first in orbit', 'Who was the first human in space?', ['Yuri Gagarin', 'Alexei Leonov', 'Valentina Tereshkova'], 0, 'Yuri Gagarin flew on 12 April 1961, a date still celebrated as Cosmonautics Day.');
quiz('sputnik', 'Space: first satellite', 'In which year did the USSR launch Sputnik, the first artificial satellite?', ['1949', '1957', '1969'], 1, 'Sputnik 1 launched on 4 October 1957 and started the space age.');
quiz('baikal', 'Nature: Baikal', 'What makes Lake Baikal special?', ['The deepest lake on Earth', 'The saltiest lake on Earth', 'The warmest lake in Siberia'], 0, 'Baikal is the deepest lake on Earth (about 1,640 m) and holds roughly a fifth of the world\'s unfrozen fresh water.');
quiz('transsib', 'Travel: the Trans-Siberian', 'About how long is the Trans-Siberian Railway from Moscow to Vladivostok?', ['About 2,000 km', 'About 9,300 km', 'About 20,000 km'], 1, 'The line runs about 9,300 km and crosses seven time zones.');
quiz('pushkin', 'Literature: Pushkin', 'Which famous work is a novel in verse by Alexander Pushkin?', ['Eugene Onegin', 'War and Peace', 'Dead Souls'], 0, '"Eugene Onegin" is Pushkin\'s novel in verse; "War and Peace" is by Tolstoy and "Dead Souls" by Gogol.');
quiz('tolstoy', 'Literature: Tolstoy', 'Who wrote "War and Peace"?', ['Fyodor Dostoevsky', 'Leo Tolstoy', 'Anton Chekhov'], 1, 'Leo Tolstoy published it in the 1860s; he lived at Yasnaya Polyana, now a museum-estate.');
quiz('dostoevsky', 'Literature: Dostoevsky', 'Which novel is by Fyodor Dostoevsky?', ['Crime and Punishment', 'Anna Karenina', 'Doctor Zhivago'], 0, '"Crime and Punishment" (1866) is set in the streets of Saint Petersburg.');
quiz('tchaikovsky', 'Music: Tchaikovsky', 'Which ballet did Pyotr Tchaikovsky compose?', ['Swan Lake', 'Giselle', 'Don Quixote'], 0, 'Tchaikovsky wrote "Swan Lake", "The Sleeping Beauty" and "The Nutcracker".');
quiz('mendeleev', 'Science: Mendeleev', 'What did Dmitri Mendeleev publish in 1869?', ['The periodic table of elements', 'The first Russian dictionary', 'The theory of relativity'], 0, 'Mendeleev\'s periodic table even predicted elements that had not been discovered yet.');
quiz('hermitage', 'Museums: the Hermitage', 'In which city is the Hermitage Museum?', ['Moscow', 'Saint Petersburg', 'Kazan'], 1, 'The Hermitage occupies the Winter Palace and neighbouring buildings in Saint Petersburg.');
quiz('kazan', 'Heritage: Kazan Kremlin', 'What do the Kul Sharif Mosque and the Annunciation Cathedral share?', ['The same square inside the Kazan Kremlin', 'The same architect', 'The same century of construction'], 0, 'Both stand inside the Kazan Kremlin, a UNESCO World Heritage Site that is often cited as a symbol of coexistence.');
quiz('cyrillic', 'Language: the alphabet', 'Which day celebrates Slavic literature and culture each year?', ['24 May', '1 January', '9 May'], 0, 'On 24 May, the Day of Slavic Writing and Culture honours Saints Cyril and Methodius, linked to the origin of the Slavic alphabets.');
quiz('elbrus', 'Mountains: Elbrus', 'Mount Elbrus in the Caucasus is...', ['The highest peak in Europe', 'The highest peak in Asia', 'A volcano in Kamchatka'], 0, 'Elbrus (5,642 m) is generally counted as Europe\'s highest peak.');
quiz('matryoshka', 'Crafts: matryoshka', 'What is a matryoshka?', ['A set of nested wooden dolls', 'A kind of sweet bread', 'A traditional scarf'], 0, 'Matryoshka dolls appeared in the 1890s and became a symbol of Russian folk craft.');
quiz('derbent', 'Heritage: Derbent', 'Derbent in Dagestan is often called...', ['One of the oldest continuously inhabited cities in Russia', 'The newest city in the Caucasus', 'The capital of Chechnya'], 0, 'Derbent has a fortress and walls from the Sasanian era, and is often described as Russia\'s oldest city.');
quiz('tretyakov', 'Art: the Tretyakov Gallery', 'The Tretyakov Gallery in Moscow is famous for...', ['A great collection of Russian art', 'A collection of ancient Greek sculpture', 'Modern cars'], 0, 'Founded by the merchant Pavel Tretyakov, it holds masterpieces of Russian painting.');
quiz('victory', 'Memory: Victory Day', 'What does Victory Day on 9 May commemorate?', ['The end of the Great Patriotic War in Europe in 1945', 'The founding of Moscow', 'The first spaceflight'], 0, 'Families remember the generation that lived through the war, which cost the Soviet Union tens of millions of lives.');
quiz('ural', 'Geography: the Urals', 'The Ural Mountains are traditionally seen as...', ['The border between Europe and Asia', 'The border with China', 'The highest mountains in the world'], 0, 'Obelisks near Yekaterinburg mark the conventional "Europe–Asia" border.');

/* ---------- Traditions and festivals ---------- */
const fest = (id: string, title: string, text: string, joinLabel: string, joinMsg: string, fx: Effects, months?: number[]) => S({
  id: `fest-${id}`, cat: 'culture', w: 1.2, months, title, text,
  choices: [C(joinLabel, joinMsg, fx), C('Watch from the side', 'You enjoy it from a distance, and promise to join next time.', { stress: -2, merit: 1 })],
});
fest('maslenitsa', 'Maslenitsa week', 'Pancakes with sour cream, caviar and jam, sleigh rides and the burning of a straw effigy: the farewell to winter.', 'Eat pancakes and join the games', 'You stuff yourself with blini and win a pole-climbing contest for a prize of a samovar mug.', { money: -400, stress: -12, merit: 4, rep: 2 }, [2, 3]);
fest('sabantuy', 'Sabantuy in Tatarstan', 'The Tatar and Bashkir "plough festival": sack races, wrestling (kuresh) and a prize of a live ram.', 'Join the sack race', 'You come last, laughing hardest. Strangers hand you chak-chak.', { money: -300, stress: -10, merit: 4, friends: 1 }, [6]);
fest('sagaalgan', 'Sagaalgan', 'The lunar new year of Buryat and Kalmyk communities, marked with family visits and white food.', 'Visit a community celebration', 'Steamed buuz dumplings, milk tea and songs about the steppe.', { money: -300, stress: -10, merit: 4 }, [1, 2, 3]);
fest('navruz2', 'Navruz in the park', 'Communities from Central Asia and the Caucasus gather with sumalak, plov and music.', 'Bring food to share', 'Someone teaches you a dance step. Someone else teaches you a proverb.', { money: -500, stress: -12, merit: 4, friends: 1 }, [3]);
fest('kurban', 'Eid al-Adha (Kurban Bayram)', 'In several Russian republics it is an official day off; families cook and share with neighbours.', 'Share a meal with neighbours', 'Plates of food cross the stairwell in both directions.', { money: -500, stress: -10, merit: 4, rep: 2 });
fest('easter', 'Orthodox Easter', 'Kulich cakes, painted eggs and the greeting "Christ is risen!" — "Truly risen!".', 'Exchange the greeting with a neighbour', 'You learn the traditional answer and receive a painted egg.', { stress: -8, merit: 3, rep: 2 }, [4, 5]);
fest('tatiana', 'Tatiana\'s Day (Students\' Day)', 'On 25 January students celebrate with songs, speeches and the occasional exam-time forgiveness.', 'Join the student concert', 'You sing badly with two hundred friends.', { money: -300, stress: -10, merit: 3, friends: 1 }, [1]);
fest('subbotnik', 'Courtyard subbotnik', 'Neighbours clean the courtyard, plant flowers and repaint the playground.', 'Grab a rake', 'Three hours of work and a long tea afterward. The courtyard looks transformed.', { energy: -12, stress: -6, merit: 6, rep: 4, friends: 1 }, [4, 5, 9, 10]);
fest('scarlet', 'Scarlet Sails (Saint Petersburg)', 'Graduates celebrate along the Neva as the bridges open and a ship with scarlet sails passes.', 'Watch the bridges open', 'The Neva glows white in the white night. You will not forget it.', { money: -200, stress: -14, merit: 3 }, [6]);
fest('whitenights', 'White Nights', 'In June the northern sky never fully darkens.', 'Stay out all night', 'You walk until dawn, tired and happy.', { energy: -20, stress: -14, merit: 2 }, [6, 7]);
fest('kupala', 'Ivan Kupala night', 'An old folk holiday: wreaths, bonfires and legends of the fern flower.', 'Make a wreath and jump the bonfire', 'You come back smelling of smoke and wildflowers.', { stress: -8, merit: 3 }, [7]);
fest('lastbell', 'The Last Bell', 'School graduates ring the last bell and cross the school threshold in the traditional ceremony.', 'Cheer the graduates', 'A first-grader carries a graduate on the shoulders, ringing the bell.', { stress: -6, merit: 2 }, [5]);
fest('kedr', 'Day of Knowledge for adults', 'Evening language and culture courses open their doors for newcomers.', 'Enrol in a course', 'You sign up for Russian conversation classes and make three friends.', { money: -1500, know: 4, merit: 3, friends: 1 });

/* ---------- Volunteering and community ---------- */
const vol = (id: string, title: string, text: string, label: string, msg: string, fx: Effects, who?: string[]) => S({
  id: `vol-${id}`, cat: 'culture', w: 1.3, who, title, text,
  choices: [C(label, msg, fx), C('Not today', 'You promise yourself you will do it soon.', { stress: 1 })],
});
vol('blood', 'Blood donation day', 'A mobile donation point stands in front of the university. Donors get a free meal and a day off.', 'Donate blood', 'A nurse praises your veins and gives you a chocolate bar. You feel useful.', { energy: -10, merit: 8, rep: 3, health: -1 });
vol('elder', 'A neighbour needs help', 'The elderly woman downstairs cannot carry her groceries up four floors.', 'Carry her bags', 'She pays you in jam, advice and an endless supply of blessings.', { energy: -6, merit: 6, rep: 4, stress: -4 });
vol('shelter', 'Animal shelter', 'A shelter in the suburbs asks volunteers to walk dogs on weekends.', 'Spend the day walking dogs', 'You return muddy, tired and slightly in love with a three-legged dog.', { energy: -14, merit: 6, stress: -10 });
vol('marathon', 'City marathon volunteers', 'Organisers need helpers at the water stations.', 'Hand out water', 'Cheering strangers for four hours is more tiring than running.', { energy: -14, merit: 5, friends: 1 });
vol('teach', 'Teach Russian conversation', 'A community centre needs people to practise Russian with newcomers.', 'Join the group', 'Fifteen people, one blackboard and a lot of laughter.', { energy: -8, merit: 7, friends: 2, rep: 3 }, ['citizen']);
vol('learnru', 'Free Russian lessons', 'A community centre offers free Russian classes for newcomers on Saturdays.', 'Attend the class', 'You learn how to ask for directions politely and complain about prices.', { energy: -8, know: 4, merit: 4, friends: 2 }, ['foreigner']);
vol('translate', 'Help a newcomer at the MFC', 'A man at the MFC does not understand the form. You speak both languages.', 'Translate for him', 'The clerk stamps the paper; the man shakes your hand with both of his.', { energy: -8, merit: 7, rep: 5, stress: -3 });
vol('garden', 'Community garden', 'A group is turning an empty plot into a vegetable garden.', 'Dig and plant', 'Your hands are in the soil and your phone is in your pocket for once.', { energy: -12, merit: 5, stress: -10 });
vol('coat', 'Winter clothes drive', 'Neighbours collect warm clothes for those who need them.', 'Donate a warm sweater', 'You feel cold for a day and warm for a month.', { clothes: -6, merit: 5, rep: 3 });
vol('fire', 'Forest fire relief', 'A regional fund collects supplies for volunteer firefighters.', 'Donate ₽1,000', 'A thank-you message arrives in your phone before you reach home.', { money: -1000, merit: 6 });
vol('tutor', 'Free tutoring for kids', 'A school asks for volunteers to help kids with homework.', 'Tutor for two hours', 'A nine-year-old explains fractions back to you better than you did.', { energy: -10, merit: 6, know: 2, stress: -3 });
vol('cleanup', 'River bank cleanup', 'Volunteers meet on Saturday morning with gloves and bags.', 'Pick up litter', 'Forty bags, two old tyres and one very proud duck.', { energy: -14, merit: 6, friends: 1, stress: -6 });

/* ---------- Learn Russian phrases ---------- */
const phrases: [string, string, string][] = [
  ['Здравствуйте', 'Zdravstvuyte', 'the polite "hello", good any time of day'],
  ['Спасибо', 'Spasibo', '"thank you"'],
  ['Пожалуйста', 'Pozhaluysta', '"please" and "you\'re welcome" in one word'],
  ['Извините', 'Izvinite', '"excuse me / sorry"'],
  ['Как пройти к метро?', 'Kak proyti k metro?', '"How do I get to the metro?"'],
  ['Сколько это стоит?', 'Skolko eto stoit?', '"How much does this cost?"'],
  ['Мне нужна помощь', 'Mne nuzhna pomoshch', '"I need help"'],
  ['Я не понимаю', 'Ya ne ponimayu', '"I do not understand"'],
  ['Говорите медленнее, пожалуйста', 'Govorite medlennee, pozhaluysta', '"Please speak slower"'],
  ['С Новым годом!', 'S Novym godom!', '"Happy New Year!"'],
  ['Приятного аппетита', 'Priyatnogo appetita', '"Bon appétit"'],
  ['На здоровье', 'Na zdorovye', 'the reply to a toast or a sneeze: "to your health"'],
  ['До свидания', 'Do svidaniya', '"goodbye"'],
  ['Можно вопрос?', 'Mozhno vopros?', '"May I ask a question?"'],
  ['Где здесь аптека?', 'Gde zdes apteka?', '"Where is the pharmacy?"'],
  ['У меня есть документы', 'U menya yest dokumenty', '"I have my documents"'],
];
phrases.forEach(([ru, tr, mean], i) => S({
  id: `phrase-${i}`, cat: 'culture', w: 0.8, title: `Russian phrase: ${ru}`, text: `A friendly neighbour teaches you: "${ru}" (${tr}) — ${mean}.`,
  choices: [
    { t: 'Repeat it five times', r: (): Outcome => O('You say it to the bus window until it feels natural.', { know: 2, merit: 1, stress: -1 }) },
    { t: 'Try it on a stranger right now', r: (): Outcome => RU.util.gamble(0.7, O('A smile and a nod. The phrase works.', { know: 3, rep: 2, merit: 2 }), O('They answer so fast you only catch the tone — but you got one more word.', { know: 1, stress: 3 })) },
  ],
}));

/* ---------- Landmarks: 24 places × 4 ways to experience them ---------- */
const sights: [string, string][] = [
  ['Red Square', 'the main square of Moscow, with the Kremlin wall, GUM and Saint Basil\'s Cathedral'],
  ['Saint Basil\'s Cathedral', 'the colourful onion-domed cathedral built in the 16th century on Ivan the Terrible\'s order'],
  ['the Moscow Kremlin', 'a fortified complex that is the historic centre of Moscow and the residence of the president'],
  ['the Hermitage', 'one of the largest art museums in the world, in Saint Petersburg\'s Winter Palace'],
  ['Peterhof fountains', 'the "Russian Versailles" with a cascade of fountains near Saint Petersburg'],
  ['the Kazan Kremlin', 'a UNESCO site where a mosque and a cathedral stand side by side'],
  ['Lake Baikal', 'the deepest lake on Earth, its ice so clear you can see cracks beneath your feet'],
  ['the volcanoes of Kamchatka', 'a UNESCO site with active volcanoes, geysers and brown bears'],
  ['the Altai Mountains', 'a region of mountains, rivers and ancient petroglyphs in southern Siberia'],
  ['Suzdal', 'a small town of the Golden Ring with wooden churches and honey mead'],
  ['Sergiev Posad', 'home of the Trinity Lavra of St. Sergius, a major Orthodox monastery and a centre of the toy and matryoshka craft'],
  ['Veliky Novgorod', 'one of the oldest Russian cities, with a medieval kremlin and the Saint Sophia Cathedral'],
  ['Yasnaya Polyana', 'Leo Tolstoy\'s estate, where he wrote and where he is buried'],
  ['Kizhi Pogost', 'a wooden-church ensemble on an island in Lake Onega, whose famous church is traditionally said to be built without nails'],
  ['Mamayev Kurgan', 'the memorial hill in Volgograd for the Battle of Stalingrad, with "The Motherland Calls" statue'],
  ['Derbent', 'an ancient Caspian fortress city in Dagestan, with walls from the Sasanian era'],
  ['Elbrus', 'the Caucasus giant that is considered Europe\'s highest peak'],
  ['the Novosibirsk Opera House', 'the largest theatre building in Russia'],
  ['Sochi Olympic Park', 'the site of the 2014 Winter Olympics on the Black Sea coast'],
  ['the Golden Horn Bay in Vladivostok', 'the Pacific port city\'s bay, crossed by the Golden Bridge'],
  ['Veliky Ustyug', 'the hometown of Ded Moroz (Father Frost), a favourite winter destination'],
  ['Murmansk polar lights', 'a northern city where winter nights bring the aurora'],
  ['Gorky Park', 'Moscow\'s riverside park, from ice rinks in winter to open-air film in summer'],
  ['Yekaterinburg\'s Europe–Asia obelisk', 'a conventional marker on the border between two continents'],
];
const ways: [string, string, (name: string, desc: string) => Outcome][] = [
  ['Visit with friends', 'Go together and take your time.', (n, d) => O(`You visit ${n} with friends: ${d}. A great day.`, { money: -800, stress: -10, merit: 3, friends: 1 })],
  ['Take a guided tour', 'A guide tells the stories behind the stones.', (n, d) => O(`The guide explains ${n}: ${d}. You remember half of it.`, { money: -1200, know: 4, merit: 3 })],
  ['Take photos at the best light', 'Early or late, the light is magical.', (n, d) => O(`You photograph ${n} in perfect light. People ask where it is.`, { energy: -8, stress: -6, merit: 2, rep: 2 })],
  ['Read about its history', 'Spend an hour with a book or a museum panel.', (n, d) => O(`You learn why ${n} matters: ${d}.`, { know: 5, merit: 2 })],
];
sights.forEach(([n, d], i) => ways.forEach(([label, text, fn], j) => S({
  id: `sight-${i}-${j}`, cat: 'culture', w: 0.7, title: `${n[0].toUpperCase() + n.slice(1)}: ${label.toLowerCase()}`,
  text: `${text} The place: ${n} — ${d}.`,
  choices: [{ t: label, r: (): Outcome => fn(n, d) }, C('Maybe another time', 'The plan stays on your list.', { stress: 1 })],
})));

/* ---------- The «Patriot» Award (in-game) ---------- */
export const AWARD_TEXT = 'The National «Patriot» Award is a public award for those who do not stand aside: people and organisations who develop and improve everyday life in Russia — through culture, knowledge, volunteering and care for their neighbours.';

S({
  id: 'award_nomination', cat: 'culture', once: true, req: (s: State) => s.merit >= 40, w: 12,
  title: 'Nominated for the community «Patriot» Award',
  text: `Neighbours, teachers and volunteers have nominated you. ${AWARD_TEXT} A small ceremony is held at the community centre.`,
  choices: [
    { t: 'Accept with gratitude', r: (): Outcome => O('You are applauded by people whose names you now know. A certificate, a medal and a pot of tea.', { flag: 'award', merit: 10, rep: 12, stress: -20 }) },
    { t: 'Decline modestly and credit the whole community', r: (): Outcome => O('Your humility makes the audience clap even louder. The award is given on behalf of the whole courtyard.', { flag: 'award', merit: 10, rep: 15, stress: -15 }) },
  ],
});
S({
  id: 'award_progress', cat: 'culture', req: (s: State) => !s.flags.award && s.merit >= 15 && s.merit < 40, w: 2,
  title: 'A word from the community centre',
  text: 'The coordinator says: "People notice what you do. Keep learning, keep helping — recognition follows." (Community merit: 15–39.)',
  choices: [C('Keep going', 'You feel useful and a little proud.', { stress: -4, merit: 1 })],
});

/* ---------- Everyday Russian life facts ---------- */
const life: [string, string, string, Choice][] = [
  ['Tea culture', 'A colleague pours tea from a samovar and offers jam instead of sugar.', 'Russians often take tea with jam, lemon or sweets, and an invitation for "a cup of tea" can last for hours.', C('Sit and talk', 'You learn three recipes for pirozhki and one family secret.', { stress: -8, merit: 2, friends: 1 })],
  ['Shoes at the door', 'A friend hands you slippers (tapochki) at the door.', 'Taking off your shoes in the hall is standard in Russian homes; guests usually get slippers.', C('Say thank you and change shoes', 'Your friend smiles; you have passed a small test of manners.', { rep: 2, merit: 1 })],
  ['Flowers and odd numbers', 'You are invited to a birthday dinner.', 'Flowers are given in odd numbers for celebrations; even numbers are for funerals.', C('Bring three flowers', 'The hostess places them in a vase with pride.', { money: -500, rep: 3, merit: 1 })],
  ['Dacha season', 'A colleague invites you to help prepare the dacha for the season.', 'Millions of families grow vegetables and spend weekends at their dacha.', C('Pick up a shovel', 'Your hands are blistered; the sunset is worth it.', { energy: -12, stress: -10, merit: 2, friends: 1 })],
  ['Banya etiquette', 'A neighbour takes you to a traditional banya.', 'The banya is a steam bath with birch twigs (veniki) and tea; it is a social ritual.', C('Try the steam', 'You emerge pink and philosophical.', { money: -800, stress: -15, merit: 1 })],
  ['Hospitality', 'A family you barely know invites you for dinner "just to meet".', 'Russian hospitality can mean more food than anyone can eat. Refusing a second plate is almost impossible.', C('Accept and bring dessert', 'You stagger home with a bag of leftovers.', { money: -400, stress: -10, rep: 3, friends: 1, merit: 1 })],
  ['Polite forms', 'You hear "ты" and "вы" in the same conversation.', 'Russian has formal "вы" and informal "ты"; the switch is a small social milestone.', C('Stay polite until invited', 'Your friend finally says "let\'s switch to ты". You feel promoted.', { rep: 2, know: 1, merit: 1 })],
  ['Metro as architecture', 'You ride the Moscow metro on a quiet afternoon.', 'Many Moscow stations — Komsomolskaya, Mayakovskaya, Novoslobodskaya — look like palaces and are cultural attractions.', C('Do a station tour', 'You exit three stations later with a camera full of mosaics.', { energy: -6, stress: -8, merit: 2, know: 2 })],
];
life.forEach(([t, text, fact, ch], i) => S({
  id: `lifefact-${i}`, cat: 'culture', w: 1, title: `Everyday life: ${t}`, text: `${text} (${fact})`,
  choices: [ch, C('Skip it', 'You move on.', {})],
}));
