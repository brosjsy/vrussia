/* Scenes from the 2026 rules for foreigners, written after the online check of 4 November 2026 (see src/foreign-law.ts: each scene's rule id is in its
   id, and the rulebook says how well it was confirmed). Nine short scenes: the income test for patent workers, a wrong entry in the register of
   controlled persons, a teenager who turns 18, digital registration, an employer who does not notify the MVD, the criminal-record certificate for
   citizenship, a SIM card with biometrics, a mobile internet shutdown and the Moscow patent fee. Game summaries, not legal advice. */
import { S, O } from '../../engine';
import type { State } from '../../engine';

const foreigner = ['foreigner'];
const migrant = (s: State): boolean => s.status === 'migrant';

S({ id: 'rule-income-test', cat: 'paper', who: foreigner, w: 1.3, req: (s: State) => migrant(s) && !!s.job && !s.flags.rvp, title: 'The income review',
  text: 'The migration office writes: for your patent to be renewed you must show that your income is above the subsistence minimum for you and each person you support. Bring pay slips, the employment contract and the lease.',
  choices: [
    { t: 'Bring the pay slips, the contract and the lease', r: () => O('The officer checks the figures and stamps the file. Your income is enough this time.', { know: 2, stress: 4, energy: -6 }) },
    { t: 'Take extra shifts for a month to raise the pay slips', r: () => O('Your pay slips look better and you are very tired.', { money: 6000, energy: -16, stress: 8, health: -3 }) },
    { t: 'Do nothing and hope', r: () => O('The patent is not renewed. You have days to fix it or leave.', { stress: 14, strike: 1 }) },
  ] });

S({ id: 'rule-register-error', cat: 'bank', who: foreigner, w: 1.0, req: (s: State) => s.status !== 'citizen' && s.docs.reg > 0 && s.day > 20, title: 'Your card is blocked',
  text: 'The bank app says "operations are limited". A friend says there are lists of foreigners without legal grounds, and legal residents have been put on them by mistake, because new papers had not reached the system.',
  choices: [
    { t: 'Check the MVD website and write to the migration office with copies of your papers', r: () => O('The website shows your name is not listed. The bank was acting on an old flag; after a few days it removes the block.', { know: 2, stress: 6, energy: -6 }) },
    { t: 'Go to the bank with your passport and registration', r: () => O('The manager is helpful, but needs a letter from the MVD. It takes a week.', { stress: 10, energy: -8 }) },
    { t: 'Ignore it and use cash for now', r: () => O('Cash works, but rent by transfer is late and the landlord is angry.', { stress: 8, money: -500 }) },
  ] });

S({ id: 'rule-teen-18', cat: 'family', who: foreigner, w: 1.2, req: (s: State) => migrant(s) && s.kids > 0 && s.day > 30, title: 'A birthday with a deadline',
  text: 'Your oldest child turns 18 next month. A child of a patent worker may stay only while the parent\'s patent is valid; at 18 they need their own patent or must leave soon after.',
  choices: [
    { t: 'Start your child\'s own patent now: exam, medical and insurance', r: () => O('It is expensive and takes weeks, but you finish before the birthday.', { money: -9000, stress: 8, energy: -10, know: 2 }) },
    { t: 'Ask the university about a study place and a student visa instead', r: () => O('There is a place if the exams go well; the international office explains the papers.', { stress: 6, know: 3 }) },
    { t: 'Wait and see', r: () => O('The month goes fast. You will have to hurry.', { stress: 12 }) },
  ] });

S({ id: 'rule-digital-reg', cat: 'paper', who: foreigner, w: 1.4, req: (s: State) => s.status !== 'citizen' && s.docs.reg <= 10, title: 'Registration in the app',
  text: 'Your landlord says that registration is moving to digital form and sends a code. You can confirm the notice through Gosuslugi or on paper at the MFC. Your registration has almost run out.',
  choices: [
    { t: 'Confirm it in the app and save the confirmation', r: () => O('The confirmation arrives in minutes. You save a screenshot and print a copy too.', { docs: { reg: 45 }, know: 2, stress: -2 }) },
    { t: 'Go to the MFC with your passport and the landlord', r: () => O('Two hours in a queue, but you leave with a paper slip.', { docs: { reg: 45 }, energy: -10, stress: 2 }) },
    { t: 'Pay an intermediary for a "quick registration"', r: () => O('The "registration" is fake and the police find it at the next check.', { money: -5000, stress: 14, strike: 1 }) },
  ] });

