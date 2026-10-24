/* The words for switching accounts (round 150), loaded with the online part (cloud-sync.ts and cloud-ui.ts) so the first download stays small. */
import { addStrings } from './i18n';

addStrings(
  { olYourGame: 'Your own saved game is loaded.', olNotYourGame: 'This game belongs to another account: it is not saved to yours. Start a new game, or log in as its player.', olLoggedOut: 'Logged out. The next player who logs in gets their own game.' },
  { olYourGame: 'Загружена ваша сохранённая игра.', olNotYourGame: 'Эта игра принадлежит другому аккаунту и не сохраняется в ваш. Начните новую игру или войдите как её игрок.', olLoggedOut: 'Вы вышли. Следующий игрок после входа получит свою игру.' },
);

/** The messages of the online part (api-client.ts, cloud.ts) in Russian; they are written in English there. */
const MSG_RU: Record<string, string> = {
  'A message has 1 to 280 characters.': 'Сообщение — от 1 до 280 символов.',
  'A name has 3 to 20 small letters, digits or underscores.': 'Имя — от 3 до 20 строчных латинских букв, цифр или знаков подчёркивания.',
  'A note has 1 to 200 characters.': 'Запись — от 1 до 200 символов.',
  'Account made. Open the link in the e-mail we sent, then log in.': 'Аккаунт создан. Откройте ссылку из письма, затем войдите.',
  'Almost there: open the link in the e-mail we sent you, then log in. (No e-mail? Check the spam folder.)': 'Почти готово: откройте ссылку из письма, затем войдите. (Нет письма? Проверьте папку «Спам».)',
  'Blocked. You will not see their messages.': 'Заблокировано. Вы не увидите их сообщений.',
  'Chat is only for players who are 18 or older.': 'Чат только для игроков от 18 лет.',
  'Confirm your e-mail first: open the link we sent you.': 'Сначала подтвердите почту: откройте ссылку из письма.',
  'Enough notes for today.': 'На сегодня записей достаточно.',
  'If that address has an account waiting for confirmation, a new link is on its way.': 'Если на этот адрес есть неподтверждённый аккаунт, новая ссылка уже в пути.',
  'If that address has an account, an e-mail with a link is on its way. The link works for 30 minutes.': 'Если на этот адрес есть аккаунт, письмо со ссылкой уже в пути. Ссылка действует 30 минут.',
  'Invitation sent.': 'Приглашение отправлено.',
  'Log in first.': 'Сначала войдите.',
  'Logged in. Choose your public name.': 'Вы вошли. Выберите публичное имя.',
  'Logged out.': 'Вы вышли.',
  'No connection. The game goes on offline.': 'Нет связи. Игра продолжается без сети.',
  'Password changed. Your other devices were logged out.': 'Пароль изменён. На других устройствах выполнен выход.',
  'Please keep it polite: that word is not allowed.': 'Пожалуйста, вежливо: это слово запрещено.',
  'Reported. Thank you.': 'Жалоба отправлена. Спасибо.',
  'Saved online.': 'Сохранено в сети.',
  'Say in a few words what is wrong.': 'Опишите в нескольких словах, что не так.',
  'Taken down online too.': 'Снято и в сети.',
  'That does not look like an e-mail address.': 'Это не похоже на адрес почты.',
  'That is enough messages for today.': 'На сегодня сообщений достаточно.',
  'That is your own home.': 'Это ваш собственный дом.',
  'That name is taken. Choose another.': 'Это имя занято. Выберите другое.',
  'The ad is taken down.': 'Объявление снято.',
  'The password is too short.': 'Пароль слишком короткий.',
  'The password needs at least 8 characters.': 'В пароле должно быть не меньше 8 символов.',
  'This e-mail already has an account. Log in instead.': 'На эту почту уже есть аккаунт. Войдите.',
  'This player does not accept messages from you.': 'Этот игрок не принимает от вас сообщения.',
  'This player has not shown their home yet.': 'Этот игрок пока не показал свой дом.',
  'This result could not be accepted.': 'Этот результат не принят.',
  'Too many requests. Wait a minute.': 'Слишком много запросов. Подождите минуту.',
  'Too many results today. Try again tomorrow.': 'Сегодня слишком много результатов. Попробуйте завтра.',
  'Type your password to delete the account.': 'Введите пароль, чтобы удалить аккаунт.',
  'Unblocked. You can write to each other again.': 'Разблокировано. Вы снова можете писать друг другу.',
  'Write a title of 4 to 60 characters.': 'Заголовок — от 4 до 60 символов.',
  'Wrong e-mail or password.': 'Неверная почта или пароль.',
  'You are writing too fast. Wait a little.': 'Вы пишете слишком быстро. Подождите немного.',
  'You follow them now.': 'Теперь вы подписаны.',
  'You have already voted this week.': 'Вы уже голосовали на этой неделе.',
  'You have enough ads up for now. Take one down or wait.': 'У вас уже достаточно объявлений. Снимите одно или подождите.',
  'You no longer follow them.': 'Вы отписались.',
  'No phone numbers or messenger names: players answer through the private chat of the game.': 'Без телефонов и мессенджеров: игроки отвечают через личный чат игры.',
  'The price cannot be below zero.': 'Цена не может быть меньше нуля.',
  'Your account and everything stored with it are deleted.': 'Аккаунт и всё, что с ним хранилось, удалены.',
  'Your e-mail is confirmed. You can log in now.': 'Почта подтверждена. Теперь можно войти.',
  'Your password is changed and every device was logged out. Log in with the new password.': 'Пароль изменён, выход выполнен на всех устройствах. Войдите с новым паролем.',
};
/** An online message in the player's language. */
export const msgL = (m: string, ru: boolean): string => (ru ? MSG_RU[m] ?? m : m);

addStrings(
  { olBlocked: 'Blocked players', olUnblock: 'unblock', olMyAds: 'My adverts in all cities' },
  { olBlocked: 'Заблокированные игроки', olUnblock: 'разблокировать', olMyAds: 'Мои объявления во всех городах' },
);

addStrings(
  { chlYourPart: 'Your part', chlPartFirst: 'First do your part in the game —', chlNeedGame: 'Open your game first: your part is done in it.' },
  { chlYourPart: 'Ваша часть', chlPartFirst: 'Сначала сделайте свою часть в игре —', chlNeedGame: 'Сначала откройте свою игру: часть делается в ней.' },
);
