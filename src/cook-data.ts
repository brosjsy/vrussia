/* The home kitchen's knowledge: the ingredients (what they are, their price, their colour on the plate and how each kind is prepared safely) and the
   kinds of dish (the steps of cooking each, with the right way and the usual mistakes). The safety rules follow the food agencies' advice for home
   cooks: raw poultry, meat, fish and eggs are not washed (the splashes spread bacteria), frozen food thaws in the fridge or in cold water in a sealed
   bag, never on the counter; a separate board for raw meat; poultry is cooked to 74 °C (165 °F), minced meat to 71 °C (160 °F), whole cuts and fish
   to 63 °C (145 °F); cooked food goes into the fridge within two hours. Red kidney beans are boiled hard for ten minutes. Prices are game values. */

export type Kind = 'root' | 'veg' | 'leaf' | 'herb' | 'fruit' | 'berry' | 'poultry' | 'meat' | 'mince' | 'fish' | 'sea' | 'egg' | 'dairy' | 'cheese'
  | 'grain' | 'legume' | 'kidney' | 'flour' | 'dry' | 'spice' | 'oil' | 'sauce' | 'tin' | 'mush' | 'bread' | 'nut' | 'sweet' | 'drink' | 'frozen';

/** [English, Russian, icon, kind, price in ₽, colour on the plate] */
export type Ing = [string, string, string, Kind, number, string];
export const ING: Record<string, Ing> = {
  potato: ['Potatoes', 'Картофель', '🥔', 'root', 60, '#e8c872'], carrot: ['Carrot', 'Морковь', '🥕', 'root', 40, '#f08a24'], beet: ['Beetroot', 'Свёкла', '🟣', 'root', 45, '#a3123a'],
  onion: ['Onion', 'Лук', '🧅', 'root', 35, '#f3e6c4'], garlic: ['Garlic', 'Чеснок', '🧄', 'root', 50, '#f5f0e1'], ginger: ['Ginger', 'Имбирь', '🟤', 'root', 90, '#d9b26f'],
  radish: ['Radish', 'Редис', '🔴', 'root', 70, '#e0435a'], turnip: ['Turnip', 'Репа', '⚪', 'root', 60, '#f1ead7'], yam: ['Yam', 'Ямс', '🍠', 'root', 220, '#efe2c2'],
  sweetpotato: ['Sweet potato', 'Батат', '🍠', 'root', 180, '#e2843b'], cassava: ['Cassava (garri)', 'Маниок (гари)', '🌾', 'flour', 260, '#f4efe1'], plantain: ['Plantain', 'Плантан', '🍌', 'fruit', 160, '#e9b949'],
  cabbage: ['Cabbage', 'Капуста', '🥬', 'leaf', 50, '#bcd98a'], sauerkraut: ['Sauerkraut', 'Квашеная капуста', '🥬', 'tin', 120, '#d6d3a0'], lettuce: ['Lettuce', 'Салат', '🥬', 'leaf', 110, '#8fc95b'],
  spinach: ['Spinach', 'Шпинат', '🥬', 'leaf', 150, '#3f7f2e'], sorrel: ['Sorrel', 'Щавель', '🌿', 'leaf', 80, '#5d8f2c'], broccoli: ['Broccoli', 'Брокколи', '🥦', 'veg', 160, '#3c8d2f'],
  cauliflower: ['Cauliflower', 'Цветная капуста', '🥦', 'veg', 140, '#f2eedd'], tomato: ['Tomatoes', 'Помидоры', '🍅', 'veg', 150, '#e2342a'], cucumber: ['Cucumbers', 'Огурцы', '🥒', 'veg', 120, '#5aa34a'],
  pickles: ['Pickled cucumbers', 'Солёные огурцы', '🥒', 'tin', 140, '#8a9a3c'], pepper: ['Bell pepper', 'Болгарский перец', '🌶️', 'veg', 180, '#e5462e'], chili: ['Chili', 'Острый перец', '🌶️', 'spice', 40, '#c8171d'],
  eggplant: ['Aubergine', 'Баклажан', '🍆', 'veg', 150, '#5b2a6e'], zucchini: ['Courgette', 'Кабачок', '🥒', 'veg', 90, '#7fb24e'], pumpkin: ['Pumpkin', 'Тыква', '🎃', 'veg', 90, '#f0912a'],
  corn: ['Sweetcorn', 'Кукуруза', '🌽', 'veg', 90, '#f5d33b'], peas: ['Green peas', 'Зелёный горошек', '🟢', 'tin', 90, '#7cc04a'], greenbeans: ['Green beans', 'Стручковая фасоль', '🟢', 'veg', 160, '#4f9a3a'],
  okra: ['Okra', 'Бамия', '🟢', 'veg', 240, '#5c9a3b'], celery: ['Celery', 'Сельдерей', '🌿', 'veg', 90, '#a5cf6b'], leek: ['Leek', 'Лук-порей', '🌿', 'veg', 130, '#c9e09a'],
  avocado: ['Avocado', 'Авокадо', '🥑', 'fruit', 120, '#9cba4a'], olives: ['Olives', 'Оливки', '⚫', 'tin', 160, '#2f2f2a'], mushroom: ['Mushrooms', 'Грибы', '🍄', 'mush', 170, '#c9a27e'],
  driedmush: ['Dried mushrooms', 'Сушёные грибы', '🍄', 'dry', 300, '#8a6544'], dill: ['Dill', 'Укроп', '🌿', 'herb', 40, '#4f8f2f'], parsley: ['Parsley', 'Петрушка', '🌿', 'herb', 40, '#3d8a2a'],
  coriander: ['Coriander', 'Кинза', '🌿', 'herb', 50, '#3a8530'], basil: ['Basil', 'Базилик', '🌿', 'herb', 70, '#2f7a2a'], mint: ['Mint', 'Мята', '🌿', 'herb', 60, '#55b065'],
  greenonion: ['Spring onion', 'Зелёный лук', '🌿', 'herb', 40, '#5aa336'], tarragon: ['Tarragon', 'Тархун', '🌿', 'herb', 70, '#3d7a35'], bayleaf: ['Bay leaf', 'Лавровый лист', '🍃', 'spice', 20, '#7d8c3a'],
  apple: ['Apples', 'Яблоки', '🍎', 'fruit', 100, '#d23a2e'], pear: ['Pear', 'Груша', '🍐', 'fruit', 130, '#c8d356'], lemon: ['Lemon', 'Лимон', '🍋', 'fruit', 60, '#f5dc3a'],
  orange: ['Orange', 'Апельсин', '🍊', 'fruit', 70, '#f39a1e'], banana: ['Bananas', 'Бананы', '🍌', 'fruit', 90, '#f2d34b'], mango: ['Mango', 'Манго', '🥭', 'fruit', 200, '#f4a52a'],
  pineapple: ['Pineapple', 'Ананас', '🍍', 'fruit', 250, '#f2c94c'], peach: ['Peaches', 'Персики', '🍑', 'fruit', 200, '#f6a77a'], cherry: ['Cherries', 'Вишня', '🍒', 'berry', 250, '#9e1b2e'],
  strawberry: ['Strawberries', 'Клубника', '🍓', 'berry', 300, '#e2303f'], berries: ['Forest berries', 'Лесные ягоды', '🍇', 'berry', 280, '#5a2d6e'], cranberry: ['Cranberries', 'Клюква', '🍒', 'berry', 220, '#b3122c'],
  raisins: ['Raisins', 'Изюм', '🍇', 'dry', 150, '#5b3a29'], dates: ['Dates', 'Финики', '🟤', 'dry', 250, '#6e3f1e'], driedfruit: ['Dried fruit', 'Сухофрукты', '🟤', 'dry', 200, '#8a5a2e'],
  coconut: ['Coconut milk', 'Кокосовое молоко', '🥥', 'tin', 180, '#f7f3ea'], pomegranate: ['Pomegranate', 'Гранат', '🔴', 'fruit', 200, '#a8142c'], quince: ['Quince', 'Айва', '🍐', 'fruit', 180, '#e9cf4e'],
  chicken: ['Chicken', 'Курица', '🍗', 'poultry', 320, '#e9c7a0'], chickenwing: ['Chicken wings', 'Куриные крылья', '🍗', 'poultry', 280, '#e6b98c'], turkey: ['Turkey', 'Индейка', '🍗', 'poultry', 450, '#e8cfae'],
  duck: ['Duck', 'Утка', '🦆', 'poultry', 700, '#b9785a'], beef: ['Beef', 'Говядина', '🥩', 'meat', 650, '#8e2a22'], pork: ['Pork', 'Свинина', '🥩', 'meat', 420, '#d97c74'],
  lamb: ['Lamb', 'Баранина', '🥩', 'meat', 800, '#a2463a'], mince: ['Minced meat', 'Фарш', '🥩', 'mince', 400, '#b5544a'], liver: ['Liver', 'Печень', '🥩', 'meat', 260, '#6b2320'],
  sausage: ['Sausage (cooked)', 'Колбаса', '🌭', 'sauce', 300, '#cf6f6a'], ham: ['Ham', 'Ветчина', '🥓', 'sauce', 350, '#e59b97'], bacon: ['Bacon', 'Бекон', '🥓', 'meat', 300, '#c9564f'],
  salo: ['Salo', 'Сало', '🥓', 'sauce', 250, '#f3e9e1'], goat: ['Goat meat', 'Козлятина', '🥩', 'meat', 700, '#9a3e30'], cowskin: ['Cow skin (ponmo)', 'Говяжья шкура (понмо)', '🥩', 'meat', 300, '#d9b98a'],
  fish: ['White fish', 'Белая рыба', '🐟', 'fish', 400, '#f1ece2'], salmon: ['Salmon', 'Лосось', '🐟', 'fish', 900, '#f28a64'], herring: ['Salted herring', 'Сельдь', '🐟', 'sauce', 220, '#a9aeb3'],
  driedfish: ['Dried fish', 'Сушёная рыба', '🐟', 'dry', 350, '#a2865c'], tuna: ['Tinned tuna', 'Консервированный тунец', '🐟', 'tin', 180, '#c9a48a'], shrimp: ['Prawns', 'Креветки', '🦐', 'sea', 700, '#f39a7c'],
  squid: ['Squid', 'Кальмар', '🦑', 'sea', 450, '#f2e4d8'], mussels: ['Mussels', 'Мидии', '🦪', 'sea', 500, '#2c2a3a'], crayfish: ['Crayfish (ground)', 'Молотые раки', '🦞', 'dry', 300, '#c2512f'],
  caviar: ['Red caviar', 'Красная икра', '🔴', 'sauce', 1200, '#f2552c'], egg: ['Eggs', 'Яйца', '🥚', 'egg', 110, '#f7e7a8'], milk: ['Milk', 'Молоко', '🥛', 'dairy', 90, '#fbfaf5'],
  kefir: ['Kefir', 'Кефир', '🥛', 'dairy', 90, '#f7f6ef'], smetana: ['Smetana (sour cream)', 'Сметана', '🥛', 'dairy', 110, '#fbf7ee'], cream: ['Cream', 'Сливки', '🥛', 'dairy', 160, '#fff8ea'],
  butter: ['Butter', 'Сливочное масло', '🧈', 'dairy', 200, '#f6dc7c'], tvorog: ['Tvorog (curd cheese)', 'Творог', '⚪', 'cheese', 160, '#fbf8f1'], cheese: ['Cheese', 'Сыр', '🧀', 'cheese', 300, '#f5c542'],
  feta: ['Brynza / feta', 'Брынза', '🧀', 'cheese', 280, '#f8f5ec'], mozzarella: ['Mozzarella', 'Моцарелла', '🧀', 'cheese', 250, '#fbfaf3'], parmesan: ['Hard cheese (parmesan)', 'Пармезан', '🧀', 'cheese', 500, '#f0d68a'],
  suluguni: ['Suluguni', 'Сулугуни', '🧀', 'cheese', 380, '#f7efd7'], yogurt: ['Yoghurt', 'Йогурт', '🥛', 'dairy', 90, '#fbfaf6'], condensed: ['Condensed milk', 'Сгущёнка', '🥫', 'tin', 120, '#efdcae'],
  rice: ['Rice', 'Рис', '🍚', 'grain', 100, '#faf8f2'], buckwheat: ['Buckwheat', 'Гречка', '🌾', 'grain', 90, '#8a5a35'], oats: ['Oats', 'Овсянка', '🌾', 'grain', 70, '#d9c49a'],
  semolina: ['Semolina', 'Манка', '🌾', 'grain', 60, '#f1e3b6'], millet: ['Millet', 'Пшено', '🌾', 'grain', 70, '#f2d26a'], barley: ['Pearl barley', 'Перловка', '🌾', 'grain', 60, '#d8c7a4'],
  bulgur: ['Bulgur', 'Булгур', '🌾', 'grain', 120, '#c9a56a'], couscous: ['Couscous', 'Кускус', '🌾', 'grain', 150, '#ecd28e'], quinoa: ['Quinoa', 'Киноа', '🌾', 'grain', 300, '#e2cfa0'],
  pasta: ['Pasta', 'Макароны', '🍝', 'dry', 90, '#f2d48a'], noodles: ['Noodles', 'Лапша', '🍜', 'dry', 110, '#f0d58e'], ricenoodle: ['Rice noodles', 'Рисовая лапша', '🍜', 'dry', 160, '#f6f1e2'],
  lentils: ['Lentils', 'Чечевица', '🟠', 'legume', 110, '#d0782e'], chickpeas: ['Chickpeas', 'Нут', '🟡', 'legume', 130, '#e0bf73'], beans: ['White beans', 'Белая фасоль', '⚪', 'legume', 120, '#f1ead6'],
  kidney: ['Red kidney beans', 'Красная фасоль', '🔴', 'kidney', 130, '#8c2a2a'], blackeyed: ['Black-eyed beans', 'Фасоль «чёрный глаз»', '⚪', 'kidney', 160, '#efe2c8'], splitpea: ['Split peas', 'Колотый горох', '🟡', 'legume', 70, '#e6c94c'],
  tofu: ['Tofu', 'Тофу', '⬜', 'dairy', 220, '#f6f1e2'], flour: ['Flour', 'Мука', '🌾', 'flour', 70, '#fbf8ef'], cornflour: ['Maize flour', 'Кукурузная мука', '🌽', 'flour', 90, '#f5d76e'],
  ryeflour: ['Rye flour', 'Ржаная мука', '🌾', 'flour', 90, '#b59a74'], yeast: ['Yeast', 'Дрожжи', '🟤', 'dry', 40, '#c6a575'], bakingpowder: ['Baking powder', 'Разрыхлитель', '⚪', 'dry', 30, '#ffffff'],
  sugar: ['Sugar', 'Сахар', '🍬', 'dry', 70, '#ffffff'], honey: ['Honey', 'Мёд', '🍯', 'sweet', 350, '#e9a823'], jam: ['Jam (varenye)', 'Варенье', '🍯', 'sweet', 200, '#a51f33'],
  chocolate: ['Chocolate', 'Шоколад', '🍫', 'sweet', 150, '#4b2a1a'], cocoa: ['Cocoa', 'Какао', '🟤', 'dry', 160, '#5a3622'], vanilla: ['Vanilla sugar', 'Ванильный сахар', '⚪', 'spice', 30, '#f7f1e3'],
  salt: ['Salt', 'Соль', '🧂', 'spice', 20, '#ffffff'], blackpepper: ['Black pepper', 'Чёрный перец', '⚫', 'spice', 50, '#2a2a2a'], paprika: ['Paprika', 'Паприка', '🔴', 'spice', 70, '#c4361d'],
  cumin: ['Cumin (zira)', 'Зира', '🟤', 'spice', 80, '#8a6136'], turmeric: ['Turmeric', 'Куркума', '🟡', 'spice', 80, '#e3a21a'], curry: ['Curry powder', 'Карри', '🟡', 'spice', 90, '#d39b22'],
  cinnamon: ['Cinnamon', 'Корица', '🟤', 'spice', 80, '#9a5a2e'], hmeli: ['Khmeli-suneli', 'Хмели-сунели', '🟢', 'spice', 90, '#8a7a3a'], garam: ['Garam masala', 'Гарам масала', '🟤', 'spice', 120, '#7a4a2a'],
  thyme: ['Thyme', 'Тимьян', '🌿', 'herb', 70, '#5a7a40'], oregano: ['Oregano', 'Орегано', '🌿', 'herb', 70, '#5a7a3a'], suya: ['Suya spice (yaji)', 'Специи суя (яджи)', '🟤', 'spice', 200, '#8a4a22'],
  stockcube: ['Stock cube', 'Бульонный кубик', '🟫', 'spice', 40, '#a57a3a'], oil: ['Sunflower oil', 'Подсолнечное масло', '🌻', 'oil', 130, '#f2d35a'], oliveoil: ['Olive oil', 'Оливковое масло', '🟢', 'oil', 500, '#b8b23a'],
  palmoil: ['Palm oil', 'Пальмовое масло', '🟠', 'oil', 300, '#e2551c'], sesameoil: ['Sesame oil', 'Кунжутное масло', '🟤', 'oil', 300, '#b5762e'], ghee: ['Ghee', 'Топлёное масло', '🧈', 'oil', 400, '#f2c14a'],
  soysauce: ['Soy sauce', 'Соевый соус', '🟫', 'sauce', 150, '#3a1f12'], vinegar: ['Vinegar', 'Уксус', '⚪', 'sauce', 60, '#f8f6ee'], mayo: ['Mayonnaise', 'Майонез', '⚪', 'sauce', 110, '#fbf3d8'],
  mustard: ['Mustard', 'Горчица', '🟡', 'sauce', 80, '#d9a520'], ketchup: ['Tomato paste', 'Томатная паста', '🍅', 'tin', 90, '#b32116'], horseradish: ['Horseradish', 'Хрен', '⚪', 'sauce', 90, '#efe8d6'],
  adjika: ['Adjika', 'Аджика', '🔴', 'sauce', 150, '#b5281b'], tkemali: ['Tkemali (plum sauce)', 'Ткемали', '🟢', 'sauce', 200, '#9a9a2e'], fishsauce: ['Fish sauce', 'Рыбный соус', '🟫', 'sauce', 250, '#8a5a2a'],
  tahini: ['Tahini', 'Тахини', '🟤', 'sauce', 300, '#d9b98a'], peanut: ['Peanuts', 'Арахис', '🥜', 'nut', 150, '#c98f4a'], walnut: ['Walnuts', 'Грецкие орехи', '🌰', 'nut', 400, '#8a5a35'],
  almond: ['Almonds', 'Миндаль', '🌰', 'nut', 500, '#d1a06b'], egusi: ['Egusi (melon seeds)', 'Эгуси (семена дыни)', '🟡', 'nut', 350, '#efe0a8'], sesame: ['Sesame', 'Кунжут', '⚪', 'nut', 90, '#efe2c2'],
  poppy: ['Poppy seeds', 'Мак', '⚫', 'nut', 120, '#2a2a33'], bread: ['Bread', 'Хлеб', '🍞', 'bread', 50, '#d9a55a'], ryebread: ['Black bread', 'Чёрный хлеб', '🍞', 'bread', 50, '#5a3a24'],
  lavash: ['Lavash', 'Лаваш', '🥙', 'bread', 70, '#f2dcae'], tortilla: ['Tortillas', 'Тортильи', '🌮', 'bread', 150, '#f0d69a'], dough: ['Puff pastry', 'Слоёное тесто', '🥐', 'frozen', 180, '#f2d48e'],
  frozenveg: ['Frozen vegetables', 'Замороженные овощи', '🧊', 'frozen', 150, '#8fb85a'], frozenberry: ['Frozen berries', 'Замороженные ягоды', '🧊', 'frozen', 200, '#6a2a5a'], icecream: ['Ice cream', 'Мороженое', '🍨', 'frozen', 120, '#fbf2e2'],
  tea: ['Black tea', 'Чёрный чай', '🍵', 'drink', 150, '#7a3a1a'], coffee: ['Coffee', 'Кофе', '☕', 'drink', 400, '#4a2a1a'], water: ['Water', 'Вода', '💧', 'drink', 0, '#d8ecf7'],
  wine: ['Red wine (for cooking)', 'Красное вино (для готовки)', '🍷', 'drink', 400, '#7a1a2a'], kvass: ['Kvass', 'Квас', '🍺', 'drink', 90, '#8a5a1a'], gelatin: ['Gelatine', 'Желатин', '⚪', 'dry', 60, '#f6efd8'],
  tamarind: ['Tamarind', 'Тамаринд', '🟤', 'sauce', 250, '#6a3a1a'], lemongrass: ['Lemongrass', 'Лемонграсс', '🌿', 'herb', 150, '#c9d98a'], seaweed: ['Nori', 'Нори', '🟩', 'dry', 200, '#1f3a1f'],
  cocoyam: ['Cocoyam', 'Таро (кокоям)', '🥔', 'root', 200, '#d8c3a5'], scentleaf: ['Scent leaf', 'Африканский базилик', '🌿', 'herb', 150, '#3a7a2a'], periwinkle: ['Periwinkles', 'Морские улитки', '🐚', 'sea', 400, '#5a4a3a'],
  apricot: ['Apricots', 'Абрикосы', '🍑', 'fruit', 220, '#f4a340'], plum: ['Plums', 'Сливы', '🟣', 'fruit', 180, '#6a2a5a'], grapes: ['Grapes', 'Виноград', '🍇', 'berry', 250, '#7a3a7a'],
  watermelon: ['Watermelon', 'Арбуз', '🍉', 'fruit', 150, '#e2475a'], melon: ['Melon', 'Дыня', '🍈', 'fruit', 200, '#f2e08a'], pinenut: ['Pine nuts', 'Кедровые орехи', '🌰', 'nut', 700, '#e9d6a8'],
  saffron: ['Saffron', 'Шафран', '🟠', 'spice', 600, '#e5701a'], cardamom: ['Cardamom', 'Кардамон', '🟢', 'spice', 300, '#9ab36a'], sumac: ['Sumac', 'Сумах', '🔴', 'spice', 200, '#8a1f2a'],
  peanutbutter: ['Peanut butter', 'Арахисовая паста', '🥜', 'sauce', 250, '#b5782e'], rabbit: ['Rabbit', 'Крольчатина', '🐇', 'meat', 700, '#efd9c9'], crab: ['Crab', 'Краб', '🦀', 'sea', 900, '#e2553a'],
  venison: ['Venison', 'Оленина', '🦌', 'meat', 900, '#6a2420'],
  rosemary: ['Rosemary', 'Розмарин', '🌿', 'herb', 70, '#4a6a3a'], locustbean: ['Locust beans (iru)', 'Ферментированные бобы (иру)', '🟤', 'dry', 250, '#5a3a1a'], bitterleaf: ['Bitter leaf', 'Горький лист', '🌿', 'leaf', 200, '#2f5a2a'], ugu: ['Ugu (pumpkin leaves)', 'Листья тыквы (угу)', '🌿', 'leaf', 200, '#2f6a2a'],
};