S({ id: 'rule-employer-notice', cat: 'work', who: foreigner, w: 1.1, req: (s: State) => migrant(s) && !!s.job, title: 'Did the employer notify the MVD?',
  text: 'A colleague says that since September employers must send a new form to the MVD when they hire a foreigner. Nobody sent one for you. A fine for the company is up to 800,000 ₽, and they may drop you rather than pay.',
  choices: [
    { t: 'Politely ask the manager and offer to bring the papers they need', r: () => O('The manager is relieved. HR files the notification the same day.', { know: 2, rep: 1, stress: 4 }) },
    { t: 'Check your contract and ask the migration lawyer in the community chat', r: () => O('The lawyer says it is the employer\'s duty, and tells you what to ask for.', { know: 3, stress: 2 }) },
    { t: 'Say nothing', r: () => O('Three weeks later the company is checked, and your job is gone.', { job: null, stress: 15, strike: 1 }) },
  ] });

S({ id: 'rule-citizen-record', cat: 'paper', who: foreigner, w: 1.2, req: (s: State) => !!s.flags.vnzh && !s.flags.naturalized, title: 'A certificate from home',
  text: 'For citizenship the migration office asks for a criminal-record certificate from every country whose passport you hold, issued within the last three months.',
  choices: [
    { t: 'Order it from your home country through the consulate (₽4,000)', r: () => O('It takes a month, with a stamp and a translation, and you have it.', { money: -4000, know: 2, stress: 4 }) },
    { t: 'Ask a relative at home to collect it for you', r: () => O('A cousin queues for you at home; the paper arrives by courier.', { money: -2500, stress: 4, friends: 0 }) },
    { t: 'Put it off', r: () => O('The old certificate expires, and you start again.', { stress: 6 }) },
  ] });

S({ id: 'rule-sim-biometrics', cat: 'phone', who: foreigner, w: 1.4, req: (s: State) => s.status !== 'citizen' && !s.flags.sim, title: 'A SIM card needs a bank first',
  text: 'The shop will not sell you a SIM card. "Foreigners need a verified Gosuslugi account and biometrics from a bank first: your face and your voice. Bring your passport, its translation and the SNILS number."',
  choices: [
    { t: 'Go to a listed bank for the biometrics, then come back for the SIM', r: () => O('You give a face scan and read a few phrases. The same day you have a Russian number.', { flag: 'sim', know: 2, energy: -8, stress: -2 }) },
    { t: 'Buy a SIM "from a man at the market"', r: () => O('It stops working in two days, and the number was registered to someone else.', { money: -1000, stress: 10 }) },
    { t: 'Use only the airport roaming for now', r: () => O('Expensive and slow, but you get by.', { money: -2500, stress: 4 }) },
  ] });

S({ id: 'rule-internet-outage', cat: 'life', who: foreigner, w: 1.6, title: 'The mobile internet is off',
  text: 'Your phone shows no internet. The metro apps, the taxi app and the bank do not load. A neighbour says there is a shutdown in the region, and only "whitelisted" sites work.',
  choices: [
    { t: 'Use the cash and the paper map you keep for this', r: s => (s.money >= 500 ? O('You walk to the metro, pay cash and are only a little late.', { money: -300, stress: 3 }) : O('You have no cash. You walk, tired and cross.', { energy: -12, stress: 10 })) },
    { t: 'Find a café with a wired connection and wait it out', r: () => O('Tea, a free hour and the shutdown ends in the evening.', { money: -250, stress: -2 }) },
    { t: 'Go home and give up on the day', r: () => O('You lose the morning.', { stress: 5, energy: -2 }) },
  ] });

S({ id: 'rule-patent-moscow-fee', cat: 'paper', who: foreigner, w: 1.2, req: (s: State) => migrant(s) && s.city === 'Moscow' && s.docs.patent <= 15, title: 'The Moscow patent payment',
  text: 'A patent in Moscow costs 10,000 ₽ a month in 2026. The receipt from the bank is the proof of the advance payment; without it a raid ends badly.',
  choices: [
    { t: 'Pay for the month and keep the receipt in your document folder', r: () => O('Paid. +30 days.', { money: -10000, docs: { patent: 30 }, stress: -2 }) },
    { t: 'Pay for three months to be safe', r: s => (s.money >= 30000 ? O('Paid. +90 days.', { money: -30000, docs: { patent: 90 }, stress: -4 }) : O('You do not have 30,000 ₽ for three months. The cashier suggests paying for one month.', { stress: 3 })) },
    { t: 'Skip this month and pay next time', r: () => O('Next month the bill is the same and the gap is a problem.', { stress: 8 }) },
  ] });
