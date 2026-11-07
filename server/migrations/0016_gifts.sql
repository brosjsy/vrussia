-- Gifts between friends (round 159): a player sends a small gift to a friend who follows them back (tea, flowers, a cake, chocolates, soup, a scarf, or a little money
-- up to 1,000 ₽); the friend finds it in their inbox and takes it. At most 3 gifts a day per sender, a short kind note that passes the language and contact-details
-- filters, nothing to a player who blocked the sender. The server counts gifts given and received for chapter 12 of the storyline ("Kindness") and keeps the
-- inbox badge in /api/inbox. The money is a gift between friends, capped so that a client that lies about its wallet can do little harm. Run as vr_owner.

create table app.gifts (
  id bigint generated always as identity primary key,
  sender uuid not null references app.profiles (id) on delete cascade,
  receiver uuid not null references app.profiles (id) on delete cascade,
  kind text not null check (kind in ('tea', 'flowers', 'cake', 'chocolates', 'soup', 'scarf', 'money')),
  amount int not null default 0 check (amount between 0 and 1000),
  note text not null default '' check (char_length(note) <= 80),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  check ((kind = 'money') = (amount > 0))
);
create index gifts_receiver on app.gifts (receiver, claimed_at);
create index gifts_sender_day on app.gifts (sender, created_at);

create function app.send_gift(p_me uuid, p_to uuid, p_kind text, p_amount int, p_note text) returns bigint language plpgsql as $$
declare n text := btrim(coalesce(p_note, '')); new_id bigint;
begin
  if not exists (select 1 from app.profiles where id = p_me) then raise exception 'no profile'; end if;
  if p_to = p_me or not exists (select 1 from app.profiles where id = p_to) then raise exception 'no such player'; end if;
  if not (exists (select 1 from app.follows where follower = p_me and followed = p_to) and exists (select 1 from app.follows where follower = p_to and followed = p_me)) then raise exception 'not friends'; end if;
  if exists (select 1 from app.blocks where blocker = p_to and blocked = p_me) then raise exception 'blocked'; end if;
  if char_length(n) > 80 then raise exception 'bad length'; end if;
  if app.has_contact(n) then raise exception 'contact details'; end if;
  if app.is_rude(n) then raise exception 'language'; end if;
  if (select count(*) from app.gifts where sender = p_me and created_at > now() - interval '1 day') >= 3 then raise exception 'daily limit'; end if;
  insert into app.gifts (sender, receiver, kind, amount, note) values (p_me, p_to, p_kind, case when p_kind = 'money' then coalesce(p_amount, 0) else 0 end, n) returning id into new_id;
  perform app.count_event(p_me, 'gift_given');
  return new_id;
end $$;

create function app.my_gifts(p_me uuid) returns table (id bigint, sender uuid, sender_name text, kind text, amount int, note text, created_at timestamptz) language sql stable as $$
  select g.id, g.sender, p.username, g.kind, g.amount, g.note, g.created_at from app.gifts g join app.profiles p on p.id = g.sender
  where g.receiver = p_me and g.claimed_at is null and not exists (select 1 from app.blocks b where b.blocker = p_me and b.blocked = g.sender)
  order by g.id desc limit 20;
$$;

-- taking a gift: once, by its receiver; the receiver's and the sender's counters move
create function app.claim_gift(p_me uuid, p_id bigint) returns table (kind text, amount int, sender_name text) language plpgsql as $$
declare g app.gifts;
begin
  select * into g from app.gifts where id = p_id and receiver = p_me and claimed_at is null for update;
  if g.id is null then raise exception 'no such gift'; end if;
  update app.gifts set claimed_at = now() where id = g.id;
  perform app.count_event(p_me, 'gift_received');
  return query select g.kind, g.amount, (select username from app.profiles where id = g.sender);
end $$;

-- what is waiting for the player: the number shown on the Online button
create function app.my_inbox(p_me uuid) returns table (gifts bigint, crew_invites bigint, flat_invites bigint, coops bigint) language sql stable as $$
  select (select count(*) from app.gifts g where g.receiver = p_me and g.claimed_at is null and not exists (select 1 from app.blocks b where b.blocker = p_me and b.blocked = g.sender)),
         (select count(*) from app.crew_invites i where i.invitee = p_me and i.status = 'open'),
         (select count(*) from app.flat_invites i where i.invitee = p_me and i.status = 'open'),
         (select count(*) from app.coops k where k.invitee = p_me and k.status = 'invited');
$$;

-- chapter 12: kindness
insert into app.chapters (id, title_en, title_ru, text_en, text_ru) values
 (12, 'Kindness', 'Доброта', 'A cup of tea, a bunch of flowers, a scarf for the cold. Small gifts between friends are how a stranger turns into one of the family.', 'Чашка чая, букет, шарф от холода. Небольшие подарки между друзьями превращают чужого человека в своего.');
insert into app.challenges (id, chapter, sort, kind, event, target, weekly, reward, title_en, title_ru, text_en, text_ru) values
 ('gift_first', 12, 1, 'event', 'gift_given', 1, false, 300, 'A first gift', 'Первый подарок', 'Send a gift to a friend.', 'Отправьте подарок другу.'),
 ('gift_five', 12, 2, 'event', 'gift_given', 5, false, 800, 'A generous hand', 'Щедрая рука', 'Send five gifts to friends.', 'Отправьте пять подарков друзьям.'),
 ('gift_twenty', 12, 3, 'event', 'gift_given', 20, false, 2000, 'Everyone''s favourite', 'Всеобщий любимец', 'Send twenty gifts to friends.', 'Отправьте двадцать подарков друзьям.'),
 ('gift_week', 12, 4, 'event', 'gift_given', 3, true, 500, 'Kind this week', 'Добрая неделя', 'Send three gifts this week.', 'Отправьте три подарка на этой неделе.'),
 ('gift_received_first', 12, 5, 'event', 'gift_received', 1, false, 300, 'Somebody thought of you', 'О вас подумали', 'Take a gift a friend sent you.', 'Заберите подарок, который прислал друг.'),
 ('gift_received_five', 12, 6, 'event', 'gift_received', 5, false, 800, 'Well loved', 'Вас любят', 'Take five gifts from friends.', 'Заберите пять подарков от друзей.'),
 ('gift_received_week', 12, 7, 'event', 'gift_received', 2, true, 400, 'A week of warmth', 'Тёплая неделя', 'Take two gifts this week.', 'Заберите два подарка на этой неделе.'),
 ('gift_both', 12, 8, 'event', 'gift_given', 10, false, 1500, 'Give and take', 'Давать и принимать', 'Send ten gifts to friends.', 'Отправьте десять подарков друзьям.'),
 ('gift_chain', 12, 9, 'event', 'gift_received', 10, false, 1500, 'A warm winter', 'Тёплая зима', 'Take ten gifts from friends.', 'Заберите десять подарков от друзей.'),
 ('gift_legend', 12, 10, 'event', 'gift_given', 50, false, 4000, 'The kindest in the city', 'Самый добрый в городе', 'Send fifty gifts to friends.', 'Отправьте пятьдесят подарков друзьям.');

grant select, insert, update, delete on app.gifts to vr_app;
grant usage on all sequences in schema app to vr_app;
grant execute on all functions in schema app to vr_app;
grant select on app.gifts to vr_backup;
