/* Home culture pack for the other CIS countries: six scenes for each of Kazakhstan, Armenia, Belarus, Azerbaijan, Moldova and Turkmenistan
   (the pack in homeculture.ts has twelve for Tajikistan, Uzbekistan, Kyrgyzstan and Nigeria). Pride, homesickness and curiosity from Russian friends.
   Each scene rests on a well-known cultural fact. */
import { S, O } from '../../engine';
import type { Effects, State } from '../../engine';

type Pick2 = [label: string, msg: string, fx: Effects];
const R = (origin: string, id: string, title: string, text: string, a: Pick2, b: Pick2): void => {
  S({
    id: `home-${origin}-${id}`, cat: 'culture', w: 1.4, req: (s: State) => s.o === origin, title, text,
    choices: [{ t: a[0], r: () => O(a[1], a[2]) }, { t: b[0], r: () => O(b[1], b[2]) }],
  });
};
const proud: Effects = { merit: 3, rep: 3, stress: -8, friends: 1 };
const quiet: Effects = { stress: -2, know: 1 };

/* ---------------- Kazakhstan ---------------- */
R('kazakh', 'nauryz', 'Nauryz in March', 'On the spring equinox your community celebrates Nauryz, the new year of the steppe, with a soup of seven ingredients, nauryz kozhe, shared with guests.',
  ['Bring colleagues to the table', 'They taste the soup and ask why seven. "For luck, for health, for every good thing," you say.', { money: -500, stress: -10, friends: 2, merit: 2 }], ['Celebrate with a call home', 'Your family holds up a bowl to the camera.', { stress: -6, famLove: 3 }]);
R('kazakh', 'dombra', 'A dombra in the corner', 'A friend finds a dombra, the two-stringed lute of Kazakh music, in a music shop and asks you to show how it is played.',
  ['Play a kui, a short piece', 'The rhythm sounds like galloping horses. The shop owner stops to listen.', proud], ['Say you only know a few notes', 'You laugh and promise to practise.', quiet]);
R('kazakh', 'baikonur', 'Gagarin and the steppe', 'On Cosmonautics Day a colleague mentions Gagarin. You say that he flew in 1961 from Baikonur, the spaceport on the Kazakh steppe, which is still used today.',
  ['Tell the story of the launch pad', 'She had not known that the space age began in your country. "Tell me more."', proud], ['Nod and let it pass', 'The talk moves on to the weekend.', quiet]);
R('kazakh', 'beshbarmak', 'Beshbarmak for the guests', 'A neighbour is moving in. You decide to welcome them with beshbarmak, boiled meat on broad noodles, the dish of Kazakh hospitality.',
  ['Cook it and invite him over', 'The whole floor smells of broth. He stays two hours.', { money: -900, stress: -10, friends: 2, merit: 2 }], ['Buy ready noodles and keep it simple', 'Not the same, but kind.', { money: -300, stress: -3 }]);
R('kazakh', 'abai', 'Who is Abai?', 'A street in Moscow carries the name of Abai, the 19th-century Kazakh poet and thinker. A friend asks who he was.',
  ['Read a short poem aloud', 'You translate on the fly. He asks you to write the name down.', { merit: 3, rep: 2, stress: -6 }], ['Say it is a long story', 'You promise to tell it over tea.', quiet]);
R('kazakh', 'astana', 'The capital on the steppe', 'A colleague asks about the capital. You explain that Astana was built on open steppe in the 1990s, and show the Baiterek tower on your phone.',
  ['Show photos of the new skyline', 'Glass towers in a flat landscape. "That is not what I imagined," he says.', proud], ['Share a picture of Almaty and the mountains', 'The snow peaks above the city surprise him.', { stress: -6, friends: 1 }]);

/* ---------------- Armenia ---------------- */
R('armenian', 'ararat', 'The mountain on the label', 'A friend holds up a bottle with Mount Ararat on the label. You say that you can see the mountain from Yerevan on a clear day.',
  ['Tell what it means to you', 'It stands across the border now, but every child in Armenia knows it. He listens quietly.', proud], ['Say only "a beautiful view"', 'He nods and pours the tea.', quiet]);
