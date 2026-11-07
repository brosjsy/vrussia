/* Partner places: a verified organisation's visible place in the game city (a line in the phone's "Partner services" app, with the advertising label and a
   link to the organisation's own page). This is not an open market: an organisation is in the list only after a person has checked it and written the check
   down (who, when, which agreement), and the list lives in src/content/partners.ts, so adding one is a reviewed change. The rules for who may be in it are
   docs/PARTNER_PLACES.md. Any price here is a REAL price in roubles paid to the organisation (never game money). Pure: no screen, no network.
   Partners learn nothing about players: nothing here records who looked. */
import type { KV } from './store';

export type PartnerCategory = 'university' | 'state' | 'language' | 'operator' | 'bank' | 'clinic' | 'employer' | 'shop';
export const CATEGORIES: Record<PartnerCategory, { en: string; ru: string }> = {
  university: { en: 'University or college', ru: 'Вуз или колледж' },
  state: { en: 'State or municipal service', ru: 'Государственная или муниципальная служба' },
  language: { en: 'Language or exam centre', ru: 'Центр языка или экзамена' },
  operator: { en: 'Mobile operator', ru: 'Оператор связи' },
  bank: { en: 'Bank (accounts and cards)', ru: 'Банк (счета и карты)' },
  clinic: { en: 'Clinic', ru: 'Клиника' },
  employer: { en: 'Employer', ru: 'Работодатель' },
  shop: { en: 'Shop or cafe', ru: 'Магазин или кафе' },
};

export interface Partner {
  id: string;
  name: string; nameRu: string;
  /** INN: 10 digits for a company, 12 for a sole entrepreneur. Shown in the label. */
  taxId: string;
  category: PartnerCategory;
  /** The game cities where the place is shown (names as in the game, e.g. "Moscow"). */
  cities: string[];
  blurb: string; blurbRu: string;
  /** The organisation's own official page: https only. */
  url: string;
  /** A real price in roubles that the organisation asks, or null when it says none. Never game money. */
  priceRub: number | null;
  /** The days the place is shown, as YYYY-MM-DD. */
  from: string; until: string;
  /** Who checked the organisation, when, and the agreement it stands on: written by the person who adds it. */
  reviewedBy: string; reviewedOn: string; agreement: string;
  /** The licence the trade needs, if any (number and who gave it). */
  licence?: string;
}

const BANNED = /(loan|credit|микрофинанс|займ|заём|кредит|money transfer|remittance|денежн[а-яё]* перевод|перевод[а-яё]* денег|without (an )?exam|без экзамен|guarantee|гарантир|гарантия результат|casino|poker|betting|букмекер|казино|ставк|vodka|beer|wine|alcohol|водк|пиво|алкогол|cigarette|tobacco|vape|сигарет|табак|вейп|кальян)/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Everything wrong with an entry, in plain words. Empty means it may be shown. */
export function problems(p: Partner): string[] {
  const out: string[] = [];
  if (!/^[a-z0-9-]{2,30}$/.test(p.id)) out.push('id: 2 to 30 small letters, digits or dashes');
  if (!p.name.trim() || !p.nameRu.trim()) out.push('name: both the English and the Russian name');
  if (!/^(\d{10}|\d{12})$/.test(p.taxId)) out.push('taxId: 10 digits (company) or 12 digits (sole entrepreneur)');
  if (!(p.category in CATEGORIES)) out.push('category: not on the allowed list');
  if (!p.cities.length) out.push('cities: at least one');
  for (const [k, v] of [['blurb', p.blurb], ['blurbRu', p.blurbRu]] as const) if (v.trim().length < 10 || v.length > 240) out.push(`${k}: 10 to 240 characters`);
  if (BANNED.test(`${p.name} ${p.nameRu} ${p.blurb} ${p.blurbRu}`)) out.push('text: mentions something partners may not offer (loans, money transfers, a result without an exam, gambling, alcohol, tobacco)');
  if (/@|\+?\d[\d\s()-]{8,}/.test(`${p.blurb} ${p.blurbRu}`)) out.push('blurb: no phone numbers or e-mail addresses (the link is the way to reach them)');
  try { const u = new URL(p.url); if (u.protocol !== 'https:' || /^[\d.]+$/.test(u.hostname) || !u.hostname.includes('.')) out.push('url: an https address with a domain name'); } catch { out.push('url: not an address'); }
  if (p.priceRub !== null && !(Number.isInteger(p.priceRub) && p.priceRub >= 0 && p.priceRub <= 10_000_000)) out.push('priceRub: whole roubles from 0 to 10,000,000, or null');
  if (!DATE.test(p.from) || !DATE.test(p.until) || p.until < p.from) out.push('from/until: dates as YYYY-MM-DD, until not before from');
  if (!p.reviewedBy.trim() || !DATE.test(p.reviewedOn) || !p.agreement.trim()) out.push('review: who checked, when, and which agreement');
  return out;
}

export const todayIso = (d: Date = new Date()): string => d.toISOString().slice(0, 10);
/** Entries that are valid and inside their dates. An invalid entry is never shown. */
export function active(list: readonly Partner[], today: string = todayIso()): Partner[] {
  return list.filter(p => problems(p).length === 0 && p.from <= today && today <= p.until);
}
export function partnersFor(list: readonly Partner[], city: string, today: string = todayIso()): Partner[] {
  return active(list, today).filter(p => p.cities.includes(city));
}
/** The label that goes with every partner place (the Russian law asks for the word and the advertiser). */
export function label(p: Partner, ru: boolean): string { return ru ? `Реклама · ${p.nameRu} · ИНН ${p.taxId}` : `Advertisement · ${p.name} · INN ${p.taxId}`; }
/** The price in real roubles, written so it cannot be mistaken for game money. */
export function realPrice(p: Partner, ru: boolean): string {
  if (p.priceRub === null) return ru ? 'Цена не указана: уточните у организации.' : 'No price given: ask the organisation.';
  if (p.priceRub === 0) return ru ? 'Бесплатно (по словам организации).' : 'Free (as the organisation says).';
  const n = p.priceRub.toLocaleString('ru-RU');
  return ru ? `Настоящая цена: ${n} руб. (платится организации, это не игровые деньги)` : `Real price: ${n} RUB (paid to the organisation, not game money)`;
}

export const HIDE_KEY = 'vrussia_hide_partners';
const kvDefault = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
/** Whether this player switched partner places off (kept on this device only). */
export function hidden(kv: KV | null = kvDefault()): boolean { try { return kv?.getItem(HIDE_KEY) === '1'; } catch { return false; } }
export function setHidden(on: boolean, kv: KV | null = kvDefault()): void { try { if (on) kv?.setItem(HIDE_KEY, '1'); else kv?.removeItem(HIDE_KEY); } catch { /* forgotten on reload */ } }