/** What to do with an ingredient before cooking: the right way and the usual mistakes, each with the lesson. By kind. */
export interface PrepQ { q: string; ok: string; bad: [string, string][] }
export const PREP: Partial<Record<Kind, PrepQ>> = {
  root: { q: 'How do you get it ready?', ok: 'Scrub under running water, then peel and cut', bad: [['Peel it without washing', 'Soil on the skin gets onto the knife and into the food.'], ['Wash it with soap', 'Soap is not for food: running water and a brush are enough.'], ['Leave it soaking for hours', 'Soaked cut vegetables lose their vitamins into the water.']] },
  veg: { q: 'How do you get it ready?', ok: 'Rinse under running water, dry, then cut', bad: [['Cut first, then wash', 'Washing after cutting rinses away the juice and flavour.'], ['Wash it with soap', 'Soap is not for food: running water is enough.'], ['Use it straight from the bag', 'Produce is washed before it is eaten or cooked.']] },
  leaf: { q: 'How do you get the leaves ready?', ok: 'Rinse the leaves in cold water, shake dry, take off any bad ones', bad: [['Use them unwashed', 'Leaves hold sand and dirt between them.'], ['Soak them in hot water', 'Hot water wilts the leaves.'], ['Wash them with soap', 'Soap is not for food.']] },
  herb: { q: 'How do you get the herbs ready?', ok: 'Rinse, dry well and chop just before using', bad: [['Chop them in the morning for the evening', 'Chopped herbs darken and lose their smell within hours.'], ['Boil them with everything from the start', 'Soft herbs go in at the end, or they lose their taste and colour.'], ['Use them unwashed', 'Herbs from the market are rinsed first.']] },
  fruit: { q: 'How do you get it ready?', ok: 'Wash under running water, then peel or cut', bad: [['Cut it without washing', 'The knife carries what is on the skin into the fruit.'], ['Wash it with soap', 'Soap is not for food.'], ['Leave it cut on the counter all day', 'Cut fruit browns and spoils: cut it close to eating.']] },
  berry: { q: 'How do you get the berries ready?', ok: 'Rinse gently just before using and take out the bad ones', bad: [['Wash them days before and keep them wet', 'Wet berries go mouldy fast: wash just before eating.'], ['Use them unwashed', 'Berries are rinsed before eating.'], ['Squeeze them under a strong tap', 'Soft berries burst: rinse gently in a colander.']] },
  poultry: { q: 'The raw chicken: what first?', ok: 'Do not wash it: pat it dry with paper towels, then cut it on a separate board', bad: [['Rinse it under the tap', 'Washing raw poultry splashes bacteria (salmonella, campylobacter) around the sink: the food agencies say do not wash it. Cooking kills them.'], ['Cut it on the bread board', 'Raw poultry gets its own board: the same board for salad or bread carries bacteria to food that will not be cooked.'], ['Leave it on the counter to warm up for hours', 'Raw poultry at room temperature for more than two hours lets bacteria grow.']] },
  meat: { q: 'The raw meat: what first?', ok: 'Do not wash it: pat it dry and cut it on a separate board for raw meat', bad: [['Rinse it under the tap', 'Rinsing raw meat spreads bacteria around the sink and does not make it safer: cooking does.'], ['Use the salad board', 'Raw meat gets its own board, washed with hot soapy water after.'], ['Leave it out all day', 'Two hours at room temperature is the limit for raw meat.']] },
  mince: { q: 'The minced meat: what first?', ok: 'Keep it cold until you use it, mix it on a separate board or bowl, wash hands after', bad: [['Taste the raw mixture for salt', 'Raw mince can carry E. coli and salmonella: fry a small piece to taste instead.'], ['Rinse it', 'Mince is not washed.'], ['Leave it in the sun on the balcony', 'Mince spoils fastest of all meat.']] },
  fish: { q: 'The raw fish: what first?', ok: 'Do not wash it in the sink: pat it dry, take out the bones, use a separate board', bad: [['Rinse it under the tap', 'Rinsing raw fish spreads bacteria around the sink: pat it dry instead.'], ['Use the bread board', 'Raw fish gets its own board.'], ['Leave it in a warm kitchen', 'Fish spoils quickly: keep it in the fridge until cooking.']] },
  sea: { q: 'The seafood: what first?', ok: 'Keep it cold; thaw in the fridge; throw away mussels that stay open when tapped', bad: [['Cook mussels that stay open when tapped', 'An open mussel that does not close is dead and may be spoiled: throw it away.'], ['Thaw prawns on the counter', 'Thaw seafood in the fridge or in cold water in a sealed bag.'], ['Refreeze after thawing', 'Thawed raw seafood is cooked, not frozen again.']] },
  egg: { q: 'The eggs: how do you handle them?', ok: 'Do not wash them; crack each into a separate cup first, wash hands after', bad: [['Wash the eggs in water', 'Washing eggs can pull bacteria through the shell: they are not washed at home.'], ['Crack straight into the dough', 'One bad egg spoils everything: crack each into a cup first.'], ['Keep them on the counter for weeks', 'Eggs keep in the fridge.']] },
  dairy: { q: 'The dairy: how do you keep it?', ok: 'Check the date and the smell; keep it in the fridge and put it back right after', bad: [['Leave it on the table all day', 'Milk products at room temperature spoil within hours.'], ['Use it past the date without looking', 'Check the date and smell it first.'], ['Keep it in the fridge door in summer heat', 'The door is the warmest part of the fridge: dairy keeps better on a shelf.']] },
  cheese: { q: 'The cheese: how do you get it ready?', ok: 'Take it from the fridge, cut or grate what you need, wrap the rest and put it back', bad: [['Leave the block out all day', 'Cheese sweats and spoils at room temperature.'], ['Cut off mould on soft cheese and eat the rest', 'Mould spreads through soft cheese: throw soft cheese away (hard cheese can be cut 1 cm around the spot).'], ['Grate it with dirty hands', 'Wash hands before handling ready-to-eat food.']] },
  grain: { q: 'The grain: how do you get it ready?', ok: 'Sort out any husks and stones, rinse until the water runs clear, measure the water', bad: [['Cook it straight from the bag without looking', 'Grain is sorted and rinsed: buckwheat and rice often have husks and dust.'], ['Leave cooked grain on the stove overnight', 'Cooked rice left warm can grow Bacillus cereus: into the fridge within two hours.'], ['Use any amount of water and hope', 'Grain needs its measure of water (rice about 1:1.5, buckwheat 1:2).']] },
  legume: { q: 'The dried pulses: how do you get them ready?', ok: 'Sort, rinse, and soak overnight (lentils need no soaking)', bad: [['Cook them without soaking', 'Unsoaked beans take hours and cook unevenly.'], ['Cook them in the soaking water', 'Pour off the soaking water and use fresh.'], ['Salt them at the start', 'Salt at the start keeps the skins hard: salt near the end.']] },
  kidney: { q: 'The red beans: how do you get them ready?', ok: 'Soak overnight, pour off the water, boil hard for at least 10 minutes, then simmer', bad: [['Slow-cook them from raw at a low heat', 'Raw red beans contain a toxin (lectin): they must boil hard for at least 10 minutes first.'], ['Eat them half cooked', 'Undercooked red beans make people sick.'], ['Cook them in the soaking water', 'Pour off the soaking water and use fresh.']] },
  flour: { q: 'The flour: how do you get it ready?', ok: 'Sift it and measure it', bad: [['Taste the raw dough', 'Raw flour is not a ready food: it can carry E. coli. Bake it first.'], ['Pack it into the cup', 'Packed flour is too much: spoon it in and level it.'], ['Keep it open by the sink', 'Flour keeps dry and closed.']] },
  dry: { q: 'How do you get it ready?', ok: 'Measure what the recipe needs and close the packet', bad: [['Guess the amount', 'Baking and dough need measures.'], ['Keep it open in the steam', 'Dry goods go lumpy and mouldy in damp.'], ['Use it with weevils in it', 'Check dry goods for pests.']] },
  spice: { q: 'The spices: how much?', ok: 'A little at first, taste, add more if needed', bad: [['The whole packet at once', 'Too much spice cannot be taken back.'], ['None at all', 'Food without salt and spice is flat.'], ['Over the steaming pot from the jar', 'Steam gets into the jar and spoils the rest: use a spoon.']] },
  oil: { q: 'The oil: how do you use it?', ok: 'Heat it first, then add the food; never leave hot oil alone', bad: [['Put water on burning oil', 'Water on burning oil explodes: cover the pan with a lid and turn off the heat.'], ['Put food into cold oil', 'Food in cold oil soaks it up and goes soggy.'], ['Leave the hot pan and go out', 'Never leave hot oil alone.']] },
  sauce: { q: 'How do you use it?', ok: 'Check the date, use a clean spoon, put it back in the fridge', bad: [['Dip a used spoon into the jar', 'A used spoon brings bacteria into the jar.'], ['Leave it out after opening', 'Opened jars keep in the fridge.'], ['Use it with a swollen lid', 'A swollen lid can mean botulism: throw it away.']] },
  tin: { q: 'The tin or jar: what do you check?', ok: 'Check for swelling and dents, open, drain if needed, move leftovers to a bowl in the fridge', bad: [['Use a swollen tin', 'A swollen tin can mean botulism: throw it away, do not taste.'], ['Keep the leftovers in the open tin', 'Move opened food into a glass or plastic box.'], ['Skip draining', 'Some tins (peas, beans) are drained first.']] },
  mush: { q: 'The mushrooms: how do you clean them?', ok: 'Wipe or brush them, a quick rinse only if dirty, trim the stems', bad: [['Soak them for an hour', 'Mushrooms drink water and go slimy when fried.'], ['Eat wild ones you do not know', 'Only mushrooms you are sure of: every year people are poisoned by wild mushrooms.'], ['Keep them in a closed plastic bag', 'Mushrooms sweat in plastic: a paper bag in the fridge.']] },
  bread: { q: 'The bread: how do you keep it?', ok: 'Check for mould and keep it in a bread bin or a bag', bad: [['Cut off the mould and eat the rest', 'Mould grows through bread: throw the loaf away.'], ['Keep it in a wet place', 'Damp bread goes mouldy.'], ['Leave it uncovered for days', 'Bread goes stale in the open.']] },
  nut: { q: 'The nuts and seeds: how do you get them ready?', ok: 'Sort them, toast them dry in a pan for the taste, let them cool', bad: [['Use rancid nuts', 'Bitter, old-smelling nuts are rancid: throw them away.'], ['Toast them and walk away', 'Nuts burn in seconds: stay by the pan.'], ['Serve them to a guest without asking about allergies', 'Nuts are a common allergy: ask first.']] },
  sweet: { q: 'How do you use it?', ok: 'Measure what you need with a dry spoon', bad: [['Use a wet spoon in the honey jar', 'Water in honey makes it ferment.'], ['The whole jar for taste', 'Sweet things are measured.'], ['Leave it open for the flies', 'Close the jar.']] },
  drink: { q: 'How do you use it?', ok: 'Measure what the recipe needs', bad: [['Guess', 'Measure it.'], ['Use it after it has gone off', 'Check the smell.'], ['Leave it open', 'Close it.']] },
  frozen: { q: 'It is frozen: how do you thaw it?', ok: 'In the fridge overnight (or in cold water in a sealed bag)', bad: [['On the counter all day', 'Thawing at room temperature lets the outside grow bacteria while the middle is still frozen.'], ['In hot water', 'Hot water warms the outside into the danger zone.'], ['Thaw, freeze again, thaw again', 'Thawed raw food is cooked, not refrozen.']] },
};