R('armenian', 'alphabet', 'An alphabet with a date', 'A colleague is curious about the curly Armenian letters on your keychain. You explain that Mesrop Mashtots created the alphabet around the year 405.',
  ['Write her name in Armenian', 'She frames the note and puts it on her desk.', { merit: 3, rep: 3, stress: -8, friends: 1 }], ['Say it is a long story', 'You promise to explain later.', quiet]);
R('armenian', 'lavash', 'Lavash from the oven', 'You find lavash, the thin flatbread baked in a clay oven. Armenian lavash is on the UNESCO list of cultural heritage.',
  ['Buy some and share it with the office', 'Wrapped around cheese and herbs, it vanishes in minutes.', { money: -400, stress: -8, friends: 2, merit: 2 }], ['Eat it alone with cheese', 'Taste of your grandmother\'s kitchen.', { stress: -6, famLove: 1 }]);
R('armenian', 'duduk', 'The sound of the duduk', 'A film in the evening has music played on the duduk, the wooden double-reed pipe made of apricot wood. You recognise it from the first note.',
  ['Tell your friends where it comes from', 'The sad, warm sound fills the room. "Can you find us more of this?"', proud], ['Listen alone with the lights off', 'You think of the street where you grew up.', { stress: -8, famLove: 1 }]);
R('armenian', 'khachkar', 'A stone cross at the church', 'A friend notices a picture of a khachkar, a carved stone cross, in your room. These carved crosses are also a UNESCO heritage in Armenia.',
  ['Explain the patterns', 'No two are the same, and each has its own lace of stone.', { merit: 3, rep: 2, stress: -6 }], ['Say it is a gift from a cousin', 'He smiles and asks no more.', quiet]);
R('armenian', 'first', 'The first Christian state', 'In a talk about religion a colleague says she did not know that Armenia adopted Christianity as the state religion in 301, earlier than any other country.',
  ['Add a few words and a story', 'She asks if there are Armenian churches in Moscow. There are.', proud], ['Let the talk go on', 'You smile and drink your tea.', quiet]);

/* ---------------- Belarus ---------------- */
R('belarusian', 'draniki', 'Draniki on a cold morning', 'It is cold, and you want draniki, the potato pancakes that Belarusians eat with sour cream.',
  ['Make a big pan for your flatmates', 'They had no idea that potatoes could taste like this.', { money: -400, stress: -10, friends: 2, merit: 2 }], ['Buy ready-made ones and eat them in silence', 'It is almost the same, almost.', { money: -250, stress: -3 }]);
R('belarusian', 'kupalle', 'Kupalle night', 'In July friends ask about Kupalle, the midsummer night when people jump over fires and look for the fern flower in the legend.',
  ['Tell them the legends', 'They are charmed by the fern flower. "Let\'s jump over a campfire."', proud], ['Say it is mostly songs now', 'They ask you to sing, and you do.', { stress: -5, friends: 1 }]);
R('belarusian', 'bison', 'The bison of Belovezhskaya Pushcha', 'A friend shows a photo of a bison. You say the Belovezhskaya Pushcha forest on the border with Poland is home to Europe\'s largest herd and is a UNESCO site.',
  ['Describe the old forest', 'Oaks several centuries old and a quiet you cannot find in Moscow.', proud], ['Say you have been there once as a child', 'The memory is warm.', { stress: -4, famLove: 1 }]);
R('belarusian', 'mir', 'A castle on a postcard', 'You send a postcard with the Mir castle, a UNESCO site, to a colleague who is going on holiday.',
  ['Add a note: "Go there once"', 'She puts it on the fridge.', { money: -150, merit: 2, rep: 2, stress: -5 }], ['Keep it for yourself', 'The castle stays on your wall.', quiet]);
