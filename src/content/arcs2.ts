/* Three more storylines: a rival at work, a retired teacher who really helps with the language test, and a stray cat. */
import { addArc, has } from './arcs';

/* ---------------- 6. Sergey, a rival at work ---------------- */
addArc({
  id: 'sergey', start: s => !!s.job && s.day > 30, gap: 8, steps: [
    { title: 'A new colleague, Sergey', text: 'Sergey joined last week. He is quick, sure of himself and has already corrected you twice in front of the manager.', choices: [
      { t: 'Ask him to show you what you missed', msg: 'He is surprised, then flattered. Within an hour he has shown you two shortcuts.', fx: { know: 2, stress: -2 }, flag: 'sergey_friend' },
      { t: 'Compete: do better than him tomorrow', msg: 'You arrive early and work flat out. The manager notices both of you.', fx: { energy: -10, rep: 2, stress: 4 }, flag: 'sergey_rival' }] },
    { title: 'Credit for your idea', text: 'In a meeting Sergey presents an idea you mentioned at lunch, with no mention of you. The manager nods approvingly.', choices: [
      { t: 'Speak to Sergey privately', msg: 'He turns red: "I did not realise... I will tell the manager."', fx: { rep: 3, stress: 4 }, flag: 'sergey_friend' },
      { t: 'Say it out loud in the meeting', msg: 'An awkward silence. The manager says "good, you both contributed". Sergey avoids you for a week.', fx: { rep: 1, stress: 8 }, flag: 'sergey_rival' },
      { t: 'Let it go', msg: 'You swallow it and keep your head down. It bothers you for days.', fx: { stress: 8, rep: -1 } }] },
    { title: 'Sergey is in trouble', text: 'Sergey made a costly mistake and the manager is furious. He looks at you across the room, pale.', choices: [
      { t: 'Help him fix it', msg: 'You spend the evening together. The mistake is repaired before the morning. He owes you.', fx: { energy: -12, rep: 4, friends: 1 }, flag: 'sergey_friend' },
      { t: 'Keep out of it', msg: 'You are safe. He notices.', fx: { stress: 2 }, flag: 'sergey_rival' }] },
    { title: 'A promotion for one', text: 'The manager announces that one of you will be promoted next month. The room goes quiet.', choices: s => [
      { t: has(s, 'sergey_friend') ? 'Recommend Sergey as well as yourself' : 'Prepare your best results', msg: has(s, 'sergey_friend') ? 'The manager is impressed by your fairness. Both of you get a raise.' : 'You give a strong presentation. The manager says "we will think about it".', fx: has(s, 'sergey_friend') ? { money: 2500, rep: 5, stress: -4 } : { rep: 2, stress: 4 } },
      { t: 'Ask for feedback instead', msg: 'The manager lists your strengths and one weakness. You write them down.', fx: { know: 3 } }] },
    { title: 'Sergey invites you to the banya', text: s => (has(s, 'sergey_friend') ? 'Sergey: "We have worked together for months. Come to the banya on Saturday, the whole team is going."' : 'Sergey: "No hard feelings. A team outing on Saturday, come if you want."'), choices: [
      { t: 'Go and bring a thermos of tea', msg: 'Steam, birch twigs, jokes and a very honest conversation about work. You are a team now.', fx: { stress: -15, friends: 1, rep: 3, money: -600 } },
      { t: 'Politely decline', msg: 'He nods. "Another time."', fx: {} }] },
  ],
});

