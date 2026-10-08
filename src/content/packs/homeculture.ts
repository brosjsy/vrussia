/* Home culture pack: twelve scenes for each of four origins (Tajikistan, Uzbekistan, Kyrgyzstan, Nigeria).
   Pride, homesickness and curiosity from Russian friends. Each scene rests on a well-known cultural fact. */
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

/* ---------------- Tajikistan ---------------- */
R('tajik', 'rudaki', 'A colleague asks about Tajik poetry', 'A colleague saw a statue and asks who Rudaki is. You know the answer: a 10th-century poet honoured as a founder of Persian poetry, with a monument in Dushanbe.',
  ['Recite a few lines and explain', 'She listens as if to music. "Say it again, slowly."', proud], ['Say it is hard to translate', 'She nods and writes the name down to look it up later.', { know: 1, stress: -2 }]);
R('tajik', 'qurutob', 'Cook qurutob for friends', 'You miss qurutob, the national dish of flatbread, dried yoghurt balls (qurut) and vegetables served on one big dish.',
  ['Cook it for your flatmates', 'They eat with their hands, as you show them. The dish disappears in ten minutes.', { money: -700, stress: -12, friends: 2, merit: 2 }], ['Eat leftovers in silence', 'It tastes of home, and of distance.', { stress: -3, famLove: -1 }]);
R('tajik', 'shashmaqom', 'A concert of Shashmaqom', 'A cultural centre announces an evening of Shashmaqom, the classical music tradition of Central Asia shared by Tajiks and Uzbeks.',
  ['Go and bring Russian friends', 'The long, slow melodies surprise them. "It is like jazz that has lived for centuries," one says.', { money: -500, stress: -12, merit: 4, friends: 1 }], ['Listen to a recording at home', 'You close your eyes and are in your grandmother\'s courtyard.', { stress: -8 }]);
R('tajik', 'pamir', 'The mountains in your memory', 'A friend shows photos of the Alps. You think of the Pamir: Ismoil Somoni Peak, 7,495 metres, the highest point of Tajikistan.',
  ['Show your own photos', 'Peaks, glacier lakes and a bus on a cliff road. The friend goes quiet: "I want to go."', proud], ['Say nothing', 'You keep your mountains to yourself for now.', { stress: 3 }]);
R('tajik', 'iskander', 'A postcard of Iskanderkul', 'Your mother sends a photo of Iskanderkul, the turquoise lake in the Fann Mountains, with the words "Come home for a summer".',
  ['Call and promise to visit', 'You make a plan on the back of an envelope. It feels good to have one.', { famLove: 5, stress: -8 }], ['Reply with a heart and a joke', 'You cannot promise anything yet.', { famLove: 1 }]);
R('tajik', 'choyxona', 'A teahouse in Moscow', 'You find a Central Asian teahouse (choyxona) with low tables, green tea and carpets on the walls.',
  ['Sit for an hour with tea and bread', 'The owner speaks your language. For one hour the city disappears.', { money: -600, stress: -14, friends: 1 }], ['Pass by quickly', 'Not today.', {}]);
R('tajik', 'mehrgon', 'Mehrgon in the autumn', 'In autumn the Mehrgon festival celebrates the harvest. A cultural centre organises a small gathering.',
  ['Join the gathering', 'Fruit, music and old songs. A neighbour from Samarkand brings pomegranates.', { money: -400, stress: -10, friends: 2, merit: 2 }], ['Stay in with a phone call', 'Your family sends a video of the harvest.', { stress: -5, famLove: 2 }]);
R('tajik', 'language', 'Two languages in one day', 'In the morning you speak Tajik to a cousin, at work Russian to the manager, and at night a mix of both to a friend. You notice it is tiring and wonderful.',
  ['Teach a colleague "thank you" in Tajik', 'The word "rahmat" spreads through the office. Everyone says it for a week.', { rep: 3, merit: 2, friends: 1, stress: -4 }], ['Practise your formal Russian', 'You listen to a podcast on the way home.', { know: 2 }]);
R('tajik', 'dushanbe', 'Why is the capital called Dushanbe?', 'A friend asks about the name of your capital. You explain that "Dushanbe" means "Monday" in Tajik, after the market that was held on Mondays.',
  ['Tell the whole story', 'He laughs: "So our Monday is your city!"', { rep: 2, stress: -4, merit: 1 }], ['Say it is a long story', 'He promises to ask again.', {}]);
