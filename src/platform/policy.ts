/* The privacy policy and the terms of use, in English and Russian. They describe what the game really does (checked by test/platform.test.ts against
   the list of keys and routes). The site owner must put their name and contact address in VITE_CONTACT (see docs/PLATFORM.md): until then the
   page says so plainly instead of inventing a company. This is a plain-language notice, not legal advice; a lawyer should read it before launch. */
export interface Section { h: string; p: string[] }
export interface Policy { title: string; updated: string; sections: Section[] }

export const POLICY_UPDATED = '2026-10-30';

export function contactLine(contact: string, ru: boolean): string {
  const c = contact.trim();
  if (c) return ru ? `Оператор и контакт для запросов: ${c}.` : `Operator and contact for requests: ${c}.`;
  return ru ? 'Оператор этой копии игры ещё не указал свои данные. Владелец сайта должен указать их до публичного запуска.' : 'The operator of this copy of the game has not entered their details yet. The site owner must do so before a public launch.';
}

export function privacyPolicy(ru: boolean, contact = ''): Policy {
  return ru ? {
    title: 'Политика конфиденциальности', updated: POLICY_UPDATED, sections: [
      { h: 'Коротко', p: ['Игра работает в вашем браузере. Без аккаунта ничего не отправляется на сервер: сохранения, настройки и результаты лежат только на вашем устройстве.', contactLine(contact, true)] },
      { h: 'Что хранится на вашем устройстве', p: ['Сохранённая игра, зал славы, настройки (язык, размер текста, графика), ответы на обучение и выбор по этой политике. Всё это можно скачать или стереть на странице «Мои данные».'] },
      { h: 'Если вы создаёте аккаунт', p: ['Мы храним адрес почты, публичное имя, хэш пароля (не сам пароль), сохранённую игру, результаты, сообщения в чате и объявления, которые вы написали сами. Данные нужны, чтобы сохранения переходили между устройствами и работали таблица лидеров и чат.', 'Вы можете скачать свои данные и удалить аккаунт вместе со всем, что с ним связано: пароль нужен для подтверждения.'] },
      { h: 'Анонимная статистика (только с вашего согласия)', p: ['Если вы разрешили, игра отправляет безымянные события (например, «игра началась», «игра закончилась», номер дня, на котором вы вышли) и сообщения об ошибках. В них нет имени, почты, IP-адреса и номера аккаунта; есть только случайный номер вкладки. Записи удаляются через 90 дней.', 'Если вы отказались или не ответили, ничего не отправляется.'] },
      { h: 'Классы', p: ['Если вы вводите код класса, учитель получает ваш псевдоним, выбранного героя, итог и список изученных тем. Не используйте настоящее имя: подойдёт любой псевдоним.'] },
      { h: 'Карта (по желанию)', p: ['Реальная карта загружает данные OpenStreetMap с сервиса OpenFreeMap, а поиск адреса отправляет набранный вами текст в сервис nominatim.openstreetmap.org. Это происходит только после вашего согласия; эти сервисы видят ваш интернет-адрес. Игра ничего больше им не отправляет. Ваше согласие хранится на устройстве (ключи vrussia_realmap_ok и vrussia_geo_ok).'] },
      { h: 'Телефон: сообщения и звонки между игроками', p: ['Номер телефона в игре (+7 0…) не настоящий и не связан ни с какой сетью. Если вы вошли в аккаунт и вам 18 лет или больше, сервер выдаёт вам один постоянный номер. Сообщения другому игроку хранятся на сервере 30 дней и видны вам и получателю; их можно стереть в приложении «Игроки» и в «Моих данных». При звонке сервер передаёт только служебные сообщения для соединения (они удаляются сразу после прочтения), а звук идёт напрямую между браузерами и нигде не записывается. Микрофон включается только когда вы звоните или отвечаете. Чтобы два браузера нашли друг друга, используется STUN-сервер (по умолчанию общедоступный): он видит ваш интернет-адрес.'] },
      { h: 'Дополнения: опрос о платных услугах', p: ['В телефоне есть приложение «Дополнения»: список того, что когда-нибудь могло бы продаваться, с планируемой ценой в рублях. Сейчас ничего не продаётся и ничего не списывается. Кнопка «Хочу такое» прибавляет единицу к безымянному счётчику на сервере; о вас, вашем устройстве и времени нажатия ничего не сохраняется. На вашем устройстве запоминается только то, что вы уже нажали (ключ vrussia_extras_interest), чтобы не считать вас дважды.'] },
      { h: 'Хранение и права', p: ['Вы вправе получить копию данных, исправить их и удалить. Для данных, хранящихся на сервере, используйте «Мои данные» в игре или напишите оператору. Где именно хранятся данные, зависит от сервера оператора; оператор обязан указать это (для данных граждан России — с учётом закона № 152-ФЗ).'] },
      { h: 'Дети', p: ['Чат доступен только тем, кто подтвердил возраст 18+. Для школьников есть режим класса без аккаунта и без чата.'] },
    ],
  } : {
    title: 'Privacy policy', updated: POLICY_UPDATED, sections: [
      { h: 'In short', p: ['The game runs in your browser. Without an account nothing is sent to a server: your saves, settings and results stay on your device.', contactLine(contact, false)] },
      { h: 'What is kept on your device', p: ['Your saved game, the hall of fame, settings (language, text size, graphics), whether you saw the tutorial, and your choice under this policy. You can download or erase all of it on the "My data" page.'] },
      { h: 'If you create an account', p: ['We keep your e-mail address, public name, a hash of your password (never the password itself), your saved game, scores, chat messages and the adverts you wrote. This is needed so saves follow you between devices and the leaderboard and chat work.', 'You can download your data and delete the account with everything linked to it; your password is needed to confirm.'] },
      { h: 'Anonymous usage numbers (only if you agree)', p: ['If you allow it, the game sends nameless events (for example "game started", "game ended", the day you stopped on) and error reports. They contain no name, e-mail, IP address or account number, only a random tab id. They are deleted after 90 days.', 'If you decline or do not answer, nothing is sent.'] },
      { h: 'Classes', p: ['If you enter a class code, your teacher receives your nickname, the character you chose, your result and the list of topics you learned. Do not use your real name: any nickname will do.'] },
      { h: 'The map (optional)', p: ['The real map loads OpenStreetMap data from the OpenFreeMap service, and the address search sends the text you type to nominatim.openstreetmap.org. This happens only after you agree; those services see your internet address. The game sends them nothing else. Your agreement is kept on your device (the keys vrussia_realmap_ok and vrussia_geo_ok).'] },
      { h: 'Phone: texts and calls between players', p: ['The phone number in the game (+7 0…) is not real and is connected to no network. If you are logged in and are 18 or older, the server gives you one permanent number. A text to another player is kept on the server for 30 days and is seen by you and the receiver; you can erase it in the Players app and in My data. For a call the server passes only the small set-up messages (deleted as soon as they are read); the sound goes directly between the browsers and is never recorded. The microphone is switched on only when you place a call or answer. So that two browsers can find each other a STUN server is used (a public one by default): it sees your internet address.'] },
      { h: 'Extras: a survey about paid services', p: ['The phone has an Extras app: a list of what could one day be sold, with a planned price in roubles. Nothing is on sale now and nothing is charged. The "I would want this" button adds one to an anonymous counter on the server; nothing about you, your device or the time you pressed is stored. Your device remembers only that you pressed (the key vrussia_extras_interest) so that you are not counted twice.'] },
      { h: 'Keeping data, and your rights', p: ['You may get a copy of your data, correct it and delete it. For data on the server use "My data" in the game or write to the operator. Where the data is stored depends on the operator’s server, and the operator must say where (for data of citizens of Russia, with Federal Law 152-FZ in mind).'] },
      { h: 'Children', p: ['Chat is only for players who confirmed they are 18 or older. Pupils can use class mode, which needs no account and has no chat.'] },
    ],
  };
}

