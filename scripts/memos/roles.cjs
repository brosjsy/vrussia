// node scripts/memos/roles.cjs   writes docs/memo/open_roles_en|ru.html and .pdf (Chrome headless): the open roles of the project, for a group announcement.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const OUT = path.join(__dirname, '..', '..', 'docs', 'memo');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CSS = `@page{size:A4;margin:16mm 15mm}*{box-sizing:border-box}body{font:10.5pt/1.45 "Segoe UI",Arial,sans-serif;color:#1b2430;margin:0}
h1{font-size:20pt;margin:0 0 2pt;color:#13304d}h2{font-size:12pt;margin:13pt 0 4pt;color:#13304d;border-bottom:1.5px solid #c9d6e4;padding-bottom:2pt}
.sub{color:#5a6b7d;font-size:9.5pt;margin-bottom:8pt}p{margin:4pt 0}ul{margin:3pt 0 3pt 15pt;padding:0}li{margin:2pt 0}
table{border-collapse:collapse;width:100%;margin:5pt 0;font-size:9.5pt}th,td{border:1px solid #c9d6e4;padding:3.5pt 6pt;text-align:left;vertical-align:top}th{background:#eef3f8}
.box{background:#f3f7fb;border-left:4px solid #2f6fa8;padding:6pt 9pt;margin:7pt 0}.conf{font-size:8.5pt;color:#8a4b00;margin-top:10pt}`;
const list = a => `<ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
const table = (head, rows) => `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const page = (lang, title, sub, body, foot) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body><h1>${title}</h1><div class="sub">${sub}</div>${body}<div class="conf">${foot}</div></body></html>`;

const EN = page('en', 'In Russia: join the team', 'Open roles · 31 October 2026',
  `<h2>The project</h2><p>«В России / In Russia» is a free browser game in which a person from <b>any country</b> coming to Russia lives two simulated years: papers and registration, work or study, housing, money, health and protection from fraud. It is made for foreign students, workers and newcomers, and for Russian young people. It runs in the browser, works offline, and respects privacy. The product already works; we are building the team to take it to a university pilot.</p>
<div class="box"><b>Where we are:</b> a working game with 14 starting characters, about 4,300 story scenes, 3D Russian cities, a class mode for teachers, interface in Russian and English (Uzbek, Tajik, Kyrgyz in part), and more than 1,000 automated tests. A university pilot is the next step.</div>
<h2>Roles we are looking for</h2>${table(['Role', 'What you would do', 'Helpful'],
    [['<b>3D / graphics developer</b> (priority)', 'Improve the 3D city and housing: building and roof models, trees, sidewalks, lighting and weather; keep it fast on ordinary phones.', 'Three.js or WebGL, low-poly modelling, level-of-detail, performance profiling'],
     ['<b>3D artist</b>', 'Make or improve models and textures for buildings, interiors, street objects and characters in a consistent style.', 'Blender, glTF export, optimisation for the web'],
     ['<b>ML engineer</b>', 'Game balance, personalised scenarios, a guide assistant that answers only from vetted sources.', 'Reinforcement learning basics, retrieval, evaluation without real users'],
     ['<b>Data analyst</b>', 'Plan and read anonymous, consent-based analytics; evaluate the university pilot.', 'Experiment design, product analytics'],
     ['<b>Project or product manager</b>', 'A 90-day plan, the pilot, partners, reviewers and deadlines.', 'Education or social projects, working with universities'],
     ['<b>Full-stack / backend developer</b>', 'Browser client (TypeScript) and server (Fastify, PostgreSQL): accounts, class mode, reliability.', 'Node.js, PostgreSQL, API security'],
     ['<b>Native reviewers</b> (Uzbek, Tajik, Kyrgyz)', 'Check the interface texts so that they sound right and are correct.', 'Fluent native speaker; no technical skills needed']])}
<h2>The 3D task in more detail</h2>${list(['The cities are built in the browser from real city data and simple models; some buildings, roofs, trees and sidewalks look basic or repeat.', 'We want a more believable, consistent look <b>without</b> making the game heavy: it must stay playable on an ordinary phone and a slow connection.', 'A first small task for a candidate: pick one thing (for example roofs, trees or street lighting), show what you would change, and estimate the performance cost.'])}
<h2>How it works</h2>${list(['Write to us with a few lines about you and the hours a week you can give.', 'A 20-minute call: we tell you about the project, you ask questions.', 'A small trial task, then we agree how to work together. Terms are discussed individually: the project is early-stage and funded by grants and university support.', 'After an agreement we share the source code, architecture and plans.'])}
<h2>What we value</h2>${list(['Honesty about what you can and cannot do.', 'Respect for privacy and for official sources: the game must never state a rule that the sources do not support.', 'Small, light and tested: every change keeps the automated tests green.'])}
<h2>Contact</h2><p>Use the contact in the message that came with this file.</p>`, 'This sheet gives a short overview. Source code, architecture, security details, budget and funding are shared after an agreement is signed.');

const RU = page('ru', 'В России: приглашаем в команду', 'Открытые роли · 31 октября 2026',
  `<h2>О проекте</h2><p>«В России / In Russia» — бесплатная браузерная игра, в которой человек из <b>любой страны</b>, приехавший в Россию, проживает два смоделированных года: документы и регистрация, работа или учёба, жильё, деньги, здоровье и защита от мошенников. Она рассчитана на иностранных студентов, работников и новоприбывших, а также на российскую молодёжь. Работает в браузере, в том числе офлайн, и уважает приватность. Продукт уже работает; мы собираем команду, чтобы довести его до пилота в университете.</p>
<div class="box"><b>Где мы сейчас:</b> рабочая игра с 14 стартовыми персонажами, около 4 300 сюжетных сцен, 3D-города России, режим класса для преподавателей, интерфейс на русском и английском (узбекский, таджикский, киргизский — частично) и более 1 000 автоматических тестов. Следующий шаг — пилот в университете.</div>
<h2>Кого мы ищем</h2>${table(['Роль', 'Что делать', 'Будет плюсом'],
    [['<b>3D-разработчик / графика</b> (приоритет)', 'Улучшить 3D-город и жильё: модели зданий и крыш, деревья, тротуары, освещение и погоду; сохранить быстродействие на обычных телефонах.', 'Three.js или WebGL, low-poly моделирование, уровни детализации, профилирование производительности'],
     ['<b>3D-художник</b>', 'Создать или улучшить модели и текстуры зданий, интерьеров, уличных объектов и персонажей в едином стиле.', 'Blender, экспорт в glTF, оптимизация для веба'],
     ['<b>Инженер ML</b>', 'Баланс игры, персональные сценарии, помощник-справочник, отвечающий только по проверенным источникам.', 'Основы обучения с подкреплением, поиск, оценка без живых пользователей'],
     ['<b>Аналитик данных</b>', 'Спланировать и читать анонимную аналитику с согласия игроков; оценить пилот в университете.', 'Планирование экспериментов, продуктовая аналитика'],
     ['<b>Руководитель проекта / продукт-менеджер</b>', 'План на 90 дней, пилот, партнёры, рецензенты и сроки.', 'Образовательные и социальные проекты, работа с университетами'],
     ['<b>Full-stack / backend-разработчик</b>', 'Клиент в браузере (TypeScript) и сервер (Fastify, PostgreSQL): аккаунты, режим класса, надёжность.', 'Node.js, PostgreSQL, безопасность API'],
     ['<b>Рецензенты-носители</b> (узбекский, таджикский, киргизский)', 'Проверить тексты интерфейса: чтобы звучали естественно и были правильными.', 'Свободное владение языком; технические навыки не нужны']])}
<h2>Задача по 3D подробнее</h2>${list(['Города строятся в браузере из реальных данных о городе и простых моделей; некоторые здания, крыши, деревья и тротуары выглядят просто или повторяются.', 'Мы хотим более правдоподобный и единый облик <b>без</b> утяжеления игры: она должна оставаться играбельной на обычном телефоне и медленном интернете.', 'Первая небольшая задача для кандидата: выбрать одно (например, крыши, деревья или уличное освещение), показать, что бы вы изменили, и оценить стоимость по производительности.'])}
<h2>Как это устроено</h2>${list(['Напишите нам несколько строк о себе и сколько часов в неделю вы можете выделить.', 'Созвон на 20 минут: мы рассказываем о проекте, вы задаёте вопросы.', 'Небольшое пробное задание, затем договариваемся о совместной работе. Условия обсуждаются индивидуально: проект на ранней стадии и финансируется грантами и поддержкой университета.', 'После договорённости мы открываем исходный код, архитектуру и планы.'])}
<h2>Что для нас важно</h2>${list(['Честность о том, что вы умеете и чего не умеете.', 'Уважение к приватности и официальным источникам: игра не должна утверждать правило, которого нет в источниках.', 'Мало, легко и протестировано: каждое изменение сохраняет автоматические тесты зелёными.'])}
<h2>Контакт</h2><p>Используйте контакт из сообщения, с которым пришёл этот файл.</p>`, 'Этот лист — краткий обзор. Исходный код, архитектура, детали безопасности, бюджет и финансирование передаются после подписания соглашения.');

for (const [name, html] of [['open_roles_en', EN], ['open_roles_ru', RU]]) {
  const h = path.join(OUT, name + '.html'), p = path.join(OUT, name + '.pdf');
  fs.writeFileSync(h, html);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--print-to-pdf=' + p, 'file:///' + h.replace(/\\/g, '/')], { stdio: 'ignore' });
  console.log(name, fs.statSync(p).size);
}
