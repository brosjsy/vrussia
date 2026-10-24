/* The bad-language check, the same list as the server's (supabase/migrations/0003_homes_and_friends.sql, is_rude). The game checks before sending so
   the player is told at once; the server checks again, because a changed copy of the game could skip this. A short list of the worst words in Russian
   and English: it stops the obvious, not a determined person. */
export const RUDE = /(хуй|хуе|хуё|пизд|ебат|ебан|ёбан|еблан|блядь|бляд|сука|суки|мудак|мудил|залуп|fuck|shit|cunt|bitch|nigger|faggot)/;
export const isRude = (text: string): boolean => RUDE.test(String(text ?? '').toLowerCase());

/** A phone number (ten or more digits, with spaces, brackets, dots or dashes between them) or a messenger: the same rule as app.has_contact on the server. */
export const hasContact = (t: string): boolean => /(\+?[0-9][ ().-]{0,2}){10,}/.test(t) || /(whats ?app|telegram|viber|t\.me|вотсап|ватсап|телеграм|вайбер)/i.test(t);
