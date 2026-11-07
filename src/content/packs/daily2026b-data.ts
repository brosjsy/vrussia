/* A second batch of daily-life scenes as data (English; the Russian is in src/scenes-ru-daily-b.ts): school and children, driving, money, customs and
   holidays, work, small everyday things. Facts from the online check of 4 November 2026 are marked "(checked)" in the text; the rest is told as fiction. */
import type { Daily } from './daily2026-data';

export const DAILY_B = [
 {
  "id": "day2-school-test",
  "cat": "edu",
  "foreigner": true,
  "title": "The Russian test for school",
  "text": "Since April 2025 a school may enrol a foreign child only after a Russian language test and a check that the family is in Russia legally (checked: press reports, passing rates were low). A child who fails must take a language course.",
  "ch": [
   [
    "Practise with the child every evening for a month",
    "The child passes the test. There is a hug, and an ice cream.",
    {
     "energy": -8,
     "stress": -3,
     "know": 1
    }
   ],
   [
    "Sign up for the free language course first",
    "It takes three months, but the child learns and makes a friend.",
    {
     "stress": 3,
     "know": 1
    }
   ],
   [
    "Hope the school will make an exception",
    "The school cannot. The year starts without the child.",
    {
     "stress": 12
    }
   ]
  ]
 },
 {
  "id": "day2-first-bell",
  "cat": "edu",
  "title": "The first of September",
  "text": "On the Day of Knowledge children in uniform bring flowers to their teacher. There is a short ceremony in the yard, then the first lesson, called \"a lesson of peace\".",
  "ch": [
   [
    "Buy a bouquet and go with the child to the school yard",
    "The teacher is touched, and the child is proud.",
    {
     "money": -600,
     "stress": -3,
     "rep": 1
    }
   ],
   [
    "Send the child with a friend's family",
    "The child is happy, but you feel you missed something.",
    {
     "stress": 3
    }
   ],
   [
    "Skip the ceremony and go to work",
    "The teacher says nothing. The child says a lot.",
    {
     "stress": 5,
     "famLove": -3
    }
   ]
  ]
 },
 {
  "id": "day2-parents-chat",
  "cat": "edu",
  "title": "The class parents' chat",
  "text": "The class chat has 34 parents. Today they ask everyone to put 500 ₽ into a fund for curtains and flowers for the teacher, and a heated debate about the colour starts.",
  "ch": [
   [
    "Send the 500 ₽ and a thumbs-up",
    "You are in. Somebody replies \"thank you, dear\".",
    {
     "money": -500,
     "rep": 1
    }
   ],
   [
    "Ask what the money is for",
    "The class mother sends a list with prices. The debate calms down.",
    {
     "know": 1,
     "money": -500
    }
   ],
   [
    "Leave the chat",
    "You miss the news about the parent meeting and the teacher is surprised.",
    {
     "stress": 4,
     "rep": -1
    }
   ]
  ]
 },
 {
  "id": "day2-driving-licence",
  "cat": "car",
  "foreigner": true,
  "title": "Your foreign driving licence",
  "text": "A foreign licence may be used in Russia with a certified Russian translation. If you hold a temporary or permanent residence permit for more than a year, you must pass the theory exam at the traffic police and get a Russian licence (checked: several reports since April 2025). Foreigners may not drive professionally.",
  "ch": [
   [
    "Get a certified translation and keep it with the licence",
    "The traffic officer at the next check reads the translation and nods.",
    {
     "money": -1500,
     "know": 1,
     "stress": -2
    }
   ],
   [
    "Book the theory exam at the traffic police",
    "You study the rules in Russian, and the exam is hard but fair.",
    {
     "energy": -6,
     "know": 3,
     "stress": 3
    }
   ],
   [
    "Drive without the translation",
    "A fine and a stern talk at the roadside.",
    {
     "money": -2500,
     "stress": 8,
     "strike": 1
    }
   ]
  ]
 },
 {
  "id": "day2-parking-yard",
  "cat": "car",
  "title": "Parking in the yard",
  "text": "The yard is full of cars. In a corner stands a car with a note under the windscreen wiper: \"You are blocking the garbage truck. Move.\" The note is signed by \"the neighbours\".",
  "ch": [
   [
    "Move the car and write a note of apology",
    "The next day somebody has put chocolate under your wiper.",
    {
     "rep": 2
    }
   ],
   [
    "Ignore it",
    "Two days later a scratch appears on your door.",
    {
     "money": -1500,
     "stress": 6
    }
   ],
   [
    "Ask in the house chat who is parked where",
    "A map of spaces appears. Everyone is thankful.",
    {
     "know": 1,
     "rep": 1
    }
   ]
  ]
 },
 {
  "id": "day2-fines-app",
  "cat": "car",
  "title": "A fine from a camera",
  "text": "A message from the state services: a camera caught your car going 75 in a 50 zone, 25 over the limit. The fine is 500 ₽; since 2025 there is a 25% discount if you pay within 30 days, so 375 ₽ (checked).",
  "ch": [
   [
    "Pay in the app within 30 days with the discount",
    "Paid. The next time you drive more slowly near the camera.",
    {
     "money": -375,
     "know": 1
    }
   ],
   [
    "Forget about it",
    "Later the fine is 500 ₽ and a bailiff's notice arrives.",
    {
     "money": -500,
     "stress": 6
    }
   ],
   [
    "Appeal because you think the speed sign was hidden",
    "It is rejected after two weeks, with a polite letter.",
    {
     "energy": -4,
     "stress": 3
    }
   ]
  ]
 },
 {
  "id": "day2-remittance",
  "cat": "family",
  "foreigner": true,
  "title": "Sending money home",
  "text": "You want to send part of your wages to your family. In 2026 the Bank of Russia kept limits on cross-border transfers for some non-residents until December, with an exception for workers: they may send up to the amount of their wages. Restrictions for citizens of friendly countries were lifted in December 2025 (checked: Bank of Russia reports).",
  "ch": [
   [
    "Send through a bank with your pay slip ready",
    "The bank checks the pay slip and the money reaches home in two days.",
    {
     "money": -1500,
     "famLove": 4,
     "stress": -3
    }
   ],
   [
    "Use a friend who \"knows a man\"",
    "The money arrives late and a part is missing. There is no receipt.",
    {
     "money": -2500,
     "stress": 10
    }
   ],
   [
    "Wait for a better rate",
    "The rate moves the wrong way and your family waits.",
    {
     "famLove": -2,
     "stress": 4
    }
   ]
  ]
 },
 {
  "id": "day2-self-employed",
  "cat": "paper",
  "title": "The self-employed tax",
  "text": "A friend repairs flats and wants to pay a simple 4–6% tax as a self-employed person, with a receipt in the app. The tax office app sends the receipt to the customer.",
  "ch": [
   [
    "Register in the app and send a receipt for each job",
    "Customers trust you more, and one asks for a big job.",
    {
     "money": -150,
     "rep": 2,
     "know": 1
    }
   ],
   [
    "Work without receipts",
    "A customer asks for a receipt and the job goes to someone else.",
    {
     "stress": 4,
     "rep": -1
    }
   ],
   [
    "Ask a lawyer whether it is allowed for you",
    "The answer depends on your status and the rules for foreigners. You write down the conditions.",
    {
     "money": -1000,
     "know": 3
    }
   ]
  ]
 },
 {
  "id": "day2-deposit",
  "cat": "estate",
  "title": "The deposit for a flat",
  "text": "The landlord asks for one month's rent as a deposit and one month in advance. He promises to return the deposit in writing when you move out.",
  "ch": [
   [
    "Sign a contract with the deposit written in it and take a receipt",
    "The contract lists the inventory. A year later the deposit comes back without a fight.",
    {
     "money": -1500,
     "know": 2
    }
   ],
   [
    "Agree orally and pay cash",
    "At moving out he finds \"damage\" and keeps the deposit.",
    {
     "money": -2500,
     "stress": 8
    }
   ],
   [
    "Photograph the flat when you move in",
    "Photos with dates later help when he claims a stain was yours.",
    {
     "know": 1,
     "stress": -2
    }
   ]
  ]
 },
 {
  "id": "day2-victory-day",
  "cat": "culture",
  "title": "The ninth of May",
  "text": "On Victory Day families carry photographs of relatives who fought in the war in a march called the Immortal Regiment. Many people wear the orange and black ribbon of St George.",
  "ch": [
   [
    "Stand quietly at the edge and watch with respect",
    "An old man tells you about his father. It is a moving morning.",
    {
     "know": 2,
     "rep": 1,
     "stress": -2
    }
   ],
   [
    "Join the march with a flower",
    "People smile at you, and some ask where you are from.",
    {
     "energy": -6,
     "friends": 1,
     "rep": 2
    }
   ],
   [
    "Stay home",
    "The street is empty, the television is solemn.",
    {
     "stress": 1
    }
   ]
  ]
 },
 {
  "id": "day2-maslenitsa",
  "cat": "culture",
  "title": "Maslenitsa",
  "text": "Before Lent there is a week of pancakes, folk games and a straw doll that is burned on Sunday. Everybody says \"forgive me\" and \"I forgive you\" at the end.",
  "ch": [
   [
    "Eat the pancakes with sour cream and honey and join the games",
    "You leave sticky, full and warm.",
    {
     "money": -300,
     "friends": 1,
     "stress": -6
    }
   ],
   [
    "Watch from a bench with tea",
    "The straw doll burns and the crowd cheers.",
    {
     "money": -100,
     "stress": -3
    }
   ],
   [
    "Say \"forgive me\" to a colleague you quarrelled with",
    "He answers \"God forgives\". The next day he is friendly.",
    {
     "rep": 2,
     "stress": -4
    }
   ]
  ]
 },
 {
  "id": "day2-march-8",
  "cat": "social",
  "title": "The eighth of March",
  "text": "International Women's Day is a public holiday: men give flowers, mimosa and small gifts to the women around them, from mothers to colleagues.",
  "ch": [
   [
    "Buy a bouquet and chocolates for the women in the office",
    "There is a lot of laughter and a toast with tea.",
    {
     "money": -1500,
     "rep": 2,
     "friends": 1
    }
   ],
   [
    "Give a single flower to your landlady",
    "She is moved, and next month she does not raise the rent.",
    {
     "money": -150,
     "rep": 1
    }
   ],
   [
    "Ignore the holiday",
    "Colleagues look at you with surprise.",
    {
     "rep": -2
    }
   ]
  ]
 },
 {
  "id": "day2-sick-leave",
  "cat": "work",
  "title": "Sick leave",
  "text": "You have a fever. In Russia a doctor can open an electronic sick note, which your employer sees directly, and pays a part of your salary for the days.",
  "ch": [
   [
    "Call a doctor home and get the sick note",
    "You rest, and the note appears in HR automatically.",
    {
     "health": 8,
     "stress": -3,
     "energy": 8
    }
   ],
   [
    "Go to work with a fever",
    "You spread it to three colleagues. Nobody thanks you.",
    {
     "health": -6,
     "rep": -2
    }
   ],
   [
    "Take the day off without a note",
    "The manager asks for an explanation and notes an absence.",
    {
     "rep": -2,
     "health": 3
    }
   ]
  ]
 },
 {
  "id": "day2-vacation",
  "cat": "work",
  "title": "The holiday schedule",
  "text": "In Russia an employee has 28 calendar days of paid holiday a year, and at the start of the year HR draws up a schedule that everyone agrees on.",
  "ch": [
   [
    "Put your holiday into the schedule in good time",
    "You get August, as you asked, and book a trip home.",
    {
     "stress": -4,
     "know": 1
    }
   ],
   [
    "Leave it for later",
    "All the good weeks are taken. You get a week in November.",
    {
     "stress": 3
    }
   ],
   [
    "Ask whether the days can be combined",
    "HR says yes if the manager agrees, and your manager agrees.",
    {
     "know": 2
    }
   ]
  ]
 },
 {
  "id": "day2-mfc-queue",
  "cat": "paper",
  "title": "The queue at the MFC",
  "text": "The MFC is a \"one window\" office for state services. You take a ticket from the machine and watch a screen with numbers. Your number is 214, and the screen shows 187.",
  "ch": [
   [
    "Book the next time online and come at an exact hour",
    "You are seen in ten minutes the next day.",
    {
     "energy": -2,
     "know": 1
    }
   ],
   [
    "Wait with a book and a snack",
    "After two hours you reach the window. The officer is kind.",
    {
     "energy": -8,
     "stress": 3
    }
   ],
   [
    "Give up and come back another day",
    "It is the same queue.",
    {
     "stress": 5,
     "energy": -3
    }
   ]
  ]
 },
 {
  "id": "day2-gosuslugi-code",
  "cat": "phone",
  "title": "A code for Gosuslugi",
  "text": "You get a text with a code to log in to Gosuslugi, and a call from a \"service employee\" who asks you to read it out to \"confirm your data\".",
  "ch": [
   [
    "Refuse and hang up",
    "Gosuslugi never asks for a code by phone. You change your password.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Read out the code",
    "Within the hour somebody has taken a loan in your name.",
    {
     "money": -3000,
     "stress": 20
    }
   ],
   [
    "Report the number to the bank",
    "The bank adds it to a block list and thanks you.",
    {
     "know": 1,
     "rep": 1
    }
   ]
  ]
 },
 {
  "id": "day2-tipping",
  "cat": "food",
  "title": "The tip",
  "text": "In a café the bill comes with \"service not included\". Waiters expect around 10% and cashless tips can be added in the terminal.",
  "ch": [
   [
    "Add 10% at the terminal",
    "The waiter smiles and brings a free tea.",
    {
     "money": -100,
     "rep": 1
    }
   ],
   [
    "Leave coins on the table",
    "It is taken with thanks.",
    {
     "money": -50
    }
   ],
   [
    "Leave nothing",
    "Nobody says anything, but you notice the look.",
    {
     "rep": -1
    }
   ]
  ]
 },
 {
  "id": "day2-night-train",
  "cat": "life",
  "title": "The night train",
  "text": "A long journey is easiest by train: a reserved-seat (platzkart) car with open berths is cheap, and a compartment is more private. Tea comes in glasses with metal holders.",
  "ch": [
   [
    "Take a platzkart berth and talk to the neighbours",
    "You share a boiled egg and hear three life stories before dawn.",
    {
     "money": -2500,
     "friends": 1,
     "stress": -4,
     "energy": -6
    }
   ],
   [
    "Take a compartment",
    "It is quiet, and you sleep well.",
    {
     "money": -3000,
     "energy": 2
    }
   ],
   [
    "Fly instead",
    "It is fast, but there is a delay for the weather.",
    {
     "money": -3000,
     "stress": 4
    }
   ]
  ]
 },
 {
  "id": "day2-mushrooms",
  "cat": "culture",
  "title": "Going for mushrooms",
  "text": "Your colleague invites you to pick mushrooms in September. Russians love it: a basket, rubber boots and a secret place. But some mushrooms are poisonous.",
  "ch": [
   [
    "Go and let him check every mushroom",
    "You bring home a basket of boletus and he shows you how to tell them apart.",
    {
     "energy": -8,
     "stress": -8,
     "know": 2
    }
   ],
   [
    "Pick mushrooms alone from a picture in your phone",
    "You get a stomach ache after dinner.",
    {
     "health": -8,
     "stress": 8
    }
   ],
   [
    "Buy mushrooms from a grandmother at the metro",
    "They are fresh. She tells you how to cook them.",
    {
     "money": -400,
     "rep": 1
    }
   ]
  ]
 },
 {
  "id": "day2-dress-cold",
  "cat": "life",
  "title": "Dressing for -20",
  "text": "The forecast is -20. Colleagues wear thermal underwear, a hat that covers the ears and a down jacket. They tell you not to go outside with wet hair.",
  "ch": [
   [
    "Dress in layers and take a scarf",
    "You are warm at the bus stop while others shiver.",
    {
     "clothes": 2,
     "health": 1
    }
   ],
   [
    "Go in a fashionable coat",
    "You look good for four minutes.",
    {
     "health": -4,
     "stress": 4
    }
   ],
   [
    "Buy a proper down jacket on sale",
    "It is not elegant, but it is warm.",
    {
     "money": -3000,
     "clothes": 15,
     "stress": -2
    }
   ]
  ]
 },
 {
  "id": "day2-courtyard-cats",
  "cat": "pets",
  "title": "The cats in the basement",
  "text": "The grandmothers of your building feed the stray cats in the basement. They ask you for a small amount for food.",
  "ch": [
   [
    "Give 200 ₽ and a tin of food",
    "The grandmothers bless you, and a cat purrs on your shoe.",
    {
     "money": -300,
     "rep": 2
    }
   ],
   [
    "Say you have no cash",
    "They nod. \"Next time\".",
    {
     "rep": 0
    }
   ],
   [
    "Offer to take a kitten",
    "They are delighted and tell you a long story about its mother.",
    {
     "money": -500,
     "stress": -4,
     "rep": 2
    }
   ]
  ]
 },
 {
  "id": "day2-notary",
  "cat": "paper",
  "title": "At the notary",
  "text": "For a translation of your passport you need a notary who certifies the translator's signature. It costs more in the centre and less in a district office.",
  "ch": [
   [
    "Go to the district office with the translator's diploma",
    "The notary stamps the translation in ten minutes.",
    {
     "money": -1300,
     "know": 1
    }
   ],
   [
    "Use the translation shop next to the metro",
    "It costs twice as much and takes only an hour.",
    {
     "money": -2500
    }
   ],
   [
    "Translate it yourself",
    "The notary refuses a translation not made by an accredited translator.",
    {
     "stress": 4,
     "energy": -4
    }
   ]
  ]
 },
 {
  "id": "day2-police-check-app",
  "cat": "police",
  "foreigner": true,
  "title": "Checking yourself on the website",
  "text": "Before travelling to another city you check on the official MVD website whether you are on the register of controlled persons and whether you have any entry or stay restrictions. The check is free.",
  "ch": [
   [
    "Check and save a screenshot",
    "You are not listed. You feel lighter.",
    {
     "know": 2,
     "stress": -4
    }
   ],
   [
    "Ask a friend to check for you",
    "He gets it wrong, and for two days you worry.",
    {
     "stress": 6
    }
   ],
   [
    "Skip it, you are sure it is fine",
    "A surprise at the bank a week later.",
    {
     "stress": 8,
     "strike": 0
    }
   ]
  ]
 },
 {
  "id": "day2-radio-call",
  "cat": "family",
  "title": "Calling home",
  "text": "It is your mother's birthday at home, and the connection is bad. A video call app may be blocked or slow today, so you choose between a call, a message and a voice note.",
  "ch": [
   [
    "Call on the ordinary line and sing",
    "She cries and laughs. The call is the best part of the day.",
    {
     "money": -300,
     "famLove": 6,
     "stress": -6
    }
   ],
   [
    "Send a voice note and flowers by delivery",
    "The flowers arrive in the evening, and she shows them to the neighbours.",
    {
     "money": -1800,
     "famLove": 5
    }
   ],
   [
    "Write \"happy birthday\" in the chat",
    "A quick \"thank you\". You feel you could have done more.",
    {
     "famLove": 1
    }
   ]
  ]
 },
 {
  "id": "day2-ruble-rate",
  "cat": "bank",
  "title": "The exchange rate",
  "text": "The ruble moved against the dollar overnight. The screen at the bank shows a new rate, and your friend tells you to \"buy dollars at once\".",
  "ch": [
   [
    "Ignore the noise and keep paying your usual bills",
    "Prices in the shop barely move. Calm helps.",
    {
     "stress": -2
    }
   ],
   [
    "Change a small sum as a precaution",
    "You lose a bit on the spread.",
    {
     "money": -300,
     "know": 1
    }
   ],
   [
    "Panic-buy dollars and groceries",
    "You pay a high rate and the cupboard is full of rice.",
    {
     "money": -2000,
     "stress": 6
    }
   ]
  ]
 }
] as unknown as Daily[];