R('belarusian', 'chagall', 'The painter from Vitebsk', 'In a gallery a friend stops at a painting by Marc Chagall. You say that he was born near Vitebsk.',
  ['Tell about the old Vitebsk', 'Flying lovers and little houses suddenly look more familiar.', { merit: 3, rep: 2, stress: -6 }], ['Say it is true, but you know little', 'You promise to read about it.', quiet]);
R('belarusian', 'languages', 'Two state languages', 'A colleague asks why you switch between Russian and Belarusian when you call home. Both are state languages in Belarus.',
  ['Explain how it works', 'He is surprised by how naturally you do it.', { know: 1, rep: 2, stress: -4 }], ['Switch to Russian and say nothing', 'He thinks you are shy.', { stress: 1 }]);

/* ---------------- Azerbaijan ---------------- */
R('azeri', 'novruz', 'Novruz at the table', 'In March you prepare for Novruz: green wheat sprouts, sweet pakhlava and shakarbura, and a table that waits for guests.',
  ['Invite colleagues and neighbours', 'A fire, sweets and a lot of tea. They stay late.', { money: -800, stress: -12, friends: 2, merit: 2 }], ['Celebrate with a video call', 'The phone on the table shows the whole family.', { stress: -6, famLove: 3 }]);
R('azeri', 'mugham', 'Mugham on an old record', 'You find a recording of mugham, the improvised classical music of Azerbaijan that is on the UNESCO list.',
  ['Play it for friends', 'Long and slow, then suddenly intense. One of them asks for the name of the singer.', proud], ['Listen alone with the window open', 'You are in your grandfather\'s courtyard.', { stress: -8 }]);
R('azeri', 'icheri', 'The Old City of Baku', 'A friend sees a photo of the Maiden Tower in the Old City of Baku, a UNESCO site, and asks about it.',
  ['Tell the legends of the tower', 'Stone walls by the sea. "I want to see the city," she says.', proud], ['Share a photo of the boulevard instead', 'It looks like a southern city on the sea.', { stress: -5, friends: 1 }]);
R('azeri', 'tea', 'Tea in the armudu glass', 'At the office you bring tea. In Azerbaijan it is served in an armudu, a small pear-shaped glass.',
  ['Bring glasses for everyone', 'The small glasses make the tea break feel like a ritual.', { money: -300, stress: -8, friends: 2, merit: 1 }], ['Use a normal cup', 'It is only tea.', quiet]);
R('azeri', 'plov', 'Plov, Azerbaijani style', 'You cook plov. In Azerbaijan the rice and the meat are often served separately, with a golden crust of bread or saffron.',
  ['Show the crust and the saffron', 'The crust disappears first.', { money: -700, stress: -10, friends: 2, merit: 2 }], ['Mix it all, like in the canteen', 'Nobody complains.', { money: -500, stress: -4 }]);
R('azeri', 'fire', 'The land of fire', 'A documentary about the Absheron peninsula shows the burning hillside Yanar Dag. A friend asks if it is real.',
  ['Say it is real, and why', 'Natural gas has been burning there for years. They are fascinated.', proud], ['Say you saw it as a child', 'The memory is warm and a little scary.', { stress: -4, famLove: 1 }]);

/* ---------------- Moldova ---------------- */
R('moldovan', 'martisor', 'A red and white string', 'On 1 March you tie a martisor, a red and white string, to the wrist of a friend. The custom is on the UNESCO list.',
  ['Give one to everyone in the office', 'They wear the strings for a week. Someone asks what the colours mean.', { money: -300, stress: -8, friends: 2, merit: 2 }], ['Give one to your mother by post', 'She ties it on her wrist.', { stress: -5, famLove: 3 }]);
R('moldovan', 'mamaliga', 'Mamaliga with brynza', 'You make mamaliga, a thick cornmeal porridge, and serve it with cheese and sour cream, as at home.',
  ['Cook it for your flatmates', 'They had never eaten anything so simple and so warm.', { money: -400, stress: -10, friends: 2, merit: 2 }], ['Eat it by yourself', 'It tastes better than you remembered.', { stress: -5 }]);
