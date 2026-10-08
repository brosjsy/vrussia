/* Storylines 12-13 for the two citizen origins: the Moscow "nepo baby" and the regional kid. */
import { addArc, has } from './arcs';

/* ---------------- 12. Connections: the favour that is always on offer (Moscow Baby) ---------------- */
addArc({
  id: 'connections', start: s => s.o === 'moscow' && s.day > 20, gap: 9, steps: [
    { title: 'Dad knows a guy', text: 'Your father puts down his phone. "I spoke to Viktor Palych. There is an internship at his firm. You start Monday. No need to thank me."', choices: [
      { t: 'Accept the internship gladly', msg: 'It is a real office with a real desk. Everyone knows whose child you are. You feel it in every handshake.', fx: { money: 1500, rep: -2, know: 2 }, flag: 'conn_used' },
      { t: 'Say you will find your own way', msg: 'He raises an eyebrow, then shrugs. "As you like."', fx: { stress: 4, rep: 2, famLove: -2 }, flag: 'conn_own' }] },
    { title: 'A favour asked in return', text: 'At the internship Viktor Palych says, smiling: "Your father and I help each other. Maybe you can ask him to sign one small paper for my nephew?"', choices: [
      { t: 'Pass the message on', msg: 'It is just a paper, you tell yourself. You wonder how many "just papers" there are.', fx: { stress: 5, rep: -3 }, flag: 'conn_used' },
      { t: 'Say that you do not mix work with your father\'s business', msg: 'The smile freezes for a second. Then he nods. "Principled. Good."', fx: { stress: 4, rep: 4 }, flag: 'conn_own' }] },
    { title: 'The call after the traffic stop', text: 'A traffic officer stops your friend\'s car. The friend, panicking, says: "Call your dad, please. He knows people."', choices: [
      { t: 'Call your father', msg: 'Within five minutes the officer waves them on. Your friend is grateful. You feel a little sick.', fx: { stress: 6, rep: -2, friends: 1 }, flag: 'conn_used' },
      { t: 'Advise your friend to show the documents and ask for the protocol', msg: 'It takes an hour, ends with a small fine, and your friend says: "You are right. It was fair."', fx: { stress: 3, rep: 3, know: 2 }, flag: 'conn_own' }] },
    { title: 'A friend needs a place', text: 'A friend from a small town has scored very well on the exams but has no connections. A place on a budget programme depends on one conversation your father could have.', choices: s => [
      { t: 'Ask your father to put in a word', msg: has(s, 'conn_own') ? 'He is surprised that you finally ask for something. He helps, and for once you did not feel ashamed, because it was for someone else who deserved it.' : 'He is happy that you ask. The friend gets in. Nobody asks why.', fx: { merit: 3, friends: 2, rep: 1, stress: -2 } },
      { t: 'Help your friend prepare the application and the portfolio instead', msg: 'Three evenings of writing and rehearsing. The friend gets in by merit, and both of you know it.', fx: { energy: -12, merit: 6, rep: 5, friends: 2, know: 2 } }] },
    { title: 'Your own path', text: s => (has(s, 'conn_own') ? 'A year of doing things your own way. Your father says at dinner: "I may have been wrong to push you. You are doing well without me."' : 'Your father says at dinner: "I have arranged something bigger. A position with a title." You realise you have never earned anything yet.'), choices: s => [
      { t: has(s, 'conn_own') ? 'Thank him, and tell him you are proud too' : 'Decline the position and earn your first real salary', msg: has(s, 'conn_own') ? 'A hug. A silence. Then he pours you tea like an adult.' : 'He is stunned, then proud, then offended, in that order. You start from the bottom of another ladder.', fx: has(s, 'conn_own') ? { stress: -12, famLove: 6, rep: 4 } : { stress: 6, rep: 6, merit: 4, famLove: -2, know: 3 } },
      { t: 'Accept the position and use it well', msg: 'You decide that a door is a door and what matters is what you do once you walk through it.', fx: { money: 3000, rep: 1, know: 1 } }] },
  ],
});

/* ---------------- 13. A mother back home (Regional Kid) ---------------- */
addArc({
  id: 'mum', start: s => s.o === 'region' && s.day > 15, gap: 9, steps: [
    { title: 'Mum calls on Sunday', text: 'Mum calls every Sunday at nine. Today she asks, as always: "Have you eaten? Is it warm there? Are you keeping to your lessons?" There is a pause. "I am fine. Do not worry."', choices: [
      { t: 'Stay on the phone for an hour', msg: 'She tells you about the neighbours, the cat, and the price of buckwheat. You laugh and want to cry.', fx: { famLove: 6, stress: -8 }, flag: 'mum_close' },
      { t: 'Promise to call back tomorrow', msg: 'She says "of course" in a very small voice.', fx: { famLove: -2, stress: 2 } }] },
    { title: 'A little money from the big city', text: 'You have saved a little. Mum\'s birthday is in a week, and the boiler in her flat has been broken for a month.', choices: [
      { t: 'Send ₽8,000 for a new boiler', msg: 'She protests for ten minutes and cries for two. The boiler is installed on Thursday.', fx: { money: -8000, famLove: 8, stress: -6, merit: 2 }, flag: 'mum_close' },
      { t: 'Send ₽2,000 and a card', msg: 'It is what you can do. She frames the card.', fx: { money: -2000, famLove: 3 } },
      { t: 'Wait until you have more money', msg: 'You tell yourself you will do more later. The guilt walks with you.', fx: { stress: 5, famLove: -2 } }] },
    { months: [11, 12], title: 'New Year at home', text: 'Trains to your hometown are crowded before the holiday. A ticket costs ₽5,000 one way. Mum has not said anything, but you know she is setting a table for two.', choices: [
      { t: 'Go home for New Year', msg: 'Olivier salad, tangerines, a tiny tree and Mum in her best dress. Snow outside, warmth inside.', fx: { money: -9000, famLove: 12, stress: -20, energy: -6 }, flag: 'mum_close' },
      { t: 'Stay and work the holiday shifts', msg: 'The money is good and the video call at midnight is short and cheerful.', fx: { money: 3500, famLove: -4, stress: 4 } }] },
    { title: 'A scare', text: 'The neighbour calls instead of Mum: "She felt dizzy and the doctor says it is her blood pressure. She does not want you to worry."', choices: s => [
      { t: has(s, 'mum_close') ? 'Drop everything and go home for a week' : 'Call the doctor and arrange help from afar', msg: has(s, 'mum_close') ? 'You sleep on the old sofa, cook her soup and learn her pills by heart. She will be fine.' : 'The doctor is kind. A neighbour agrees to check in daily. It is not enough, but it is something.', fx: has(s, 'mum_close') ? { money: -6000, famLove: 12, stress: -6, energy: -10, merit: 3 } : { money: -2000, famLove: 4, stress: 8 } },
      { t: 'Send money for private tests and stay put', msg: 'The tests show nothing serious. You exhale for the first time in two days.', fx: { money: -7000, stress: 4, famLove: 3 } }] },
    { title: 'What Mum wants', text: 'On the phone, Mum says: "Whatever you decide, I only want you to be happy. Do not come back for me. Build your life." She goes quiet. You hear a kettle.', choices: [
      { t: 'Tell her that you will visit every holiday', msg: 'A promise is a bridge. She puts the kettle down and says "I will bake."', fx: { famLove: 8, stress: -10 } },
      { t: 'Tell her that you will bring her to live near you one day', msg: 'She laughs, then asks: "Is there a place for the cat?" You say yes. It is your first plan for the future.', fx: { famLove: 6, stress: -6, know: 1 } }] },
  ],
});
