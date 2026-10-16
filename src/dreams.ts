/* "What do you want to become?" The player picks one life dream when creating a character. A dream gives a small starting boost and one
   personal goal that is checked against the real state of the game. Boosts are kept small so no dream makes the game easy. */
import type { State, Effects } from './engine';

export interface Dream { id: string; label: string; icon: string; blurb: string; boost: Effects; goal: string; done: (s: State) => boolean }

export const DREAMS: Dream[] = [
  { id: 'doctor', label: 'Doctor', icon: '🩺', blurb: 'Study medicine and heal people.', boost: { know: 5 }, goal: 'Get into university and reach knowledge 60', done: s => !!s.flags.admitted && s.know >= 60 },
  { id: 'engineer', label: 'Engineer', icon: '🛠️', blurb: 'Build things that work.', boost: { know: 4 }, goal: 'Have a job and reach knowledge 55', done: s => !!s.job && s.know >= 55 },
  { id: 'entrepreneur', label: 'Entrepreneur', icon: '🏪', blurb: 'Start your own company.', boost: { rep: 3 }, goal: 'Open a business', done: s => !!s.biz },
  { id: 'teacher', label: 'Teacher', icon: '📚', blurb: 'Pass knowledge on.', boost: { know: 3, merit: 2 }, goal: 'Reach knowledge 70 and have three friends', done: s => s.know >= 70 && s.friends >= 3 },
  { id: 'artist', label: 'Artist', icon: '🎭', blurb: 'Live for culture and beauty.', boost: { merit: 4 }, goal: 'Earn community merit 30', done: s => s.merit >= 30 },
  { id: 'athlete', label: 'Athlete', icon: '🏅', blurb: 'Strong body, strong mind.', boost: { energy: 5 }, goal: 'Reach perfect health (100)', done: s => s.health >= 100 },
  { id: 'driver', label: 'Driver', icon: '🚗', blurb: 'Own a car and the open road.', boost: { energy: 5 }, goal: 'Own a car', done: s => !!s.car },
  { id: 'citizen', label: 'Russian citizen', icon: '🛂', blurb: 'Make Russia home for good (for newcomers).', boost: { know: 3 }, goal: 'Become a Russian citizen', done: s => !!s.flags.naturalized },
];

export const dreamById = (id: string | undefined): Dream | undefined => DREAMS.find(d => d.id === id);

/** The player's dream, if they chose one. */
export const dreamOf = (s: State): Dream | undefined => dreamById(s.dream);
