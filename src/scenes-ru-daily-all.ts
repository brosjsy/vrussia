/* The Russian texts of all the daily-life scenes (three files of data), fetched together with the generated texts and only when the game is in Russian. */
import type { SceneRu } from './scenes-ru';
import { DAILY_RU } from './scenes-ru-daily';
import { DAILY_B_RU } from './scenes-ru-daily-b';
import { DAILY_C_RU } from './scenes-ru-daily-c';
import { DAILY_D_RU } from './scenes-ru-daily-d';
import { DAILY_E_RU } from './scenes-ru-daily-e';

export const DAILY_ALL_RU: Record<string, SceneRu> = { ...DAILY_RU, ...DAILY_B_RU, ...DAILY_C_RU, ...DAILY_D_RU, ...DAILY_E_RU };
