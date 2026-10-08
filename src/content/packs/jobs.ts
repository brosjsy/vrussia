/* Jobs pack: 30 more jobs. Each gets the nine standard workplace incidents plus two signature incidents. */
import { S, O, jobs } from '../../engine';
import type { Effects, Job, State } from '../../engine';
import { workIncidents } from '../generated';

type Sig = [title: string, text: string, labelA: string, msgA: string, fxA: Effects, labelB: string, msgB: string, fxB: Effects];

interface Row { job: Job; sig: [Sig, Sig] }
const row = (id: string, name: string, pay: number, extra: Partial<Job>, line: string, sig: [Sig, Sig]): Row => ({ job: { id, name, pay, energy: 20, stress: 5, line, ...extra }, sig });

const ROWS: Row[] = [
  row('pharmacist', 'Pharmacist', 3400, { min: 45, cit: true, energy: 12 }, 'White coat, shelves of boxes and polite customers who ask about everything.', [
    ['A customer asks for antibiotics without a prescription', 'An older man insists he "always took them without a prescription".', 'Explain the rules politely and suggest a doctor', 'He grumbles, then thanks you. Rules protect people.', { rep: 3, stress: 2 }, 'Sell it to avoid an argument', 'You break the rules and feel uneasy all day.', { money: 300, rep: -3, stress: 6 }],
    ['A mix-up on the shelf', 'You notice two similar medicines are in the wrong boxes.', 'Stop, check every shelf and fix it', 'It takes an hour, but nobody gets the wrong pill.', { energy: -8, rep: 4, know: 2 }, 'Fix it quietly after closing', 'You avoid a scene but worry about an earlier sale.', { stress: 8 }]]),
  row('dentistassist', 'Dental assistant', 3000, { min: 35, energy: 14 }, 'A bright chair, a humming drill and a calm voice: "Open wide."', [
    ['A scared child', 'A seven-year-old refuses to open his mouth.', 'Show him the tools and tell a story', 'He laughs and lets the dentist work. His mum cries with relief.', { rep: 4, stress: -4 }, 'Ask the parent to leave the room', 'It works, but the child sniffles on his way out.', { stress: 3 }],
    ['Emergency at closing time', 'A patient arrives with a broken tooth at 19:55.', 'Stay and help the doctor', 'You leave at nine, tired and respected.', { energy: -12, rep: 4, money: 800 }, 'Send him to another clinic', 'The clinic is annoyed; the patient is not.', { rep: -2 }]]),
  row('kgteacher', 'Kindergarten teacher', 2600, { min: 35, cit: true, stress: 8, energy: 18 }, 'Twenty tiny voices shouting your name at once.', [
    ['A child will not nap', 'Little Misha has opened one eye for an hour.', 'Read a quiet story', 'He falls asleep halfway. You do too, almost.', { stress: -4, rep: 2 }, 'Let him play quietly', 'He builds a tower that falls onto three other children.', { stress: 8 }],
    ['Parents\' meeting', 'Parents complain about the soup and the schedule.', 'Listen and note every concern', 'They leave calmer than they came.', { rep: 3, stress: 4 }, 'Defend the kindergarten firmly', 'The meeting ends in a draw and a lecture.', { stress: 7 }]]),
  row('librarian', 'Librarian', 2300, { min: 30, cit: true, energy: 8, stress: 3 }, 'Old books, quiet reading rooms and a stamp that never leaves your hand.', [
    ['A lost reader', 'A student asks for a book that does not exist under that title.', 'Search the catalogue until you find it', 'You find the real title after twenty minutes. The student is grateful.', { know: 2, rep: 3 }, 'Say you do not have it', 'He leaves disappointed.', { rep: -1 }],
    ['A donation of old books', 'A family brings forty boxes of books and photographs.', 'Sort and catalogue them', 'Among them is a diary from 1943. You hold your breath.', { know: 4, merit: 4, energy: -12 }, 'Redirect them to a museum', 'They thank you and leave, relieved.', { merit: 1 }]]),
  row('museumguide', 'Museum guide', 2700, { min: 35, energy: 14 }, 'You know every painting by heart and every corridor by its smell.', [
    ['A group of school children', 'Thirty children, one tired teacher and a long gallery.', 'Make it a game: find a hidden detail in each painting', 'They shout answers and beg for a second tour.', { rep: 4, merit: 2, stress: -3 }, 'Follow the standard script', 'The children yawn but the teacher nods approvingly.', { stress: 4 }],
    ['A foreign tourist asks a hard question', 'He asks about a painter whose name you have never heard.', 'Admit it and look it up together', 'He is delighted. You learn something new.', { know: 3, rep: 2 }, 'Improvise an answer', 'It is half right, half invented. You feel uneasy.', { rep: -2, stress: 4 }]]),
  row('journalist', 'Local journalist', 3200, { min: 50, cit: true, energy: 14, stress: 8 }, 'A press card, a dictaphone and a deadline in two hours.', [
    ['A neighbourhood story', 'Residents say the playground has been broken for a year.', 'Visit, interview and publish', 'The article is shared widely; the playground is repaired within a month.', { merit: 8, rep: 5, energy: -10 }, 'Wait for an official comment', 'The comment never arrives. The story dies.', { stress: 5 }],
    ['A fact-checking dilemma', 'A source gives you a dramatic quote that you cannot confirm.', 'Check it twice and cut it if needed', 'The editor grumbles; readers trust you.', { rep: 4, know: 2 }, 'Publish it anyway', 'It goes viral, then gets corrected. Your name is on it.', { rep: -5, stress: 10 }]]),
  row('translator', 'Translator', 3800, { min: 55, energy: 12 }, 'Two languages, three dictionaries and one very picky client.', [
    ['A tricky contract', 'A legal text contains a word with three meanings.', 'Ask the client to clarify', 'The client appreciates your care and pays on time.', { rep: 4, know: 3 }, 'Choose the most likely meaning', 'It turns out to be wrong. You fix it for free.', { money: -1500, stress: 6 }],
    ['Interpreting at the MFC', 'A newcomer needs help to fill in a long form.', 'Interpret clearly and slowly', 'He completes the form without a mistake. He shakes your hand twice.', { merit: 6, rep: 4, energy: -8 }, 'Finish quickly and move on', 'He signs without understanding half of it.', { rep: -1 }]]),
  row('accountant', 'Accountant', 3600, { min: 50, cit: true, energy: 10, stress: 8 }, 'Spreadsheets, reports and the quarterly tax deadline.', [
    ['A tax deadline', 'Everything is due tomorrow and two invoices are missing.', 'Work late and find the invoices', 'You find them and file on time. Tea, relief, home at midnight.', { energy: -15, rep: 4, stress: 6 }, 'Ask for an extension', 'The tax office grants it, with a sigh.', { stress: 5 }],
    ['A suspicious payment', 'A client asks you to book an expense that looks fake.', 'Refuse and document it', 'The client sulks; the auditor later thanks you.', { rep: 5, stress: 8 }, 'Book it to keep him happy', 'It feels wrong for weeks.', { rep: -5, stress: 12 }]]),
  row('salesmgr', 'Sales manager', 4500, { min: 40, energy: 14, stress: 9 }, 'A phone, a target and a customer who says "maybe".', [
    ['A big deal', 'A customer will sign if you reduce the price by 10%.', 'Discuss with your boss first', 'The boss agrees to a smaller discount and the deal closes.', { money: 3000, rep: 3 }, 'Agree on the spot', 'The deal closes but your boss is not happy.', { money: 1500, rep: -2, stress: 4 }],
    ['A rude client', 'A client shouts about delivery times.', 'Stay calm and offer a solution', 'He calms down and orders again.', { rep: 4, stress: 3 }, 'Hang up', 'It feels good for ten seconds and bad for ten days.', { rep: -3, stress: 6 }]]),
  row('realtor', 'Real estate agent', 4200, { min: 45, cit: true, energy: 14, stress: 8 }, 'Keys, contracts and viewings in every part of the city.', [
    ['A hesitant buyer', 'A family loves a flat but is afraid of the mortgage.', 'Walk them through the numbers honestly', 'They sign a month later. Their thank-you card hangs on your desk.', { money: 4000, rep: 5 }, 'Push them to decide today', 'They walk away, annoyed.', { rep: -3, stress: 5 }],
    ['A landlord who hides a flaw', 'The flat has a leak that the owner did not mention.', 'Tell the buyer', 'The owner is furious, the buyer grateful.', { rep: 5, stress: 6 }, 'Say nothing and close the deal', 'You get the bonus and a guilty conscience.', { money: 2500, rep: -5, stress: 8 }]]),
  row('bankclerk', 'Bank clerk', 3500, { min: 45, cit: true, energy: 10, stress: 7 }, 'A queue, a stamp and a screen that always asks for one more document.', [
    ['An elderly customer', 'A grandmother wants to send money to a "grandson" who called her this morning.', 'Warn her about phone scams and call her family', 'She cancels the transfer. Her family brings you a cake.', { merit: 8, rep: 6 }, 'Process the transfer as asked', 'You find out later it was a scam.', { rep: -4, stress: 12 }],
    ['A system outage', 'Your system goes offline in the middle of the day.', 'Apologise and handle customers manually', 'Everyone queues patiently thanks to your explanations.', { rep: 3, stress: 5 }, 'Close the window and wait', 'The manager is not impressed.', { rep: -2 }]]),
  row('postman', 'Postman', 2300, { energy: 22, stress: 4 }, 'A bag, a map and a million doorbells.', [
    ['A package for a lonely resident', 'The old man in flat 41 gets one parcel a year.', 'Deliver it with a chat', 'He offers tea; you stay ten minutes. He cries when you leave.', { merit: 3, stress: -4, rep: 3 }, 'Drop it and move on', 'He signs without speaking.', {}],
    ['A snowstorm', 'The snow is knee-deep on your route.', 'Finish the route in spite of the snow', 'You come home soaked and proud.', { energy: -14, rep: 4, health: -2 }, 'Deliver half and finish tomorrow', 'Customers understand; your boss shrugs.', { rep: -1 }]]),
  row('conductor', 'Train conductor (provodnitsa)', 3000, { energy: 20, stress: 6 }, 'A uniform, a samovar and a carriage that rocks all night.', [
    ['A passenger without a ticket', 'A student boards with an expired ticket and no money.', 'Let him ride to the next station and sort it out', 'He thanks you and later sends a postcard.', { rep: 2, merit: 2 }, 'Follow the rules and ask him to leave', 'He steps off in the dark; you watch him go.', { stress: 6 }],
    ['A night with a crying baby', 'A baby cries for three hours in compartment 7.', 'Make tea and sit with the mother', 'The baby falls asleep. The mother thanks you quietly.', { energy: -8, merit: 3, rep: 3 }, 'Ask the passengers to cope', 'The whole carriage glares at you.', { stress: 5 }]]),
  row('electrician', 'Electrician', 3800, { min: 25, energy: 20, stress: 5 }, 'A tool belt, a voltage tester and a very careful approach.', [
    ['A bare wire', 'In an old building, you find a wire that should have been replaced decades ago.', 'Replace it properly (extra hour)', 'The tenants never know how close they were to a fire.', { rep: 5, energy: -8, merit: 3 }, 'Tape it and move on', 'It works until the next winter.', { rep: -4, stress: 6 }],
    ['A client who wants cheap', 'A client wants a socket in a bathroom without safety rules.', 'Refuse and explain', 'He grumbles and then thanks you after you install it right.', { rep: 3, stress: 3 }, 'Do what he wants', 'A week later you worry.', { rep: -3, stress: 8 }]]),
  row('plumber', 'Plumber', 3500, { min: 20, energy: 20, stress: 5 }, 'A wrench, a flashlight and the sound of dripping water.', [
    ['An emergency at 2 a.m.', 'A pipe has burst; the neighbours below are shouting.', 'Go immediately', 'You fix it before dawn. The grateful family pays double.', { energy: -15, money: 3000, rep: 4 }, 'Come in the morning', 'The flat is flooded by then.', { rep: -3 }],
    ['An honest bill', 'The leak is small; you could pad the bill.', 'Charge a fair price', 'The client recommends you to everyone in the building.', { rep: 4, money: 300 }, 'Pad the bill', 'He later finds out and says so loudly.', { money: 1500, rep: -6 }]]),
  row('carpenter', 'Carpenter', 3600, { min: 25, energy: 22, stress: 4 }, 'Sawdust, pencil behind the ear and the smell of fresh pine.', [
    ['A custom order', 'A customer wants a table that fits an impossible corner.', 'Measure twice and make it perfect', 'He says it looks like it grew in the room.', { rep: 5, know: 2, money: 2000 }, 'Make a standard size and adjust it', 'It does not quite fit.', { rep: -2 }],
    ['A hurt thumb', 'The saw slips; a small cut turns into a big bleed.', 'Go to the first aid room', 'A bandage and a day off.', { health: -4, energy: -6 }, 'Wrap it in a rag and keep working', 'It gets infected.', { health: -8, stress: 6 }]]),
  row('mechanic', 'Car mechanic', 3900, { min: 25, energy: 22 }, 'Oil on your hands, a radio on the shelf and a queue of cars outside.', [
    ['A hidden defect', 'Under the car you find a worn brake line that the owner does not know about.', 'Tell the owner, even if it costs him', 'He thanks you; the car is safe.', { rep: 6, merit: 3 }, 'Keep quiet to keep the order small', 'Later, the brakes fail on a hill. He is lucky.', { rep: -6, stress: 12 }],
    ['A winter rush', 'The first frost: every car in the city needs a battery.', 'Work through lunch', 'It is a record day and your shoulders hurt.', { money: 3500, energy: -16 }, 'Take your normal break', 'The queue grows and customers grumble.', { rep: -2 }]]),
  row('tractor', 'Tractor driver', 3000, { energy: 24, stress: 4 }, 'A field to the horizon, a thermos of tea and a radio.', [
    ['A break-down in the field', 'The tractor stops in the middle of a hundred hectares.', 'Try to fix it yourself', 'Two hours with a wrench and a lot of language you do not use at home.', { know: 3, energy: -10 }, 'Call the mechanic', 'He arrives an hour later and laughs.', { stress: 4 }],
    ['Harvest weekend', 'The weather turns; all hands are needed.', 'Work the whole weekend', 'The harvest is saved. The farm gives you a bonus and a bag of potatoes.', { money: 3500, energy: -20, rep: 4 }, 'Take your weekend off', 'The harvest is partly lost. People remember.', { rep: -4 }]]),
  row('miner', 'Miner (Kuzbass)', 5500, { min: 25, energy: 30, stress: 9 }, 'A helmet, a lamp and a descent into the dark every morning.', [
    ['A safety check', 'The shift manager hurries the safety check to hit the target.', 'Insist on the full check', 'The shift is delayed, but everybody is safe.', { rep: 4, stress: 5 }, 'Skip it like everyone else', 'You go down and spend the shift anxious.', { stress: 10, health: -2 }],
    ['A tough double shift', 'A colleague is sick and asks you to cover.', 'Cover him', 'You are exhausted but he owes you one.', { energy: -22, money: 3000, rep: 3 }, 'Say no', 'He finds someone else, a little cold toward you.', { rep: -1 }]]),
  row('oilrig', 'Oil rig worker (rotation)', 6500, { min: 25, energy: 28, stress: 8 }, 'Four weeks on the rig, two weeks off, and a lot of time to think.', [
    ['Homesick on the rig', 'Week three, the phone signal is weak and your family is far.', 'Write a long letter', 'Mail takes ten days; your family keeps it forever.', { stress: -8, famLove: 4 }, 'Play cards with the crew', 'You lose ₽300 and gain a friend.', { money: -300, friends: 1, stress: -6 }],
    ['A safety drill', 'An alarm goes off at 4 a.m. for an unannounced drill.', 'Take it seriously', 'The crew is faster than ever; the manager nods.', { rep: 4, know: 2 }, 'Grumble and go slowly', 'You are scolded in front of the crew.', { rep: -3, stress: 5 }]]),
  row('fisherman', 'Fisherman (Sakhalin)', 5000, { energy: 30, stress: 7 }, 'A trawler in a cold sea and nets full of silver.', [
    ['A storm at sea', 'Waves as tall as a house; the captain shouts commands.', 'Follow orders without hesitation', 'The storm passes. You drink tea with shaking hands.', { rep: 5, stress: 8, energy: -14 }, 'Panic and hide in the cabin', 'The crew remembers.', { rep: -5, stress: 12 }],
    ['A huge catch', 'The nets come up heavier than expected.', 'Help to sort the catch fast', 'You earn a bonus and a bucket of fresh fish.', { money: 3000, energy: -16 }, 'Take a break', 'The catch spoils slightly. The captain notes it.', { rep: -2 }]]),
  row('ranger', 'Forest ranger', 2900, { energy: 20, stress: 3 }, 'Pine needles, a notebook and a very long walk.', [
    ['A lost hiker', 'A tourist has been missing since the morning.', 'Search until you find him', 'You find him cold and sheepish at dusk.', { merit: 8, rep: 5, energy: -20 }, 'Call for the rescue team', 'The rescue team arrives and you guide them.', { merit: 4, rep: 2 }],
    ['An illegal campfire', 'Campers have lit a fire in a dry forest.', 'Put it out and explain the rules kindly', 'They apologise and help you clear the site.', { rep: 3, merit: 3 }, 'Fine them immediately', 'They pay, grumbling.', { money: 800, rep: -1 }]]),
  row('baker', 'Baker', 2800, { energy: 22, stress: 5 }, 'Three in the morning, hot ovens and the smell of fresh bread.', [
    ['A morning rush', 'The shop opens in ten minutes and the rye is not ready.', 'Work fast and ask the cashier to help', 'The queue gets bread; everyone gets a smile.', { energy: -10, rep: 4 }, 'Let the queue wait', 'People mutter and buy elsewhere.', { rep: -3 }],
    ['A new recipe', 'The boss lets you test a new loaf.', 'Experiment with seeds and honey', 'It becomes the bestseller of the week.', { know: 3, rep: 5, money: 1000 }, 'Stick to the classics', 'Classic, safe and boring.', {}]]),
  row('chef', 'Chef', 4800, { min: 35, energy: 24, stress: 9 }, 'A hot line, loud orders and a plate that must be perfect.', [
    ['A fussy critic', 'A food critic is in the dining room tonight.', 'Cook everything with extra care', 'The review is glowing. The owner brings champagne.', { rep: 8, money: 3000, stress: -4 }, 'Treat him like any other guest', 'The review is average.', { stress: 3 }],
    ['A spoiled delivery', 'The fish delivery arrives warm.', 'Reject it and change the menu', 'It costs the day\'s profit but not your name.', { money: -1500, rep: 5 }, 'Use it anyway', 'A customer gets sick. You are sick with worry.', { rep: -8, stress: 14 }]]),
  row('waiter', 'Waiter', 2600, { energy: 20, stress: 7 }, 'A tray, a notepad and a smile that never leaves your face.', [
    ['A table that does not tip', 'A large group leaves without a word.', 'Smile anyway', 'The next table makes up for it.', { stress: 2, money: 800 }, 'Comment under your breath', 'The manager hears. You get a warning.', { rep: -3 }],
    ['A birthday song', 'A table asks you to sing for their grandmother.', 'Sing loudly and badly', 'The whole restaurant joins in. You get a big tip.', { money: 1500, stress: -6, rep: 4 }, 'Politely decline', 'She understands.', {}]]),
  row('hairdresser', 'Hairdresser', 3000, { energy: 14, stress: 5 }, 'Scissors, gossip and a mirror full of stories.', [
    ['A big change', 'A client asks to be "completely different".', 'Suggest a gentle change', 'She loves it and comes back every month.', { rep: 5, money: 1200 }, 'Do exactly what she asks', 'She cries a bit, then loves it. Probably.', { stress: 5 }],
    ['A long chat', 'A client talks about her divorce for two hours.', 'Listen and nod', 'She tips you double.', { money: 1500, stress: 4 }, 'Change the subject', 'She looks offended.', { rep: -2 }]]),
  row('tailor', 'Tailor', 3100, { min: 30, energy: 14, stress: 4 }, 'Needles, chalk and measuring tape wrapped around your neck.', [
    ['A wedding dress', 'The bride arrives three days before the wedding with a torn hem.', 'Work through the night', 'She walks down the aisle perfectly.', { energy: -18, money: 3000, rep: 6 }, 'Refuse the rush', 'She finds someone else.', {}],
    ['Strange measurements', 'A client\'s measurements keep changing by the week.', 'Take new measurements each time', 'The suit fits perfectly.', { rep: 4, know: 2 }, 'Use the first set', 'It is slightly too tight.', { rep: -2 }]]),
  row('photographer', 'Photographer', 3800, { min: 40, energy: 14, stress: 5 }, 'A camera, a bag of lenses and a golden hour that waits for nobody.', [
    ['A wedding shoot', 'It starts to rain right before the ceremony.', 'Shoot in the rain', 'The wet, windswept photos are the best of the day.', { rep: 6, money: 3000 }, 'Wait for the rain to stop', 'The ceremony starts without you.', { rep: -3, stress: 6 }],
    ['A portrait of an elderly couple', 'They have been married for sixty years.', 'Take your time and listen to their story', 'The portrait is shown in a local gallery.', { merit: 6, rep: 4 }, 'Click quickly and leave', 'The photos are fine; the moment is lost.', {}]]),
  row('trainer', 'Fitness trainer', 3700, { min: 30, energy: 18, stress: 4 }, 'A whistle, a stopwatch and a room full of burning calves.', [
    ['A beginner who wants quick results', 'A client wants to lose ten kilos in a month.', 'Explain the realistic plan', 'He sticks with you for a year.', { rep: 5, money: 1500 }, 'Promise results', 'He quits in two weeks and complains.', { rep: -4 }],
    ['A group class', 'Twenty people, one playlist and a lot of sweat.', 'Lead with energy', 'The class applauds you at the end.', { rep: 4, stress: -4, energy: -10 }, 'Run it on autopilot', 'The class is quiet and sour.', { stress: 3 }]]),
  row('truckdriver', 'Long-haul truck driver', 4800, { min: 25, energy: 26, stress: 6 }, 'Three thousand kilometres, one thermos and an endless road.', [
    ['A blizzard on the highway', 'The road is closed; hundreds of trucks queue up.', 'Wait it out in the cab and share tea with other drivers', 'A trucker\'s community: songs, stories and soup.', { friends: 2, stress: -4 }, 'Try to go around', 'You get stuck in a ditch and need a tow.', { money: -3000, stress: 12 }],
    ['A late delivery', 'The warehouse says: "You are two hours late."', 'Explain calmly and show the road report', 'They accept it and thank you for the honest call.', { rep: 3 }, 'Argue', 'The dispatcher cuts your bonus.', { money: -1000, rep: -3 }]]),
];

for (const { job, sig } of ROWS) {
  jobs.push(job);
  workIncidents(job);
  sig.forEach(([title, text, la, ma, fa, lb, mb, fb], k) => S({
    id: `work-${job.id}-sig${k}`, cat: 'work', req: (s: State) => s.job === job.id, w: 1.5, title: `${title} (${job.name})`, text,
    choices: [{ t: la, r: () => O(ma, fa) }, { t: lb, r: () => O(mb, fb) }],
  }));
}
