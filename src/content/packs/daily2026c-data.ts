/* A third part of the daily-life scenes as data (English; the Russian is in src/scenes-ru-daily-c.ts): roommates, holidays, the car, regions, work, health,
   exams, family, online life, student life and leisure. Facts from the online check of 4 November 2026 are marked "(checked)" in the text; the rest is told as
   fiction. A scene with a `req` key is shown only to players for whom daily2026.ts says it fits (a shared flat, a city, a status). */
import type { Effects } from '../../engine';

export type PickC = [choice: string, result: string, fx: Effects];
export interface DailyC { id: string; cat: string; foreigner?: boolean; req?: string; title: string; text: string; ch: PickC[] }

export const DAILY_C = [
 {
  "id": "day3-flat-dishes",
  "cat": "home",
  "req": "flat",
  "title": "The pile of dishes",
  "text": "The sink is full again. Everybody says they are \"just about to\" wash up. Your flatmates are in the kitchen waiting to see who moves first.",
  "ch": [
   [
    "Wash it all and propose a rota",
    "The rota goes on the fridge. For three weeks it even works.",
    {
     "energy": -4,
     "rep": 1,
     "stress": -2
    }
   ],
   [
    "Wash only your own plate",
    "A cold silence. Tomorrow the pile is still there.",
    {
     "stress": 3
    }
   ],
   [
    "Leave a polite note",
    "Somebody draws a smiley under it. Somebody washes up.",
    {
     "stress": -1
    }
   ]
  ]
 },
 {
  "id": "day3-flat-bills",
  "cat": "home",
  "req": "flat",
  "title": "Splitting the bills",
  "text": "The electricity and internet bills come to 4,200 ₽. One flatmate suggests splitting equally; another says he is hardly home.",
  "ch": [
   [
    "Split equally, and keep a shared sheet",
    "Everyone sees the numbers. Nobody argues again this month.",
    {
     "money": -1000,
     "know": 1
    }
   ],
   [
    "Agree that the one who is home most pays more",
    "It is fair, but you pay the most.",
    {
     "money": -1700,
     "stress": -2
    }
   ],
   [
    "Skip it and hope someone pays",
    "The internet is switched off on Thursday. Everybody blames everybody.",
    {
     "stress": 6,
     "rep": -1
    }
   ]
  ]
 },
 {
  "id": "day3-flat-guests",
  "cat": "home",
  "req": "flat",
  "title": "A guest for the weekend",
  "text": "A cousin of your flatmate arrives for the weekend with a big bag and sleeps on the sofa. Nobody asked the others first.",
  "ch": [
   [
    "Welcome him and cook a big dinner together",
    "The weekend is loud and warm, and the cousin leaves a cake.",
    {
     "money": -400,
     "friends": 1,
     "stress": -4
    }
   ],
   [
    "Say politely that guests need to be agreed beforehand",
    "A new rule appears on the fridge. It helps in the end.",
    {
     "know": 1,
     "stress": 2
    }
   ],
   [
    "Say nothing and sleep with headphones on",
    "You are tired, and the next guest comes next week.",
    {
     "energy": -4,
     "stress": 4
    }
   ]
  ]
 },
 {
  "id": "day3-flat-quiet",
  "cat": "home",
  "req": "flat",
  "title": "Night owl and early bird",
  "text": "One flatmate gets up at five for his shift; another plays music till one in the morning. It has been going on for two weeks.",
  "ch": [
   [
    "Gather everyone for a calm talk and set quiet hours",
    "Quiet hours: after 23:00. It is not perfect, but it is peace.",
    {
     "know": 1,
     "stress": -3
    }
   ],
   [
    "Move your bed to the kitchen",
    "Tomorrow you ache everywhere.",
    {
     "energy": -6,
     "health": -2
    }
   ],
   [
    "Bang on the wall",
    "It only makes it worse.",
    {
     "stress": 5,
     "rep": -1
    }
   ]
  ]
 },
 {
  "id": "day3-flat-fridge",
  "cat": "food",
  "req": "flat",
  "title": "Whose yogurt?",
  "text": "Your yogurt has vanished from the fridge. A note appeared: \"Sorry, I was hungry. Will replace\". It is the third time.",
  "ch": [
   [
    "Suggest labelled shelves for everyone",
    "Everybody gets a shelf and a marker. Peace returns.",
    {
     "stress": -2
    }
   ],
   [
    "Buy a lock for your box",
    "It works, but the atmosphere cools.",
    {
     "money": -300,
     "stress": 2
    }
   ],
   [
    "Smile and buy two next time",
    "Your flatmate brings you tea the next evening.",
    {
     "money": -150,
     "friends": 1
    }
   ]
  ]
 },
 {
  "id": "day3-flat-registration",
  "cat": "paper",
  "foreigner": true,
  "req": "flat",
  "title": "Registration at a shared address",
  "text": "The flat is rented by one of your flatmates. To register you at the address, the owner must agree and the notice is filed through the host. The owner is away for two weeks.",
  "ch": [
   [
    "Call the owner and ask him to confirm by phone, then file at the MFC with him online",
    "It takes a week of messages, but you are registered in time.",
    {
     "know": 2,
     "energy": -4
    }
   ],
   [
    "Ask the flatmate to sign for you",
    "He cannot: he is not the owner, and the MFC refuses.",
    {
     "stress": 6
    }
   ],
   [
    "Pay a \"registration agent\"",
    "The paper is fake. You learn this at the next check.",
    {
     "money": -3000,
     "stress": 12,
     "strike": 1
    }
   ]
  ]
 },
 {
  "id": "day3-flat-moveout",
  "cat": "home",
  "req": "flat",
  "title": "A flatmate moves out",
  "text": "One of you is moving to another city for a job. The rent share for the rest goes up, and there is a free room for four weeks.",
  "ch": [
   [
    "Throw a goodbye dinner and ask friends about the room",
    "A friend of a friend is interested. You promise to meet him.",
    {
     "money": -700,
     "friends": 1,
     "stress": -2
    }
   ],
   [
    "Post the room on a listing site",
    "Twelve messages in a day, and three are scammers.",
    {
     "stress": 4,
     "know": 1
    }
   ],
   [
    "Do nothing and pay more",
    "The money disappears faster than you thought.",
    {
     "money": -1500,
     "stress": 3
    }
   ]
  ]
 },
 {
  "id": "day3-unity-day",
  "cat": "culture",
  "title": "The Day of National Unity",
  "text": "On 4 November there is a day off in Russia, with concerts, a march in some cities and flowers at the monument to Minin and Pozharsky in Moscow. Many people just enjoy the long weekend.",
  "ch": [
   [
    "Go to the concert in the square",
    "Cold, loud, and you hear a song you know.",
    {
     "stress": -4,
     "energy": -4
    }
   ],
   [
    "Visit friends for a meal",
    "You eat a lot and talk about everything.",
    {
     "money": -300,
     "friends": 1,
     "stress": -5
    }
   ],
   [
    "Use the day to catch up on paperwork",
    "The offices are closed, but the online services work.",
    {
     "know": 1,
     "energy": -3
    }
   ]
  ]
 },
 {
  "id": "day3-feb-23",
  "cat": "social",
  "title": "The twenty-third of February",
  "text": "Defender of the Fatherland Day is a day off, when women give men small gifts, socks, a card or chocolates, whether they served or not.",
  "ch": [
   [
    "Congratulate the men around you with a smile and a card",
    "You receive a bar of chocolate in return and a funny remark.",
    {
     "money": -200,
     "rep": 1,
     "friends": 1
    }
   ],
   [
    "Say \"happy holiday\" at work and leave it at that",
    "It is enough.",
    {
     "rep": 0
    }
   ],
   [
    "Ignore it",
    "A colleague looks at you surprised.",
    {
     "rep": -1
    }
   ]
  ]
 },
 {
  "id": "day3-russia-day",
  "cat": "culture",
  "title": "Russia Day",
  "text": "The twelfth of June is a day off, with concerts, flags and fireworks in the evening. In the park a group plays folk songs and invites everyone to dance a round dance.",
  "ch": [
   [
    "Join the round dance",
    "Your feet do not know the steps, but your neighbours laugh kindly.",
    {
     "stress": -6,
     "friends": 1
    }
   ],
   [
    "Watch the fireworks from a bench",
    "A long boom, a quiet crowd, a bag of seeds.",
    {
     "stress": -4
    }
   ],
   [
    "Stay in",
    "You catch up on sleep.",
    {
     "energy": 6
    }
   ]
  ]
 },
 {
  "id": "day3-osago",
  "cat": "car",
  "title": "Insurance for the car",
  "text": "You need compulsory third-party insurance (OSAGO) before you can drive in Russia, and the traffic police may ask for it at any check. You can buy it online in ten minutes or from an agent.",
  "ch": [
   [
    "Buy it online and save the policy on your phone and on paper",
    "Done. The check next week takes thirty seconds.",
    {
     "money": -1800,
     "know": 1,
     "stress": -2
    }
   ],
   [
    "Drive without it for now",
    "The traffic police stop you the very next day.",
    {
     "money": -800,
     "stress": 8
    }
   ],
   [
    "Ask a friend which agent is honest",
    "He recommends a woman in a small office, and she explains everything.",
    {
     "money": -2000,
     "know": 2
    }
   ]
  ]
 },
 {
  "id": "day3-traffic-stop",
  "cat": "police",
  "title": "A traffic stop",
  "text": "An inspector waves his baton. He asks for your documents. You have your licence, the registration paper of the car and the insurance.",
  "ch": [
   [
    "Show the documents, stay calm, and ask the reason for the stop",
    "It is a routine check. He wishes you a good journey.",
    {
     "stress": 3,
     "know": 1
    }
   ],
   [
    "Argue with him",
    "The check takes forty minutes.",
    {
     "stress": 10,
     "energy": -6
    }
   ],
   [
    "Offer money",
    "A bribe is a crime. He writes a report, and the case is serious.",
    {
     "money": -3000,
     "stress": 20,
     "strike": 1
    }
   ]
  ]
 },
 {
  "id": "day3-winter-tyres",
  "cat": "car",
  "title": "Winter tyres",
  "text": "The first snow is coming. Everyone in the garage queue says \"change your tyres now, or you will wait three weeks\".",
  "ch": [
   [
    "Book a tyre change for this week",
    "You drive on snow with confidence.",
    {
     "money": -2200,
     "stress": -2
    }
   ],
   [
    "Wait for the first snow",
    "The queue is four hours long.",
    {
     "money": -2200,
     "energy": -6,
     "stress": 5
    }
   ],
   [
    "Drive carefully on summer tyres",
    "The car slides through a junction, and your heart stops for a moment.",
    {
     "stress": 10,
     "health": -1
    }
   ]
  ]
 },
 {
  "id": "day3-accident",
  "cat": "car",
  "title": "A small scratch",
  "text": "A car touches yours in a car park. There is a scratch and the driver apologises. He suggests settling it quickly with no police.",
  "ch": [
   [
    "Photograph both cars, the plates and the scene, and exchange details",
    "The insurer settles it by the photos in a week.",
    {
     "know": 2,
     "stress": 2
    }
   ],
   [
    "Take 2,000 ₽ in cash and go",
    "The repair costs three times more.",
    {
     "stress": 6
    }
   ],
   [
    "Call the police and wait two hours",
    "A report is written, and you are late for everything.",
    {
     "energy": -6,
     "stress": 6
    }
   ]
  ]
 },
 {
  "id": "day3-kazan",
  "cat": "culture",
  "req": "kazan",
  "title": "Chak-chak in Kazan",
  "text": "Kazan is a city of two cultures: Tatar and Russian live side by side. A colleague invites you for tea with chak-chak, a sweet made of fried dough and honey.",
  "ch": [
   [
    "Accept and ask him about the traditions",
    "You learn three Tatar words and the right way to hold the cup.",
    {
     "friends": 1,
     "know": 2,
     "stress": -4
    }
   ],
   [
    "Politely decline",
    "He nods: \"next time\".",
    {
     "rep": 0
    }
   ],
   [
    "Bring a box of sweets from your own country",
    "It is a hit, and he asks for the recipe.",
    {
     "money": -400,
     "friends": 1,
     "rep": 1
    }
   ]
  ]
 },
 {
  "id": "day3-yekat",
  "cat": "life",
  "req": "yekat",
  "title": "Winter in Yekaterinburg",
  "text": "Yekaterinburg is on the edge of the Urals, with long, cold winters. The city is industrial but has a lot of student life and a strong music scene.",
  "ch": [
   [
    "Go to a concert in a small club",
    "The room is warm, the band is local, and you hum all the way home.",
    {
     "money": -600,
     "stress": -6,
     "friends": 1
    }
   ],
   [
    "Skate on the frozen pond in the park",
    "You fall twice and laugh a lot.",
    {
     "money": -200,
     "health": 1,
     "stress": -5
    }
   ],
   [
    "Stay in with a thick blanket",
    "Warm, but you envy the stories your friends tell tomorrow.",
    {
     "stress": -2
    }
   ]
  ]
 },
 {
  "id": "day3-novosib",
  "cat": "edu",
  "req": "novosib",
  "title": "Akademgorodok",
  "text": "Novosibirsk has a science town in the pine forest, Akademgorodok, where researchers and students walk to the lake after their lectures.",
  "ch": [
   [
    "Spend a Sunday walking in the forest and visiting a museum",
    "Fresh air, big trees, and a new idea for your studies.",
    {
     "stress": -7,
     "know": 2,
     "energy": -4
    }
   ],
   [
    "Go to a public lecture on a Friday evening",
    "A scientist talks about stars. You understand half, and you love it.",
    {
     "know": 3,
     "stress": -2
    }
   ],
   [
    "Stay in the city centre",
    "Nothing wrong with that.",
    {
     "stress": 0
    }
   ]
  ]
 },
 {
  "id": "day3-vlad",
  "cat": "life",
  "req": "vlad",
  "title": "The sea at the end of the country",
  "text": "Vladivostok is on the Pacific coast, far from Moscow, with ferries, a long bridge and seafood markets. The city feels different from the capital.",
  "ch": [
   [
    "Walk along the sea front and try fresh seafood",
    "Salty wind, loud gulls, and a delicious lunch.",
    {
     "money": -900,
     "stress": -6
    }
   ],
   [
    "Take the ferry to an island",
    "A quiet beach in the evening light.",
    {
     "money": -400,
     "stress": -8,
     "energy": -4
    }
   ],
   [
    "Call home and describe the view",
    "Your family wants to see photos.",
    {
     "famLove": 4
    }
   ]
  ]
 },
 {
  "id": "day3-queue-bank",
  "cat": "bank",
  "title": "Opening a deposit",
  "text": "A bank clerk offers a deposit with a good rate, but only for a year, and asks for your passport and your registration.",
  "ch": [
   [
    "Read the terms and ask what happens if you need the money earlier",
    "The clerk explains the penalty clearly, and you decide calmly.",
    {
     "know": 2,
     "stress": -1
    }
   ],
   [
    "Sign immediately",
    "Three months later you need cash and the rate falls.",
    {
     "money": -800,
     "stress": 4
    }
   ],
   [
    "Say you will think about it",
    "The clerk gives a leaflet. You never read it.",
    {
     "stress": 0
    }
   ]
  ]
 },
 {
  "id": "day3-warm-clothes",
  "cat": "shop",
  "title": "The second-hand market",
  "text": "Warm clothes are expensive, and a friend tells you about a second-hand shop where good coats cost a third of the price.",
  "ch": [
   [
    "Go on Tuesday, when the new boxes arrive",
    "You find a thick wool coat in your size.",
    {
     "money": -1800,
     "clothes": 20,
     "stress": -2
    }
   ],
   [
    "Buy a coat in the mall at full price",
    "It is nice, and the card hurts a little.",
    {
     "money": -3000,
     "clothes": 25
    }
   ],
   [
    "Wait until it is warmer",
    "It does not get warmer.",
    {
     "health": -2,
     "stress": 3
    }
   ]
  ]
 },
 {
  "id": "day3-baby-formula",
  "cat": "family",
  "title": "The children's polyclinic",
  "text": "Your friend's baby has a fever, and she asks where to go. In Russia a district paediatrician sees children for free if they have a policy; an ambulance (103) comes for emergencies.",
  "ch": [
   [
    "Help her call the polyclinic and go together",
    "The doctor is kind and the baby is fine in two days.",
    {
     "energy": -6,
     "friends": 1,
     "stress": -2
    }
   ],
   [
    "Tell her to call the ambulance at once",
    "They come, check the baby and say it is not an emergency, kindly.",
    {
     "stress": 4
    }
   ],
   [
    "Say you do not know",
    "She asks someone else. You feel sorry.",
    {
     "stress": 3
    }
   ]
  ]
 },
 {
  "id": "day3-new-job-probation",
  "cat": "work",
  "title": "The probation period",
  "text": "At your new job there is a probation period of three months. Your manager says that during it you can be let go with three days' notice, but after that it is harder.",
  "ch": [
   [
    "Ask for feedback every two weeks",
    "The manager is surprised and pleased. You know where you stand.",
    {
     "know": 2,
     "rep": 2
    }
   ],
   [
    "Work late every evening to impress him",
    "You are tired, and he does not notice.",
    {
     "energy": -12,
     "stress": 8
    }
   ],
   [
    "Do the job as usual",
    "At the end of three months you stay.",
    {
     "rep": 1
    }
   ]
  ]
 },
 {
  "id": "day3-library",
  "cat": "edu",
  "title": "The library card",
  "text": "The city library usually gives out a card to anybody with a passport. It has books in many languages, a quiet hall with free internet, and Saturday classes for children.",
  "ch": [
   [
    "Get a card and borrow a book in Russian",
    "The librarian recommends a short novel. You read ten pages a day.",
    {
     "know": 3,
     "stress": -3
    }
   ],
   [
    "Use the reading hall as a quiet office",
    "You finish three days of work in one.",
    {
     "energy": 2,
     "know": 1
    }
   ],
   [
    "Skip it",
    "The card will wait.",
    {
     "stress": 0
    }
   ]
  ]
 },
 {
  "id": "day3-recycling-batteries",
  "cat": "home",
  "title": "The battery box",
  "text": "At the supermarket entrance there is a box for old batteries, and another one for plastic bottle caps that a charity collects.",
  "ch": [
   [
    "Bring your batteries and the caps next time",
    "You feel a small pleasure each time you drop one.",
    {
     "rep": 1,
     "stress": -1
    }
   ],
   [
    "Throw them in the bin",
    "Nobody sees, but you know.",
    {
     "stress": 1
    }
   ],
   [
    "Ask the cashier how it works",
    "She explains and gives you a leaflet.",
    {
     "know": 1
    }
   ]
  ]
 },
 {
  "id": "day4-region-ban",
  "cat": "work",
  "foreigner": true,
  "req": "migrant",
  "title": "A job the region closed",
  "text": "Many regions now ban patent workers from some jobs: couriers, taxi drivers, shop sellers, sometimes healthcare or beauty services. By one report 51 of 88 regions had such bans (checked, press reports). Citizens of EAEU countries are usually exempt. You were offered a courier shift.",
  "ch": [
   [
    "Check the regional decree before you start",
    "The ban applies to your patent here. You turn the shift down and look for a warehouse job.",
    {
     "know": 3,
     "stress": 2
    }
   ],
   [
    "Take the shift and hope nobody checks",
    "The platform bans your account, and the company says it did not know.",
    {
     "money": -1500,
     "stress": 12,
     "strike": 1
    }
   ],
   [
    "Ask a lawyer in the community chat",
    "The lawyer tells you which regions and which jobs, with the dates the decrees expire.",
    {
     "know": 2
    }
   ]
  ]
 },
 {
  "id": "day4-contract-term",
  "cat": "work",
  "foreigner": true,
  "req": "migrant",
  "title": "A contract with a term",
  "text": "Since 1 September 2026 the employer's notice to the MVD states the contract term (checked: MVD order 290). Your new employer offers an open-ended contract \"so we don't need to file again\".",
  "ch": [
   [
    "Read it and ask that the term matches your patent",
    "HR agrees and writes the right dates. You feel calm.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Sign, it is simpler",
    "A month later the notice has the wrong dates and must be filed again.",
    {
     "stress": 6,
     "energy": -4
    }
   ],
   [
    "Ask a colleague what he has",
    "He shows you his contract. It is a useful template.",
    {
     "know": 1
    }
   ]
  ]
 },
 {
  "id": "day4-medical-30",
  "cat": "health",
  "foreigner": true,
  "title": "The medical exam within thirty days",
  "text": "Under the law of 10 June 2026 (162-FZ, in force from 1 September) a foreigner staying more than 90 days must pass a medical examination within 30 days of entry, and repeat it every year; a fine of 25,000–50,000 ₽ is reported for avoiding it (checked, press reports; details differ between sources).",
  "ch": [
   [
    "Book the exam at an approved centre now",
    "You go on a quiet weekday. It takes three hours, and the papers arrive in a week.",
    {
     "money": -4500,
     "energy": -8,
     "know": 2
    }
   ],
   [
    "Wait until the last day",
    "The centre is full and the deadline passes by two days.",
    {
     "stress": 10,
     "money": -2500
    }
   ],
   [
    "Ask whether a clinic in your city is on the approved list",
    "There is one, and it is closer than the big centre.",
    {
     "know": 1,
     "energy": -2
    }
   ]
  ]
 },
 {
  "id": "day4-hepatitis",
  "cat": "health",
  "foreigner": true,
  "title": "New tests",
  "text": "Reports say migrants are now also tested for hepatitis B, C and D at the examination (checked: one outlet, not confirmed in the law text). The nurse hands you a list of blood tests and says they are routine.",
  "ch": [
   [
    "Ask what each test is for and where the results go",
    "She explains patiently. You feel respected.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Refuse the blood tests",
    "The doctor writes it down. Without the tests the certificate is not issued.",
    {
     "stress": 8
    }
   ],
   [
    "Take the tests and keep every receipt",
    "A folder with receipts helps later when a form asks for them.",
    {
     "know": 1,
     "stress": -1
    }
   ]
  ]
 },
 {
  "id": "day4-exam-electronic",
  "cat": "paper",
  "foreigner": true,
  "title": "The exam on a computer",
  "text": "The complex exam in Russian, history and basics of law, needed for a patent, work permit, temporary residence or residence permit, moved to an electronic format from 1 January 2026 (checked: one source). You sit at a screen with headphones and a timer.",
  "ch": [
   [
    "Take the practice test the night before",
    "The format is familiar. You finish with ten minutes to spare.",
    {
     "know": 3,
     "stress": -3,
     "energy": -4
    }
   ],
   [
    "Arrive with only your passport and no preparation",
    "The history questions surprise you. Your score is borderline.",
    {
     "know": 1,
     "stress": 8
    }
   ],
   [
    "Ask the staff how the results are sent",
    "They say by e-mail and in the official portal within days.",
    {
     "know": 1
    }
   ]
  ]
 },
 {
  "id": "day4-hours",
  "cat": "work",
  "title": "Overtime",
  "text": "Your manager asks you to stay three hours extra \"just today\". Under the Labour Code overtime must be agreed in writing and paid at a higher rate for the first two hours and double after.",
  "ch": [
   [
    "Agree and ask for the extra hours to be written down",
    "The manager sighs and fills in the form. You get the pay.",
    {
     "energy": -8,
     "know": 1
    }
   ],
   [
    "Agree and say nothing",
    "You work three hours for nothing and learn from it.",
    {
     "energy": -8,
     "stress": 4
    }
   ],
   [
    "Politely decline because you have a family dinner",
    "He understands, and asks somebody else.",
    {
     "stress": -2,
     "rep": 0
    }
   ]
  ]
 },
 {
  "id": "day4-payslip",
  "cat": "work",
  "title": "The pay slip",
  "text": "Your pay is lower than you counted. The accountant says the difference is income tax, 13% for residents and 30% for non-residents; a patent worker pays a fixed advance payment instead.",
  "ch": [
   [
    "Ask her to explain each line of the pay slip",
    "She draws a little table. Now you know where it goes.",
    {
     "know": 3,
     "stress": -2
    }
   ],
   [
    "Say nothing and complain to a friend",
    "He nods and tells you his own story.",
    {
     "stress": 1
    }
   ],
   [
    "Check whether you count as a tax resident",
    "After 183 days in a year you pay the lower rate. You note the day.",
    {
     "know": 2
    }
   ]
  ]
 },
 {
  "id": "day4-ru-course",
  "cat": "edu",
  "foreigner": true,
  "title": "A Russian course in the evening",
  "text": "A cultural centre offers an evening course in Russian for newcomers, twice a week, with a teacher who speaks some of your language.",
  "ch": [
   [
    "Sign up and do the homework",
    "After two months you can argue with a shopkeeper in Russian.",
    {
     "money": -1800,
     "know": 4,
     "energy": -4
    }
   ],
   [
    "Try one lesson and see",
    "The teacher is funny. You come again.",
    {
     "money": -300,
     "know": 1
    }
   ],
   [
    "Learn from videos instead",
    "Free, but alone, and you give up after a week.",
    {
     "know": 1,
     "stress": 2
    }
   ]
  ]
 },
 {
  "id": "day4-trki",
  "cat": "edu",
  "foreigner": true,
  "title": "A certificate of Russian",
  "text": "A university offers an official test of Russian as a foreign language, the TRKI, at levels from A1 to C2. A level B1 certificate is useful for study, work and the road to residence.",
  "ch": [
   [
    "Register for the B1 test and study with past papers",
    "You pass with a good mark and a certificate on thick paper.",
    {
     "money": -4500,
     "know": 4,
     "energy": -6
    }
   ],
   [
    "Take A2 first to learn how the test works",
    "A cheaper first try, and you understand the format.",
    {
     "money": -3000,
     "know": 2
    }
   ],
   [
    "Postpone it",
    "The next date is in three months.",
    {
     "stress": 2
    }
   ]
  ]
 },
 {
  "id": "day4-embassy",
  "cat": "paper",
  "foreigner": true,
  "title": "The embassy",
  "text": "Your passport expires in five months. The embassy of your country in Moscow accepts renewals by appointment only, and the queue is a month long.",
  "ch": [
   [
    "Book an appointment today and gather the photos and copies",
    "You are ready for the day, and the new passport comes in six weeks.",
    {
     "money": -3500,
     "know": 1,
     "stress": -2
    }
   ],
   [
    "Wait until it is closer to the date",
    "The next free slot is after your passport expires.",
    {
     "stress": 10
    }
   ],
   [
    "Ask the community chat about faster ways",
    "Somebody explains the consular fast track and its price.",
    {
     "know": 2
    }
   ]
  ]
 },
 {
  "id": "day4-hostel",
  "cat": "home",
  "foreigner": true,
  "title": "The hostel",
  "text": "A bed in a hostel costs 500 ₽ a night and the owner offers to \"arrange\" your registration there. Real registration needs a host who files the notice and a real address.",
  "ch": [
   [
    "Ask to see the hostel's licence and how the notice is filed",
    "The owner shows you the system. It is legal, and the receipt is real.",
    {
     "know": 2,
     "money": -500
    }
   ],
   [
    "Pay extra for a \"stamp\" on the paper",
    "The stamp means nothing, and the police tell you so.",
    {
     "money": -3000,
     "strike": 1,
     "stress": 10
    }
   ],
   [
    "Look for a room with a normal contract",
    "It takes a week, but you have a proper address.",
    {
     "energy": -6,
     "know": 1
    }
   ]
  ]
 },
 {
  "id": "day4-cleaning-job",
  "cat": "work",
  "title": "A cleaning shift at night",
  "text": "A cleaning agency offers a night shift in an office, paid in cash, no contract. The pay is higher by a third than the formal offer at the next office.",
  "ch": [
   [
    "Take the formal job with the contract",
    "Less money, but your papers are clean and your pay is protected.",
    {
     "rep": 1,
     "stress": -2,
     "energy": -8
    }
   ],
   [
    "Take the cash job",
    "Quick money, until the owner disappears with your last two weeks.",
    {
     "stress": 10
    }
   ],
   [
    "Ask for a trial shift at the formal office first",
    "They agree, and you meet a kind supervisor.",
    {
     "energy": -6,
     "friends": 1
    }
   ]
  ]
 },
 {
  "id": "day4-sakharovo-queue",
  "cat": "paper",
  "foreigner": true,
  "title": "The big centre",
  "text": "The migration centre handles medical exams, fingerprints and exams in one place, so the halls are crowded from early morning and the queue is long.",
  "ch": [
   [
    "Come at opening with water, a snack and every copy in order",
    "You are through by lunchtime and the staff are less tired.",
    {
     "energy": -10,
     "know": 1
    }
   ],
   [
    "Come at noon",
    "The queue is endless, and you leave without a stamp.",
    {
     "energy": -8,
     "stress": 8
    }
   ],
   [
    "Ask an agent to stand in the line for 1,500 ₽",
    "Some of those agents are honest. Yours is, this time.",
    {
     "money": -1500,
     "energy": -2
    }
   ]
  ]
 },
 {
  "id": "day4-oath",
  "cat": "paper",
  "foreigner": true,
  "req": "vnzh",
  "title": "The oath",
  "text": "A citizenship decree was signed. At the ceremony you will swear an oath to the Constitution and receive your passport. Your colleagues ask whether you want a small party.",
  "ch": [
   [
    "Invite them for tea and a cake at the office",
    "They give you a card with twenty signatures.",
    {
     "money": -800,
     "friends": 2,
     "rep": 3,
     "stress": -8
    }
   ],
   [
    "Keep it quiet and celebrate with the family",
    "A small dinner and a long phone call home.",
    {
     "money": -500,
     "famLove": 6,
     "stress": -8
    }
   ],
   [
    "Skip celebrating, there is more paperwork to do",
    "You work all evening on forms, and sleep well.",
    {
     "know": 1,
     "energy": -4
    }
   ]
  ]
 },
 {
  "id": "day5-marriage-zags",
  "cat": "love",
  "foreigner": true,
  "title": "The registry office",
  "text": "To marry a Russian citizen you file an application at ZAGS with both passports, a certified Russian translation of yours and the fee receipt. ZAGS refuses to marry a foreigner who is on the register of controlled persons (checked: law-firm sources).",
  "ch": [
   [
    "Gather the papers, check your status on the MVD website, then file together",
    "The clerk finds everything in order and gives you a date.",
    {
     "money": -2500,
     "know": 2,
     "stress": -4
    }
   ],
   [
    "Come with the original passport only",
    "No translation, no application. You come back next week.",
    {
     "energy": -4,
     "stress": 4
    }
   ],
   [
    "Ask your partner's mother what the family expects",
    "She hands you a long list and a cake slice.",
    {
     "know": 1,
     "rep": 1
    }
   ]
  ]
 },
 {
  "id": "day5-rvp-marriage",
  "cat": "paper",
  "foreigner": true,
  "req": "married",
  "title": "Temporary residence by marriage",
  "text": "A foreigner married to a Russian citizen may apply for temporary residence outside the quota (115-FZ art. 6; checked: several sources). The application needs an appointment, not just Gosuslugi, and the documents are checked carefully.",
  "ch": [
   [
    "Book the appointment, bring the marriage certificate, translations and proof of address",
    "The officer is thorough and polite. You leave with a receipt.",
    {
     "money": -15000,
     "know": 2,
     "stress": -3
    }
   ],
   [
    "Wait until the registration runs out",
    "You apply with days to spare and a pounding heart.",
    {
     "money": -15000,
     "stress": 10
    }
   ],
   [
    "Ask a lawyer first",
    "He charges for an hour and finds one missing paper.",
    {
     "money": -2000,
     "know": 3
    }
   ]
  ]
 },
 {
  "id": "day5-school-papers",
  "cat": "edu",
  "foreigner": true,
  "req": "kids",
  "title": "Papers for the school",
  "text": "For school the family needs the child's documents with translation, proof that the family lives in Russia legally and the Russian test (checked: reports since April 2025). The school secretary explains the list slowly.",
  "ch": [
   [
    "Make a checklist and bring the originals and copies together",
    "The secretary accepts the folder with a smile and books the test date.",
    {
     "know": 2,
     "energy": -4
    }
   ],
   [
    "Send the papers by email and wait",
    "No reply for ten days.",
    {
     "stress": 6
    }
   ],
   [
    "Ask a parent in the same position",
    "She shares what worked and what went wrong for her.",
    {
     "know": 2,
     "friends": 1
    }
   ]
  ]
 },
 {
  "id": "day5-vpn",
  "cat": "phone",
  "title": "The VPN question",
  "text": "A friend tells you that using a VPN is not itself an offence, but advertising one is fined, and since September 2025 knowingly searching for \"extremist\" materials is fined too, 3,000–5,000 ₽ (checked: several outlets; some amounts differ).",
  "ch": [
   [
    "Keep your searches ordinary and do not share VPN ads",
    "Nothing happens, and your phone works.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Search for banned things \"out of curiosity\"",
    "You do not get a fine today, but you worry for weeks.",
    {
     "stress": 8
    }
   ],
   [
    "Post a VPN recommendation in a chat",
    "A moderator deletes it fast and warns you about advertising.",
    {
     "stress": 5,
     "rep": -1
    }
   ]
  ]
 },
 {
  "id": "day5-sim-count",
  "cat": "phone",
  "foreigner": true,
  "title": "Too many numbers",
  "text": "You tried to buy a second SIM card and the shop says you already have several numbers registered in your name, and the number allowed per foreigner is limited (checked: reports of a limit of 10).",
  "ch": [
   [
    "Check your numbers in the Gosuslugi app and cancel the ones you do not use",
    "You find an old number and release it. The shop can sell you the new one.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Buy a SIM in your flatmate's name",
    "He is responsible for what you do with it. He is not pleased.",
    {
     "stress": 6,
     "rep": -1
    }
   ],
   [
    "Use the roaming SIM instead",
    "Expensive, but it works.",
    {
     "money": -1500
    }
   ]
  ]
 },
 {
  "id": "day5-bank-card-block",
  "cat": "bank",
  "title": "A transfer under review",
  "text": "Your bank holds a transfer for review: it was large for your account and went to a new recipient. The app asks you to explain the purpose in a short form.",
  "ch": [
   [
    "Fill in the purpose honestly and attach the invoice",
    "The bank releases the money the next morning.",
    {
     "know": 1,
     "stress": -2
    }
   ],
   [
    "Say it is a gift to a friend, though it is a payment",
    "The bank asks for a contract, and you have none.",
    {
     "stress": 8
    }
   ],
   [
    "Call the hotline and ask what is needed",
    "A kind operator tells you exactly what to attach.",
    {
     "know": 2,
     "energy": -2
    }
   ]
  ]
 },
 {
  "id": "day5-lost-passport",
  "cat": "paper",
  "foreigner": true,
  "title": "A lost passport",
  "text": "Your passport was left in a taxi. Without it you cannot prove your status, and the migration card and registration slip were in the same bag.",
  "ch": [
   [
    "Call the taxi service and report it to the police at once, then go to the embassy",
    "The driver finds the bag. The embassy gives a certificate anyway, to be safe.",
    {
     "stress": 8,
     "energy": -8,
     "money": -500
    }
   ],
   [
    "Wait a few days to see if it turns up",
    "It does not. Now every deadline is closer.",
    {
     "stress": 14
    }
   ],
   [
    "Ask your landlord to confirm your address in writing",
    "A useful paper for the embassy and the police.",
    {
     "know": 1,
     "stress": -1
    }
   ]
  ]
 },
 {
  "id": "day5-neighbour-help",
  "cat": "social",
  "title": "Help for an old neighbour",
  "text": "An old woman in your building cannot carry her shopping up four floors. She thanks you and asks if you could look in on her on Sundays.",
  "ch": [
   [
    "Agree and bring her bread every Sunday",
    "She pays you in jam and stories about the building.",
    {
     "energy": -2,
     "rep": 3,
     "friends": 1,
     "stress": -4
    }
   ],
   [
    "Carry the bags this once and leave",
    "Kind and quick.",
    {
     "rep": 1
    }
   ],
   [
    "Say you are too busy",
    "She nods. Next time she asks someone else.",
    {
     "rep": -1
    }
   ]
  ]
 },
 {
  "id": "day5-dacha-season",
  "cat": "culture",
  "title": "Dacha season",
  "text": "In May half the city leaves for the dacha. A colleague invites you for a weekend of planting potatoes. \"Many hands make light work.\"",
  "ch": [
   [
    "Go in old clothes and plant",
    "Your back hurts and your cheeks are red. You eat a huge dinner.",
    {
     "energy": -12,
     "friends": 1,
     "stress": -6
    }
   ],
   [
    "Go for the barbecue only",
    "Everybody sees what you did, kindly.",
    {
     "rep": 0
    }
   ],
   [
    "Decline politely",
    "He sends photos of the potatoes in August.",
    {
     "stress": 0
    }
   ]
  ]
 },
 {
  "id": "day5-meter-reading",
  "cat": "home",
  "title": "The inspector at the door",
  "text": "A man at the door says he is from the gas service and must check your meters now. Real inspectors announce visits in advance, and scammers sometimes use the same story.",
  "ch": [
   [
    "Do not open, call the service number on your bill",
    "The service says nobody was sent. The man leaves.",
    {
     "know": 2,
     "stress": -2
    }
   ],
   [
    "Let him in",
    "He \"finds a fault\" and wants 3,000 ₽ in cash.",
    {
     "money": -3000,
     "stress": 14
    }
   ],
   [
    "Ask for his ID through the door",
    "He does not have one, and walks away fast.",
    {
     "know": 1,
     "stress": 2
    }
   ]
  ]
 },
 {
  "id": "day5-wifi-cafe",
  "cat": "life",
  "title": "Free wifi in a café",
  "text": "A café asks you to log in to its wifi with your phone number and a code. In Russia many public networks require identification of the user.",
  "ch": [
   [
    "Log in with the code and use it for light things only",
    "You read the news and check the map. No banking here.",
    {
     "know": 1
    }
   ],
   [
    "Do your online banking on it",
    "Nothing happens, but it was not wise.",
    {
     "stress": 3
    }
   ],
   [
    "Use your own mobile internet",
    "It is slow in this part of town, but private.",
    {
     "energy": -1
    }
   ]
  ]
 },
 {
  "id": "day5-interpreter",
  "cat": "police",
  "foreigner": true,
  "title": "An interpreter at the station",
  "text": "You have to give a statement as a witness. The officer speaks fast. You may ask for an interpreter and a copy of the record; signing what you do not understand is not required.",
  "ch": [
   [
    "Ask politely for an interpreter and wait",
    "It takes an hour. You understand every word you sign.",
    {
     "energy": -6,
     "know": 2
    }
   ],
   [
    "Sign to leave quickly",
    "The record has a detail that is not true, and it takes weeks to correct.",
    {
     "stress": 10
    }
   ],
   [
    "Bring a friend who speaks Russian well",
    "He helps, but the officer wants an official interpreter anyway.",
    {
     "energy": -4,
     "know": 1
    }
   ]
  ]
 },
 {
  "id": "day6-dorm-rules",
  "cat": "edu",
  "req": "student",
  "title": "The dormitory rules",
  "text": "The dormitory has a pass system, quiet hours from 23:00, a kitchen on every floor and a night guard who knows everybody's name. Guests must leave by 23:00.",
  "ch": [
   [
    "Say hello to the guard and ask what the rules are for guests",
    "He writes a list for you and tells you who is on duty on which night.",
    {
     "know": 2,
     "rep": 1
    }
   ],
   [
    "Sneak a friend in after eleven",
    "The guard sees everything. You get a talk and a note for the dean.",
    {
     "stress": 8,
     "rep": -2
    }
   ],
   [
    "Meet friends in the café across the street",
    "It costs a little, and nobody complains.",
    {
     "money": -300,
     "friends": 1
    }
   ]
  ]
 },
 {
  "id": "day6-session-night",
  "cat": "edu",
  "req": "student",
  "title": "The night before the exam",
  "text": "It is the exam session. Your whole floor is awake with cards, tea and lecture notes. Somebody laughs, somebody cries. Tomorrow's exam is oral.",
  "ch": [
   [
    "Study in a group and quiz each other",
    "You learn more from explaining than from reading.",
    {
     "know": 3,
     "energy": -8,
     "friends": 1
    }
   ],
   [
    "Study alone until three in the morning",
    "You know the notes, but the exam finds you sleepy.",
    {
     "know": 2,
     "energy": -14,
     "stress": 6
    }
   ],
   [
    "Sleep and trust what you know",
    "You are fresh, and you have to improvise.",
    {
     "know": 1,
     "energy": 6,
     "stress": 4
    }
   ]
  ]
 },
 {
  "id": "day6-scholarship",
  "cat": "edu",
  "req": "student",
  "title": "The scholarship office",
  "text": "A notice on the board says that the scholarship committee meets on Thursday. Good grades, activity in the faculty and social work count.",
  "ch": [
   [
    "Bring a short list of your activities with proof",
    "The committee reads it carefully, and one member asks about your essay.",
    {
     "know": 1,
     "rep": 2,
     "stress": 3
    }
   ],
   [
    "Ask a friend who won last year what to do",
    "He gives you a template and a warning about deadlines.",
    {
     "know": 2
    }
   ],
   [
    "Skip it, the odds are small",
    "You never find out.",
    {
     "stress": 1
    }
   ]
  ]
 },
 {
  "id": "day6-hockey",
  "cat": "culture",
  "title": "A hockey night",
  "text": "A colleague has a spare ticket for a hockey match. Ice, a loud crowd, chants, and a long cold walk to the arena.",
  "ch": [
   [
    "Go and learn the chants",
    "You lose your voice and win a friend.",
    {
     "money": -400,
     "friends": 1,
     "stress": -8,
     "energy": -6
    }
   ],
   [
    "Go and watch quietly",
    "A good game, and you leave before the crowd.",
    {
     "money": -400,
     "stress": -4
    }
   ],
   [
    "Decline and watch it on TV",
    "The commentators speak so fast you understand little.",
    {
     "stress": -1
    }
   ]
  ]
 },
 {
  "id": "day6-football-yard",
  "cat": "social",
  "title": "A game in the yard",
  "text": "On a summer evening lads play football in the courtyard. One of them waves: \"Join us, we are one short\".",
  "ch": [
   [
    "Join and play your best",
    "You score one goal and fall twice. They invite you again.",
    {
     "energy": -8,
     "friends": 2,
     "stress": -6
    }
   ],
   [
    "Stand in goal",
    "Not much running, a lot of shouting.",
    {
     "energy": -3,
     "friends": 1
    }
   ],
   [
    "Watch from the bench",
    "Pleasant, but nobody speaks to you.",
    {
     "stress": -1
    }
   ]
  ]
 },
 {
  "id": "day6-ski-day",
  "cat": "culture",
  "title": "Skiing in the park",
  "text": "After a heavy snow the city park lays out a ski track. You can rent skis for a few hundred roubles, and everyone from toddlers to grandfathers glides by.",
  "ch": [
   [
    "Rent skis and try one lap",
    "Your legs shake, your cheeks burn, and you laugh at yourself.",
    {
     "money": -400,
     "health": 2,
     "stress": -7,
     "energy": -8
    }
   ],
   [
    "Walk beside the track with tea",
    "A thermos of tea and a good view.",
    {
     "money": -100,
     "stress": -4
    }
   ],
   [
    "Stay home with a blanket",
    "Warm, if a little dull.",
    {
     "stress": 0
    }
   ]
  ]
 },
 {
  "id": "day6-cinema",
  "cat": "culture",
  "title": "A film night",
  "text": "A cinema nearby shows a Russian film with English subtitles on Sundays, followed by a short talk with a student film club.",
  "ch": [
   [
    "Go and stay for the talk",
    "You hear three opinions you never imagined and make a new friend.",
    {
     "money": -450,
     "know": 2,
     "friends": 1
    }
   ],
   [
    "Watch and leave",
    "A fine film. You walk home thinking.",
    {
     "money": -450,
     "stress": -4
    }
   ],
   [
    "Watch at home with Russian subtitles",
    "Slow, but you learn new words.",
    {
     "know": 2
    }
   ]
  ]
 },
 {
  "id": "day6-sauna-colleagues",
  "cat": "work",
  "title": "A team evening",
  "text": "The company organises an evening for the team in a restaurant. A toast is raised for every colleague, and the director makes a long speech.",
  "ch": [
   [
    "Join in, make a short toast, and leave at a reasonable time",
    "People like it. The director shakes your hand.",
    {
     "rep": 3,
     "friends": 1,
     "stress": -3
    }
   ],
   [
    "Stay quiet in the corner",
    "Nobody minds, nobody remembers.",
    {
     "rep": 0
    }
   ],
   [
    "Stay until the end and sing",
    "Everybody sings. You are on the group photo.",
    {
     "energy": -8,
     "rep": 2,
     "friends": 2
    }
   ]
  ]
 },
 {
  "id": "day6-street-musician",
  "cat": "social",
  "title": "The street musician",
  "text": "In the underpass a man plays an accordion and sings a song your grandmother used to sing. People drop coins in his hat as they hurry by.",
  "ch": [
   [
    "Stop and listen to the whole song",
    "He nods to you at the end. Your day is lighter.",
    {
     "stress": -6,
     "money": -100
    }
   ],
   [
    "Drop a coin and walk on",
    "A small kindness.",
    {
     "money": -50,
     "rep": 0
    }
   ],
   [
    "Record him on your phone",
    "He asks you not to. You delete it.",
    {
     "stress": 2
    }
   ]
  ]
 },
 {
  "id": "day6-bread",
  "cat": "food",
  "title": "Bread and the shop on the corner",
  "text": "The shop on the corner sells warm bread at seven in the morning. A line forms, and the saleswoman remembers everyone's favourite loaf.",
  "ch": [
   [
    "Become a regular and say hello each morning",
    "After a week she saves your loaf. A small warmth in the cold.",
    {
     "money": -80,
     "rep": 1,
     "stress": -2
    }
   ],
   [
    "Buy bread from the supermarket instead",
    "Quicker, colder.",
    {
     "money": -70
    }
   ],
   [
    "Try a loaf you have never had",
    "Dark, sour and dense. You like it.",
    {
     "money": -90,
     "know": 1
    }
   ]
  ]
 },
 {
  "id": "day6-cold-call-bank",
  "cat": "phone",
  "title": "A call about a \"parcel\"",
  "text": "A call: \"Your parcel is held at customs, pay a fee of 4,000 ₽ with this link\". You are not waiting for any parcel.",
  "ch": [
   [
    "Hang up and block the number",
    "Easy. You report it to your bank for good measure.",
    {
     "know": 1,
     "stress": -1
    }
   ],
   [
    "Pay the fee to be safe",
    "No parcel, no refund.",
    {
     "money": -3000,
     "stress": 12
    }
   ],
   [
    "Check your orders in the shop app",
    "Nothing there. It was a scam.",
    {
     "know": 1
    }
   ]
  ]
 },
 {
  "id": "day6-power-cut",
  "cat": "home",
  "title": "A power cut",
  "text": "The lights go out in the evening in the whole street. A neighbour comes with a candle and says it happens in winter when the lines freeze.",
  "ch": [
   [
    "Share tea and talk by candlelight",
    "Two hours later the lights come back, and you are friends.",
    {
     "friends": 1,
     "stress": -4
    }
   ],
   [
    "Call the emergency line",
    "They already know and say two hours.",
    {
     "stress": 3
    }
   ],
   [
    "Go to bed early",
    "You wake up well rested.",
    {
     "energy": 8
    }
   ]
  ]
 },
 {
  "id": "day6-kids-playground",
  "cat": "family",
  "title": "The playground",
  "text": "On the playground parents trade advice about doctors, schools and cheap clothes. A woman asks where you are from and offers a winter coat her son has outgrown.",
  "ch": [
   [
    "Accept with thanks and offer to bring a dish next time",
    "The coat fits, and you bring dumplings on Saturday.",
    {
     "friends": 1,
     "rep": 2,
     "clothes": 10
    }
   ],
   [
    "Decline politely",
    "She smiles, \"if you change your mind\".",
    {
     "rep": 0
    }
   ],
   [
    "Ask about the best polyclinic nearby",
    "She gives you the name of a paediatrician she trusts.",
    {
     "know": 2
    }
   ]
  ]
 },
 {
  "id": "day6-museum-free",
  "cat": "culture",
  "title": "Free museum day",
  "text": "On certain days museums are free for students or for everyone. A poster announces a night of museums with queues around the block.",
  "ch": [
   [
    "Go to two museums with a friend",
    "You walk home at midnight with new ideas.",
    {
     "know": 3,
     "stress": -5,
     "energy": -8,
     "friends": 1
    }
   ],
   [
    "Go early in the morning to avoid the crowd",
    "A quiet hall just for you.",
    {
     "know": 2,
     "stress": -4
    }
   ],
   [
    "Skip the queue and read about it online",
    "Not the same, but you learn a little.",
    {
     "know": 1
    }
   ]
  ]
 }
] as unknown as DailyC[];