R('tajik', 'ayni', 'A book by Sadriddin Ayni', 'A Russian reader asks for a Central Asian novel to read. You think of Sadriddin Ayni, the founder of modern Tajik literature.',
  ['Recommend his work and offer to translate a page', 'She keeps the page folded in her bag for weeks.', { merit: 3, rep: 3, know: 1 }], ['Recommend a Russian classic instead', 'She buys Tolstoy and thanks you.', {}]);
R('tajik', 'hisor', 'The old fortress at Hisor', 'A documentary on TV shows the Hisor fortress near Dushanbe. Your flatmates ask if you have been.',
  ['Describe the road and the old gate', 'You tell it as a story. By the end they have booked a trip in their minds.', proud], ['Say you were there once as a child', 'A smile and a quiet memory.', { stress: -4 }]);
R('tajik', 'sambusa', 'Baking sambusa for the office', 'Your birthday is next week. You could bake sambusa, pastries with meat and onion, for your colleagues.',
  ['Bake a big tray', 'The tray is empty before lunch. Someone asks for the recipe, someone else for a second tray.', { money: -600, stress: -8, rep: 4, friends: 1 }], ['Buy cake instead', 'Easy, but no one asks for the recipe.', { money: -400 }]);

/* ---------------- Uzbekistan ---------------- */
R('uzbek', 'registan', 'The Registan in a photograph', 'A coworker has a postcard of the Registan in Samarkand: three grand madrasahs around a square. "Have you been?" she asks.',
  ['Tell her about the evening light', 'The blue tiles turn gold. She decides to go next spring.', proud], ['Say it looks small on a postcard', 'She laughs. "Then I must see it."', { stress: -2 }]);
R('uzbek', 'ulugh', 'The astronomer king', 'You read a news item about stars and remember Ulugh Beg, the 15th-century ruler of Samarkand who built a great observatory.',
  ['Share the story with a friend who loves space', 'He is amazed that the star catalogue was so accurate. "Five hundred years before telescopes!"', { merit: 3, rep: 3, know: 1 }], ['Keep it to yourself', 'Quiet pride.', { stress: -3 }]);
R('uzbek', 'navoi', 'Navoi on a bookshelf', 'In a library you find a book by Alisher Navoi, the great poet of the Chagatai language. The librarian asks if you know him.',
  ['Quote a couplet from memory', 'The librarian writes it down. "Beautiful," she says.', { merit: 3, rep: 3, stress: -6 }], ['Say you know him from school', 'She nods, impressed.', { rep: 1 }]);
R('uzbek', 'plov', 'The right way to cook plov', 'Your friends argue about plov: which rice, which meat, which pot. Only you know the real answer.',
  ['Cook a big cauldron on Saturday', 'Carrots, cumin, patience. They declare it "the best thing ever" and ask you to teach them.', { money: -1200, stress: -14, friends: 2, rep: 4, merit: 2 }], ['Give a verbal lecture only', 'They take notes and burn the rice.', { rep: 1 }]);
R('uzbek', 'bukhara', 'The towers of Bukhara', 'A magazine shows the Kalyan minaret in Bukhara. You say you have walked in its shadow.',
  ['Tell them about the old bazaar domes', 'You describe the trading domes and the smell of spices. They listen like children.', proud], ['Say nothing', 'You smile at the picture.', {}]);
R('uzbek', 'suzani', 'A suzani on the wall', 'Your mother sent a suzani, an embroidered cloth, as a gift. It brightens the flat.',
  ['Hang it and tell visitors the story', 'Everyone touches the stitches. Your flat feels warmer.', { stress: -8, rep: 2, famLove: 3 }], ['Fold it away safely', 'It stays in a drawer, a promise of a future home.', { stress: 2 }]);
R('uzbek', 'timur', 'Who was Amir Timur?', 'A history debate starts at lunch about Tamerlane, known in Uzbekistan as Amir Timur. People have strong and different opinions.',
  ['Explain how he is remembered in Uzbekistan', 'You are careful and calm. The debate ends with curiosity, not heat.', { know: 2, rep: 3, merit: 1 }], ['Stay out of the debate', 'A wise decision some days.', {}]);
