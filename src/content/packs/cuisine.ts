/* Cuisine pack: 60 dishes × 4 ways to meet them (restaurant, home cooking, street stall, shared by a neighbour). */
import { S, O } from '../../engine';
import type { Outcome } from '../../engine';

// [name, where it comes from, what it is]
const DISHES: [string, string, string][] = [
  ['borscht', 'Eastern Slavic cuisine', 'a beetroot soup served hot with sour cream and a slice of black bread'],
  ['shchi', 'Russian cuisine', 'a cabbage soup that has warmed Russian tables for centuries'],
  ['solyanka', 'Russian cuisine', 'a thick, tangy soup with meat, pickles and olives'],
  ['okroshka', 'Russian cuisine', 'a cold summer soup of vegetables and meat, made with kvass or kefir'],
  ['ukha', 'Russian cuisine', 'a clear fish soup, best cooked over a fire by a river'],
  ['rassolnik', 'Russian cuisine', 'a soup made with barley and pickled cucumbers'],
  ['pelmeni', 'Ural and Siberian cuisine', 'small meat dumplings, boiled and eaten with butter, vinegar or sour cream'],
  ['vareniki', 'Eastern Slavic cuisine', 'dumplings filled with potato, cottage cheese or cherries'],
  ['blini', 'Russian cuisine', 'thin pancakes, the star of Maslenitsa week'],
  ['syrniki', 'Russian cuisine', 'pan-fried cottage-cheese pancakes served with jam and sour cream'],
  ['buckwheat kasha', 'Russian cuisine', 'a humble buckwheat porridge that Russians love with butter or mushrooms'],
  ['pirozhki', 'Russian cuisine', 'small baked or fried pies with cabbage, potato or meat'],
  ['kulebyaka', 'Russian cuisine', 'a long layered pie with fish or meat, a festive dish'],
  ['Olivier salad', 'Russian New Year cuisine', 'a mayonnaise salad with potatoes, peas, pickles and sausage, a New Year must'],
  ['herring under a fur coat', 'Russian New Year cuisine', 'a layered salad of herring, beetroot, potato and mayonnaise'],
  ['kholodets', 'Russian cuisine', 'a jellied meat dish served with horseradish and mustard'],
  ['golubtsy', 'Eastern Slavic cuisine', 'cabbage rolls stuffed with meat and rice'],
  ['beef Stroganov', 'Russian cuisine', 'strips of beef in a creamy sauce, usually with mashed potatoes'],
  ['Pozharsky cutlets', 'Russian cuisine', 'tender minced chicken cutlets in breadcrumbs'],
  ['syrnaya paskha and kulich', 'Orthodox Easter cuisine', 'sweet cheese dessert and a tall fruit cake for Easter'],
  ['kvass', 'Russian cuisine', 'a lightly fermented drink made from rye bread'],
  ['medovukha', 'Russian cuisine', 'a traditional honey drink, low in alcohol'],
  ['sbiten', 'Russian cuisine', 'a hot spiced honey drink for cold days'],
  ['Tula gingerbread', 'Tula region', 'a pressed and printed spice cake, a famous souvenir'],
  ['pastila', 'Kolomna and Russian cuisine', 'a soft apple sweet with a long history'],
  ['chak-chak', 'Tatar and Bashkir cuisine', 'fried dough strands in honey, served at weddings and festivals'],
  ['echpochmak', 'Tatar cuisine', 'a triangular pie with meat and potatoes'],
  ['belish', 'Tatar cuisine', 'a big round pie, golden on top, filled with meat and potato'],
  ['gubadia', 'Tatar cuisine', 'a layered pie with rice, raisins and dried fruit'],
  ['kumys', 'Bashkir and Kazakh cuisine', 'fermented mare\'s milk, a traditional summer drink'],
  ['beshbarmak', 'Kazakh and Kyrgyz cuisine', 'boiled meat on wide noodles in broth, eaten at feasts'],
  ['plov', 'Central Asian cuisine', 'rice cooked with meat, carrots and cumin in a cauldron'],
  ['lagman', 'Uyghur and Central Asian cuisine', 'hand-pulled noodles with a meat and vegetable sauce'],
  ['manti', 'Central Asian cuisine', 'large steamed dumplings filled with lamb and onion'],
  ['samsa', 'Central Asian cuisine', 'baked pastry triangles with meat, baked in a tandoor oven'],
  ['shurpa', 'Central Asian cuisine', 'a rich lamb and vegetable soup'],
  ['chuchvara', 'Central Asian cuisine', 'tiny dumplings in broth'],
  ['oromo', 'Central Asian cuisine', 'a rolled steamed dough with a meat and vegetable filling'],
  ['sumalak', 'Navruz tradition', 'a sweet wheat paste cooked overnight for the spring festival'],
  ['non bread', 'Central Asian cuisine', 'a round flat bread baked in a tandoor and stamped with patterns'],
  ['khachapuri', 'Georgian cuisine', 'cheese-filled bread; the boat-shaped Adjarian type has an egg on top'],
  ['khinkali', 'Georgian cuisine', 'large soup dumplings eaten by hand'],
  ['shashlik', 'Caucasian cuisine', 'skewered grilled meat, the king of weekend picnics'],
  ['lula kebab', 'Caucasian cuisine', 'minced meat grilled on a skewer'],
  ['dolma', 'Caucasian cuisine', 'vine leaves or vegetables stuffed with rice and meat'],
  ['khinkal (Dagestani)', 'Dagestani cuisine', 'boiled dough pieces with meat and garlic sauce'],
  ['chudu', 'Dagestani cuisine', 'a thin flatbread with fillings such as meat, pumpkin or herbs'],
  ['zhizhig-galnash', 'Chechen cuisine', 'boiled meat with dumplings and garlic sauce'],
  ['kurze', 'Dagestani cuisine', 'small dumplings with a variety of fillings'],
  ['stroganina', 'Yakut and Northern cuisine', 'thinly shaved frozen raw fish eaten with salt and pepper'],
  ['omul', 'Lake Baikal cuisine', 'a smoked or salted fish from Lake Baikal'],
  ['buuz', 'Buryat cuisine', 'steamed meat dumplings for the Lunar New Year'],
  ['kalitki', 'Karelian cuisine', 'open rye pies filled with potato or barley'],
  ['salmon caviar', 'Far Eastern cuisine', 'bright orange salmon roe on buttered bread, a festive treat'],
  ['Kamchatka crab', 'Far Eastern cuisine', 'a giant king crab, served boiled with lemon'],
  ['pomor fish pie', 'Northern cuisine', 'a closed fish pie from the White Sea coast'],
  ['jollof rice', 'Nigerian cuisine from home', 'spicy tomato rice that tastes like a Lagos Sunday'],
  ['egusi soup', 'Nigerian cuisine from home', 'a rich melon-seed soup that is hard to find in Russia'],
  ['suya', 'Nigerian cuisine from home', 'spicy grilled meat on a skewer, the taste of home streets'],
  ['pounded yam', 'Nigerian cuisine from home', 'a stretchy yam dough that needs a good soup'],
  ['tvorog with honey', 'Russian cuisine', 'cottage cheese with honey or jam, a classic breakfast'],
];

