/* The bad-language check, the same list as the server's (supabase/migrations/0003_homes_and_friends.sql, is_rude). The game checks before sending so
   the player is told at once; the server checks again, because a changed copy of the game could skip this. A short list of the worst words in Russian
   and English: it stops the obvious, not a determined person. */
export const RUDE = /(хуй|хуе|хуё|пизд|ебат|ебан|ёбан|еблан|блядь|бляд|сука|суки|мудак|мудил|залуп|fuck|shit|cunt|bitch|nigger|faggot)/;
export const isRude = (text: string): boolean => RUDE.test(String(text ?? '').toLowerCase());

/** A way to move a conversation off the moderated game: a phone number (ten or more digits, with spaces, brackets, dots or dashes between them),
   a messenger or social network (also written "t . me", "tg", "вк"), an @handle or an e-mail address. The same rule as app.has_contact on the server
   (migration 0009, round 152), which now applies to chat, guest books and adverts alike. */
export const hasContact = (t: string): boolean => {
  const x = String(t ?? '').toLowerCase();
  return /(\+?[0-9][ ().-]{0,2}){10,}/.test(x)
    || /(whats ?app|telegram|viber|t\s*\.\s*me|wa\s*\.\s*me|vk\s*\.\s*com|вотсап|ватсап|телеграм|вайбер|инстаграм|instagram|вконтакте|signal|discord)/.test(x)
    || /(^|[^a-zа-яё0-9_])(tg|тг|вк|vk|тлг)([^a-zа-яё0-9_]|$)/.test(x)
    || /@[a-z0-9_.]{3,}/.test(x);
};