R('uzbek', 'mahalla', 'The mahalla spirit', 'Your neighbours here are cold, and you remember the mahalla, the close neighbourhood community at home where everyone knows everyone.',
  ['Organise a small tea gathering on the stairs', 'Four doors open. A new kind of mahalla is born.', { merit: 5, friends: 2, rep: 4, money: -500 }], ['Keep to yourself and miss home', 'It is a quiet evening.', { stress: 4 }]);
R('uzbek', 'khiva', 'Khiva on the screen', 'A travel show features Khiva, a walled city of the Silk Road whose old town Itchan Kala is a UNESCO heritage site.',
  ['Say you have seen it and recommend the sunset', 'The host says the same words on screen and you laugh.', { stress: -6, merit: 1 }], ['Change the channel', 'You feel homesick all the same.', { stress: 3 }]);
R('uzbek', 'metro', 'The metro that looks like a palace', 'You compare Moscow\'s palatial stations with the Tashkent metro, opened in 1977, whose stations are decorated with ceramics and carvings.',
  ['Tell your Moscow friends and compare stations', 'They are surprised: "We have not seen that!" You take photos next time at home.', { rep: 2, merit: 2, know: 1, stress: -4 }], ['Think quietly about home', 'The tunnel lights flash past.', { stress: 2 }]);
R('uzbek', 'silkroad', 'Silk Road jokes', 'A colleague asks if your grandfather rode a camel on the Silk Road. You laugh and answer properly.',
  ['Tell the real story of trade routes and bazaars', 'The joke ends; the interest begins.', { rep: 3, merit: 2, know: 1 }], ['Play along with the joke', 'Everyone laughs, nobody learns.', { stress: -3 }]);
R('uzbek', 'oshi', 'A wedding plov', 'A friend of the family is getting married in Moscow and wants you to cook the wedding plov.',
  ['Agree and cook for two hundred', 'You wake at 4 a.m. and cook until noon. Applause follows you home.', { money: 1500, energy: -20, stress: -6, rep: 5, friends: 2 }], ['Offer to help instead of lead', 'The big pot is in better hands, and you stir.', { energy: -8, rep: 2, friends: 1 }]);

/* ---------------- Kyrgyzstan ---------------- */
R('kyrgyz', 'manas', 'The epic of Manas', 'A friend hears that Kyrgyz people memorise an epic hero\'s story longer than many novels. "Is it true?" he asks.',
  ['Explain that the Manas epic is one of the longest in the world and is performed by manaschi storytellers', 'He is speechless. "And people perform it from memory?"', proud], ['Say it is a long story', 'He asks you to tell some of it next time.', { stress: -2 }]);
R('kyrgyz', 'issykkul', 'Issyk-Kul in your head', 'A photo of a lake in the mountains reminds you of Issyk-Kul, one of the largest mountain lakes in the world.',
  ['Tell them that it does not freeze even in winter', 'They are surprised, as they thought only the Baikal could surprise them.', { rep: 2, merit: 2, stress: -6 }], ['Show a photo from your phone', 'A blue, endless sheet of water.', { stress: -8, famLove: 1 }]);
R('kyrgyz', 'yurt', 'A yurt in a park', 'A festival in a Moscow park shows a yurt. The guide speaks about the "tunduk", the ring at the top of the roof.',
  ['Add that the tunduk is on the national flag', 'The guide is delighted. "Do you want to tell the next group?"', { merit: 4, rep: 4, stress: -6 }], ['Listen quietly with a smile', 'It is nice to hear it from someone else.', { stress: -4 }]);
R('kyrgyz', 'kiyiz', 'Ala-kiyiz, a felt carpet', 'You are given a traditional felt carpet, an ala-kiyiz, made by your aunt.',
  ['Place it in the centre of your room', 'Friends sit on it, take their shoes off, and relax. The room feels like a home.', { stress: -10, friends: 1, famLove: 3 }], ['Hang it on the wall', 'Colour and craft in a grey flat.', { stress: -6 }]);
R('kyrgyz', 'kumys', 'Kumys on the table', 'A Kazakh friend brings kumys, the fermented mare\'s milk loved in Central Asia. You raise a glass with him.',
  ['Drink, laugh and tell stories', 'Sour, fizzy, and wonderfully familiar. You talk until midnight.', { stress: -10, friends: 1, merit: 1 }], ['Politely refuse', 'He understands and drinks it for you.', {}]);
