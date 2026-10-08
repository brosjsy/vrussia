/* Storylines 9–11: a talkative taxi driver, a romance that can become a partnership, and a professor who mentors you. */
import { addArc, has } from './arcs';

/* ---------------- 9. Vladimir, the taxi driver ---------------- */
addArc({
  id: 'vladimir', start: s => s.day > 25, gap: 9, steps: [
    { title: 'A taxi driver with opinions', text: 'The driver, Vladimir, has a thermos, an icon on the dashboard and a view on everything. "You are new in the city," he says. "I can tell by how you look at the buildings."', choices: [
      { t: 'Ask him what to see in the city', msg: 'He lists three places no guidebook mentions, and a fourth where the soup is good.', fx: { know: 3, stress: -4, merit: 1 }, flag: 'vladimir_close' },
      { t: 'Look at your phone and nod', msg: 'He turns the radio up a little. The ride is quiet.', fx: {} }] },
    { title: 'The shortcut', text: 'Vladimir says: "I know a shortcut through the courtyards that saves ten minutes. The map does not know it."', choices: [
      { t: 'Let him take it', msg: 'Through an arch, past a bakery, across a car park: you arrive early. You learn the route.', fx: { energy: 4, know: 2 }, flag: 'vladimir_close' },
      { t: 'Insist on the maps app route', msg: 'He shrugs. You arrive on time, a little stiffly.', fx: {} }] },
    { title: 'He forgot his wallet', text: 'At the end of a ride Vladimir looks stricken: his card reader is broken and he cannot give change for your note.', choices: [
      { t: 'Tell him to keep the change', msg: 'He puts his hand on his chest. "I will remember this."', fx: { money: -300, rep: 2, merit: 1 }, flag: 'vladimir_close' },
      { t: 'Wait while he finds change', msg: 'It takes five minutes and an apology. You are fair, he is grateful.', fx: { energy: -3 } }] },
    { title: 'A call at midnight', text: 'Your phone rings at 23:40. It is Vladimir: "I have a passenger who says he is lost and has no phone. Do you know the address?"', choices: s => [
      { t: has(s, 'vladimir_close') ? 'Help him find the address' : 'Say you cannot help', msg: has(s, 'vladimir_close') ? 'Together you find the street. He thanks you and says: "You are one of us now."' : 'He sighs and thanks you anyway.', fx: has(s, 'vladimir_close') ? { merit: 4, rep: 3, stress: -2 } : { stress: 2 } },
      { t: 'Suggest calling the police for lost people', msg: 'He nods slowly and does so.', fx: { know: 1 } }] },
    { title: 'A job offer', text: 'Vladimir says he is retiring to his dacha and his taxi company needs reliable people. "You would be good. You are patient, you ask questions."', choices: s => [
      { t: 'Ask about the conditions', msg: has(s, 'vladimir_close') ? 'He gives you a fair introduction, a trial day and a warning about the toughest customers. The money is good if you work late.' : 'A polite introduction and a standard trial.', fx: { know: 2, rep: 2, money: 1500, flag: 'vladimir_job' } },
      { t: 'Thank him and decline', msg: 'He shakes your hand. "If you change your mind, ask for Vladimir."', fx: { stress: -2 } }] },
  ],
});

