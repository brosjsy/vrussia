/* More story scenes in Russian, added a batch at a time (the first scenes are in scenes-ru.ts). Same shape: the scene's id, then its title, its text
   and each choice with the line that follows it. {name}, {city} and {home} must stay as they are. How to add a batch:
     1. RU_EXPORT=papers npx vitest run test/ru-coverage.test.ts   (writes docs/translate/papers.json with the English of every scene still to do)
     2. translate the strings, paste the finished scenes below, in the same order of choices
     3. npx vitest run test/ru-coverage.test.ts                   (checks ids, choices, placeholders and that the text really is Russian)
   A scene that has no Russian here is shown in English, as before. docs/RU_COVERAGE.md says how far the translation has come.
   The line after a choice replaces the game's own result line, so write it only where the English line is always the same for that choice
   (the export marks these "fixed"). Where the result differs from game to game (luck, money, papers), leave the line empty ('') and the game
   shows its own line, so the Russian never says something that did not happen. */
import type { SceneRu } from './scenes-ru';
import { PAPERS_RU } from './scenes-ru-papers';
import { POLICE_RU } from './scenes-ru-police';
import { CULTURE_CIS_RU } from './scenes-ru-cis';
import { RULES_RU } from './scenes-ru-rules';

export const SCENES_RU_MORE: Record<string, SceneRu> = { ...PAPERS_RU, ...POLICE_RU, ...CULTURE_CIS_RU, ...RULES_RU };

/** The scenes built from the phrase list (scenes-ru-gen-*.ts, made by docs/translate/gen.cjs): separate files, fetched together. */
export const loadGenerated = async (): Promise<Record<string, SceneRu>> => ({ ...(await import('./scenes-ru-gen').then(m => m.loadGenerated())), ...(await import('./scenes-ru-daily-all').then(m => m.DAILY_ALL_RU)) });
