/* Who has checked the Uzbek, Tajik and Kyrgyz texts. A native reader reviews them with docs/translate/locale-review.csv (see docs/LOCALES.md),
   fixes the texts in locale-data.ts and pf-text.ts, then sets the language here. Until then the language list says the text is not yet reviewed.
   Honest by design, like `verifiedOn` in citations.ts: the date must mean that a person read it. */
export interface Review { by: string; on: string }
export const REVIEWED: Record<string, Review | null> = {};     // a language id with a Review once a person has read it
export const needsReview = (l: string): boolean => l !== 'en' && l !== 'ru' && !REVIEWED[l];
