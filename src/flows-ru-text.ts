/* Russian for the words inside the online forms (flows.ts): steps, field labels, choices, hints and the results. The table itself (flows-ru-data.ts) is fetched on demand when a form's page is Russian;
   until it has arrived, or for a line it does not list (a price, a name made in code), the English line stays. forms-ui.ts runs every line through frx(). */
import { lang } from './i18n';

let table: Record<string, string> | null = null;
/** Fetches the table when the page is Russian; resolves when it can be used. */
export const loadFlowRu = (): Promise<void> => (lang() === 'ru' && !table ? import('./flows-ru-data').then(m => { table = m.FLOW_TEXT_RU; }, () => undefined) : Promise.resolve());

/** A line of a form in the language of the page (English where it has no Russian). */
export const frx = (x: string): string => (lang() === 'ru' && table ? table[x] ?? x : x);

/** A result line that is a known line, or a known line with a known piece added to it (the forms join their sentences with a space or a bracket). */
export function frxPart(x: string): string {
  if (lang() !== 'ru' || !table) return x;
  if (table[x]) return table[x];
  let out = x;
  for (const k of Object.keys(table).sort((a, b) => b.length - a.length)) if (k.length > 12 && out.includes(k)) out = out.split(k).join(table[k]);
  return out;
}