/** A step of cooking: the question, the right way, the usual mistakes with the lesson. */
export interface Step { q: string; ok: string; bad: [string, string][] }
const S = (q: string, ok: string, ...bad: [string, string][]): Step => ({ q, ok, bad });
/** The kinds of dish and how each is cooked. */
export const TYPES: Record<string, { name: string; ru: string; shape: 'bowl' | 'plate' | 'pie' | 'glass' | 'jar' | 'stack' | 'pot' | 'roll'; steps: Step[]; serve: string }> = {
  soup: { name: 'Soup', ru: 'Суп', shape: 'bowl', serve: 'Serve hot; a spoon of smetana or herbs on top.', steps: [
    S('The broth', 'Meat into cold water, bring to the boil, skim the foam, then simmer gently', ['Meat into boiling water and boil hard', 'A hard boil makes the broth cloudy.'], ['No skimming', 'The grey foam left in makes a cloudy, bitter broth.']),
    S('The vegetables', 'The hardest first (potatoes, roots), the soft ones later, greens at the very end', ['Everything at once at the start', 'Soft vegetables turn to mush while the potatoes are still hard.'], ['Greens at the start', 'Herbs boiled for an hour lose their taste and colour.']),
    S('Seasoning', 'Salt and pepper near the end, then taste', ['A spoon of salt at the start', 'The broth boils down and gets too salty.'], ['Never taste', 'Cooks taste and adjust.']),
    S('Resting', 'Turn off the heat and let it stand covered for 10–15 minutes', ['Serve it boiling straight from the fire', 'A short rest lets the flavours settle.'], ['Leave it on the stove until tomorrow', 'Soup goes into the fridge within two hours, not on the stove overnight.'])] },
  stew: { name: 'Stew', ru: 'Рагу', shape: 'pot', serve: 'Serve with bread, rice or potatoes.', steps: [
    S('Browning', 'Brown the meat in hot oil in small batches', ['All the meat into the pan at once', 'A crowded pan steams the meat grey instead of browning it.'], ['Into cold oil', 'Cold oil soaks into the meat.']),
    S('The base', 'Soften onion, carrot and garlic in the same pan', ['Burn the garlic first', 'Burnt garlic is bitter: it goes in last for a minute.'], ['Skip the onion', 'The onion is the base of the taste.']),
    S('Simmering', 'Add liquid to just cover, lid on, simmer gently until tender', ['Boil it hard to finish faster', 'Hard boiling makes meat tough and stringy.'], ['No liquid', 'Without liquid it burns to the pot.']),
    S('Done?', 'The meat falls apart with a fork (and reaches the safe temperature)', ['When the timer says so, without checking', 'Check that it is tender and cooked through.'], ['Pink in the middle is fine for a stew', 'Stewed meat is cooked through.'])] },
  fry: { name: 'Fried dish', ru: 'Жареное блюдо', shape: 'plate', serve: 'Serve straight from the pan.', steps: [
    S('The pan', 'Heat the pan, then the oil, then the food', ['Food into a cold pan', 'Food sticks and soaks up oil in a cold pan.'], ['A pan full of oil and walk away', 'Never leave hot oil alone.']),
    S('Frying', 'Do not crowd the pan; turn once when golden', ['Turn it every ten seconds', 'Constant turning stops the crust from forming.'], ['Fill the pan to the edges', 'A crowded pan steams instead of fries.']),
    S('Safety', 'If the oil catches fire: lid on, heat off', ['Pour water on it', 'Water on burning oil explodes into a fireball.'], ['Carry the burning pan to the sink', 'Moving a burning pan spreads the fire: lid on, heat off.']),
    S('Done?', 'Cooked through: no pink juices in poultry or mince', ['Golden outside means done', 'The outside browns before the inside is cooked.'], ['Cut it and serve it half raw', 'Poultry and mince are cooked through.'])] },
  bake: { name: 'Baked dish', ru: 'Запечённое блюдо', shape: 'plate', serve: 'Let it stand 5 minutes, then cut.', steps: [
    S('The oven', 'Heat the oven before the food goes in', ['Into a cold oven', 'In a cold oven baking takes longer and dries the food.'], ['As hot as it goes', 'The top burns before the middle is cooked.']),
    S('The dish', 'Grease the form, lay it out evenly', ['No grease', 'It sticks to the form.'], ['Pile it high in the middle', 'Uneven layers cook unevenly.']),
    S('Baking', 'Bake on the middle shelf; do not open the door too often', ['Open the door every two minutes', 'Each opening lets out the heat.'], ['Bottom shelf, full heat', 'The bottom burns.']),
    S('Done?', 'Check the middle: a knife or thermometer', ['Brown on top means done', 'The top browns before the middle cooks.'], ['Take it out early to save power', 'Half-baked dishes with meat or eggs are not safe.'])] },
  salad: { name: 'Salad', ru: 'Салат', shape: 'bowl', serve: 'Dress just before serving.', steps: [
    S('Boiled parts', 'Boil, cool completely, then cut', ['Mix the warm vegetables with mayonnaise', 'Warm vegetables in mayonnaise spoil fast.'], ['Cut them raw and hope', 'Potatoes, beets and eggs for salad are cooked first.']),
    S('Cutting', 'Small even cubes on a clean board (not the raw meat one)', ['Use the board from the raw chicken', 'Salad is not cooked again: the raw-meat board makes people sick.'], ['Chunks of all sizes', 'Even cubes make a better salad.']),
    S('Dressing', 'Dress just before serving', ['Dress it the night before', 'Dressed salad goes watery overnight.'], ['A whole jar of dressing', 'Dress lightly; more can be added.']),
    S('Keeping', 'Leftovers in the fridge, eaten within a day', ['Leave the bowl on the table all evening', 'Salads with mayonnaise spoil quickly in a warm room.'], ['Keep it a week', 'Dressed salads keep about a day.'])] },
  dumpling: { name: 'Dumplings', ru: 'Пельмени и вареники', shape: 'plate', serve: 'With smetana, butter or vinegar.', steps: [
    S('The dough', 'Flour, water, egg, a pinch of salt; knead until smooth, rest 30 minutes', ['Use it straight away', 'Rested dough rolls thin without tearing.'], ['A wet sticky dough', 'Add flour until it does not stick.']),
    S('The filling', 'Season the filling; fry a little piece to taste (never taste raw)', ['Taste the raw mince', 'Raw mince is never tasted.'], ['No salt', 'Bland filling makes bland dumplings.']),
    S('Shaping', 'Roll thin, cut circles, fill, pinch the edges tightly', ['Thick dough', 'Thick dough is chewy and raw inside.'], ['Leave the edges open', 'Open edges burst in the water.']),
    S('Cooking', 'Into well salted boiling water, stir once; 3–5 minutes after they float', ['Into cold water', 'They stick together and go soggy.'], ['Out as soon as they float', 'They float before the filling is cooked: a few more minutes.'])] },
  pancake: { name: 'Pancakes', ru: 'Блины и оладьи', shape: 'stack', serve: 'With smetana, jam, honey or butter.', steps: [
    S('The batter', 'Whisk eggs, milk and flour until smooth; rest 15 minutes', ['Lumps are fine', 'Lumps cook into raw flour spots.'], ['Taste the raw batter', 'Raw batter with eggs and flour is not tasted.']),
    S('The pan', 'Heat the pan well and brush it with a little oil', ['A cold pan', 'The first pancake sticks: the pan was cold.'], ['A centimetre of oil', 'Too much oil makes them greasy.']),
    S('Pouring', 'A thin ladle, tilt the pan to spread it', ['A thick layer', 'Thick batter stays raw inside.'], ['Pour and walk away', 'Thin pancakes cook in a minute.']),
    S('Turning', 'When the edges lift and the top is set', ['Turn at once', 'Too early it tears.'], ['Never turn', 'One side burns, the other stays raw.'])] },
  porridge: { name: 'Porridge', ru: 'Каша', shape: 'bowl', serve: 'With butter, honey, jam or fruit.', steps: [
    S('Measure', 'Measure the grain and the liquid', ['Guess', 'Too much water makes soup; too little burns.'], ['Use a cup of grain per person and a cup of water for all', 'Grain needs its measure of liquid.']),
    S('Boiling', 'Bring to the boil, lower the heat, stir now and then', ['High heat all the way', 'Milk porridge burns to the bottom.'], ['Never stir', 'It sticks and burns.']),
    S('Resting', 'Lid on, off the heat, rest 10 minutes', ['Serve it watery at once', 'A rest lets it thicken.'], ['Leave it out until tomorrow', 'Cooked porridge goes into the fridge.']),
    S('Serving', 'Butter in, a pinch of salt or sugar', ['Nothing at all', 'Plain porridge is flat: "you cannot spoil porridge with butter".'], ['Half a pack of butter', 'A spoon is enough.'])] },
  grill: { name: 'Grilled meat', ru: 'Блюдо на гриле', shape: 'plate', serve: 'With raw onion, herbs and lavash.', steps: [
    S('Marinating', 'Marinate in the fridge, in a covered bowl', ['Marinate on the balcony in the sun', 'Meat in the warm grows bacteria.'], ['Use the marinade as a sauce', 'Marinade that held raw meat is boiled before it is used as a sauce, or thrown away.']),
    S('The coals', 'Wait until the coals are grey, with no flames', ['Over high flames', 'Flames burn the outside and leave the inside raw.'], ['Lighter fluid on the hot coals', 'Lighter fluid on hot coals flares up.']),
    S('Grilling', 'Turn regularly, raw and cooked meat on separate plates', ['Cooked meat back on the raw plate', 'The raw plate puts bacteria back on the cooked meat.'], ['Never turn', 'One side burns.']),
    S('Done?', 'Cut one piece: clear juice, no pink in poultry, pork or mince', ['Blackened outside means done', 'Burnt outside, raw inside is the classic shashlik mistake.'], ['Serve at once without checking', 'Check the thickest piece.'])] },
  rice: { name: 'Rice dish', ru: 'Блюдо из риса', shape: 'plate', serve: 'Serve hot, with salad.', steps: [
    S('The rice', 'Rinse until clear, measure the water', ['No rinsing', 'Unrinsed rice is sticky and dusty.'], ['A lot of water and drain', 'For pilaf-type dishes the rice drinks a measured amount.']),
    S('The base', 'Fry the meat or vegetables first for the taste', ['Boil everything together raw', 'Frying first gives the taste.'], ['Burn the onion', 'Burnt onion is bitter.']),
    S('Cooking', 'Lay the rice, add the water, do not stir; lid on, low heat', ['Stir it all the time', 'Stirring makes rice mushy.'], ['Lift the lid every minute', 'The steam cooks the rice.']),
    S('Leftovers', 'Cool quickly and into the fridge within two hours', ['Leave it warm on the stove overnight', 'Warm rice left out grows Bacillus cereus, which reheating does not destroy.'], ['Reheat it several times', 'Reheat rice once, until steaming hot.'])] },
  pie: { name: 'Pie', ru: 'Пирог', shape: 'pie', serve: 'Let it cool a little before cutting.', steps: [
    S('The dough', 'Knead and let yeast dough rise in a warm place, covered', ['In a draught', 'Yeast dough does not rise in the cold.'], ['Knead in a lot of extra flour', 'Too much flour makes it heavy.']),
    S('The filling', 'Cook and cool the filling before it goes in', ['Hot filling into the dough', 'A hot filling melts the dough.'], ['Raw meat filling in a quick pie', 'Raw fillings need long baking: cook them first.']),
    S('Shaping', 'Seal the edges, prick the top, brush with egg', ['No holes on top', 'Steam bursts the pie.'], ['Leave the edges open', 'The filling runs out.']),
    S('Baking', 'Into a hot oven; done when golden and hollow-sounding underneath', ['Out when the top is pale', 'Underbaked dough is raw.'], ['Open the oven every few minutes', 'Yeast dough falls when the door opens.'])] },
  dessert: { name: 'Dessert', ru: 'Десерт', shape: 'plate', serve: 'Serve chilled or at room temperature.', steps: [
    S('Measuring', 'Weigh or measure everything first', ['By eye', 'Sweet baking is chemistry: measure.'], ['Double the sugar', 'Too much sugar burns and cracks.']),
    S('Mixing', 'Mix just until combined', ['Beat for half an hour', 'Overmixed batter is tough.'], ['Leave lumps of flour', 'Lumps stay raw.']),
    S('Cooking or setting', 'Bake, or set in the fridge, as the recipe says', ['Leave a cream dessert out to set', 'Cream and egg desserts set in the fridge, not on the counter.'], ['Taste the raw batter', 'Raw eggs and flour are not tasted.']),
    S('Keeping', 'Cream desserts in the fridge, eaten within two days', ['On the table for a week', 'Cream spoils fast.'], ['In the sun on the window', 'Keep it cool.'])] },
  drink: { name: 'Drink', ru: 'Напиток', shape: 'glass', serve: 'Serve in glasses.', steps: [
    S('The water', 'Clean drinking water, boiled if the recipe heats it', ['Water straight from a river', 'Untreated water carries germs.'], ['Water from the hot tap', 'Hot tap water is not for drinking: use cold, then heat.']),
    S('Mixing', 'Dissolve the sugar or honey in warm liquid', ['Sugar into ice water', 'It stays at the bottom.'], ['Boil honey hard', 'Boiling honey ruins its taste.']),
    S('Straining', 'Strain through a sieve', ['Leave the bits in', 'Strain it for a clean drink.'], ['Squeeze the bag hard', 'Squeezing tea leaves makes it bitter.']),
    S('Keeping', 'In the fridge, drunk within a few days', ['On the shelf for a week', 'Homemade drinks ferment and spoil.'], ['In a sealed bottle in the sun', 'Fermenting drinks in sealed bottles can burst.'])] },
  pickle: { name: 'Pickles and preserves', ru: 'Соленья и заготовки', shape: 'jar', serve: 'Open in winter; keep opened jars in the fridge.', steps: [
    S('The jars', 'Wash and sterilise the jars and lids', ['Use dirty jars', 'Dirty jars spoil the pickle and can grow botulism.'], ['Reuse old rusty lids', 'Lids must seal.']),
    S('The brine', 'Weigh the salt (and vinegar) exactly by the recipe', ['A little salt to make it healthier', 'Too little salt or acid lets dangerous bacteria grow.'], ['Any salt by eye', 'Preserving is done by weight.']),
    S('Filling', 'Pack tightly, cover with hot brine, seal', ['Leave air at the top', 'Air spoils the top layer.'], ['Cold brine in a hot jar', 'Glass cracks from the change of temperature.']),
    S('Storing', 'Cool upside down, then into a dark cool place; throw away jars with swollen lids', ['Taste a jar with a swollen lid', 'A swollen lid can mean botulism: throw it away unopened.'], ['Keep them over the radiator', 'Pickles keep cool and dark.'])] },
  sandwich: { name: 'Sandwich or snack', ru: 'Бутерброд или закуска', shape: 'plate', serve: 'Serve at once.', steps: [
    S('Hands and board', 'Wash hands, use a clean board', ['The raw chicken board', 'Ready-to-eat food is never cut on the raw-meat board.'], ['Unwashed hands after the bin', 'Wash hands first.']),
    S('Assembling', 'Spread, layer, press lightly', ['Wet tomatoes straight on the bread', 'The bread goes soggy: butter first, or dry the tomatoes.'], ['Pile it so high it falls apart', 'Layers you can bite.']),
    S('Toasting', 'Toast or fry until crisp, if the recipe says', ['Leave the toaster unwatched with a fork in it', 'Never put metal into a toaster.'], ['Burn it black', 'Burnt toast is bitter.']),
    S('Serving', 'Eat within two hours or put it in the fridge', ['Leave it in a hot car all day', 'Sandwiches with meat or mayonnaise spoil in the heat.'], ['Keep it for three days at room temperature', 'Into the fridge.'])] },
  pasta: { name: 'Pasta or noodles', ru: 'Паста или лапша', shape: 'plate', serve: 'Serve at once, with cheese or herbs.', steps: [
    S('The water', 'Lots of boiling salted water', ['A little water in a small pot', 'Pasta sticks in too little water.'], ['Oil in the water instead of stirring', 'Stir in the first minute: oil only makes it slippery.']),
    S('Cooking', 'Cook to the time on the packet, taste a piece', ['Twice the time', 'Overcooked pasta is mush.'], ['Rinse hot pasta in cold water', 'Rinsing washes off the starch that holds the sauce (except for cold noodle salads).']),
    S('The sauce', 'Cook the sauce while the pasta boils', ['Start the sauce after', 'The pasta goes cold and sticky.'], ['No salt anywhere', 'Pasta water is salted.']),
    S('Mixing', 'Toss the pasta in the sauce with a splash of the cooking water', ['Pile sauce on dry pasta', 'Tossing coats every piece.'], ['Pour all the water away first', 'A splash of pasta water makes the sauce silky.'])] },
  roast: { name: 'Roast', ru: 'Жаркое из духовки', shape: 'plate', serve: 'Rest, carve, serve with the juices.', steps: [
    S('Thawing', 'A frozen bird or joint thaws in the fridge (a day per 2 kg)', ['On the counter overnight', 'The outside sits in the danger zone for hours.'], ['In hot water', 'Hot water warms the outside into the danger zone.']),
    S('Seasoning', 'Pat dry, season, oil the skin', ['Wash the bird first', 'Washing raw poultry splashes bacteria round the kitchen.'], ['No salt', 'Season it.']),
    S('Roasting', 'Into a hot oven; baste now and then', ['A cold oven', 'It dries out.'], ['Never check it', 'Check the time and the colour.']),
    S('Done?', 'A thermometer in the thickest part: poultry 74 °C, pork and beef joints 63 °C, then rest', ['Cut it at once', 'Resting keeps the juice in the meat.'], ['Pink juice in chicken is fine', 'Chicken is cooked until the juice is clear (74 °C).'])] },
  steam: { name: 'Steamed dish', ru: 'Блюдо на пару', shape: 'plate', serve: 'Serve hot with a dipping sauce.', steps: [
    S('The steamer', 'Water below, not touching the basket; bring to the boil', ['Water touching the food', 'It boils instead of steaming.'], ['Let it boil dry', 'A dry pot burns: keep an eye on the water.']),
    S('Laying out', 'Space between the pieces, on oiled paper or leaves', ['Pieces touching', 'They stick together.'], ['Straight on the metal', 'Dough sticks to bare metal.']),
    S('Steaming', 'Lid on, do not lift it too often', ['Lift the lid every minute', 'The steam escapes.'], ['Lid off', 'Steaming needs a lid.']),
    S('Done?', 'The filling is cooked through', ['When the dough looks done', 'The dough sets before the filling cooks.'], ['Half the time', 'Meat fillings need the full time.'])] },
  sauce: { name: 'Sauce or dip', ru: 'Соус', shape: 'jar', serve: 'Serve with bread, meat or vegetables.', steps: [
    S('Base', 'Prepare everything first and measure it', ['Start cooking and look for things after', 'Sauces go fast: have everything ready.'], ['By eye', 'Measure.']),
    S('Cooking', 'Low heat, stir all the time', ['High heat and walk away', 'Sauces burn and split.'], ['Never stir', 'It catches on the bottom.']),
    S('Seasoning', 'Taste and adjust at the end', ['Never taste', 'Taste it.'], ['A spoon of salt at once', 'Little by little.']),
    S('Keeping', 'In a clean jar in the fridge, a few days', ['On the shelf for weeks', 'Homemade sauces keep in the fridge.'], ['Double-dip with the same spoon', 'Use a clean spoon.'])] },
  cold: { name: 'Cold dish', ru: 'Холодное блюдо', shape: 'bowl', serve: 'Serve well chilled.', steps: [
    S('Boiling', 'Cook the parts that need it, then cool them quickly', ['Mix them warm', 'Warm and cold together spoil fast.'], ['Leave them on the table to cool overnight', 'Into the fridge within two hours.']),
    S('Cutting', 'Clean board, small even pieces', ['The raw-meat board', 'Cold dishes are not cooked again: a clean board.'], ['Unwashed vegetables', 'Wash them first.']),
    S('Setting', 'Chill in the fridge for several hours', ['On the balcony in summer', 'Only the fridge is cold enough in summer.'], ['Serve warm', 'It is a cold dish.']),
    S('Serving', 'Eat within a day or two', ['Keep it for a week', 'Cold dishes keep a day or two.'], ['Leave it out at the party all night', 'Back into the fridge between helpings.'])] },
  egg: { name: 'Egg dish', ru: 'Блюдо из яиц', shape: 'plate', serve: 'Serve at once, hot.', steps: [
    S('The eggs', 'Crack each into a cup, then into the bowl', ['Crack straight in', 'One bad egg spoils the bowl.'], ['Wash the eggs first', 'Eggs are not washed at home.']),
    S('Beating', 'Beat with a pinch of salt and a splash of milk', ['No beating', 'Uneven omelette.'], ['Salt half an hour before', 'Salted eggs go watery.']),
    S('Cooking', 'Medium heat, butter in the pan, lid for the top to set', ['Highest heat', 'Burnt below, raw on top.'], ['A cold pan', 'Eggs stick.']),
    S('Done?', 'Set, no runny white (soft yolk only with fresh eggs from a trusted seller)', ['Runny white is fine', 'Raw egg white can carry salmonella.'], ['Leave it in the pan for an hour', 'Eggs dry out and turn rubbery.'])] },
  swallow: { name: 'Swallow and soup', ru: 'Густая каша с соусом', shape: 'bowl', serve: 'Shape into balls and eat with the soup, by hand.', steps: [
    S('The soup', 'Cook the meat and stock first, then the leaves and seeds', ['Leaves first for an hour', 'Leaves go to mush and lose their colour.'], ['No stock', 'The stock is the taste of the soup.']),
    S('The oil', 'Heat palm oil gently, do not let it smoke black', ['Bleach it until it smokes black indoors', 'Smoking oil fills the flat with fumes: gently.'], ['Cold oil in everything', 'Warm oil carries the taste.']),
    S('The swallow', 'Sprinkle the flour into boiling water and stir hard until smooth', ['Dump it all in at once', 'It goes lumpy.'], ['Stop stirring', 'It burns and goes lumpy.']),
    S('Serving', 'Wrap the swallow, serve with the soup; leftover soup into the fridge', ['Leave the soup out all night', 'Soup goes into the fridge within two hours.'], ['Serve the swallow cold and hard', 'It is served warm.'])] },
};
/** Every dish ends with the leftovers. */
export const LEFTOVER: Step = S('The leftovers', 'Cool them and put them in the fridge within two hours, in a closed box',
  ['Leave the pot on the stove until tomorrow', 'Food left warm for more than two hours lets bacteria grow; reheating does not undo all of it.'],
  ['Put the hot pot straight into a packed fridge', 'A big hot pot warms the whole fridge: cool it quickly first (split it into small boxes).']);