R('moldovan', 'wine', 'A country of wine cellars', 'A friend asks if it is true that Moldova has cellars where the streets are underground. Milestii Mici is one of the largest wine collections in the world.',
  ['Tell about the cellar streets', 'Kilometres of tunnels and millions of bottles. "I want to go."', proud], ['Say it is true, and nothing else', 'He nods and writes it down.', quiet]);
R('moldovan', 'wineday', 'The wine festival in autumn', 'In October there is a wine festival at home. The cousins send photos of grapes, songs and a long table.',
  ['Call and join the table by video', 'A toast to the screen, and the whole kitchen laughs.', { stress: -10, famLove: 4 }], ['Reply with a heart', 'It hurts a little more than it should.', { stress: -3, famLove: 1 }]);
R('moldovan', 'hora', 'A hora in the park', 'At a folk festival in the park people form a ring for the hora, a circle dance. You know the steps.',
  ['Join the circle and teach a few steps', 'By the third round strangers are laughing with you.', { stress: -12, friends: 2, rep: 2, merit: 2 }], ['Watch from the side', 'Your feet move on their own.', { stress: -4 }]);
R('moldovan', 'placinta', 'Placinta for a rainy day', 'Rain outside. You fry placinta, the thin pies with cheese or pumpkin that you ate as a child.',
  ['Share them with the neighbour', 'She brings jam in return.', { money: -400, stress: -8, friends: 2, merit: 1 }], ['Eat them while you call home', 'Your mother tells you what to change in the dough.', { stress: -6, famLove: 2 }]);

/* ---------------- Turkmenistan ---------------- */
R('turkmen', 'akhalteke', 'The horse of gold', 'A friend shows a photo of a horse with a metallic shine. You say it is an Akhal-Teke, a breed from Turkmenistan, and a national symbol.',
  ['Tell about the horses at home', 'Slim, fast and shiny in the sun. He asks if he can see one.', proud], ['Say you have only seen them from afar', 'He nods and says nothing.', quiet]);
R('turkmen', 'carpet', 'A carpet on the wall', 'Your room has a small Turkmen carpet with red patterns. A friend asks about the pattern.',
  ['Explain the guls, the round motifs', 'Each tribe has its own gul. He sees it differently now.', { merit: 3, rep: 2, stress: -6 }], ['Say it is a family thing', 'He says he understands.', quiet]);
R('turkmen', 'darvaza', 'The door in the desert', 'A video shows the Darvaza gas crater in the Karakum desert, burning for decades. Colleagues ask if it is real.',
  ['Tell what you know', 'It was lit long ago by geologists. They watch the video three times.', proud], ['Say you have not been there', 'It is far from where you grew up.', quiet]);
R('turkmen', 'melon', 'Melon day', 'In August Turkmenistan celebrates Melon Day. At a market you see a ripe melon that looks like the ones from home.',
  ['Buy it and share it', 'Sweet and cold. "It is the best melon in Moscow," a colleague says.', { money: -350, stress: -10, friends: 2, merit: 2 }], ['Walk past', 'It cannot be the same.', { stress: 1 }]);
R('turkmen', 'ashgabat', 'The white city', 'A friend finds photos of Ashgabat: white marble buildings and wide empty streets. "Is it really so white?" he asks.',
  ['Describe the city from memory', 'Clean, quiet and strange. He wants to see it.', proud], ['Say it is better in winter', 'You smile at your own joke.', quiet]);
R('turkmen', 'dutar', 'The sound of the dutar', 'A recording of a dutar, a two-stringed lute, plays in a Central Asian cafe. You recognise the song.',
  ['Tell the cafe owner you know it', 'He pours you tea and talks to you in Turkmen for ten minutes.', { stress: -12, friends: 1, merit: 2 }], ['Listen quietly', 'It is enough for today.', { stress: -6 }]);
