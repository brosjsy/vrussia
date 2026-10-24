// Writes the report "V Russia: the features, how to play, and a play-test" as a PDF (docs/V_Russia_report.pdf), from the play-test's results
// (dev/playtest/<seed>-<players>-players.json, written by: PT_PLAYERS=50 PT_DB_DIR=dev/playtest-db PT_OUT=docs/PLAYTEST_50.md npx vitest run test/players20.test.ts)
// and the game's own lists (docs/ACTIVITIES.md, docs/DISHES.md). The page is HTML; Microsoft Edge (or Chrome) prints it to PDF.
// Run: node scripts/playtest-pdf.mjs [seed] [players]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const seed = process.argv[2] ?? '1', players = process.argv[3] ?? '50', R = JSON.parse(readFileSync(`dev/playtest/${seed}-${players}-players.json`, 'utf8'));
const esc = x => String(x ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rub = n => `${Math.round(n).toLocaleString('en-US')} ₽`;
const pct = (a, b) => `${Math.round((100 * a) / Math.max(1, b))}%`;

// the game's own lists
const acts = readFileSync('docs/ACTIVITIES.md', 'utf8'), dishes = readFileSync('docs/DISHES.md', 'utf8');
const actTotal = acts.match(/\*\*(\d+) activities\*\*/)?.[1], actCats = [...acts.matchAll(/^## (.+?) \((\d+) built, (\d+) scenes/gm)].map(m => [m[1], Number(m[2]), Number(m[3])]);
const dishTotal = dishes.match(/\*\*(\d+) dishes\*\*/)?.[1], cuisines = [...dishes.matchAll(/^## (.+?) \((\d+)\)/gm)].map(m => [m[1], Number(m[2])]);

// ---------- what the game has, area by area (kept by hand, checked against README.md and the code) ----------
const AREAS = [
  ['Starting a life', 'Choose who you are: a Moscow "nepo baby", a regional kid, a Tajik, Uzbek or Kyrgyz labour migrant, a foreign student (from Lagos), a Dagestani student. Choose a difficulty (Easy, Normal, Realistic), make your character (skin, hair, height, clothes), and live two years (730 days).'],
  ['Before Russia (foreigners)', 'A foreigner can start at home: the passport, the invitation, the HIV test, insurance and photos, the visa form (with its typos), a consulate appointment on a calendar, the interview, collecting the visa, buying the ticket and the migration card at the border. Visa-free countries (Central Asia, the EAEU) skip the visa.'],
  ['A day', 'Each day has three parts (morning, afternoon, evening); every action uses one. Needs fall during the day (hunger, hygiene, social contact, fun, the toilet), and energy, stress, health, money, reputation and knowledge change with what you do. Rent is paid on Saturdays. Over 4,000 life scenes come up with choices that are remembered.'],
  ['Papers and the law', 'Registration, the medical exam, health insurance, the work patent and its monthly payment, the language test, RVP, VNZh and citizenship, with the real state duties. Expired papers mean police checks, fines and legal strikes; three strikes mean deportation. Crime and the police: shoplifting, pickpocketing, a fight, fare dodging, drinking in public, being robbed, calling 102, witnessing, arrest, court (fines, arrest, a suspended sentence, colony) and the MVD raids that look for undocumented foreigners.'],
  ['Work and money', 'Job applications, shifts and promotions (Trainee to Lead), gig work (courier, barista mini-games), state and public jobs (police, traffic police, migration service, tax, customs, emergencies, bailiffs, MFC, railways, post) with a workday of decisions, the commute and parking, a business of your own, banks, cards, transfers home, loans, mortgages, savings goals, self-employment.'],
  ['Home life', 'Rented rooms, dorms, flats, building your own house, furniture you place yourself, renovation, cleaning, the dishes, the rubbish, plants, breakdowns (a tap, a socket, the fridge, the heater), lost keys and the locksmith, the alarm clock, series, books, naps, laundry and the phone bill.'],
  ['The Kitchen', `${Number(dishTotal ?? 1000).toLocaleString('en-US')} dishes of ${cuisines.length} cuisines, cooked step by step: take the ingredients from a shelf, prepare them safely (do not wash raw chicken, thaw in the fridge, boil red beans hard), answer the four steps of that kind of dish, a kitchen safety question, the doneness check and the leftovers. Stars, mistakes explained, food poisoning after dangerous ones. A drawing of every dish, suggestions, diets (halal, vegetarian, vegan), guests with allergies, the family, a fridge where food goes off, the market and haggling, equipment, ranks and unlocking, cuisine medals, a daily online challenge with a table of the best, in English and Russian.`],
  ['City life', `${actTotal ?? '400+'} ordinary activities in the City life app and the other apps (health, food, sport, culture, faith, friends, family and love, children, study, travel, shopping, repairs, nature, holidays in their real months, papers), each with its price, time, what it needs and what it gives.`],
  ['Getting around', 'The metro of the real city, buses, trains between 37 cities, flights (a full booking site, the airport and the border), the driving school and a car, carsharing and scooters. Weather and seasons: snow, frost and rain.'],
  ['People', 'Friends, dating, marriage at the ZAGS, children, family decisions, calls and money home, 14 recurring characters whose stories remember your choices, pets and stray dogs.'],
  ['The phone', 'Your own Russian number and SIM, 20 apps: jobs, the state service, police and law, the household, the City life, the Kitchen, study, housing, daily life, trains, the shop, messages (with scam texts), dating, games, calls, the bank, and 14 online services filled in step by step.'],
  ['The 3D city and the map', 'A 3D world where people walk, talk and work, cars that wait for people, rooms you can enter and use, billboards with players\' adverts, the city hall and its weekly election; an optional real map from OpenStreetMap.'],
  ['Online with other players', 'Accounts on the game\'s own server, a cloud save, the leaderboard, who is online, chat at places and in private (adults only, report and block), following and friends, homes to visit and a guest book, a city vote, adverts on the boards of the 3D city, weekly challenges, and the Kitchen\'s daily dish table.'],
  ['Goals and endings', '45 achievements, a first-month checklist, goals, a journal, a hall of fame. Lives end at two years, or earlier: deported, broke, ill.'],
];
const HOW = [
  ['1. Start', 'Open the game, press New game, choose who you are and the difficulty, make your character. A foreigner can tick "start at home" to go through the visa and the ticket first.'],
  ['2. The first days', 'The first-month checklist says what matters: a SIM card, registration, the medical exam and the patent for a migrant, a bank account, a job or classes. The phone (bottom right) has the apps.'],
  ['3. Each part of the day', 'Pick one thing: an action on the map (work, study, rest, the market, the clinic...), a place to go by metro or bus, an app on the phone, or the 3D view to walk in. Small things at home (a tea, a shower) take no part of the day.'],
  ['4. Scenes', 'Life scenes come up with two to four choices (keys 1-9). Some cost money or give it, some change your papers, friends or family; characters remember.'],
  ['5. Keep it going', 'Keep the needs up, pay the rent and the bills, keep papers valid (the game warns), save money, move up at work, make friends. Build the life you choose: a cook, an officer, a businessman, a student, a family.'],
  ['6. The end', 'After two years (or earlier) the ending screen sums up your life; a logged-in player\'s score goes on the online leaderboard.'],
];

// ---------- the results ----------
const O = R.outcomes, rows = R.rows;
const worked = rows.filter(r => r.ok > 0).length, crashes = rows.reduce((a, r) => a + r.err, 0);
const HOW_END = { time: 'Lived the full two years', deported: 'Deported', debt: 'Ran out of money (debt)', hospital: 'Health gave out (hospital)' }, endName = k => HOW_END[k] ?? k;
const endings = {}; for (const o of O) for (const l of o.history) endings[endName(l.over)] = (endings[endName(l.over)] ?? 0) + 1;
const livesAll = O.reduce((a, o) => a + o.lives, 0);
const byStyle = {}; for (const o of O) (byStyle[o.style] ??= []).push(o);
const avg = (xs, f) => xs.length ? xs.reduce((a, x) => a + f(x), 0) / xs.length : 0;
const areas = {}; for (const r of rows) { const a = (areas[r.area] ??= { f: 0, ok: 0, tot: 0, okP: 0, ps: 0 }); a.f++; a.ok += r.ok; a.tot += r.tot; a.okP += r.okP; a.ps += r.ps; }
const kitchenRows = rows.filter(r => r.area === 'Kitchen');

const css = `@page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}body{font:10.5pt/1.45 "Segoe UI",Arial,sans-serif;color:#1b2333;margin:0}
h1{font-size:24pt;margin:0 0 4mm;color:#16203a}h2{font-size:15pt;margin:8mm 0 3mm;color:#16203a;border-bottom:2px solid #e0373f;padding-bottom:1mm;break-after:avoid}
h3{font-size:12pt;margin:5mm 0 2mm;break-after:avoid}p{margin:0 0 2.5mm}.cover{height:250mm;display:flex;flex-direction:column;justify-content:center;border-left:8px solid #e0373f;padding-left:10mm}
.sub{font-size:13pt;color:#4a5670}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:6mm 0}.kpi{border:1px solid #d4daee;border-radius:3mm;padding:3mm}.kpi b{display:block;font-size:17pt;color:#2f5fd0}
table{border-collapse:collapse;width:100%;margin:2mm 0 4mm;font-size:8.6pt}th,td{border:1px solid #d4daee;padding:1.3mm 1.8mm;text-align:left;vertical-align:top}th{background:#eef1fa}tr{break-inside:avoid}
.area td:first-child{font-weight:600;width:34mm}.small{font-size:8.6pt;color:#4a5670}.ok{color:#1d7a3a;font-weight:600}.bad{color:#b3261e;font-weight:600}.pb{break-before:page}.note{background:#fff8e6;border:1px solid #f0d58e;border-radius:2mm;padding:3mm;margin:3mm 0}
code{font-family:Consolas,monospace;font-size:9pt;background:#f1f3f8;padding:0 1mm;border-radius:1mm}`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>V Russia report</title><style>${css}</style></head><body>
<section class="cover"><h1>V Russia</h1><p class="sub">A life simulator of Russia in the browser.<br>The features, how it is played, and a play-test with ${R.players} players.</p>
<p class="small">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · play-test seed ${R.seed} · ${R.days} game days each, then every life to its end · ${R.seconds} seconds on the game's own server</p></section>

<h2>1. The game in short</h2>
<p>V Russia is a free life simulator in the browser, set in Russia. The player picks a life (a citizen, a labour migrant, a foreign student) and lives two years of it: work, study, papers, family, culture, crime and the police, cooking, and many small everyday surprises. It runs on a computer or a phone, in English or Russian, offline or online with other players on the game's own server.</p>
<div class="kpis"><div class="kpi"><b>4,000+</b>life scenes with choices</div><div class="kpi"><b>${esc(actTotal)}</b>everyday activities</div><div class="kpi"><b>${Number(dishTotal).toLocaleString('en-US')}</b>dishes to cook</div><div class="kpi"><b>20</b>phone apps</div></div>

<h2>2. How a player plays</h2>
<table class="area">${HOW.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>

<h2>3. All the features, area by area</h2>
<table class="area"><tr><th>Area</th><th>What the player can do</th></tr>${AREAS.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>
<h3>The everyday activities (${esc(actTotal)}), by category</h3>
<table><tr><th>Category</th><th>Built</th><th>Only in scenes</th></tr>${actCats.map(([c, b, s]) => `<tr><td>${esc(c)}</td><td>${b}</td><td>${s}</td></tr>`).join('')}</table>
<h3>The Kitchen's dishes (${esc(dishTotal)}), by cuisine</h3>
<table><tr>${cuisines.map(([c, n]) => `<td>${esc(c)}: <b>${n}</b></td>`).reduce((a, x, i) => a + x + ((i + 1) % 4 === 0 ? '</tr><tr>' : ''), '')}</tr></table>

<h2 class="pb">4. The test database: ${R.players} players to log in as</h2>
<p>The play-test leaves its database behind: ${O.length} accounts${R.players > O.length ? ` (one of the ${R.players} deleted its account on day 90, as part of the test)` : ''}, each with a confirmed e-mail, a profile, a save of its life from day 100 (load it after logging in), its leaderboard scores, chats, friends, homes and adverts. Start the game on it on this computer:</p>
<p><code>npm run local -- --db dev/playtest-db</code> &nbsp;then open <code>http://127.0.0.1:5173</code>, press 🌐 and log in as any of them.</p>
<div class="note">The e-mail addresses end in <code>@play.test</code> (a test domain; no e-mail is ever sent there). The passwords are in <code>server/secrets/playtest-accounts.json</code> on this computer (git never takes that folder). They are test accounts only, never real people, and the database never leaves this computer.</div>
<table><tr><th>#</th><th>Username</th><th>E-mail</th><th>Style</th><th>Starting life</th><th>Under 18</th></tr>${O.map((o, i) => `<tr><td>${i + 1}</td><td>${esc(o.name)}</td><td>${esc(o.email)}</td><td>${esc(o.style)}</td><td>${esc(o.origin)}</td><td>${o.adult ? '' : 'yes (no chat)'}</td></tr>`).join('')}</table>
<p class="small">Styles: <b>careful</b> players do the safe thing and answer the Kitchen right; <b>social</b> players chat, follow and visit; <b>hustlers</b> chase money; <b>random</b> players pick anything. The bots press the same buttons and call the same rules as a person; they are not people, so they find what breaks and what is out of reach, not what is fun.</p>

<h2 class="pb">5. The play-test: what the ${R.players} players did</h2>
<div class="kpis"><div class="kpi"><b>${rows.length}</b>features tried</div><div class="kpi"><b class="${worked === rows.length ? 'ok' : ''}">${worked}</b>worked for someone</div><div class="kpi"><b class="${crashes ? 'bad' : 'ok'}">${crashes}</b>crashes</div><div class="kpi"><b class="${R.serverErrors.length ? 'bad' : 'ok'}">${R.serverErrors.length}</b>server errors</div></div>
<p>Each player lived ${R.days} game days, going round all ${R.features} features again and again (two a day besides the day's ordinary actions), then played the rest of each life to its end. Every 10 days the world was checked: no server errors, numbers in range, sessions alive, the server's saves equal to the device's, private talks private, the number of accounts right. ${R.problems.length ? `<span class="bad">Problems: ${esc(R.problems.join('; '))}</span>` : '<span class="ok">No problems were found.</span>'}</p>
<h3>How the ${livesAll} lives ended</h3>
<p class="small">A player whose life ended early started a new one, so most players lived more than one life.</p>
<table><tr><th>Ending</th><th>Lives</th></tr>${Object.entries(endings).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')}</table>
<h3>By play style</h3>
<table><tr><th>Style</th><th>Players</th><th>Features that worked (average)</th><th>Achievements (average)</th><th>Dishes cooked (average)</th><th>Lives (average)</th><th>Money at the end of the longest life (average)</th></tr>${Object.entries(byStyle).map(([k, xs]) => `<tr><td>${esc(k)}</td><td>${xs.length}</td><td>${avg(xs, o => o.features.worked).toFixed(0)} of ${xs[0].features.of}</td><td>${avg(xs, o => o.achievements).toFixed(1)}</td><td>${avg(xs, o => o.kitchen.cooked).toFixed(1)}</td><td>${avg(xs, o => o.lives).toFixed(1)}</td><td>${rub(avg(xs, o => o.longest.money))}</td></tr>`).join('')}</table>
<h3>By area of the game</h3>
<table><tr><th>Area</th><th>Features</th><th>Tries</th><th>Worked</th></tr>${Object.entries(areas).sort().map(([k, a]) => `<tr><td>${esc(k)}</td><td>${a.f}</td><td>${a.tot}</td><td>${pct(a.ok, a.tot)}</td></tr>`).join('')}</table>
<p class="small">"Worked" counts the tries that the game carried out; the rest were refused with a reason (no money, not open at night, the papers missing, already done today). A refusal with a reason is the game working; only a crash is a bug.</p>
<h3>The Kitchen in the play-test</h3>
<table><tr><th>Feature</th><th>Players it worked for</th><th>Tries</th><th>Worked</th><th>Main reasons it was refused</th></tr>${kitchenRows.map(r => `<tr><td>${esc(r.f)}</td><td>${r.okP} / ${r.ps}</td><td>${r.tot}</td><td>${pct(r.ok, r.tot)}</td><td>${esc(r.w || '—')}</td></tr>`).join('')}</table>

<h2 class="pb">6. Each player</h2>
<table><tr><th>Player</th><th>Style · start</th><th>Their lives</th><th>Money (longest life)</th><th>At the end of the longest life</th><th>Ach.</th><th>Features</th><th>Kitchen (all lives)</th><th>What they did most</th></tr>${O.map(o => { const L = o.longest; return `<tr><td><b>${esc(o.name)}</b></td><td>${esc(o.style)} · ${esc(o.origin)}</td><td class="small">${o.history.map(l => `${esc(endName(l.over))} (day ${l.day})`).join('; ')}</td><td>${rub(L.money)}</td><td>${esc(L.city)} · ${esc(L.job ?? 'no job')} · ${esc(L.housing)} · ${esc(L.status)}${L.partner ? ' · partner' : ''}${L.kids ? ` · ${L.kids} child${L.kids > 1 ? 'ren' : ''}` : ''} · health ${L.health}</td><td>${o.achievements}</td><td>${o.features.worked}/${o.features.of}</td><td>${o.kitchen.cooked} cooked, ${o.kitchen.threeStars}★★★ · ${esc(o.kitchen.rank)}</td><td class="small">${esc(o.features.most.join(', '))}</td></tr>`; }).join('')}</table>

<h2 class="pb">7. Every feature</h2>
<table><tr><th>Area</th><th>Feature</th><th>Players</th><th>Tries</th><th>Worked</th><th>Main reasons it was refused</th></tr>${rows.map(r => `<tr><td>${esc(r.area)}</td><td>${esc(r.f)}</td><td>${r.okP} / ${r.ps}</td><td>${r.tot}</td><td>${pct(r.ok, r.tot)}${r.err ? ` <span class="bad">${r.err} crashes</span>` : ''}</td><td class="small">${esc(r.w || '—')}</td></tr>`).join('')}</table>
<h3>The world, checked every 10 days</h3><ul class="small">${R.checks.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
<h3>The online leaderboard at the end</h3><p>${R.leaderboard.map(r => `@${esc(r.username)} ${r.score}`).join(' · ')}</p>
<h2>8. What this test does not show</h2>
<p>The players are bots: they show what works, what is refused and why, and what crashes; they do not show what is fun, clear or too hard for a person. The game was also played by hand in the browser while it was built (the screenshots in <code>docs/screens/</code>). Not covered here: a real phone on a real network, many people at once on a public server (the game is not on one yet), and the visual look of every screen.</p>
</body></html>`;

mkdirSync('docs/report', { recursive: true });
const htmlPath = resolve('docs/report/V_Russia_report.html'), pdfPath = resolve('docs/V_Russia_report.pdf');
writeFileSync(htmlPath, html);
const browsers = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const exe = browsers.find(existsSync); if (!exe) { console.log('No Edge or Chrome found: open docs/report/V_Russia_report.html and print it to PDF.'); process.exit(0); }
const r = spawnSync(exe, ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], { stdio: 'inherit' });
console.log(r.status === 0 && existsSync(pdfPath) ? `Written: ${join('docs', 'V_Russia_report.pdf')}` : 'Printing failed: open docs/report/V_Russia_report.html and print it to PDF.');