/** Poultry, pork and mince are checked for doneness. */
export const DONENESS: Step = S('Is it cooked?', 'Check the thickest piece with a thermometer: poultry 74 °C, mince 71 °C, whole cuts and fish 63 °C',
  ['It looks brown, so it is done', 'Colour is not a safe test: use a thermometer or cut the thickest piece.'], ['A little pink in the chicken is fine', 'Poultry is cooked through: 74 °C, clear juices.']);

/** Kitchen safety: one of these comes with every dish. */
export const SAFETY: Step[] = [
  S('The pan handle', 'Turned inwards, away from the edge of the stove', ['Sticking out over the edge', 'A sleeve or a child catches it: hot food on the floor and on someone.'], ['Over the next burner', 'The handle gets hot and burns the hand.']),
  S('Cutting', 'Fingers curled under, a sharp knife, a damp cloth under the board so it does not slide', ['Cut towards the hand that holds the food', 'One slip and the knife is in your hand.'], ['A blunt knife, pressing hard', 'A blunt knife slips and cuts more often than a sharp one.']),
  S('The tea towel', 'Hung away from the burners', ['Hanging over the gas', 'A towel near the flame catches fire.'], ['Left on the hob to dry', 'A forgotten towel on a hot ring starts kitchen fires.']),
  S('Washing hands', 'With soap for 20 seconds, before cooking and after raw meat, eggs and the bin', ['A quick rinse without soap', 'Water alone does not take the bacteria off.'], ['Only after cooking', 'Hands carry bacteria into the food: wash them before and during.']),
  S('It smells of gas', 'Turn off the gas, open the windows, touch no switches, leave and call 104', ['Light a match to find the leak', 'A flame in a room full of gas is an explosion.'], ['Switch on the cooker hood', 'A spark from a switch can ignite the gas.']),
  S('The hot tray from the oven', 'Dry oven gloves', ['A wet towel', 'Heat goes through wet cloth as steam and burns.'], ['Bare hands, quickly', 'An oven tray at 200 °C burns in a second.']),
  S('Children in the kitchen', 'Away from the stove and the knives, pots on the back burners', ['Let them carry the hot pot', 'Scalds from hot liquids are the commonest burns in small children.'], ['Leave them alone with the stove on', 'Never leave children alone by a working stove.']),
  S('Leaving the kitchen', 'Check that the hob and the oven are off', ['Leave the soup on and go to the shop', 'Cooking left alone is the commonest cause of fires at home.'], ['Leave the oven open to warm the flat', 'A gas oven used as a heater can fill the flat with carbon monoxide.']),
];