/* ---------------- 7. Olga Petrovna, retired teacher ---------------- */
addArc({
  id: 'olga', who: ['foreigner'], start: s => s.know < 55 && s.day > 20, gap: 7, steps: [
    { title: 'A retired teacher offers help', text: 'Olga Petrovna, a retired Russian-language teacher, notices you struggling with a form at the post office and corrects it kindly. "I give free lessons on Tuesdays at the community centre," she says.', choices: [
      { t: 'Go to the first lesson', msg: 'A room with a blackboard, a samovar and six students from five countries. She writes "здравствуйте" in careful chalk.', fx: { know: 3, friends: 1, stress: -4 }, flag: 'olga_close' },
      { t: 'Say you will think about it', msg: 'She smiles and gives you a leaflet.', fx: { know: 1 } }] },
    { title: 'The case system', text: 'Today Olga Petrovna explains the six cases. Half the class looks at the ceiling. "Do not fear," she says. "Everyone is afraid of the instrumental case."', choices: [
      { t: 'Practise with flashcards every evening', msg: 'By the end of the week you can say "I am going to the doctor with my friend" in four forms.', fx: { know: 4, energy: -6 }, flag: 'olga_close' },
      { t: 'Copy the table into your notebook and hope', msg: 'You will need to see it again.', fx: { know: 1 } }] },
    { title: 'A tea and a story', text: 'After class Olga Petrovna invites you to tea. She tells you about teaching in a village school fifty years ago and about her own travels.', choices: [
      { t: 'Listen and ask questions in Russian', msg: 'You use five new words and make three mistakes. She corrects you gently every time.', fx: { know: 3, stress: -8, rep: 2 } },
      { t: 'Bring something from your own country to share', msg: 'She tastes it and says it is the best thing she has eaten this year. You believe her, a little.', fx: { rep: 3, stress: -8, friends: 1, money: -300 } }] },
    { title: 'Preparing for the test', text: 'Olga Petrovna says: "The language, history and law test is soon. Let us do a rehearsal." She prints a mock exam with a stern look.', choices: [
      { t: 'Do a full mock exam under time limit', msg: 'Two hours later you are tired and much more confident. She marks every error in green. (Your chance of passing the real test goes up.)', fx: { know: 4, energy: -12 }, flag: 'olga_prep' },
      { t: 'Ask her for the key phrases only', msg: 'She gives you a one-page list. It helps, a little.', fx: { know: 2 } }] },
    { title: 'A farewell present', text: 'The course is ending. Olga Petrovna gives each student a small book of Russian proverbs, signed in her round handwriting.', choices: [
      { t: 'Thank her and promise to keep practising', msg: 'The book sits on your shelf, and her handwriting is the first thing you see in the morning.', fx: { know: 2, stress: -6, merit: 3, rep: 2 } },
      { t: 'Offer to help her teach the next group', msg: 'She hesitates, then says yes. A volunteer teacher, you are already a part of the story.', fx: { merit: 7, rep: 4, know: 2 } }] },
  ],
});

/* ---------------- 8. Ginger, a stray cat ---------------- */
addArc({
  id: 'ginger', start: s => s.day > 40 && s.rent > 0, gap: 9, steps: [
    { title: 'A ginger cat at the door', text: 'A thin ginger cat sits by your entrance every evening, staring at the door with great dignity.', choices: [
      { t: 'Put out a saucer of milk and some fish', msg: 'The cat eats with great solemnity and then leaves without saying thank you.', fx: { money: -150, stress: -4, merit: 1 }, flag: 'ginger_fed' },
      { t: 'Ignore it', msg: 'The cat watches you pass. You feel judged.', fx: { stress: 1 } }] },
    { title: 'The cat is limping', text: 'One morning the cat limps to the door and cries. Its paw is swollen.', choices: [
      { t: 'Take it to the vet (₽3,500)', msg: 'A splinter and an infection. The vet gives an injection and a pill. The cat hates you for an hour and then forgives you.', fx: { money: -3500, merit: 5, stress: 4 }, flag: 'ginger_vet' },
      { t: 'Wash the paw and wait', msg: 'It heals slowly, and you spend three evenings with a cat on your lap.', fx: { merit: 2, stress: -4 } }] },
    { title: 'What to call a cat', text: 'The neighbours are arguing over the cat\'s name: Ryzhik (Ginger), Barsik or Mikhalych.', choices: [
      { t: 'Vote for Ryzhik', msg: 'The name sticks. Soon half the building calls it by name.', fx: { friends: 1, stress: -3 } },
      { t: 'Suggest a name in your own language', msg: 'The cat answers to it at once. The neighbours are charmed.', fx: { rep: 3, friends: 1, stress: -4 } }] },
    { title: 'Ginger and the neighbour\'s dog', text: 'A big dog barks at Ginger in the courtyard. Ginger arches up, hisses and rushes to your door.', choices: [
      { t: 'Carry the cat inside and calm the dog\'s owner', msg: 'Everyone is calm in ten minutes. The dog owner brings a bag of cat food as an apology.', fx: { rep: 3, stress: 2 } },
      { t: 'Let them sort it out', msg: 'Ginger wins by speed, and the dog retreats looking embarrassed.', fx: {} }] },
    { title: 'Ginger moves in?', text: s => (has(s, 'ginger_vet') ? 'Ginger sits on your windowsill every evening, and your landlord has just said: "A cat is fine, as long as it is clean."' : 'Ginger sits by your door every evening and meows to be let in.'), choices: [
      { t: 'Let Ginger in for good', msg: 'The first night the cat inspects every corner, then curls up on your pillow. You sleep badly and happily.', fx: { stress: -14, money: -2000, merit: 4, friends: 1 } },
      { t: 'Keep feeding Ginger at the door', msg: 'An arrangement works for both of you: a cat of the courtyard, fed by the whole building.', fx: { stress: -6, merit: 3 } }] },
  ],
});
