/* The city decree of the week: a short rule or announcement of the town hall that changes every seven days and is the same for everybody in the same city.
   The idea of a shared "rule of the week" was taken from watching the public front page of another life game; the texts and the Russian flavour are our own.
   Decrees are only announcements in this game (they show on the notice boards in the 3D city); they never change money, health or any other number, so the game's balance is untouched. Which decree is in force is decided by the weekly election in election.ts. */
import type { State } from './engine';

export interface Decree { id: string; title: string; text: string }

export const DECREES: Decree[] = [
  { id: 'queue', title: 'CITY DECREE', text: 'Queue numbers at the MFC are now handed out from 8:00' },
  { id: 'heat', title: 'CITY DECREE', text: 'Radiators go on when it stays cold for five days' },
  { id: 'dogs', title: 'CITY DECREE', text: 'Free vaccination day for pets at the shelter this Saturday' },
  { id: 'metro', title: 'CITY DECREE', text: 'Roadworks: allow extra time on buses this week' },
  { id: 'quiet', title: 'CITY DECREE', text: 'Quiet hours in the courtyards from 23:00 to 7:00' },
  { id: 'tea', title: 'CITY DECREE', text: 'Free tea in the polyclinic waiting hall on weekday mornings' },
  { id: 'clean', title: 'CITY DECREE', text: 'Subbotnik: courtyard clean-up day, gloves provided' },
  { id: 'library', title: 'CITY DECREE', text: 'Libraries stay open until 20:00 during exam season' },
  { id: 'bikes', title: 'CITY DECREE', text: 'New bicycle lanes open along the main street' },
  { id: 'school', title: 'CITY DECREE', text: 'Free Russian conversation clubs for newcomers in the library' },
  { id: 'market', title: 'CITY DECREE', text: 'Farmers\' market opens on the square at the weekend' },
  { id: 'lights', title: 'CITY DECREE', text: 'Street lights are being replaced: some evenings are darker' },
  { id: 'snow', title: 'CITY DECREE', text: 'Snow clearing starts at 5:00, move your car off the kerb' },
  { id: 'fines', title: 'CITY DECREE', text: 'Parking rules are checked with cameras again' },
  { id: 'doctors', title: 'CITY DECREE', text: 'Extra evening appointments at the polyclinic' },
  { id: 'concert', title: 'CITY DECREE', text: 'Open-air concert in the park on Sunday evening' },
];

/** Which week of the game it is (the first seven days are week 0). */
export const weekOf = (s: State): number => Math.floor(Math.max(0, s.day) / 7);