/** The cuisines. */
export const CUISINES: Record<string, [string, string, string]> = {
  ru: ['Russian', 'Русская', '🇷🇺'], ua: ['Ukrainian', 'Украинская', '🇺🇦'], by: ['Belarusian', 'Белорусская', '🇧🇾'], tat: ['Tatar and Bashkir', 'Татарская и башкирская', '🥟'],
  cauc: ['Georgian and Armenian', 'Грузинская и армянская', '🍷'], az: ['Azerbaijani', 'Азербайджанская', '🇦🇿'], uz: ['Uzbek and Tajik', 'Узбекская и таджикская', '🇺🇿'], kz: ['Kazakh and Kyrgyz', 'Казахская и киргизская', '🇰🇿'],
  ng: ['Nigerian', 'Нигерийская', '🇳🇬'], wa: ['West African', 'Западноафриканская', '🌍'], ea: ['East and Southern African', 'Восточная и южная Африка', '🌍'], na: ['North African', 'Североафриканская', '🇲🇦'],
  me: ['Middle Eastern', 'Ближневосточная', '🧆'], tr: ['Turkish', 'Турецкая', '🇹🇷'], in: ['Indian and Pakistani', 'Индийская и пакистанская', '🇮🇳'], cn: ['Chinese', 'Китайская', '🇨🇳'],
  jp: ['Japanese and Korean', 'Японская и корейская', '🇯🇵'], sea: ['South-East Asian', 'Юго-Восточная Азия', '🇻🇳'], it: ['Italian', 'Итальянская', '🇮🇹'], fr: ['French', 'Французская', '🇫🇷'],
  eu: ['European', 'Европейская', '🇪🇺'], la: ['Latin American', 'Латиноамериканская', '🌮'], us: ['American', 'Американская', '🇺🇸'],
  md: ['Moldovan and Romanian', 'Молдавская и румынская', '🇲🇩'], sib: ['Siberian and Northern', 'Сибирская и северная', '❄️'], jw: ['Jewish', 'Еврейская', '🕎'], carib: ['Caribbean', 'Карибская', '🏝️'], world: ['Everyday', 'Повседневная', '🍽️'],
};
