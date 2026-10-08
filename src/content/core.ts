import { RU, FEE } from '../engine';
import type { State } from '../engine';
/* Hand-written scenarios: intros, calendar, document chain, set pieces */
  const { O, gamble, rnd } = RU.util;
  const C = (t, msg, fx) => ({ t, msg, fx });
  const F = (t, r) => ({ t, r });
  const S = RU.S;

  /* ---------- Intros (queued at start) ---------- */
  S({ id: 'intro_citizen', cat: 'intro', free: true, title: 'Welcome to Russia', text: '{name}, a Russian citizen. Your internal passport is in your pocket, your Gosuslugi app is installed, and the metro is running. Two years ahead: study, work, fall in love, survive winter. Goals are in the side panel.', choices: [C('Let\'s go', 'Day 1 begins.', {})] });
  S({ id: 'intro_migrant', cat: 'intro', free: true, title: 'Kazansky Station, 05:40', text: '{name}, the train from {home} just arrived. Migration card stamped. You have a short time to get registered (15 days for citizens of Tajikistan and Uzbekistan, 7 for most others), then a medical exam, health insurance and a patent before you can work legally. Rules change often — read everything twice.', choices: [C('Step onto the platform', 'Cold air, Russian announcements, a stranger offering "work, registration, everything". Day 1 begins.', {})] });
  S({ id: 'intro_eaeu', cat: 'intro', free: true, title: 'Kazansky Station, 06:10', text: '{name}, citizen of an EAEU country. You need no patent to work, but you still need registration and an employment contract. Moscow is bigger than anything back in {home}.', choices: [C('Step onto the platform', 'Day 1 begins.', {})] });
  S({ id: 'intro_student', cat: 'intro', free: true, title: 'Airport transfer to the dorm', text: '{name}, a foreign student from {home}. The quota place, the dorm and the first snowflakes are real. Your student visa and registration have an expiry date — keep track of them.', choices: [C('Drag your suitcase upstairs', 'The dorm keeper hands you a key and a kettle. Day 1 begins.', {})] });

  /* ---------- Rent / forced ---------- */
  /* ---------- Calendar ---------- */
  const cal = (id, title, text, choices) => S({ id, cat: 'cal', free: true, title, text, choices });
  cal('cal_sept1', 'September 1st — Day of Knowledge', 'Flowers, ribbons, first-graders with bouquets taller than them. Universities start too.', [
    C('Go to the ceremony', 'You clap for strangers\' kids. Somehow it is moving.', { stress: -4, rep: 2 }),
    C('Skip it and study', 'The library is empty and quiet.', { know: 3 })]);
  cal('cal_unity', 'Unity Day', 'A holiday, a long weekend, and everyone arguing about what it celebrates.', [
    C('Join a street concert', 'Folk songs and hot sbiten.', { stress: -6, money: -300 }),
    C('Work extra', 'Holiday pay is a rumour, but tips are real.', { money: 1500, energy: -15 })]);
  cal('cal_newyear', 'New Year\'s Eve', 'Olivier salad, tangerines, "Irony of Fate" on TV, the president\'s speech at midnight.', [
    C('Celebrate with friends', 'Champagne at 00:00 and fireworks across the courtyard.', { money: -2500, stress: -15, rep: 3 }),
    C('Celebrate alone with video call home', 'You make a small salad and watch the screen glow with family faces.', { stress: -8, money: -600 }),
    C('Work the night shift', 'Double rate. The city is empty and glittery.', { money: 4000, energy: -25 })]);
  cal('cal_christmas', 'Orthodox Christmas', 'January 7th. Some neighbours go to church, others just enjoy the day off.', [
    C('Visit a neighbour\'s table', 'Kutya and pirogi. Nobody asks for documents.', { stress: -6, rep: 2 }),
    C('Rest at home', 'Quiet day.', { energy: 15 })]);
  cal('cal_feb23', 'Defender of the Fatherland Day', 'Women congratulate men, men congratulate each other, and every shop sells socks and razors.', [
    C('Buy a small gift for a colleague', 'It lands well.', { money: -500, rep: 3 }),
    C('Ignore it', 'Day like any other.', {})]);
  cal('cal_mar8', 'International Women\'s Day', 'Tulips cost triple. The entire country is a flower stall.', [
    C('Buy flowers for someone', 'They smile. You pay a lot.', { money: -1500, rep: 4, stress: -3 }),
    C('Skip the florists', 'You still end up holding a mimosa twig.', {})]);
  cal('cal_navruz', 'Navruz', 'Spring equinox. Diaspora communities cook sumalak and gather in parks.', [
    C('Join a Navruz gathering', 'Plov, music, familiar faces. For a moment Moscow feels smaller.', { stress: -15, rep: 3, money: -400 }),
    C('Stay in', 'You eat leftovers and call {home}.', { stress: -3 })]);
  cal('cal_victory', 'Victory Day, May 9', 'Parades, the Immortal Regiment, St George ribbons. Many families carry portraits of ancestors.', [
    C('Walk in the Immortal Regiment', 'Strangers share stories. Shashlik afterwards.', { stress: -6, rep: 4 }),
    C('Watch from the pavement', 'Fireworks over the river at 22:00.', { stress: -3 }),
    C('Avoid the crowds', 'Quiet street, lots of police in the centre.', {})]);
  cal('cal_russiaday', 'Russia Day', 'June 12. Flags, concerts, a day off.', [
    C('Attend a concert', 'Free tickets, dancing, ice cream.', { stress: -5 }),
    C('Take extra shifts', 'Quiet streets, good money.', { money: 2000, energy: -20 })]);
  cal('cal_ege', 'ЕГЭ Day', 'The Unified State Exam. Phones in a box, metal detector at the door, 3 hours 55 minutes.', [
    F('Sit the exam', s => {
      const sc = s.know + rnd(-15, 15);
      const pts = clamp100(Math.round(sc * 1.1));
      return O(`You score ${pts} points on the main subject.`, { know: pts > 70 ? 3 : 1, stress: pts > 70 ? -4 : 8, flag: pts > 70 ? 'egeHigh' : 'egeLow' });
    }),
    C('Skip it and try next year', 'You regret it before lunch.', { stress: 3 })]);
  function clamp100(v) { return Math.max(0, Math.min(100, v)); }
  cal('cal_admission', 'Admission results: the enrolment order', 'Applications for budget places closed on 25 July and the ranked lists came out on 27 July. Today, 7 August, the university publishes its enrolment order for the main competition. Your name was somewhere between 41 and 80 for 40 budget places.', [
    F('Refresh the list', s => {
      if (s.flags.admitted) return O('You are already in. You just enjoy watching others sweat.', { stress: -4 });
      if (!s.flags.applied) return O('The lists are public, but your name is not on them: you never submitted an application on the admission portal (Online services → University application, June–July).', { stress: 12 });
      const score = s.know + (s.flags.egeHigh ? 20 : 0) + (s.flags.olymp ? 15 : 0) + rnd(-12, 12);
      if (score >= 70) return O(`Your name is in the top 40 at ${s.tmp.uni || 'your first-choice university'}. Budget place secured. Registration at the dorm, student card, new life.`, { flag: 'admitted', stress: -20, rep: 5, know: 3 });
      if (score >= 50) return O('You are in the paid group: ₽280,000 per year. Parents or a loan may help — or you may try next year.', { flag: 'admittedPaid', stress: 6, money: -2000 });
      return O('Not this year. You remember that Russia also has colleges and distance courses.', { stress: 15, rep: -2 });
    })]);

  /* ---------- Document chain: migrants / students ---------- */
  S({ id: 'reg_first', cat: 'paper', who: ['migrant', 'eaeu'], req: s => !s.flags.registered, w: 60,
    title: 'Registration — the clock is ticking', text: 'The rules give a short time to register your place of stay after arrival: 7 days for most nationalities, 15 days for citizens of Tajikistan and Uzbekistan, 30 for EAEU workers (the game simplifies how the days are counted). Your host, a landlord or a hostel has to submit the notice through the MFC, post office or Gosuslugi.',
    choices: [
      F('Ask your landlord to submit the notice (honest)', s => gamble(0.65, O('The landlord signs, the MFC stamps. You are registered for 90 days.', { docs: { reg: 90 }, flag: 'registered', money: -1000, stress: -5 }), O('The landlord refuses: "I don\'t do paperwork." You lose a day and some nerves.', { stress: 8, energy: -10 }))),
      F('Buy "registration" from a fixer for ₽5,000', s => gamble(0.55, O('The fixer produces a valid notice. Expensive but real.', { docs: { reg: 90 }, flag: 'registered', money: -5000 }), O('The registration turns out to be a fictitious address used by 300 people. Fake in practice — a strike if checked.', { money: -5000, flag: 'fakeReg', docs: { reg: 90 }, stress: 8 }))),
      C('Postpone', 'The clock keeps ticking.', { stress: 6 })] });

  S({ id: 'reg_renew', cat: 'paper', who: ['migrant', 'eaeu', 'student'], req: s => s.docs.reg < 20 && !s.flags.rvp, w: 60,
    title: 'Registration is running out', text: 'Your registration has less than 20 days. Renewal needs the host\'s consent, the migration card and the receipt.',
    choices: [
      F('Renew at the MFC properly', s => gamble(0.8, O('Number 142 in the queue, but you leave with a fresh notice.', { docs: { reg: 90 }, money: -500, energy: -10 }), O('A missing stamp sends you home. Again.', { stress: 8, energy: -10 }))),
      F('Pay a "helper" to jump the queue', s => gamble(0.5, O('Done in 20 minutes for ₽3,000. The helper vanishes into the crowd.', { docs: { reg: 90 }, money: -3000 }), O('The helper knows nothing and neither does the paper he sold you.', { money: -3000, stress: 6, strike: 1 }))),
      C('Do it next week', 'There is always next week.', {})] });

  S({ id: 'med_exam', cat: 'paper', who: ['migrant'], w: 40, req: s => !s.flags.med,
    title: 'Medical exam for migrants', text: 'Before a patent you need a medical certificate: infectious diseases, drug test, fingerprinting, Russian language test. Clinics near Sakharovo are crowded.',
    choices: [
      F('Go to Sakharovo multifunctional centre', s => gamble(0.75, O('Eight stamps, three stations, one ID. You walk out with the certificate.', { flag: 'med', money: -6000, energy: -20, stress: 4 }), O('The system goes down at 15:00. Come back tomorrow.', { energy: -15, stress: 8 }))),
      F('Pay a clinic "VIP" service', s => gamble(0.55, O('No queue, same certificate, double price.', { flag: 'med', money: -16000 }), O('The certificate is fake. It is not recognised at the MFC.', { money: -16000, stress: 10, strike: 1 })))] });

  S({ id: 'patent_buy', cat: 'paper', who: ['migrant'], req: s => !!s.flags.med && !!s.flags.insured && s.docs.patent < 12 && !s.flags.rvp && !(s.flags.patentBan && s.day < (s.marks.patentBan ?? 0) + 365), w: 60,
    title: 'Patent payment', text: 'A work patent is paid for in monthly advance payments of income tax. In Moscow it was ₽8,900 a month in 2025 and rose to about ₽10,000 from 1 January 2026 (other regions differ). Pay on time and keep the receipts. After you receive the patent you must notify the Interior Ministry within two months.',
    choices: [
      F('Pay for 1 month', s => s.money < 10000 ? O('You do not have the money. The MFC clerk shrugs.', { stress: 6 }) : O('Receipt in hand, +30 days.', { money: -10000, docs: { patent: 30 }, ...(s.marks.patent === undefined ? { mark: 'patent' } : {}) })),
      F('Pay for 3 months', s => s.money < 30000 ? O('You do not have ₽30,000.', { stress: 6 }) : O('Peace of mind. +90 days.', { money: -30000, docs: { patent: 90 }, ...(s.marks.patent === undefined ? { mark: 'patent' } : {}) })),
      C('Not today', 'You tell yourself you will pay on Friday.', { stress: 3 })] });

  S({ id: 'dms_policy', cat: 'paper', who: ['migrant'], req: s => !!s.flags.med && !s.flags.insured && !s.flags.rvp, w: 60,
    title: 'You need a health insurance policy for the patent',
    text: 'To get a work patent a labour migrant must hold a voluntary health insurance policy (DMS) that covers at least ₽100,000 and lasts as long as the patent. The price in the game is an approximation: about ₽5,000 for three months. You can also buy it in Online services → Buy health insurance.',
    choices: [
      F('Buy a three-month policy (₽5,000)', s => s.money < 5000 ? O('You do not have the money for the policy yet.', { stress: 5 }) : O('An insurer prints a policy with your name and a hotline number. Now the patent can be bought.', { money: -5000, flag: 'insured', stress: -4 })),
      C('Think about it', 'You open three insurance sites and close them again.', { stress: 3 })] });

  S({ id: 'patent_notice', cat: 'paper', who: ['migrant'], req: s => s.marks.patent !== undefined && !s.flags.patentNotice && !s.flags.rvp && s.day >= s.marks.patent + 5 && s.day < s.marks.patent + 60, w: 50,
    title: 'Notify the Interior Ministry about your patent', text: 'After getting a patent you must send a notification to the Interior Ministry within two months. A friend warns: "If you forget, the patent can be suspended for a year."',
    choices: [
      C('File the notification at the MFC today', 'A form, a stamp and a receipt. One less thing to worry about.', { flag: 'patentNotice', money: -300, stress: -6, energy: -6 }),
      C('Do it later', 'The deadline does not move.', { stress: 3 })] });
  S({ id: 'patent_suspended', cat: 'paper', who: ['migrant'], req: s => s.marks.patent !== undefined && !s.flags.patentNotice && !s.flags.patentBan && !s.flags.rvp && s.day >= s.marks.patent + 60, w: 100,
    title: 'Your patent has been suspended', text: 'A clerk reads the screen: "You did not send the notification within two months. The patent is suspended for a year." Everything you do for work now counts as illegal.',
    choices: [C('Accept it and look for another way', 'You read the rules three times. A lawyer tells you: next time, mark the date in your phone.', { flag: 'patentBan', mark: 'patentBan', setDocs: { patent: 0 }, stress: 20 })] });
  S({ id: 'imm_controlled_registry', cat: 'paper', who: ['foreigner'], w: 2, title: 'Check the register of controlled persons', text: 'Foreigners with unresolved violations can be placed on a register of "controlled persons" with restrictions. A friend recommends checking your status on the official website.',
    choices: [
      F('Check the official website', s => s.strikes >= 2 ? O('The page shows warnings about your record. Time to be very careful.', { stress: 10, know: 2 }) : O('Your name is not on the list. You exhale.', { stress: -5, know: 2 })),
      C('Skip it', 'Not knowing is not safer.', { stress: 2 })] });
  S({ id: 'imm_fssp_check', cat: 'paper', who: ['foreigner'], w: 2, title: "Unpaid fines and the bailiffs' database", text: "Before certain applications, unpaid fines must be cleared. You can search the bailiffs' (FSSP) database by name and date of birth.",
    choices: [
      F('Search the database', s => Math.random() < 0.25 ? O('A forgotten fine of ₽2,000 appears. You pay it online at once.', { money: -2000, stress: 4, know: 2 }) : O('Nothing is registered against you.', { stress: -3, know: 2 })),
      C('Ignore it', 'The fine would have grown with time.', { stress: 2 })] });

  S({ id: 'student_visa', cat: 'paper', who: ['student'], req: s => s.docs.visa < 45, w: 60,
    title: 'Student visa extension', text: 'The university international office stamps the extension request. The migration service needs your attendance record.',
    choices: [
      F('Hand in all documents', s => gamble(0.85, O('Approved. Visa extended for a year.', { docs: { visa: 365, reg: 365 }, money: -3000, energy: -10 }), O('They ask for one more certificate. Come back Thursday.', { stress: 7, energy: -10 }))),
      C('Ask the dean\'s office first', 'They sigh, check the list and say you are fine.', { docs: { visa: 120 }, stress: -4 })] });

  S({ id: 'work_permit_student', cat: 'paper', who: ['student'], req: s => !s.flags.workPermit, w: 25,
    title: 'Working as a student?', text: 'Students can work only with specific permissions. A dean\'s letter plus a contract with the employer opens the door.',
    choices: [
      F('Apply for permission', s => gamble(0.6, O('Permission granted for part-time work.', { flag: 'workPermit', money: -1500 }), O('Rejected: wrong form, wrong address.', { stress: 6 }))),
      C('Stay on scholarship only', 'No work, no risk.', {})] });

  S({ id: 'rutest', cat: 'paper', who: ['migrant', 'eaeu', 'student'], req: s => s.day > 30 && !s.flags.rutest, w: 40,
    title: 'Russian language, history and law exam', text: '', choices: [],
    build: s => {
      const half = !!s.flags.exam_half;
      const cost = half ? 2650 : 5300;
      return {
        text: half
          ? 'You failed one module last time, so you may retake only that module for half the price (₽2,650). The exam has three modules: Russian language, history of Russia, and the basics of legislation.'
          : 'The exam has three modules: Russian language, history of Russia, and the basics of legislation. The residence-permit version takes about two and a quarter hours and costs about ₽5,300 at a university testing centre (prices differ by centre; the shorter patent version is about ₽4,900). Fail one module and you can retake just that one for half price; fail two or more and you retake everything at full price. Beware of anyone selling a "guaranteed result".',
        choices: [
          { t: `Prepare properly and take the exam (₽${cost.toLocaleString('en-US')})`, r: st => {
            if (st.money < cost) return O(`You need ₽${cost.toLocaleString('en-US')} for the exam fee.`, { stress: 1 });
            const p = Math.min(0.95, 0.3 + st.know / 100 + (st.flags.olga_prep ? 0.25 : 0));
            if (Math.random() < p) return O('You pass all three modules. The certificate is issued within about ten working days and is valid for five years.', { flag: 'rutest', unflag: 'exam_half', money: -cost, know: 3, stress: -5 });
            if (!half && Math.random() < 0.5) return O('You pass two modules and miss the third by a few points. You may retake only that module, at half price.', { flag: 'exam_half', money: -cost, stress: 8 });
            return O(half ? 'You miss the pass mark again. Because you failed a module twice, you must start over with all three modules at full price.' : 'You fail two or more modules. You must retake all three modules at full price.', { unflag: 'exam_half', money: -cost, stress: 10 });
          } },
          { t: 'Pay for a "guaranteed result"', r: () => O('The certificate is checked in the official registry. It is not there. Serious trouble.', { money: -25000, strike: 1, stress: 15 }) },
        ],
      };
    } });

  S({ id: 'rvp_apply', cat: 'paper', who: ['migrant', 'eaeu', 'student'], req: s => s.flags.rutest && s.flags.rvpGround && s.day > 90 && !s.flags.rvp, w: 40,
    title: 'Temporary residence permit (RVP)', text: 'You have the language certificate and a ground for RVP (quota place, marriage to a citizen, or a Russian child). Income proof, clean record, medical certificate, fingerprints. The clerk says: "Decision within 6 months".',
    choices: [
      F('Submit documents (state duty ₽15,000)', s => s.money < FEE.rvp ? O('You cannot pay the ₽15,000 state duty yet.', { stress: 3 }) : (gamble(0.55 + (s.rep / 300) - s.strikes * 0.15, O('Approved. The stamp goes into your passport; you no longer need a patent.', { flag: 'rvp', mark: 'rvp', docs: { reg: 9000 }, money: -FEE.rvp, stress: -10, rep: 3 }), O('Denied: "insufficient documents". Re-apply when you fix the gaps.', { stress: 10, money: -FEE.rvp })))),
      C('Wait', 'You can re-apply later.', {})] });

  S({ id: 'vnzh_apply', cat: 'paper', who: ['migrant', 'eaeu', 'student'], req: s => s.flags.rvp && !s.flags.vnzh && s.day >= (s.marks.rvp || 0) + 120, w: 40,
    title: 'Permanent residence permit (VNZh)', text: 'After at least a year on RVP you can apply for the residence permit (VNZh): a card valid for five years, renewable, with the right to live and work without a patent. You must show regular income, tax payments and a clean record. (In real life the waiting times are years; the game shortens them to months.)',
    choices: [
      F('Submit the VNZh application (state duty ₽30,000)', s => s.money < FEE.vnzh ? O('You cannot pay the ₽30,000 state duty yet.', { stress: 3 }) : (gamble(0.6 + (s.rep / 300) - s.strikes * 0.15, O('Approved. The VNZh card arrives: green, five years, enormous relief.', { flag: 'vnzh', mark: 'vnzh', money: -FEE.vnzh, stress: -15, rep: 4 }), O('Denied: tax certificate missing. Gather and retry.', { stress: 10, money: -FEE.vnzh })))),
      C('Wait', 'Not yet.', {})] });

  S({ id: 'citizenship', cat: 'paper', who: ['migrant', 'eaeu', 'student'], req: s => !s.flags.naturalized && s.flags.vnzh && s.day >= (s.marks.vnzh || 0) + (s.flags.marriedCitizen ? 60 : 150), w: 40,
    title: 'Russian citizenship', text: 'Normally citizenship takes about five years of residence on a residence permit, or three if you are married to a citizen. You apply with documents, an interview and an oath, and then you receive the passport. (The game shortens the waiting to a few months.)',
    choices: [
      F('Apply for citizenship (state duty ₽50,000)', s => s.money < FEE.citizen ? O('You cannot pay the ₽50,000 state duty yet.', { stress: 3 }) : (gamble(0.6 + s.rep / 300 - s.strikes * 0.2, O('"Congratulations, citizen of the Russian Federation." Your first internal passport photo looks tired.', { status: 'citizen', flag: 'naturalized', stress: -25, rep: 8, money: -FEE.citizen }), O('Rejected without detailed reasons; you can retry.', { stress: 12, money: -FEE.citizen })))),
      C('Wait a bit', 'Something about patience.', {})] });

  S({ id: 'quota_rvp', cat: 'paper', who: ['migrant', 'eaeu', 'student'], req: s => s.flags.rutest && !s.flags.rvpGround && s.day > 45, w: 30,
    title: 'RVP quota application', text: 'Each region has a yearly quota for temporary residence permits. You must apply for a quota place, which may take months. The queue at the Migration Department (GUVM) starts at 5 a.m.',
    choices: [
      F('Queue for the quota ticket', s => gamble(0.45 + s.rep / 250, O('You get a quota place. Now the RVP application can follow.', { flag: 'rvpGround', energy: -20, stress: -4 }), O('Quota for your region has run out. Come back next year.', { energy: -20, stress: 12 }))),
      C('Check other grounds first (marriage, child)', 'Marriage to a Russian citizen or having a Russian child opens RVP without the quota.', { know: 1 })] });

  S({ id: 'fixer_scam', cat: 'paper', who: ['foreigner'], w: 1.5,
    title: 'A "helper" at the MFC', text: 'A man in a leather jacket approaches you: "Documents, patent, registration — fast, ₽7,000, no queue."',
    choices: [
      C('Ignore him', 'He moves to the next person.', {}),
      F('Pay him', s => gamble(0.3, O('Surprisingly works — but you know it is a risk.', { money: -7000, docs: { reg: 30 } }), O('He disappears with the money.', { money: -7000, stress: 12 }))),
      C('Report him to the MFC guard', 'The guard nods and takes a note. Maybe it helps.', { rep: 1 })] });

  S({ id: 'gosuslugi_down', cat: 'paper', w: 1.5, title: 'Gosuslugi is down', text: 'The "State Services" website shows an error page. The queue at the MFC in person is 90 minutes.',
    choices: [
      C('Wait in the physical queue', 'You read half a novel on your phone.', { energy: -10, stress: 4 }),
      C('Try again tomorrow', 'The page loads at 07:03.', { stress: 2 })] });

  S({ id: 'voenkomat', cat: 'paper', who: ['citizen'], w: 1.5, req: s => s.day < 400, title: 'Letter from the military enlistment office',
    text: 'An envelope arrives: "Please appear at the voenkomat." Rumours ripple through the family chat.',
    choices: [
      F('Go and follow the process', s => O(Math.random() < 0.5 ? 'Deferred because of studies. Stamp, signature, relief.' : 'Medical commission, questionnaires, a long afternoon. You walk out with a new status.', { stress: 6, energy: -12, know: 0 })),
      C('Ignore the letter', 'Ignoring does not remove the file — and fines add up.', { strike: 1, stress: 8 })] });

  /* ---------- Edu set pieces ---------- */
  S({ id: 'olympiad', cat: 'edu', once: true, w: 2, title: 'Olympiad invitation', text: 'The school teacher says: "There is an olympiad in your subject. A winner gets extra points for admission."',
    choices: [
      F('Prepare for three weeks and compete', s => gamble(0.3 + s.know / 150, O('You win a prize. Admission points: +.', { flag: 'olymp', know: 3, stress: 6 }), O('Not this year, but you learn a lot.', { know: 2, stress: 6 }))),
      C('Skip it', 'The chance passes.', {})] });

  S({ id: 'quota_rossotr', cat: 'edu', who: ['foreigner'], once: true, title: 'Russian government scholarship quota', text: 'Rossotrudnichestvo offers quota places for foreign applicants: a year of preparatory language faculty, then the university programme.',
    choices: [
      F('Apply for the quota', s => gamble(0.5 + s.know / 200, O('Accepted. Tuition free, dorm included.', { flag: 'quota', know: 3, stress: -8 }), O('The committee prefers another candidate.', { stress: 8 }))),
      C('Wait', 'Maybe next year.', {})] });

  /* ---------- Police / raids ---------- */
  S({ id: 'cvsin', cat: 'police', who: ['foreigner'], req: s => s.strikes >= 2, w: 5, title: 'Summons to the migration department',
    text: 'A letter says: "Appear at the department regarding violations." Your friend heard about people in the temporary detention centre waiting for deportation papers.',
    choices: [
      F('Hire a lawyer (₽15,000)', s => s.money < 15000 ? O('You cannot afford a lawyer; the hearing is brief.', { strike: 1, stress: 18 }) : gamble(0.7, O('The lawyer cuts the sentence: only a fine.', { money: -15000, strike: -1, stress: 8 }), O('Lawyer tries, court is unmoved.', { money: -15000, strike: 1 }))),
      F('Go alone', s => gamble(0.35, O('A clerk sighs and gives you a last warning.', { stress: 15 }), O('The hearing is five minutes. The decision is final.', { strike: 1, stress: 20 }))),
      C('Do not appear', 'Not appearing makes the file thicker.', { strike: 1, stress: 20 })] });

  S({ id: 'market_raid', cat: 'police', who: ['foreigner'], w: 1.5, title: 'Market raid at dawn', text: 'The doors of Sadovod are blocked. Officers walk between stalls: "Documents, everyone."',
    choices: [
      F('Show valid documents', s => RU.problems(s).length ? O('Something is off in the papers. A report is drawn up.', { strike: 1, money: -5000, stress: 15 }) : O('You wait two hours and are released.', { energy: -10, stress: 5 })),
      F('Hide behind the stalls', s => gamble(0.3, O('You slip out through the back.', { stress: 10 }), O('A neighbour points you out.', { strike: 1, money: -5000, stress: 15 }))),
      F('Ask your employer to vouch for you', s => gamble(0.5, O('The boss makes a call. A "mistake" is solved.', { stress: 4, rep: 1 }), O('The boss refuses to know you.', { rep: -3, stress: 10 })))] });

  /* ---------- Life set pieces ---------- */
  S({ id: 'banya', cat: 'social', w: 1, title: 'Banya invitation', text: 'A coworker invites you to a Saturday banya: steam, birch twigs, tea and honest advice.',
    choices: [
      C('Go', 'You leave pink, calm and with a recommendation for a better job.', { stress: -18, energy: 5, rep: 3, money: -800 }),
      C('Decline', 'He shrugs: "Next time."', {})] });
  S({ id: 'winter', cat: 'social', months: [12, 1, 2], w: 2, title: '−25 °C', text: 'The thermometer on the bank says −25. Your sneakers do not like it.',
    choices: [
      C('Buy proper boots (₽4,500)', 'Your feet thank you every winter step.', { money: -4500, health: 2 }),
      C('Endure in sneakers', 'You get a cold and a lesson.', { health: -8, stress: 6 })] });
  S({ id: 'hot_water', cat: 'home', months: [5, 6, 7, 8], w: 2, title: 'Annual hot water shutdown', text: 'A paper in the stairwell: no hot water for 14 days "for maintenance". It happens every summer.',
    choices: [
      C('Boil kettles like everyone', 'The ritual of the summer. Muscles of the arm: improved.', { energy: -6, stress: 3 }),
      C('Go to the public banya', 'Pricey but pleasant.', { money: -1000, stress: -4 })] });
  S({ id: 'sber_block', cat: 'social', w: 1, title: 'Bank card blocked', text: 'SMS from a bank: "Transaction suspicious". You wired money to family and now the app says "contact support".',
    choices: [
      C('Call support and wait 45 minutes', 'A kind voice unblocks the card.', { energy: -6, stress: 6 }),
      C('Visit a branch', 'Queue + passport + a form. Done.', { energy: -12, money: -100 })] });
  S({ id: 'scam_call', cat: 'social', w: 1.2, title: '"Security service" calls', text: 'A voice claims to be from your bank, then from the police, then from the FSB: "Move your money to a safe account."',
    choices: [
      C('Hang up', 'You report the number. The spam calls continue anyway.', { rep: 1 }),
      F('Believe them', s => O('The account is empty by evening. Another victim in a very long list.', { money: -Math.min(Math.max(s.money, 0), 30000), stress: 20 }))] });
  S({ id: 'dacha', cat: 'social', months: [5, 6, 7, 8, 9], w: 1.2, title: 'A dacha weekend', text: 'A friend drags you out to a dacha: tomatoes, grill, mosquitoes, a samovar.',
    choices: [
      C('Go', 'You come back with a bag of cucumbers and a sunburn.', { stress: -15, money: -500, rep: 2 }),
      C('Stay in the city', 'Quiet metro, quiet flat.', { energy: 10 })] });
  S({ id: 'hockey', cat: 'social', months: [9, 10, 11, 12, 1, 2, 3, 4], w: 1, title: 'KHL hockey night', text: 'A colleague has an extra ticket. The crowd chants, the beer is warm, the puck is fast.',
    choices: [
      C('Take the ticket', 'Your voice is gone, your mood is great.', { money: -1000, stress: -12, rep: 2 }),
      C('Say no', 'You watch the second period in a café.', { stress: -3 })] });
  S({ id: 'lost_phone', cat: 'social', w: 1, title: 'Lost phone on the metro', text: 'You realise your phone is not in your pocket. All documents, banking, taxi — gone.',
    choices: [
      F('Ask the lost-and-found at the station', s => gamble(0.4, O('A stranger handed it in!', { stress: -5 }), O('Nothing. A new phone costs a week of wages.', { money: -12000, stress: 8 }))),
      C('Buy a cheap phone immediately', 'Your SIM must be reissued with a passport visit.', { money: -8000, stress: 5 })] });
  S({ id: 'neighbour_tea', cat: 'social', w: 2, title: 'Neighbour with a pie', text: 'The old woman from flat 12 rings the bell: "I baked too much. Come, eat."',
    choices: [
      C('Accept', 'Tea with raspberry jam and the full history of the building.', { stress: -10, energy: 6, rep: 4 }),
      C('Politely refuse', 'She leaves the pie at your door anyway.', { rep: 1 })] });
  S({ id: 'racism', cat: 'social', who: ['foreigner'], w: 0.8, title: 'Rude remark in the shop', text: 'A customer behind you complains loudly about "people like you". The cashier looks away.',
    choices: [
      C('Ignore it', 'You pay and leave. It stays with you for the day.', { stress: 8 }),
      C('Answer calmly', 'A few people nod. The customer mutters.', { stress: 4, rep: 2 }),
      C('Report it to the store manager', 'The manager apologises and checks the camera.', { stress: -2, rep: 1 })] });
  S({ id: 'kindness', cat: 'social', who: ['foreigner'], w: 0.8, title: 'A stranger helps', text: 'You are lost near the station, phone dead. A woman walks you to the right bus and hands you a pirozhok.',
    choices: [C('Thank her', 'Not every day is about problems.', { stress: -8, rep: 1 })] });

  /* ---------- Family ---------- */
  S({ id: 'remit', cat: 'family', who: ['foreigner'], w: 3, title: 'Remittance to {home}', text: 'Your mother says the roof is leaking and your sister needs school books. Transfers cost a commission.',
    choices: [
      F('Send ₽10,000', s => s.money < 10000 ? O('Not enough money.', { stress: 6 }) : O('The family is happy. Your wallet is not.', { money: -10000, stress: -10, rep: 2 })),
      F('Send ₽3,000', s => s.money < 3000 ? O('Not even that.', { stress: 8 }) : O('A small gesture, big gratitude.', { money: -3000, stress: -4 })),
      C('Explain that it is tight this month', 'She says she understands. You hear her sigh.', { stress: 7 })] });
  S({ id: 'family_visit', cat: 'family', who: ['foreigner'], w: 1, title: 'A cousin wants to come', text: 'A relative asks if he can stay a week "until work starts".',
    choices: [
      C('Say yes', 'Three people in the room. Rent split, spirits up.', { money: -1500, stress: 6, rep: 2 }),
      C('Say no', 'He finds another place — your phone stays silent for a while.', { stress: 4 })] });
  S({ id: 'parents_call', cat: 'family', who: ['citizen'], w: 2, title: 'Mum calls', text: 'She asks if you eat enough, if you wear a hat and when you will visit.',
    choices: [
      C('Promise to visit', 'You mean it, mostly.', { stress: -8 }),
      C('Say you are busy', 'She says "of course" in a way that tells you otherwise.', { stress: 4 })] });
