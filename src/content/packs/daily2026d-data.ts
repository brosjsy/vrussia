/* A fourth part of the daily-life scenes as data (English; the Russian is in src/scenes-ru-daily-d.ts): legal basics for everybody (consumer rights, leaving a job,
   renting) and small street situations. Facts from the online check of 4 November 2026 are marked "(checked)" in the text. Game summaries, not legal advice. */
import type { DailyC } from './daily2026c-data';

export const DAILY_D = [
 {
  "id": "day7-return-shoes",
  "cat": "shop",
  "title": "The shoes that do not fit",
  "text": "The shoes you bought four days ago pinch. Under the consumer law you can exchange a non-food item of proper quality within 14 days (the day of purchase is not counted) if it is unused, with the tags and the look it had, and you have the receipt or other proof (checked: consumer-agency and law-firm sources).",
  "ch": [
   [
    "Go back with the box, the receipt and the shoes unworn",
    "The shop exchanges them for the next size without fuss.",
    {
     "stress": -2,
     "know": 1
    }
   ],
   [
    "Wear them outside to \"soften\" them first",
    "There is a scuff on the sole. The shop refuses the exchange.",
    {
     "money": -2000,
     "stress": 6
    }
   ],
   [
    "Wait a month and then ask",
    "The 14 days have passed. The manager is polite, and firm.",
    {
     "stress": 4
    }
   ]
  ]
 },
 {
  "id": "day7-lost-receipt",
  "cat": "shop",
  "title": "No receipt",
  "text": "You lost the receipt for a jacket you want to exchange. A receipt is the usual proof, but other proof of purchase can be accepted, such as a card statement or witnesses.",
  "ch": [
   [
    "Show the card statement from the bank app",
    "The cashier finds the sale in the system by the time and the amount.",
    {
     "know": 1,
     "stress": -2
    }
   ],
   [
    "Say you remember buying it, and nothing else",
    "The manager says, kindly, that he cannot take your word alone.",
    {
     "stress": 4
    }
   ],
   [
    "Photograph every receipt from now on",
    "Your phone gets a folder of receipts, which later saves a refund.",
    {
     "know": 1
    }
   ]
  ]
 },
 {
  "id": "day7-cosmetics",
  "cat": "shop",
  "title": "Perfume cannot go back",
  "text": "You bought a perfume that gives you a headache. In shops perfumes and cosmetics are on the list of proper-quality goods that cannot be exchanged (checked: Government decree 2463 of 31 December 2020, 14 categories).",
  "ch": [
   [
    "Accept it and give the bottle to a friend with a strong nose",
    "He loves it. You smell nothing, gladly.",
    {
     "friends": 1,
     "stress": -1
    }
   ],
   [
    "Argue with the manager for an hour",
    "He shows you the sign by the till. You lose an hour.",
    {
     "energy": -4,
     "stress": 6
    }
   ],
   [
    "Check the rules for each item before buying next time",
    "You ask before you buy. The cashier is surprised, then helpful.",
    {
     "know": 2
    }
   ]
  ]
 },
 {
  "id": "day7-online-return",
  "cat": "shop",
  "title": "An order from the internet",
  "text": "You ordered a lamp online and it is not what you expected. Goods bought at a distance have their own rules, set apart from the 14-day exchange in shops (checked: the consumer agency says they are separate; read the seller's terms and the law).",
  "ch": [
   [
    "Read the seller's return terms and send the request in writing",
    "The marketplace accepts the return and refunds in a few days.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Throw away the packaging first",
    "Now the return is harder. You find the box in the bin.",
    {
     "stress": 6,
     "energy": -3
    }
   ],
   [
    "Keep the lamp and write a review",
    "It lights a corner of the room, and your review helps the next buyer.",
    {
     "rep": 1
    }
   ]
  ]
 },
 {
  "id": "day7-resign-notice",
  "cat": "work",
  "title": "Leaving a job",
  "text": "You have found a better job. Under the Labour Code an employee gives written notice two weeks before leaving; the period starts the day after the employer receives the application (checked: law-firm sources, article 80).",
  "ch": [
   [
    "Write the application in two copies and ask the secretary to sign yours",
    "You have proof of the date. The two weeks are counted properly.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Tell the manager in the corridor and leave",
    "He writes you up as absent. Your final pay is delayed.",
    {
     "stress": 10,
     "rep": -3
    }
   ],
   [
    "Ask the manager whether you can leave earlier by agreement",
    "He agrees on ten days. Both of you are relieved.",
    {
     "know": 1,
     "rep": 1
    }
   ]
  ]
 },
 {
  "id": "day7-probation-notice",
  "cat": "work",
  "title": "Leaving during probation",
  "text": "Two weeks into your new job you know it is not for you. During the probation period you only need to give three days' written notice (checked: article 71, law-firm sources).",
  "ch": [
   [
    "Write the application for three days' notice and part on good terms",
    "The manager nods and wishes you luck.",
    {
     "rep": 1,
     "know": 1
    }
   ],
   [
    "Stay out of embarrassment",
    "Three months of a job you do not like.",
    {
     "stress": 8
    }
   ],
   [
    "Disappear without a word",
    "It counts as absence from work, and the reference will say so.",
    {
     "rep": -4,
     "stress": 8
    }
   ]
  ]
 },
 {
  "id": "day7-final-pay",
  "cat": "work",
  "title": "The final payment",
  "text": "It is your last day. The accountant says \"come on the tenth, we pay on the tenth\". The Labour Code says all sums due are paid on the last day of work and the work record is handed over (checked: articles 140 and 84.1, law-firm sources).",
  "ch": [
   [
    "Politely ask for the payment today, citing the article",
    "The accountant sighs, checks the system and pays out before lunch.",
    {
     "know": 2,
     "rep": 1
    }
   ],
   [
    "Come back on the tenth",
    "You wait nine days and the money arrives, in the end.",
    {
     "stress": 5
    }
   ],
   [
    "Write a complaint to the labour inspectorate",
    "They answer in a month. The accountant pays that same afternoon, quietly.",
    {
     "know": 2,
     "stress": 3
    }
   ]
  ]
 },
 {
  "id": "day7-notice-landlord",
  "cat": "home",
  "title": "Moving out",
  "text": "You plan to move out. Under the Civil Code a tenant may end the tenancy with three months' written notice, with the consent of those who live with them; most private contracts set their own, shorter, terms. Read yours (checked: article 687, law-firm sources).",
  "ch": [
   [
    "Read the contract, then send a written notice by registered mail",
    "The landlord answers in a week, and you agree on a date.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Just tell him by phone",
    "A month later he says he never heard, and claims another month's rent.",
    {
     "money": -1500,
     "stress": 8
    }
   ],
   [
    "Ask a friend to take over the flat",
    "The landlord agrees to a new contract with your friend.",
    {
     "friends": 1,
     "rep": 1
    }
   ]
  ]
 },
 {
  "id": "day7-landlord-enters",
  "cat": "home",
  "title": "The landlord with a key",
  "text": "You come home and find your landlord in the kitchen. \"I just came to check the pipes\", he says, and he has his own key.",
  "ch": [
   [
    "Say politely that you would like a warning before each visit, and agree on days",
    "He is a little offended, then agrees. The tension eases.",
    {
     "know": 1,
     "stress": -2
    }
   ],
   [
    "Say nothing",
    "He comes again on Sunday morning.",
    {
     "stress": 6
    }
   ],
   [
    "Change the lock without telling him",
    "He is furious, and the contract suffers.",
    {
     "stress": 10,
     "rep": -2
    }
   ]
  ]
 },
 {
  "id": "day7-rent-rise",
  "cat": "home",
  "title": "The rent goes up",
  "text": "Your landlord writes that from next month the rent is 5,000 ₽ higher. The contract says the rent changes only by agreement of both sides.",
  "ch": [
   [
    "Reply that you read the contract and suggest a smaller rise from the new year",
    "He accepts 2,000 ₽ from January. Good for both.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Pay the new sum without a word",
    "It is easy, and expensive.",
    {
     "money": -2500,
     "stress": 2
    }
   ],
   [
    "Start looking for another flat",
    "Three viewings, two scams and one nice room.",
    {
     "energy": -8,
     "know": 1
    }
   ]
  ]
 },
 {
  "id": "day7-sublet",
  "cat": "estate",
  "title": "Renting out your room",
  "text": "A friend of a friend wants to rent your spare room for a month. Subletting without the owner's written consent can break your contract.",
  "ch": [
   [
    "Ask the owner for written consent first",
    "He agrees for a small share of the rent. Everyone knows where they stand.",
    {
     "know": 2,
     "stress": -1
    }
   ],
   [
    "Do it quietly",
    "A neighbour tells the owner. You get a warning.",
    {
     "stress": 8,
     "rep": -2
    }
   ],
   [
    "Decline",
    "Safe, and a bit lonely.",
    {
     "stress": 0
    }
   ]
  ]
 },
 {
  "id": "day7-receipt-warranty",
  "cat": "shop",
  "title": "The kettle that stopped",
  "text": "Your electric kettle stopped working after three months. A warranty card and a receipt help; a defective item can be exchanged, repaired or refunded by the seller within the legal terms.",
  "ch": [
   [
    "Bring the kettle, the card and the receipt, and ask in writing",
    "The shop takes it for inspection and gives you a new one within two weeks.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Throw it away and buy another",
    "You spend money you could have kept.",
    {
     "money": -1200
    }
   ],
   [
    "Open it and try to fix it yourself",
    "You void the warranty and the kettle is still dead.",
    {
     "stress": 4
    }
   ]
  ]
 },
 {
  "id": "day7-bank-fee",
  "cat": "bank",
  "title": "A fee you did not expect",
  "text": "Your bank took a monthly fee for a service you never asked for. The bank app lets you switch it off or dispute it in the chat.",
  "ch": [
   [
    "Write to the bank chat, ask to cancel it and refund the fee",
    "The operator cancels it and returns the last month.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Ignore it",
    "The fee comes every month, quietly.",
    {
     "money": -400,
     "stress": 2
    }
   ],
   [
    "Close the account in anger",
    "A new account takes a week and a visit with your passport.",
    {
     "energy": -6,
     "stress": 6
    }
   ]
  ]
 },
 {
  "id": "day7-queue-jumper",
  "cat": "life",
  "title": "Someone cuts the queue",
  "text": "A man walks to the front of the queue at the ticket office and says \"I just have a quick question\". The woman behind you rolls her eyes.",
  "ch": [
   [
    "Politely say that the queue starts at the end",
    "He apologises and goes to the end. The woman nods at you.",
    {
     "rep": 1,
     "stress": 2
    }
   ],
   [
    "Let it go",
    "He is served first; you wait ten minutes more.",
    {
     "stress": 3
    }
   ],
   [
    "Shout at him",
    "The whole hall looks at you. The cashier calls for security.",
    {
     "stress": 10,
     "rep": -2
    }
   ]
  ]
 },
 {
  "id": "day7-honest-wallet",
  "cat": "life",
  "title": "A wallet on the bench",
  "text": "You find a wallet on a bench in the park, with money and a student card. Handing in found property to the police is the right thing, and often rewarded with a thank-you.",
  "ch": [
   [
    "Take it to the police, or call the owner through the university",
    "The student comes the next day with chocolates and a very red face.",
    {
     "rep": 3,
     "stress": -3,
     "friends": 1
    }
   ],
   [
    "Keep the money and throw away the wallet",
    "It is a theft. You do not sleep well.",
    {
     "stress": 12,
     "rep": -3
    }
   ],
   [
    "Leave it where it is",
    "Somebody else takes it.",
    {
     "stress": 3
    }
   ]
  ]
 }
] as unknown as DailyC[];
