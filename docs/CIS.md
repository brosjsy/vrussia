# All CIS countries

The sign-up form already lists every country (`src/countries.ts`, group “CIS”: Russia, Armenia, Azerbaijan, Belarus, Kazakhstan, Kyrgyzstan, Moldova, Tajikistan, Turkmenistan, Uzbekistan). Since round 154 each of them is also a **playable character**. Russia is covered by the two citizen characters (Moscow, regional). Georgia and Ukraine left the CIS and are not included.

| Character | Country | Status in the game | Papers at the start |
|---|---|---|---|
| Tajik Migrant | Tajikistan | migrant | registration 15 days, patent |
| Uzbek Migrant | Uzbekistan | migrant | registration 15 days, patent |
| Azerbaijani Migrant | Azerbaijan | migrant | registration 15 days, patent |
| Moldovan Migrant | Moldova | migrant | registration 15 days, patent |
| Turkmen Migrant | Turkmenistan | migrant | registration 15 days, patent |
| Kyrgyz (EAEU) Worker | Kyrgyzstan | EAEU | registration 30 days, no patent |
| Kazakh (EAEU) Worker | Kazakhstan | EAEU | registration 30 days, no patent |
| Armenian (EAEU) Worker | Armenia | EAEU | registration 30 days, no patent |
| Belarusian (Union State) | Belarus | EAEU | registration 90 days, no patent |

The EAEU members are Armenia, Belarus, Kazakhstan and Kyrgyzstan; their citizens work without a patent. The others come visa-free (Turkmenistan is the exception and needs a visa) but need registration and a patent. The game values are simplified (see `prearrival.ts`).

What each character has: a start (money, knowledge, reputation, home town), Russian text, a look to start from, a shared flat, a flight home (`flights.ts` has Minsk, Baku, Chisinau and Ashgabat added), the cuisine of home in the kitchen, the pre-arrival preparation with the right country, and **six home-culture scenes** (pack `homeculture-cis.ts`; Tajikistan, Uzbekistan and Kyrgyzstan have twelve). Tests: `test/cis.test.ts`, `test/homeculture.test.ts`.

## Not done, honestly

- **Check the facts with someone from each country.** The cultural scenes rest on well-known facts (Nauryz, lavash, Martisor, Akhal-Teke and so on) but were not reviewed by native readers. Belarus has 90 days to register, as the registration scene (`reg_first`) already said; the real Union State arrangements give Belarusian citizens more than that, and a lawyer should set the exact numbers.
- **Story scenes** (the ones outside the culture pack) are written for a general migrant or EAEU worker and do not mention the individual countries.
- The six culture packs are translated into Russian (`scenes-ru-cis.ts`); the Uzbek, Tajik and Kyrgyz screens fall back to Russian for them.
- **The first download grew by about 7 KB gzipped**, so the budget in `test/perf.test.ts` went from 250 to 262 KB. The next growth should move the home-culture packs into a file loaded when a run starts.
