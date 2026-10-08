/* More dates in the calendar: twelve holidays and observances with three ways to spend each. */
import { S, CAL } from '../../engine';
import type { Choice, Effects } from '../../engine';

const C = (t: string, msg: string, fx: Effects): Choice => ({ t, msg, fx });

type Day = [m: number, d: number, id: string, title: string, text: string, Choice[]];
const DAYS: Day[] = [
  [1, 25, 'cal_tatiana', 'Tatiana\'s Day (Students\' Day)', 'Students celebrate the patron saint of their university. Songs, silly costumes and a very relaxed attitude to timetables.', [
    C('Join the student party', 'You dance in a circle and sing the university anthem off-key.', { money: -500, stress: -14, friends: 1, merit: 1 }),
    C('Study quietly', 'Exams wait for no one.', { know: 3 }),
    C('Call a friend from the old university', 'You swap stories for an hour.', { stress: -8, friends: 1 })]],
  [2, 14, 'cal_valentine', 'Valentine\'s Day', 'Shops fill with pink hearts and flowers. Some say it is imported, but everyone buys the chocolates.', [
    C('Buy a small gift for someone', 'A card and a chocolate heart. A smile.', { money: -800, stress: -6, love: 5 }),
    C('Spend it with friends', 'Pizza and a bad romantic comedy.', { stress: -8, friends: 1, money: -500 }),
    C('Ignore it', 'It is just a Tuesday.', {})]],
  [3, 27, 'cal_theatre', 'World Theatre Day', 'Theatres across the country offer free open rehearsals and backstage tours.', [
    C('See an open rehearsal', 'You watch a scene repeated eleven times and fall in love with the craft.', { know: 2, stress: -8, merit: 2 }),
    C('Buy a cheap standing ticket (₽300)', 'You see a classic from the balcony with a hundred students.', { money: -300, stress: -10, merit: 2 }),
    C('Skip it', 'The theatre will be there next year.', {})]],
  [4, 12, 'cal_cosmos', 'Cosmonautics Day', 'On 12 April Russia celebrates Yuri Gagarin\'s first spaceflight in 1961. Museums, planetariums and space-themed concerts fill the city.', [
    C('Visit a space museum', 'Rockets, capsules and the smell of old metal. You leave feeling small and inspired.', { know: 4, merit: 3, money: -400, stress: -6 }),
    C('Look at the stars from a roof', 'A friend brings a telescope. Jupiter looks like a pearl.', { stress: -12, friends: 1, merit: 1 }),
    C('Eat "space food" at a café', 'Tubes of puree, as in the old days. Strangely good.', { money: -300, stress: -4 })]],
  [5, 1, 'cal_mayday', 'Spring and Labour Day', 'The first of May: a day off, banners, picnics and the opening of the dacha season.', [
    C('Go to a dacha with friends', 'Shashlik, mud and a lot of laughter.', { money: -800, stress: -14, friends: 1 }),
    C('Join the city festival', 'A concert, balloons and sticky candy floss.', { stress: -10, merit: 1 }),
    C('Take extra shifts', 'Holiday pay, but a tired Friday.', { money: 2500, energy: -16 })]],
  [5, 24, 'cal_slavic', 'Day of Slavic Writing and Culture', 'On 24 May the country honours Saints Cyril and Methodius and the alphabet that carries their names.', [
    C('Attend a reading in the library', 'You hear poems in Old Church Slavonic and modern Russian side by side.', { know: 3, merit: 3, stress: -6 }),
    C('Write a letter by hand', 'You practise a beautiful cursive and send it to a friend.', { know: 1, stress: -8, famLove: 2 }),
    C('Visit a monument to Cyril and Methodius', 'A quiet moment in a busy city.', { know: 2, merit: 2 })]],
  [6, 1, 'cal_kids', 'Children\'s Day', 'Playgrounds fill with face painting, balloons and giant bubbles.', [
    C('Volunteer at a children\'s event', 'You paint faces for four hours. A fox, a tiger, a very serious Spider-Man.', { merit: 6, rep: 3, stress: -10, energy: -10 }),
    C('Take your own child out for ice cream', 'Chocolate on the nose and sunshine.', { money: -600, stress: -10, love: 3, famLove: 2 }),
    C('Avoid the crowded parks', 'A quiet afternoon.', {})]],
  [6, 6, 'cal_pushkin', 'Pushkin Day and Russian Language Day', 'On 6 June, Pushkin\'s birthday, people read his verses in parks, schools and metro stations.', [
    C('Read a poem aloud', 'You stumble over the meter and the audience applauds the effort.', { know: 3, merit: 3, stress: -6 }),
    C('Listen to a reading at a monument', 'A grandmother recites "I remember a wondrous moment" from memory.', { know: 2, merit: 2, stress: -8 }),
    C('Learn a new Russian word', 'Today\'s word: "umilenie" (tender emotion). You use it three times.', { know: 2 })]],
  [7, 8, 'cal_family', 'Day of Family, Love and Fidelity', 'On 8 July people give chamomile flowers and celebrate Saints Peter and Fevronia, the patrons of marriage.', [
    C('Spend the day with your loved ones', 'A picnic, chamomile flowers and a promise for another year.', { love: 6, famLove: 4, stress: -12, money: -500 }),
    C('Call your family', 'You talk for two hours and cry a little.', { famLove: 8, stress: -8 }),
    C('Do volunteering at a children\'s home', 'A day you will remember.', { merit: 6, stress: -6, energy: -10 })]],
  [8, 19, 'cal_spas', 'The Transfiguration (Apple Spas)', 'On 19 August Orthodox communities bless the first fruits of the harvest.', [
    C('Take apples to be blessed and share them', 'Everyone shares and the church smells of apples and incense.', { stress: -8, merit: 2, rep: 2 }),
    C('Buy apples at the market', 'Crisp and sweet.', { money: -250 }),
    C('Make an apple pie', 'The flat smells like autumn.', { money: -400, stress: -8, know: 1 })]],
  [10, 5, 'cal_teachers', 'Teachers\' Day', 'Students bring flowers to school and thank their teachers. Even adults remember the one teacher who changed their lives.', [
    C('Write to your favourite teacher', 'The reply arrives in an hour: three lines and a lot of emotion.', { stress: -8, rep: 2, merit: 2 }),
    C('Bring flowers to a teacher at your school or university', 'She says "you did not have to" and then glows.', { money: -600, rep: 3, merit: 2 }),
    C('Do nothing', 'You think about it on the bus.', {})]],
  [12, 12, 'cal_constitution', 'Constitution Day', 'A day off for many, with ceremonies and a discussion about the rights and duties written in the constitution.', [
    C('Read the first chapter', 'It is shorter than you thought, and longer than you read.', { know: 3, merit: 2 }),
    C('Use the day off for errands', 'The banks are closed; the shops are open.', { money: -500 }),
    C('Rest at home', 'A rare quiet day.', { energy: 12, stress: -8 })]],
];

for (const [m, d, id, title, text, choices] of DAYS) {
  CAL.push({ m, d, id });
  S({ id, cat: 'cal', free: true, title, text, choices });
}