R('kyrgyz', 'kokboru', 'Kok-boru on the screen', 'On TV, horse riders fight over a goat carcass in a game called kok-boru, a traditional Central Asian sport.',
  ['Explain the rules to your puzzled flatmates', 'They are aghast and fascinated. "Is it safe?" "Very, if you can ride."', { rep: 2, merit: 2, stress: -4 }], ['Switch the channel', 'You are not in the mood.', {}]);
R('kyrgyz', 'eagle', 'Eagle hunters', 'A documentary shows berkutchi, eagle hunters of Kyrgyzstan who train golden eagles to hunt foxes.',
  ['Tell your friends you know a family who do it', 'They ask a hundred questions. You promise to ask your uncle for a video.', proud], ['Watch quietly', 'The eagle on the screen reminds you of the mountains.', { stress: -4 }]);
R('kyrgyz', 'osh', 'Osh and the holy mountain', 'You tell a friend about your city, Osh, one of the oldest in Central Asia, and the Sulaiman-Too mountain on a UNESCO list.',
  ['Describe the bazaar and the mountain', 'She says: "I know only Moscow. Your world is so big."', { rep: 3, merit: 2, stress: -6 }], ['Show a photograph', 'A mountain rising from the city. She looks for a long time.', { stress: -4 }]);
R('kyrgyz', 'beshbarmak', 'Beshbarmak for guests', 'Your guests want to try beshbarmak, "five fingers", a dish of boiled meat and noodles that is eaten by hand.',
  ['Cook it and teach them to eat', 'There is laughter, greasy fingers and a long toast.', { money: -1000, stress: -12, friends: 2, rep: 3 }], ['Order from a Central Asian restaurant', 'Quick and good.', { money: -1500, stress: -4 }]);
R('kyrgyz', 'nooruz', 'Nooruz in Moscow', 'Spring arrives, and with it Nooruz. The Kyrgyz community plans a gathering with songs and a long table.',
  ['Join and bring food', 'You meet a cousin of a cousin and the evening turns into a chain of introductions.', { money: -500, stress: -12, friends: 2, merit: 2 }], ['Call home instead', 'Your family\'s voices warm the room.', { famLove: 4, stress: -6 }]);
R('kyrgyz', 'boorsok', 'Boorsok for a rainy day', 'Rain outside. You decide to fry boorsok, the golden puffs of dough you ate as a child.',
  ['Fry a batch and share', 'The smell travels up and down the staircase. Neighbours knock.', { money: -300, stress: -10, friends: 2, rep: 3 }], ['Eat them all yourself', 'No regrets.', { stress: -6, energy: 6 }]);
R('kyrgyz', 'eaeu', 'The EAEU advantage', 'A friend from another country asks why you do not need a patent. You explain the EAEU: citizens of member states can work without one.',
  ['Explain the rules and offer to help him', 'He is relieved to learn what is possible. You compare notes on documents.', { know: 2, rep: 2, merit: 2 }], ['Say it is complicated', 'He nods and asks someone else.', {}]);

/* ---------------- Nigeria ---------------- */
R('student', 'jollof', 'The jollof rice argument', 'Your classmates from Ghana say their jollof rice is better. You know that the debate is a serious cultural sport.',
  ['Cook a pot of Nigerian jollof for the dorm', 'It is smoky and spicy. Even the Ghanaians admit it is good. Almost.', { money: -800, stress: -12, friends: 2, rep: 4 }], ['Smile and say both are good', 'The debate continues, as it must.', { stress: -4 }]);
R('student', 'nollywood', 'Movie night: Nollywood', 'You offer to show the dorm a Nollywood film, from one of the world\'s largest film industries by volume.',
  ['Organise a movie night with snacks', 'There is laughter, shouting at the screen and a plot twist nobody saw coming.', { money: -400, stress: -12, friends: 2, merit: 2 }], ['Watch it alone on a laptop', 'It feels like home, in a small window.', { stress: -6 }]);
