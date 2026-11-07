/* Thirty-one daily-life scenes as data (English; the Russian texts are in src/scenes-ru-daily.ts, fetched only when the game is in Russian).
   Facts that came from the online check of 4 November 2026 are marked "(checked)" in the text; the rest is everyday life told as fiction, with no legal
   claim. Every result line is fixed for its choice. Costs stay small: no choice takes more than 3,000 ₽ and none gives money. */
import type { Effects } from '../../engine';

export type Pick = [choice: string, result: string, fx: Effects];
export interface Daily { id: string; cat: string; foreigner?: boolean; title: string; text: string; ch: Pick[] }

export const DAILY = [
 {
  "id": "day-sbp-transfer",
  "cat": "bank",
  "title": "Pay a friend by phone number",
  "text": "Your flatmate asks for 1,500 ₽ for the shared groceries. In Russia you can send it by the Fast Payments System with only a phone number, in seconds.",
  "ch": [
   [
    "Send it by phone number and check the bank name",
    "The transfer shows the first name and the initial of the surname. It is correct and it arrives at once.",
    {
     "money": -1500,
     "stress": -2
    }
   ],
   [
    "Give cash instead",
    "He says \"thanks\" and forgets about it for a week.",
    {
     "money": -1500
    }
   ],
   [
    "Say you will pay later",
    "You forget, he reminds you, and it is a little awkward.",
    {
     "rep": -1,
     "stress": 3
    }
   ]
  ]
 },
 {
  "id": "day-scam-call",
  "cat": "bank",
  "title": "\"Your bank security service\"",
  "text": "A call: \"Your account is under attack, move your money to a safe account and tell us the code from the SMS.\" The number looks like your bank's.",
  "ch": [
   [
    "Hang up and call the number on the back of your card",
    "The real bank says it was a fraud. Banks never ask for codes or for a transfer to a \"safe account\".",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Tell them the code to \"stop the attack\"",
    "The money is gone in two minutes. The bank says you gave the code yourself.",
    {
     "money": -3000,
     "stress": 18,
     "know": 1
    }
   ],
   [
    "Keep talking to waste their time",
    "They get angry and hang up. You lose twenty minutes.",
    {
     "stress": 3,
     "energy": -3
    }
   ]
  ]
 },
 {
  "id": "day-marketplace-parcel",
  "cat": "shop",
  "title": "The pickup point",
  "text": "Your order from an online marketplace is at the pickup point round the corner. They open the box in front of you, and you scan a code from the app.",
  "ch": [
   [
    "Try the jacket on before you accept it",
    "It is too small, and you return it on the spot with no questions.",
    {
     "stress": -1,
     "energy": -2
    }
   ],
   [
    "Take it and leave",
    "It does not fit; the return is a whole afternoon.",
    {
     "money": -150,
     "energy": -6,
     "stress": 4
    }
   ],
   [
    "Photograph the parcel as it is opened",
    "The photos help when the cup in the box turns out to be cracked: a refund the same day.",
    {
     "know": 1,
     "stress": -2
    }
   ]
  ]
 },
 {
  "id": "day-cash-or-card",
  "cat": "shop",
  "title": "The terminal does not read your card",
  "text": "In a small shop the card terminal says \"declined\". Your foreign card does not work in Russia, but your Russian card is in the other pocket.",
  "ch": [
   [
    "Pay with the Russian card by phone",
    "The terminal beeps and the shopkeeper smiles.",
    {
     "money": -350
    }
   ],
   [
    "Run to the cash machine",
    "You return with cash and a queue behind you.",
    {
     "money": -350,
     "energy": -4
    }
   ],
   [
    "Leave the groceries",
    "You go home with no dinner.",
    {
     "stress": 4
    }
   ]
  ]
 },
 {
  "id": "day-utility-bill",
  "cat": "home",
  "title": "The bill from the housing office",
  "text": "A bill with many lines arrives: rent for the flat, heating, water, major repairs and rubbish removal. The meters in your flat must be read by the twenty-fifth.",
  "ch": [
   [
    "Send the meter readings in the app",
    "The bill is lower than last month, because it is for what you used.",
    {
     "money": -1200,
     "know": 1
    }
   ],
   [
    "Forget the readings",
    "The housing office charges an average, which is too much.",
    {
     "money": -2000,
     "stress": 3
    }
   ],
   [
    "Ask the landlord to deal with it",
    "He says the meters are your job, and he sends you the number of the office.",
    {
     "stress": 2
    }
   ]
  ]
 },
 {
  "id": "day-intercom",
  "cat": "home",
  "title": "The intercom does not work",
  "text": "Your key fob no longer opens the entrance door. In the dark you stand outside with the shopping.",
  "ch": [
   [
    "Ring a neighbour and ask politely",
    "A neighbour lets you in and tells you to ask the housing office for a new key. You say thank you twice.",
    {
     "rep": 1,
     "friends": 0
    }
   ],
   [
    "Wait for someone to come out",
    "Twenty minutes in the cold; a teenager lets you in without a word.",
    {
     "energy": -4,
     "stress": 3
    }
   ],
   [
    "Call the landlord at midnight",
    "He is angry, but comes with a spare key.",
    {
     "stress": 6,
     "rep": -1
    }
   ]
  ]
 },
 {
  "id": "day-heating-off",
  "cat": "home",
  "title": "The heating is off in October",
  "text": "The heating season starts when the average temperature drops. The radiators are cold, and your flat is 16 degrees.",
  "ch": [
   [
    "Call the dispatcher of the housing office",
    "They say the heating starts on Monday. On Monday the radiators are warm.",
    {
     "stress": -2,
     "know": 1
    }
   ],
   [
    "Buy a small electric heater",
    "It works, and the electricity bill grows.",
    {
     "money": -2200,
     "stress": -1
    }
   ],
   [
    "Put on every sweater you have",
    "You are warm enough, and somehow very funny to look at.",
    {
     "stress": 1,
     "health": -1
    }
   ]
  ]
 },
 {
  "id": "day-noise-rules",
  "cat": "home",
  "title": "Quiet hours",
  "text": "It is 23:30 and you cannot sleep. Your neighbour upstairs starts drilling. In most regions the law protects quiet from 22:00 or 23:00 to 06:00 or 07:00.",
  "ch": [
   [
    "Knock on his door and explain calmly",
    "He is embarrassed, says sorry and stops. The next day he leaves a cake outside your door.",
    {
     "rep": 2,
     "friends": 1
    }
   ],
   [
    "Call the police at once",
    "The patrol arrives late and writes a note. The neighbour does not speak to you for a month.",
    {
     "stress": 6,
     "rep": -2
    }
   ],
   [
    "Put in earplugs",
    "You sleep badly but you sleep.",
    {
     "energy": -4,
     "stress": 3
    }
   ]
  ]
 },
 {
  "id": "day-rubbish",
  "cat": "home",
  "title": "Sorting the rubbish",
  "text": "Next to the bins in your courtyard there is a new container for plastic and paper. Your neighbour sorts her rubbish with great seriousness.",
  "ch": [
   [
    "Sort plastic and paper like her",
    "It takes two extra minutes. She nods approvingly.",
    {
     "rep": 1
    }
   ],
   [
    "Throw everything in one bag",
    "Nobody says anything. Her look says enough.",
    {
     "rep": -1
    }
   ],
   [
    "Ask her how it works in your city",
    "She explains the colours and the schedule and invites you for tea.",
    {
     "know": 1,
     "friends": 1
    }
   ]
  ]
 },
 {
  "id": "day-troika",
  "cat": "life",
  "title": "Metro fare",
  "text": "You tap your phone at the Moscow metro gate and it opens. A single ride was reported at 75 ₽ in 2026 (checked, one source), cheaper with a Troika card. A friend says you can even pay with your face.",
  "ch": [
   [
    "Buy a Troika card and top it up",
    "Each ride is cheaper, and the card works on buses and trams as well.",
    {
     "money": -450,
     "know": 1
    }
   ],
   [
    "Pay by phone each time",
    "It works, only a little more expensive.",
    {
     "money": -75
    }
   ],
   [
    "Set up Face Pay in the app",
    "You upload a photo and link a card. It is optional, and the gate recognises you in a moment.",
    {
     "money": 0,
     "know": 1,
     "stress": -1
    }
   ]
  ]
 },
 {
  "id": "day-taxi",
  "cat": "life",
  "title": "A taxi in the snow",
  "text": "It is -15 and the last metro train has gone. The taxi app shows a price three times the normal fare, because everybody wants a taxi.",
  "ch": [
   [
    "Wait fifteen minutes for the price to fall",
    "The price falls by a third. Your feet are cold.",
    {
     "money": -900,
     "energy": -4
    }
   ],
   [
    "Pay now and get home warm",
    "The driver is friendly and talks about the weather the whole way.",
    {
     "money": -1700,
     "stress": -2
    }
   ],
   [
    "Walk to the night bus",
    "It comes in twenty minutes and is full of people going home.",
    {
     "energy": -6,
     "health": -1
    }
   ]
  ]
 },
 {
  "id": "day-elektrichka",
  "cat": "life",
  "title": "The suburban train",
  "text": "To go to a friend's dacha you take an elektrichka. You can buy a ticket at the machine or by the app; inspectors walk through the cars.",
  "ch": [
   [
    "Buy a ticket in the app",
    "The inspector scans it and moves on.",
    {
     "money": -220
    }
   ],
   [
    "Hope there is no inspector",
    "He comes in the second car. A fine of 1,000 ₽ plus the ticket.",
    {
     "money": -1220,
     "stress": 6
    }
   ],
   [
    "Sit by the window and watch the birches",
    "You bought a ticket and enjoy the view. The countryside is quiet.",
    {
     "money": -220,
     "stress": -4
    }
   ]
  ]
 },
 {
  "id": "day-polyclinic",
  "cat": "health",
  "title": "The polyclinic queue",
  "text": "To see a therapist you need an appointment by the app, by phone, or at the registry. Free state care needs an OMS policy; emergency care is free for everyone (checked).",
  "ch": [
   [
    "Book in the app for the next free slot",
    "Three days later you see a tired but kind doctor in ten minutes.",
    {
     "health": 4,
     "stress": -2
    }
   ],
   [
    "Go to a private clinic",
    "No queue, a long conversation, and a bill of 3,000 ₽.",
    {
     "money": -3000,
     "health": 6,
     "stress": -3
    }
   ],
   [
    "Wait until it passes",
    "It does not pass for a week.",
    {
     "health": -3,
     "stress": 5
    }
   ]
  ]
 },
 {
  "id": "day-oms-rule",
  "cat": "health",
  "foreigner": true,
  "title": "The five-year rule",
  "text": "A friend says the State Duma voted in November 2025 to give labour migrants an OMS policy only after five years of work, with emergency care still free for all (checked, signing and date not confirmed). Highly qualified specialists were exempt.",
  "ch": [
   [
    "Buy private insurance (VHI) and keep the policy with you",
    "Routine visits are covered. You keep the paper in your document folder.",
    {
     "money": -2500,
     "health": 2,
     "stress": -3
    }
   ],
   [
    "Rely on emergency care only",
    "It is free if it is truly an emergency. For a toothache you pay.",
    {
     "stress": 3
    }
   ],
   [
    "Ask the employer what the contract covers",
    "HR shows you a clause about VHI. It is a pleasant surprise.",
    {
     "know": 2,
     "stress": -2
    }
   ]
  ]
 },
 {
  "id": "day-pharmacy",
  "cat": "health",
  "title": "At the pharmacy",
  "text": "You have a cough. The pharmacist offers three syrups, one of which costs six times the other, with the same active ingredient.",
  "ch": [
   [
    "Ask for the cheapest with the same ingredient",
    "She gives it with a smile. \"Smart,\" she says.",
    {
     "money": -250,
     "health": 2
    }
   ],
   [
    "Take the expensive one in the pretty box",
    "It helps, but so would the cheap one.",
    {
     "money": -1100,
     "health": 2
    }
   ],
   [
    "Drink tea with honey and lemon",
    "Grandmother's way takes longer but you feel looked after.",
    {
     "health": 1,
     "stress": -2
    }
   ]
  ]
 },
 {
  "id": "day-grocery-app",
  "cat": "food",
  "title": "Groceries in fifteen minutes",
  "text": "A delivery app promises groceries in fifteen minutes. A shop on the corner has the same bread, cheaper, if you walk.",
  "ch": [
   [
    "Order through the app",
    "The courier arrives in twelve minutes, and you pay for the speed.",
    {
     "money": -700,
     "energy": 3
    }
   ],
   [
    "Walk to the shop",
    "You get a discount card at the till and meet the neighbour's dog.",
    {
     "money": -380,
     "energy": -2,
     "stress": -1
    }
   ],
   [
    "Cook from what you have",
    "Pasta with an onion. It is not bad.",
    {
     "money": 0,
     "stress": 1
    }
   ]
  ]
 },
 {
  "id": "day-market-bargain",
  "cat": "shop",
  "title": "The market in the morning",
  "text": "At the farmers' market the tomato seller says \"for you, special price\". The scales are old and the sign says 280 ₽ a kilo.",
  "ch": [
   [
    "Smile, ask for a kilo and bargain a little",
    "He gives you a cucumber for free. Everybody is happy.",
    {
     "money": -240,
     "rep": 1
    }
   ],
   [
    "Check the weight on your phone scale",
    "He gave you a little less. You mention it politely next week and he is more careful.",
    {
     "money": -280,
     "know": 1
    }
   ],
   [
    "Go to the supermarket instead",
    "The tomatoes there are cold and have no taste.",
    {
     "money": -190
    }
   ]
  ]
 },
 {
  "id": "day-tea-guests",
  "cat": "food",
  "title": "Tea for the guests",
  "text": "A neighbour you have just met drops by with a jar of jam. In Russia a guest is given tea, something sweet and often a full table.",
  "ch": [
   [
    "Put the kettle on and put out whatever you have",
    "You sit for two hours and learn the history of the whole building.",
    {
     "friends": 1,
     "rep": 2,
     "energy": -3
    }
   ],
   [
    "Thank her and say you are busy",
    "She smiles, but it is a bit cold at the door.",
    {
     "rep": -1
    }
   ],
   [
    "Bring her a jar of something from your own country",
    "She tastes it with curiosity and asks for the recipe.",
    {
     "friends": 1,
     "rep": 2
    }
   ]
  ]
 },
 {
  "id": "day-queue-etiquette",
  "cat": "shop",
  "title": "Who is last?",
  "text": "In the pharmacy queue everybody asks \"who is last?\" and nobody stands in a line you can see. You are not sure where you are.",
  "ch": [
   [
    "Ask \"who is last?\" and remember the person",
    "You are placed. When he leaves for a minute, he says \"I am after the man in blue\".",
    {
     "know": 1,
     "stress": -1
    }
   ],
   [
    "Go to the front",
    "A grandmother tells you where the end is, in detail.",
    {
     "rep": -2,
     "stress": 4
    }
   ],
   [
    "Come back later",
    "It is less busy at noon.",
    {
     "energy": -2
    }
   ]
  ]
 },
 {
  "id": "day-work-chat",
  "cat": "work",
  "title": "The work chat",
  "text": "Your manager adds you to a work chat in the state messenger Max (checked). The messages are in fast Russian with many abbreviations.",
  "ch": [
   [
    "Ask a colleague what the abbreviations mean",
    "She sends you a list of twenty. By Friday you understand most.",
    {
     "know": 2,
     "friends": 1
    }
   ],
   [
    "Use a translator for each message",
    "It works, slowly. A joke is lost.",
    {
     "know": 1,
     "energy": -3
    }
   ],
   [
    "Mute the chat",
    "You miss a shift change and your manager is not pleased.",
    {
     "rep": -2,
     "stress": 5
    }
   ]
  ]
 },
 {
  "id": "day-contract-read",
  "cat": "work",
  "foreigner": true,
  "title": "Read the contract",
  "text": "A new employer hands you a contract in Russian to sign today. It has a probation period, the pay and a clause about fines for being late.",
  "ch": [
   [
    "Ask to take it home and check the pay, the term and the fines",
    "HR agrees. A friend finds that the fine clause is not allowed. It is changed.",
    {
     "know": 3,
     "stress": 2
    }
   ],
   [
    "Sign at once to look keen",
    "The first pay is 8,000 ₽ lower than promised. The contract says so.",
    {
     "money": -2500,
     "stress": 8
    }
   ],
   [
    "Ask for a version in English or a translator",
    "They are surprised but arrange a short translation.",
    {
     "know": 2
    }
   ]
  ]
 },
 {
  "id": "day-salary-day",
  "cat": "work",
  "title": "Payday",
  "text": "In many Russian companies the pay comes twice a month: an \"advance\" in the middle and the rest at the end. This time the advance is late by two days.",
  "ch": [
   [
    "Ask HR politely when it will be paid",
    "It arrives the next morning, with an apology.",
    {
     "stress": -2
    }
   ],
   [
    "Say nothing and borrow from a friend",
    "Your friend lends you enough for lunch until it comes.",
    {
     "stress": 2
    }
   ],
   [
    "Complain to everyone in the break room",
    "Everyone nods; nothing changes, and the manager hears it.",
    {
     "rep": -2,
     "stress": 3
    }
   ]
  ]
 },
 {
  "id": "day-lecture-ru",
  "cat": "edu",
  "foreigner": true,
  "title": "The first lecture in Russian",
  "text": "The professor speaks fast and does not repeat. The slides are in Russian. Your classmates are taking notes in a shorthand you do not know.",
  "ch": [
   [
    "Record the lecture and read the slides at home",
    "It takes three hours, but you understand the lesson.",
    {
     "know": 3,
     "energy": -8
    }
   ],
   [
    "Ask a classmate to share her notes",
    "She does, and you share your notes in English in return.",
    {
     "know": 2,
     "friends": 1
    }
   ],
   [
    "Skip the lecture",
    "You miss the point, and the exam is near.",
    {
     "know": -1,
     "stress": 5
    }
   ]
  ]
 },
 {
  "id": "day-new-year",
  "cat": "culture",
  "title": "New Year's Eve",
  "text": "New Year is the biggest holiday. The table has salad Olivier, herring under a \"fur coat\", mandarins and champagne. At midnight the President speaks on TV, then the chimes of the Kremlin.",
  "ch": [
   [
    "Cook a dish and bring it to a friend's table",
    "You eat until midnight and again after. Somebody sings.",
    {
     "money": -900,
     "friends": 1,
     "stress": -6
    }
   ],
   [
    "Stay home and watch the TV",
    "Quiet, a little lonely, and the chimes are beautiful.",
    {
     "stress": -2
    }
   ],
   [
    "Go to the fireworks on the main square",
    "A crowd of thousands, snow, and strangers wishing you happiness.",
    {
     "stress": -4,
     "energy": -6
    }
   ]
  ]
 },
 {
  "id": "day-banya",
  "cat": "culture",
  "title": "The banya",
  "text": "A colleague invites you to a banya on Saturday. There is a steam room, birch twigs, tea and cold water afterwards. You should bring a hat, slippers and a towel.",
  "ch": [
   [
    "Go and follow your friend's lead",
    "It is hot, you laugh a lot, and you leave very light.",
    {
     "money": -700,
     "stress": -10,
     "health": 3,
     "friends": 1
    }
   ],
   [
    "Politely decline",
    "He says \"next time\".",
    {
     "rep": 0
    }
   ],
   [
    "Go but stay only in the warm room",
    "You drink tea and talk. This is also fine.",
    {
     "money": -500,
     "stress": -4
    }
   ]
  ]
 },
 {
  "id": "day-dacha-weekend",
  "cat": "culture",
  "title": "A weekend at the dacha",
  "text": "A friend's family takes you to their dacha, a small house with a garden. Everyone works in the beds in the morning, and in the evening there is a barbecue.",
  "ch": [
   [
    "Help with the beds and the barbecue",
    "Your back hurts, you take home a bag of cucumbers, and the grandmother adopts you.",
    {
     "energy": -10,
     "friends": 1,
     "rep": 2,
     "stress": -6
    }
   ],
   [
    "Read a book in a hammock",
    "Nobody minds. They bring you tea.",
    {
     "stress": -8,
     "energy": 2
    }
   ],
   [
    "Take photos of everything",
    "Everyone is flattered, and you send the pictures later.",
    {
     "friends": 1
    }
   ]
  ]
 },
 {
  "id": "day-name-day",
  "cat": "social",
  "title": "A birthday at work",
  "text": "A colleague has a birthday and brings a cake. In many offices the person with the birthday treats everyone, and the team gives a gift and a card.",
  "ch": [
   [
    "Put 300 ₽ into the team gift and sign the card",
    "Your signature is in a lot of red ink. Everyone is warm to you the whole week.",
    {
     "money": -300,
     "rep": 2,
     "friends": 1
    }
   ],
   [
    "Say happy birthday and eat the cake",
    "It is enough, but someone notices you did not give.",
    {
     "rep": 0
    }
   ],
   [
    "Skip the party",
    "You are asked where you were.",
    {
     "rep": -1
    }
   ]
  ]
 },
 {
  "id": "day-shoes-off",
  "cat": "social",
  "title": "Shoes off",
  "text": "You visit a new friend. At the door he hands you slippers. In Russia nobody walks around the flat in street shoes.",
  "ch": [
   [
    "Take your shoes off and put on the slippers",
    "The host is pleased. You are given tea and a spare pair of socks.",
    {
     "rep": 1
    }
   ],
   [
    "Leave the shoes on",
    "There is a silence. Then his mother brings a cloth.",
    {
     "rep": -2,
     "stress": 3
    }
   ],
   [
    "Ask whether it is the custom",
    "He laughs kindly and explains.",
    {
     "know": 1
    }
   ]
  ]
 },
 {
  "id": "day-chat-ads",
  "cat": "phone",
  "title": "Spam in the messenger",
  "text": "A group chat for your building has 400 people, and every hour somebody sells something or asks who parked in the wrong place.",
  "ch": [
   [
    "Mute it and check once a day",
    "You still find out when the water is turned off.",
    {
     "stress": -2,
     "know": 1
    }
   ],
   [
    "Leave the group",
    "You miss the news about the water, and the stairwell is cold at night.",
    {
     "stress": 3
    }
   ],
   [
    "Reply to the question about the parking",
    "Now 30 people ask you about it.",
    {
     "stress": 4,
     "rep": 1
    }
   ]
  ]
 },
 {
  "id": "day-passport-copy",
  "cat": "paper",
  "foreigner": true,
  "title": "Copies of everything",
  "text": "The landlord, the employer and the clinic each ask for a copy of your passport, registration and migration card. You find a copy shop that will make ten sets for 80 ₽.",
  "ch": [
   [
    "Make ten sets and keep them in a folder with the originals at home",
    "Every office is satisfied in two minutes. You also photograph all the papers for the phone.",
    {
     "money": -80,
     "know": 1,
     "stress": -2
    }
   ],
   [
    "Give the originals to each office to copy",
    "The employer keeps the passport \"for a day\". You are uneasy until it comes back.",
    {
     "stress": 8
    }
   ],
   [
    "Refuse because \"it is private\"",
    "Without the copy the clinic cannot register you.",
    {
     "stress": 4
    }
   ]
  ]
 },
 {
  "id": "day-language-cafe",
  "cat": "social",
  "title": "A language café",
  "text": "A café nearby has a weekly evening where Russians and foreigners talk and practise languages over tea. The entrance is free.",
  "ch": [
   [
    "Go and speak Russian with everyone you can",
    "Your grammar suffers, but they understand. You come home with two phone numbers.",
    {
     "money": -300,
     "know": 3,
     "friends": 2
    }
   ],
   [
    "Go and speak only English",
    "You help others practise but you learn little.",
    {
     "money": -300,
     "friends": 1
    }
   ],
   [
    "Stay home",
    "The evening is quiet.",
    {
     "stress": 1
    }
   ]
  ]
 }
] as unknown as Daily[];
