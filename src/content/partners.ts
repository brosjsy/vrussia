/* The verified partners shown in the phone's "Partner services" app. Empty on purpose: an organisation is added here only after a person has checked it
   (registration, tax number, the licence its trade needs), a written agreement exists, and the checks are written in the entry. The rules are
   docs/PARTNER_PLACES.md, and test/partners.test.ts refuses the build if any entry here breaks them. Prices are real roubles, never game money.
   The format of one entry:
   {
     id: 'example-uni', name: 'Example University', nameRu: 'Пример-университет', taxId: '7700000000', category: 'university', cities: ['Moscow'],
     blurb: 'Help desk for new foreign students: papers, housing, language.', blurbRu: 'Центр помощи новым иностранным студентам: документы, жильё, язык.',
     url: 'https://example.edu/international', priceRub: 0, from: '2027-01-01', until: '2027-12-31',
     reviewedBy: 'Name of the person who checked', reviewedOn: '2026-12-15', agreement: 'Agreement No. 12 of 2026-12-10', licence: '(if the trade needs one)',
   }
   Do not add an example like this to the list itself: it would be shown to players. */
import type { Partner } from '../partners';

export const PARTNERS: Partner[] = [];