R('student', 'fela', 'Afrobeat in a Kazan club', 'A DJ plays a Fela Kuti track, the music of the pioneer of Afrobeat. You find yourself dancing before you realise it.',
  ['Dance and teach the steps', 'Fifteen people join you. The DJ nods.', { money: -500, stress: -14, friends: 2, rep: 3 }], ['Listen at the bar', 'You tap your foot and smile.', { stress: -6 }]);
R('student', 'soyinka', 'A conversation about Soyinka', 'A literature student asks which African writers you recommend. You think of Wole Soyinka, the first African to win the Nobel Prize in Literature, in 1986.',
  ['Recommend a play and offer to lend it', 'She returns it two weeks later with a page of notes.', { merit: 3, rep: 3, know: 1 }], ['Mention Chinua Achebe\'s "Things Fall Apart" instead', 'She writes down the title. Both are good answers.', { merit: 2, rep: 2 }]);
R('student', 'traffic', 'Traffic jokes', 'Your classmate complains about Moscow traffic. You smile: in Lagos it is called "go-slow" and can eat half a day.',
  ['Tell the Lagos story with gestures', 'Everyone laughs. Moscow traffic seems almost polite.', { rep: 2, stress: -6, friends: 1 }], ['Nod politely', 'Different cities, similar problems.', {}]);
R('student', 'owambe', 'An owambe in the dorm', 'It is a friend\'s birthday, and you propose an owambe, a big Yoruba-style party with music, food and matching outfits.',
  ['Organise it in the common room', 'Rice, music, a speaker the size of a fridge. The dorm manager arrives, listens, and stays for an hour.', { money: -2000, stress: -16, friends: 3, rep: 5 }], ['Keep the party small', 'Cake, tea and a playlist.', { money: -400, stress: -8, friends: 1 }]);
R('student', 'pidgin', 'Pidgin in Russia', 'On the phone with a friend you slip into Nigerian Pidgin. A Russian neighbour overhears and asks what language it is.',
  ['Explain that it is Nigerian Pidgin, an English-based language', 'She tries a phrase and giggles. "Wetin dey?" she says.', { rep: 3, merit: 1, stress: -6 }], ['Switch to Russian', 'Politeness in any language.', {}]);
R('student', 'harmattan', 'Your first real winter', 'Minus twenty. You remember the Harmattan, the dry dusty wind of the Nigerian dry season, and laugh: you thought that was cold.',
  ['Buy proper winter gear and take a photo for the family group', 'The family chat explodes. "You look like a cushion!" says your cousin.', { money: -4000, clothes: 25, famLove: 3, stress: -6 }], ['Brave it in a thin jacket', 'You learn quickly.', { health: -4, stress: 5 }]);
R('student', 'asoebi', 'Aso ebi at a wedding', 'A Nigerian friend\'s wedding in Moscow asks guests to wear aso ebi, matching fabric chosen by the family.',
  ['Wear it proudly', 'A sea of colours in a grey city. Strangers ask for photos.', { money: -2500, stress: -14, friends: 2, rep: 4 }], ['Wear a normal suit', 'You look smart but out of the pattern.', { money: -500, stress: 2 }]);
R('student', 'eyo', 'Eyo on a video call', 'Your family calls from Lagos during the Eyo festival, when masquerades in white robes walk through the streets.',
  ['Watch the festival on your phone with your family', 'You see your cousin in the crowd and wave at the screen.', { famLove: 6, stress: -10 }], ['Message and promise to call tomorrow', 'You miss the day, but the call is kind.', { famLove: 1, stress: 2 }]);
R('student', 'suya', 'Suya on a Kazan roof', 'A Nigerian classmate arranges a suya night on a rooftop: grilled spiced beef, onions, pepper and a speaker.',
  ['Help to grill', 'Smoke, stories and the first stars. Russian friends ask what the spice mix is.', { money: -600, stress: -14, friends: 2, rep: 3 }], ['Bring drinks', 'A happy guest.', { money: -300, stress: -8, friends: 1 }]);
R('student', 'lagoshome', 'A friend asks about Lagos', 'A Russian friend asks what Lagos is really like. You think carefully about how to answer.',
  ['Tell the full story: the noise, the food, the music, the energy', 'He listens for an hour. "I want to go," he says. "I will start with a map."', proud], ['Say it is complicated', 'He nods. "Someday you will tell me."', { stress: 2 }]);