const mk = (id: string, cat: string, title: string, text: string, a: [string, () => Outcome], b: [string, () => Outcome]): void => {
  S({ id, cat, title, text, w: 0.6, choices: [{ t: a[0], r: a[1] }, { t: b[0], r: b[1] }] });
};
const up = (t: string): string => t[0].toUpperCase() + t.slice(1);

DISHES.forEach(([name, origin, desc], i) => {
  mk(`dish-${i}-rest`, 'food', `${up(name)} at a restaurant`, `A small restaurant with a handwritten menu offers ${name}: ${desc}. (${origin}.)`,
    ['Order it', () => O(`The ${name} arrives hot and steaming. It is the best thing you have eaten this week.`, { money: -(600 + (i % 7) * 120), energy: 14, stress: -8, know: 1 })],
    ['Choose the cheapest dish instead', () => O('Cheap and filling. You glance at the neighbour\'s plate with envy.', { money: -250, energy: 8 })]);
  mk(`dish-${i}-home`, 'food', `Cooking ${name} at home`, `You decide to cook ${name} yourself: ${desc}. The recipe is a mix of videos and phone calls to family.`,
    ['Follow the recipe carefully', () => (Math.random() < 0.65 ? O(`Success! Your flat smells of ${name} and your neighbour knocks to ask what it is.`, { money: -400, energy: 14, stress: -10, know: 2, rep: 1 }) : O('A smoky disaster. The result is edible if you are very hungry.', { money: -400, energy: 8, stress: 3 }))],
    ['Improvise freely', () => O('Your version is not what any cookbook would call authentic, but it tastes of you.', { money: -300, energy: 10, stress: -4, know: 1 })]);
  mk(`dish-${i}-street`, 'food', `${up(name)} from a street stall`, `A steamy stall near the metro sells ${name}: ${desc}. The queue is short and the vendor is chatty.`,
    ['Buy a portion (₽250)', () => (Math.random() < 0.9 ? O(`Hot, quick and cheap. You eat standing up in the cold and feel happy.`, { money: -250, energy: 10, stress: -4 }) : O('Your stomach disagrees with the stall for a day.', { money: -250, health: -3, energy: -4 }))],
    ['Skip the stall', () => O('You buy a packaged snack from the kiosk instead.', { money: -120, energy: 4 })]);
  mk(`dish-${i}-gift`, 'social', `A neighbour brings ${name}`, `A neighbour knocks with a plate of ${name}: "I made too much." (${origin}: ${desc}.)`,
    ['Accept and chat for a while', () => O('You eat, talk and learn two family recipes. The plate comes back with a pie on it.', { energy: 10, stress: -8, rep: 3, friends: 1, merit: 1 })],
    ['Thank her and eat alone', () => O('Delicious. You return the plate washed and politely empty.', { energy: 10, stress: -3, rep: 1 })]);
});
