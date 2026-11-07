# Contributing

Thank you for helping. This page tells you how to run the project, check your change and make the most common changes. For how the code fits together read `docs/ARCHITECTURE.md`; for one line about every file, `docs/MODULES.md`.

## Run it

```bash
npm install
npm run dev          # the game in the browser, with live reload
npm run local        # the same with a local server (picks a free port)
```

The server (optional) is in `server/`; its own instructions are in `docs/BACKEND.md` and `docs/DEPLOY_VPS.md`.

## Check your change (before you ask anyone to look)

```bash
npm run typecheck    # TypeScript
npm test             # the fast test suite (about 5 minutes)
npm run build && npm run check:bundle   # the size budget
npm run test:server  # only if you changed server/
npm run e2e          # real-browser tests (PW_CHANNEL=chrome uses installed Chrome)
```

Long checks you run when they matter: `npm run test:full`, `npm run balance`, `npm run playtest`.

## Common changes

**Add a scenario.** Open the file of the right theme in `src/content/` and call `S({ id: 'my-id', cat: 'life', title, text, choices: [...] })`. Give it a unique `id`, a `req` if it should appear only in some situations, and choices with a result (`msg` and `fx`). Run `npm test`: the simulation tests play many games and catch broken scenarios.

**Add a Russian version of a scenario.** `RU_EXPORT=all npx vitest run test/ru-coverage.test.ts` lists what is still in English (`docs/translate/all.json`). Follow `docs/RU_COVERAGE.md`. Leave a result line empty where the result differs from game to game.

**Add a character (origin).** Add an entry to `origins` in `src/engine.ts`; add its Russian text to `ORIGINS_RU` in `src/i18n.ts`, its home town to `HOME_RU` in `src/scenes-ru.ts`, its look to `GROUP_OF_ORIGIN` in `src/avatar.ts`, its flat to `dwellingOf` in `src/homes.ts`; for a character from one country, the country to `ORIGIN_COUNTRY` in `src/prearrival.ts`. Update the count in `test/docs.test.ts`.

**Change a legal rule.** Change the number in the engine and the scenes, and update or add its source in `src/platform/citations.ts`. After a person has checked the official text: `node scripts/verify-source.mjs <id> --confirm "Your Name"`.

**Add a language string.** Interface text: `src/i18n.ts` (English and Russian). Platform text: `src/platform/pf-text.ts`. The tests check that keys exist in every language.

**Add or change a screen.** Put the drawing in the `*-ui.ts` file of that feature and the rules elsewhere. Load heavy screens with `import()`. Check keyboard use and high-contrast mode; `test/a11y.test.ts` and the e2e tests cover the basics.

## Rules we keep

- Never state a legal rule the cited source does not support; say "not checked" instead.
- No personal data in events, logs or URLs; consent first.
- No new dependency without a reason in the pull request; versions are pinned exactly.
- Keep the first download small (`npm run check:bundle`).
- Every file has a header comment; run `node scripts/module-map.mjs` after adding a file.

## Security

Report a security problem privately to the project owner, not in a public issue. The developer-run checks are described in `docs/OWASP.md`; they are not a penetration test.