export function terms(ru: boolean, contact = ''): Policy {
  return ru ? {
    title: 'Условия использования', updated: POLICY_UPDATED, sections: [
      { h: 'Это игра, а не юридическая консультация', p: ['«В России» — образовательная игра-симулятор. Сроки, суммы и правила в игре упрощены и могут устареть. Перед реальными действиями проверьте их на официальных сайтах (ссылки есть в разделе «Источники») и при необходимости обратитесь к юристу.'] },
      { h: 'Правила поведения', p: ['В чате и объявлениях нельзя оскорблять, давать контакты для обхода игры, предлагать поддельные документы и нарушать закон. Нарушения можно отметить кнопкой «Пожаловаться»; администратор может скрыть сообщение или закрыть аккаунт.'] },
      { h: 'Ответственность', p: ['Игра предоставляется «как есть». Оператор не отвечает за решения, принятые на основе игры.', contactLine(contact, true)] },
    ],
  } : {
    title: 'Terms of use', updated: POLICY_UPDATED, sections: [
      { h: 'A game, not legal advice', p: ['"In Russia" is an educational life simulator. Times, amounts and rules in the game are simplified and may be out of date. Before you act in real life, check them on the official sites (see "Sources") and, if needed, ask a lawyer.'] },
      { h: 'How to behave', p: ['In chat and adverts do not insult people, share contacts to get around the game, offer forged documents or break the law. Use "Report" to flag a message; an administrator may hide it or close the account.'] },
      { h: 'Responsibility', p: ['The game is provided "as is". The operator is not responsible for decisions made because of the game.', contactLine(contact, false)] },
    ],
  };
}

export function policyHtml(p: Policy, esc: (s: string) => string): string {
  return `<article class="legal"><h3>${esc(p.title)}</h3><p class="sub">${esc(p.updated)}</p>${p.sections.map(s => `<h4>${esc(s.h)}</h4>${s.p.map(x => `<p>${esc(x)}</p>`).join('')}`).join('')}</article>`;
}
