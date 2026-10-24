// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { hasContact } from '../src/rude';

/* Round 152 (security review): contacts are refused everywhere players write to each other. */
describe('the contact check', () => {
  it('finds phone numbers, messengers, handles, e-mail addresses and spaced links, and lets ordinary words through', () => {
    for (const t of ['+7 999 123 45 67', '8(999)123-45-67', 'пиши в тг', 'write me on TG please', 'мой вк', 'telegram', 'Телеграм', 'whatsapp', 't . me/ivan', 'wa.me/7999', '@ivan_work', 'ivan@mail.ru', 'add me on discord'])
      expect(hasContact(t), t).toBe(true);
    for (const t of ['Тогда до встречи', 'Привет! Как дела?', 'Продаю диван за 5 000 ₽', 'meet at the MFC at 10', 'stage two', 'Вкусный борщ'])
      expect(hasContact(t), t).toBe(false);
  });
});
