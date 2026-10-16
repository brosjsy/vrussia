/* Storyline 14 for everyone: Valentina Petrovna, the neighbour on the bench by the entrance.
   What you choose early (kindness or distance) changes the last step. Flags: val_kind, val_cool. */
import { addArc, has } from './arcs';

addArc({
  id: 'valentina', start: s => s.day > 25, gap: 10, steps: [
    { title: 'The woman on the bench', text: 'Every evening a small woman in a headscarf sits on the bench by your entrance. Today she looks at you for a long time. "You walk by every day and say nothing. Are you from here? Did nobody teach you to say good evening?"', choices: [
      { t: 'Say good evening and introduce yourself', msg: 'Her name is Valentina Petrovna. She nods slowly, as if you had passed an exam.', fx: { stress: -3, friends: 1, rep: 1 }, flag: 'val_kind' },
      { t: 'Nod politely and keep walking', msg: 'She sighs. "Young people."', fx: { stress: 1 }, flag: 'val_cool' }] },
    { title: 'A small favour', text: 'Valentina Petrovna stops you at the door. Her shopping bag is heavy and her flat is on the fifth floor. "The lift again. Would you mind?"', choices: s => [
      { t: 'Carry the bag up the stairs', msg: has(s, 'val_kind') ? 'On the fifth floor she hands you a jar of pickled cucumbers as if it were a medal. "From my dacha. Eat."' : 'She is surprised and says nothing, but the next day there is a jar of jam on your door handle.', fx: { energy: -8, friends: 1, rep: 2, stress: -2 }, flag: 'val_kind' },
      { t: 'Say you are in a hurry', msg: 'She says "of course, of course" in a voice that suggests she does not mind, but she does.', fx: { stress: 2, rep: -1 }, flag: 'val_cool' }] },
    { months: [11, 12, 1, 2], title: 'The light is off', text: 'For three days there has been no light under her door and the bench stands empty in the frost. A neighbour says she has caught a cold and does not like to trouble anyone.', choices: s => [
      { t: has(s, 'val_kind') ? 'Knock and bring hot soup and medicine' : 'Knock and ask if she needs anything', msg: has(s, 'val_kind') ? 'She opens the door in a shawl, pretends to protest and then eats two plates. "You remind me of my son," she says.' : 'She says she is fine, takes a few tablets and thanks you more warmly than you expected.', fx: { energy: -6, money: -400, friends: 1, stress: -2, merit: 2 }, flag: 'val_kind' },
      { t: 'Leave a note with your phone number', msg: 'She calls on the fourth day and says it was nothing. You agree, a bit relieved.', fx: { stress: 1, merit: 1 } }] },
    { title: 'Her grandson', text: 'Valentina Petrovna introduces you to her grandson, a quiet teenager with a notebook. "Do you tutor maths, by any chance? You look clever, I can see." She looks at you hopefully.', choices: s => [
      { t: 'Offer a couple of free lessons', msg: 'The boy understands fractions at last. Valentina Petrovna sends a plate of pies after each lesson.', fx: { energy: -8, know: 1, friends: 2, merit: 3, stress: -3 }, flag: 'val_kind' },
      { t: 'Suggest a paid tutor from the school', msg: has(s, 'val_kind') ? 'She nods, a bit disappointed, but understands. The pies come anyway.' : 'She says "of course" and that is the end of the matter.', fx: { stress: 1 } }] },
    { title: 'Spring on the bench', text: s => (has(s, 'val_kind') ? 'In April the bench is full: Valentina Petrovna, two other women and, at the end, an empty place that someone has kept for you. She pats the wood.' : 'In April Valentina Petrovna is on the bench again. She watches you walk by and, for the first time, says "Good evening" first.'), choices: s => [
      { t: has(s, 'val_kind') ? 'Sit down and listen to the whole story of the house' : 'Stop and answer her greeting', msg: has(s, 'val_kind') ? 'Forty years of the house: who lived where, who fell in love, who never paid the rent. You will never walk past this bench in the same way again.' : 'It takes thirty seconds. You walk on feeling oddly lighter.', fx: { know: 2, stress: -8, friends: 2, merit: 3, famLove: 1 } },
      { t: 'Smile and promise to come tomorrow', msg: 'Tomorrow becomes next week. She will remember.', fx: { stress: -2, friends: 1 } }] },
  ],
});
