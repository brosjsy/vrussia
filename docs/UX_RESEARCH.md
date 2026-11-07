# First-time player research: what it says and what we changed

Searched on 31 October 2026. Most of what is public on this topic is practitioner advice (engine vendors, platform documentation, blogs), not controlled studies. Where a source gave a number without evidence, it is not used here.

## What the sources say

| Finding | Source | Strength |
|---|---|---|
| The first session decides a lot: new players judge a game in minutes, and day-1 retention is the usual measure of onboarding. A Meta developer post reports that longer first-day play goes with a higher return rate. | [Roblox onboarding docs](https://create.roblox.com/docs/en-us/production/game-design/onboarding), [Meta growth insights](https://developers.meta.com/horizon/blog/growth-insights-series-building-competency-new-user-onboarding/) | Vendor data, correlation only |
| Put the most engaging mechanic first; do not make the player read before they play. | [Unity first-time-user tips](https://unity.com/how-to/10-first-time-user-experience-tips-games) | Practitioner advice |
| Teach one skill at a time, when it is needed; reveal depth as the player gains competence (progressive disclosure). | Meta (above), [Yu-kai Chou on onboarding](https://yukaichou.com/gamification-study/game-design-techniques-the-onboarding-bundle/) | Practitioner advice |
| Show short-, mid- and long-term goals, and keep them visible in the interface. Sandbox-style life games feel unapproachable without guided early goals. | Roblox (above), [Peasant to Noble, a student project on simulation games](https://ixd.smc.edu/student-profile-projects/peasant-to-noble) | Practitioner advice, a student project |
| Give feedback for good actions at once (sound, visual reward). “Juicy” feedback is thought to motivate through curiosity, competence and effectance; the authors of the CHI 2024 study say why it works is still not known. | [Kao and others, CHI 2024](https://spiral.imperial.ac.uk/entities/publication/253c32f5-d124-4a23-88b5-9aaaf114608d) | Peer-reviewed, tests mechanisms, not retention |
| Players with competence, autonomy and relatedness stay with simulation games. | Self-determination theory, via the student project above | Theory, secondhand |
| Layer the mix: effects above music above ambience (rule of thumb: effects about −3 to −6 dB, music −6 to −12, ambience −12 to −18). Vary repeated sounds (3 to 5 variants). Change the music with the game state and crossfade so the player does not notice the seam. Muffle the mix when the character is hurt. | [game-audio guides](https://www.mdskills.ai/skills/game-audio) | Rules of thumb collected on skill pages; a GDC talk or the Wwise/FMOD docs would be the authoritative source |
| If audio plays by itself for more than 3 seconds, give a way to pause or stop it, or a volume control independent of the system volume. Prefer audio that starts from a user action. | [WCAG 1.4.2 Audio Control](https://www.w3.org/WAI/WCAG20/Understanding/audio-control), [Deque](https://dequeuniversity.com/rules/axe/4.9/no-autoplay-audio) | Standard (Level A) |
| Day-1 retention for mobile games is around 22 to 30 percent, day-7 8 to 14 percent; a large gap between day 1 and day 7 points at the first-time experience. | [Segwise](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies.md), [GameDev.net](https://gamedev.net/blogs/entry/2298160-the-d7d1-retention-ratio-for-mobile-games-a-complete-guide) | Directional; cohorts differ |

## What we did with it

| Finding | Change | Where |
|---|---|---|
| Clear, visible short-term goal | A “Next: …” bar on the game screen with the single most useful next step for this character (register, medical exam, insurance, language test, patent, job, bank…), the days left when a registration is about to run out, and a “Why?” button that opens the matching guide answer | `src/platform/ftue.ts` (`nextStep`), the bar in `index.html` |
| Teach when it matters | Tips shown once each, the first time something becomes relevant: low energy, low money, a legal strike, a paper about to expire, the first week | `ftue.ts` (`HINTS`, `takeHint`) |
| Early wins and immediate feedback | A celebration (toast and a short rising phrase) when a checklist step is completed; the first one of a game is marked as “your first win” | `ftue.ts` (`newWins`), `platform-ui.ts` |
| Short guided start with a way out | A seven-step tour (about a minute) in five languages, skippable with Escape, with back and replay; it replaces the long help text the first time | `onboarding.ts` |
| Layered mix | Levels in decibels: effects −5, music −10, ambience −16 | `audio.ts` (`DB`) |
| Sound follows the activity | Ten moods made on the fly: a warm pad at home, a slower one to rest in the evening, a steady pulse at work, office air at the MFC and the bank, a soft pad at the university, traffic on the street with rain or wind by weather, a rhythm at stations, a market hiss, a low tremolo when strikes, stress or health are bad | `audio.ts` (`moodFor`, `RECIPES`) |
| Crossfade and muffle | Moods fade over about 1.5 seconds; the mix is muffled when health is under 25 | `audio.ts` |
| Do not repeat the same sound | Every click sound has a few percent of pitch variation | `src/sound.ts` |
| WCAG 1.4.2 | Audio starts only after the first click or key press; music and effects can each be switched off and have their own volume (keyboard-operable sliders), independent of the device volume; sound pauses when the tab is hidden | `audio.ts`, “Sound and music” in the More menu |
| Segment players | Presets by character, adaptive scenarios, class tasks | `personalise.ts`, `classroom.ts` |
| Measure drop-off | Anonymous, consent-based events: `run_start`, `session_end` (the day the player stopped on), `scenario`, `tour_done`/`tour_skip`, `win`; the admin page shows quit days and never-picked scenarios | `telemetry.ts`, `/api/admin/stats` |

## Not done, and why

- **No A/B result yet.** The tools are in place (feature flags with a percentage rollout, anonymous events, quit-day numbers). Whether the tour, the next-step bar or the music raises day-1 return can only be known from real players.
- **Music is generated, not composed.** A pad and a rhythm made from oscillators and noise are a start. Real recorded or composed loops would make a stronger first impression, and the engine could play files in the same slots.
- **No voice or spatial audio**, and no listening test with real players. The levels are from rules of thumb; ears on a phone speaker should adjust them (they are all in `DB`).
- **No usability test with first-time players.** The research above is secondhand; five people playing for ten minutes, watched silently, would tell more than all of it.