/* ---------------- 10. Zarina, a possible partner ---------------- */
addArc({
  id: 'zarina', start: s => s.day > 40 && !s.partner && (!!s.job || !!s.flags.admitted), gap: 8, steps: [
    { title: 'A person you keep meeting', text: 'In the corridor, at the coffee machine and at the bus stop you keep meeting Zarina, who always has a book. Today she says: "We should stop pretending we do not know each other."', choices: [
      { t: 'Say hello and ask what she reads', msg: 'She reads poetry, mostly Akhmatova and Mandelstam. You spend ten minutes on a bench.', fx: { stress: -6, know: 1 }, flag: 'zarina_open' },
      { t: 'Nod politely and go on', msg: 'She smiles and returns to her book.', fx: {} }] },
    { title: 'A coffee after work', text: 'Zarina suggests a coffee on Friday. "Not a date," she says quickly. "Probably not a date."', choices: [
      { t: 'Say yes and choose a quiet café', msg: 'Two hours go by in what feels like twenty minutes. Nobody checks a phone.', fx: { money: -600, stress: -10, friends: 1 }, flag: 'zarina_open' },
      { t: 'Suggest a walk instead', msg: 'A walk along the river. Her laugh is louder than you expected.', fx: { stress: -10, friends: 1 }, flag: 'zarina_open' }] },
    { title: 'A misunderstanding', text: 'You forget to reply to Zarina for a day. She writes: "Okay. I understand." The tone of the message is cold.', choices: [
      { t: 'Call her and explain honestly', msg: 'You were overwhelmed with work. She is quiet, then forgives you with a joke.', fx: { stress: 4, rep: 2 }, flag: 'zarina_open' },
      { t: 'Send a long message with excuses', msg: 'She reads it and answers with a single emoji. You are not sure what it means.', fx: { stress: 6 } },
      { t: 'Let it pass', msg: 'The silence lasts a week. You see her at the bus stop and both look at the sky.', fx: { stress: 8 }, flag: 'zarina_cold' }] },
    { title: 'Meet the friends', text: s => (has(s, 'zarina_cold') ? 'After a quiet week Zarina writes: "Come to my friends\' evening. They want to meet the person I keep talking about."' : 'Zarina invites you to her friends\' evening: "They want to meet you."'), choices: [
      { t: 'Go and bring something to share', msg: 'Salad, music, an argument about films. Her friends approve, loudly.', fx: { money: -500, stress: -12, friends: 2, rep: 3 } },
      { t: 'Politely decline, you are tired', msg: 'She understands, but looks at her phone a bit longer than usual.', fx: { energy: 8, stress: 2 } }] },
    { title: 'What are we?', text: 'On a bench by the river Zarina says: "I like you. I think you like me. So what are we?"', choices: s => [
      { t: 'Say you want to be together', msg: has(s, 'zarina_open') && !has(s, 'zarina_cold') ? 'She smiles and takes your hand. It is that simple and that big.' : 'She hesitates, then nods slowly. "Let us try."', fx: { stress: -14, friends: 1, ...(s.partner ? {} : { partner: { name: 'Zarina', kind: 'compatriot' as const, love: has(s, 'zarina_open') && !has(s, 'zarina_cold') ? 60 : 45 } }) } },
      { t: 'Say you need time', msg: 'She nods. "Take your time. I will be reading Akhmatova."', fx: { stress: 2 } }] },
  ],
});

/* ---------------- 11. The professor ---------------- */
addArc({
  id: 'professor', start: s => !!s.flags.admitted && s.day > 30, gap: 10, steps: [
    { title: 'Office hours', text: 'Professor Belova, the head of the department, leaves a note on your desk: "Office hours, room 312, Thursday. Please come."', choices: [
      { t: 'Go with a prepared question', msg: 'She tilts her glasses. "At last, a student who prepares."', fx: { know: 4, rep: 3, stress: 2 }, flag: 'professor_close' },
      { t: 'Go and ask what she wants', msg: 'She wanted to talk about your last assignment. It was not bad.', fx: { know: 2 } }] },
    { title: 'A research project', text: 'Professor Belova offers: "I need a student for a small research project. Unpaid, but it will look good on your CV and you will learn."', choices: [
      { t: 'Accept', msg: 'Hours in the library and an unexpected love of footnotes.', fx: { know: 5, energy: -12, stress: 4 }, flag: 'professor_close' },
      { t: 'Decline, you are too busy', msg: 'She nods. "The offer stands until the end of term."', fx: { stress: -2 } }] },
    { title: 'A hard conversation', text: 'The professor asks to see you: "Your results have dropped. Is everything all right?"', choices: [
      { t: 'Tell her honestly about the stress', msg: 'She listens, then gives you an extension and the number of the student counsellor.', fx: { stress: -8, rep: 2 }, flag: 'professor_close' },
      { t: 'Say it is nothing', msg: 'She looks unconvinced. "My door is open."', fx: { stress: 4 } }] },
    { title: 'A conference', text: s => (has(s, 'professor_close') ? 'Professor Belova invites you to present a poster at a student conference in another city: "I have already booked your place."' : 'Professor Belova mentions a student conference. "You could apply."'), choices: [
      { t: 'Go and present', msg: 'You are terrified for ten minutes and then you are not. Someone asks a good question.', fx: { know: 5, money: -2000, stress: -4, rep: 5, merit: 3 } },
      { t: 'Skip it this year', msg: 'She does not scold you. "Next year, then."', fx: {} }] },
    { title: 'A letter of recommendation', text: 'At the end of term Professor Belova hands you a sealed envelope. "I have written a recommendation. Use it well."', choices: s => [
      { t: 'Thank her and read it later', msg: has(s, 'professor_close') ? 'Her letter is three paragraphs of precise praise. You keep it in a drawer, and you read it on hard days.' : 'A short, polite letter. It will help.', fx: { rep: 5, stress: -8, know: 2 } },
      { t: 'Thank her and ask what she would advise next', msg: 'She tells you about her own first year: the failure, the doubt, the stubbornness.', fx: { know: 3, merit: 2, stress: -4 } }] },
  ],
});
