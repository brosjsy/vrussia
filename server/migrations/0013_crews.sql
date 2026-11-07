-- Crews: a small group of friends (up to 12) with its own chat room and its own chapter of challenges (round 156). A player belongs to at most one
-- crew. The chat room is "crew:<id>"; only members may write or read it, the same rules as everywhere (adults only, the language filter, the
-- speed limits, blocks). Run as vr_owner.

create table app.crews (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 3 and 30),
  owner uuid not null references app.profiles (id) on delete cascade,
  city text check (city is null or char_length(city) between 2 and 40),
  created_at timestamptz not null default now()
);
create unique index crews_name_unique on app.crews (lower(name));
create table app.crew_members (
  crew_id bigint not null references app.crews (id) on delete cascade,
  player_id uuid not null references app.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, player_id)
);
create unique index crew_members_one_crew on app.crew_members (player_id);
create table app.crew_invites (
  id bigint generated always as identity primary key,
  crew_id bigint not null references app.crews (id) on delete cascade,
  inviter uuid not null references app.profiles (id) on delete cascade,
  invitee uuid not null references app.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
create unique index crew_invites_open on app.crew_invites (crew_id, invitee) where status = 'open';

create function app.is_crew_member(p uuid, c bigint) returns boolean language sql stable as $$
  select exists (select 1 from app.crew_members m where m.crew_id = c and m.player_id = p);
$$;

create function app.create_crew(p_me uuid, p_name text, p_city text) returns bigint language plpgsql as $$
declare nm text := btrim(p_name); new_id bigint;
begin
  if not exists (select 1 from app.profiles where id = p_me and adult) then raise exception 'chat is for adults'; end if;
  if char_length(nm) < 3 or char_length(nm) > 30 then raise exception 'bad length'; end if;
  if app.is_rude(nm) then raise exception 'language'; end if;
  if exists (select 1 from app.crew_members where player_id = p_me) then raise exception 'already in a crew'; end if;
  insert into app.crews (name, owner, city) values (nm, p_me, p_city) returning id into new_id;
  insert into app.crew_members (crew_id, player_id, role) values (new_id, p_me, 'owner');
  perform app.count_event(p_me, 'crew_created');
  return new_id;
exception when unique_violation then raise exception 'name taken';
end $$;

-- only friends who follow each other may be invited, and not people who blocked the inviter
create function app.crew_invite(p_me uuid, p_friend uuid) returns bigint language plpgsql as $$
declare c bigint; new_id bigint;
begin
  select crew_id into c from app.crew_members where player_id = p_me;
  if c is null then raise exception 'not in a crew'; end if;
  if p_friend = p_me or not exists (select 1 from app.profiles where id = p_friend) then raise exception 'no such player'; end if;
  if not (exists (select 1 from app.follows where follower = p_me and followed = p_friend) and exists (select 1 from app.follows where follower = p_friend and followed = p_me)) then raise exception 'not friends'; end if;
  if exists (select 1 from app.blocks where blocker = p_friend and blocked = p_me) then raise exception 'blocked'; end if;
  if exists (select 1 from app.crew_members where player_id = p_friend) then raise exception 'already in a crew'; end if;
  if (select count(*) from app.crew_members where crew_id = c) >= 12 then raise exception 'crew is full'; end if;
  insert into app.crew_invites (crew_id, inviter, invitee) values (c, p_me, p_friend) returning id into new_id;
  perform app.count_event(p_me, 'crew_invite');
  return new_id;
exception when unique_violation then raise exception 'already invited';
end $$;

create function app.crew_answer(p_me uuid, p_invite bigint, p_accept boolean) returns void language plpgsql as $$
declare inv app.crew_invites;
begin
  select * into inv from app.crew_invites where id = p_invite and invitee = p_me and status = 'open' for update;
  if inv.id is null then raise exception 'no such invitation'; end if;
  if not p_accept then update app.crew_invites set status = 'declined' where id = inv.id; return; end if;
  if exists (select 1 from app.crew_members where player_id = p_me) then raise exception 'already in a crew'; end if;
  if (select count(*) from app.crew_members where crew_id = inv.crew_id) >= 12 then raise exception 'crew is full'; end if;
  insert into app.crew_members (crew_id, player_id, role) values (inv.crew_id, p_me, 'member');
  update app.crew_invites set status = 'accepted' where id = inv.id;
  update app.crew_invites set status = 'declined' where invitee = p_me and status = 'open';
  perform app.count_event(p_me, 'crew_joined');
  perform app.count_event(inv.inviter, 'crew_member_joined');
end $$;

-- leaving: the owner's place goes to the member who has been there longest; the last one out closes the crew
create function app.crew_leave(p_me uuid) returns void language plpgsql as $$
declare c bigint; r text; heir uuid;
begin
  select crew_id, role into c, r from app.crew_members where player_id = p_me;
  if c is null then raise exception 'not in a crew'; end if;
  delete from app.crew_members where player_id = p_me;
  select player_id into heir from app.crew_members where crew_id = c order by joined_at, player_id limit 1;
  if heir is null then delete from app.crews where id = c; return; end if;
  if r = 'owner' then update app.crew_members set role = 'owner' where crew_id = c and player_id = heir; update app.crews set owner = heir where id = c; end if;
end $$;

create function app.crew_kick(p_me uuid, p_target uuid) returns void language plpgsql as $$
declare c bigint;
begin
  select crew_id into c from app.crew_members where player_id = p_me and role = 'owner';
  if c is null then raise exception 'not the owner'; end if;
  if p_target = p_me then raise exception 'use leave'; end if;
  delete from app.crew_members where crew_id = c and player_id = p_target;
end $$;

create function app.my_crew(p_me uuid) returns table (id bigint, name text, city text, role text, members jsonb) language sql stable as $$
  select c.id, c.name, c.city, me.role,
    (select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'role', m.role, 'online', exists (select 1 from app.presence r where r.player_id = p.id and r.seen_at > now() - interval '3 minutes')) order by m.joined_at)
       from app.crew_members m join app.profiles p on p.id = m.player_id where m.crew_id = c.id)
  from app.crew_members me join app.crews c on c.id = me.crew_id where me.player_id = p_me;
$$;
create function app.my_crew_invites(p_me uuid) returns table (id bigint, crew_id bigint, crew_name text, inviter_name text, created_at timestamptz) language sql stable as $$
  select i.id, i.crew_id, c.name, p.username, i.created_at from app.crew_invites i join app.crews c on c.id = i.crew_id join app.profiles p on p.id = i.inviter
  where i.invitee = p_me and i.status = 'open' order by i.id desc limit 20;
$$;

-- chat: the same functions as before, with the crew room added (members only)
alter table app.messages drop constraint messages_room_check;
alter table app.messages add constraint messages_room_check check (room ~ '^(place:[^:]{2,40}:[a-z]{2,20}|direct:[0-9a-f-]{36}:[0-9a-f-]{36}|crew:[0-9]{1,12})$');
create or replace function app.send_message(p_me uuid, p_room text, p_body text) returns bigint language plpgsql as $$
declare prof app.profiles; body text := btrim(p_body); n int; other uuid; new_id bigint;
begin
  select * into prof from app.profiles where id = p_me;
  if prof.id is null then raise exception 'no profile'; end if;
  if not prof.adult then raise exception 'chat is for adults'; end if;
  if char_length(body) < 1 or char_length(body) > 280 then raise exception 'bad length'; end if;
  if app.is_rude(body) then raise exception 'language'; end if;
  select count(*) into n from app.messages where sender = p_me and created_at > now() - interval '30 seconds';
  if n >= 6 then raise exception 'slow down'; end if;
  if (select count(*) from app.messages where sender = p_me and created_at > now() - interval '1 day') >= 300 then raise exception 'daily limit'; end if;
  if p_room like 'direct:%' then
    if p_room !~ '^direct:[0-9a-f-]{36}:[0-9a-f-]{36}$' or (split_part(p_room, ':', 2) <> p_me::text and split_part(p_room, ':', 3) <> p_me::text) then raise exception 'not your talk'; end if;
    other := case when split_part(p_room, ':', 2) = p_me::text then split_part(p_room, ':', 3)::uuid else split_part(p_room, ':', 2)::uuid end;
    if p_room <> app.direct_room(p_me, other) then raise exception 'bad room'; end if;
    if not exists (select 1 from app.profiles where id = other) then raise exception 'bad room'; end if;
    if exists (select 1 from app.blocks where blocker = other and blocked = p_me) then raise exception 'blocked'; end if;
  elsif p_room ~ '^crew:[0-9]{1,12}$' then
    if not app.is_crew_member(p_me, substr(p_room, 6)::bigint) then raise exception 'not your crew'; end if;
  elsif p_room !~ '^place:[^:]{2,40}:[a-z]{2,20}$' then raise exception 'bad room';
  end if;
  insert into app.messages (room, sender, username, body) values (p_room, p_me, prof.username, body) returning id into new_id;
  return new_id;
end $$;
create or replace function app.read_messages(p_me uuid, p_room text, p_after bigint) returns table (id bigint, room text, sender uuid, username text, body text, created_at timestamptz) language sql as $$
  select m.id, m.room, m.sender, m.username, m.body, m.created_at from app.messages m
  where m.room = p_room and m.id > coalesce(p_after, 0) and not m.hidden
    and exists (select 1 from app.profiles p where p.id = p_me and p.adult)
    and (m.room like 'place:%' or (m.room like 'direct:%' and (split_part(m.room, ':', 2) = p_me::text or split_part(m.room, ':', 3) = p_me::text))
         or (m.room ~ '^crew:[0-9]{1,12}$' and app.is_crew_member(p_me, substr(m.room, 6)::bigint)))
    and not exists (select 1 from app.blocks b where b.blocker = p_me and b.blocked = m.sender)
  order by m.id desc limit 50;
$$;

-- the counting of messages knows the crew room (it is neither a place nor a private talk)
create or replace function app.count_message() returns trigger language plpgsql as $$
declare other uuid; city text;
begin
  if new.room like 'place:%' then
    perform app.count_event(new.sender, 'msg_place');
    city := split_part(new.room, ':', 2);
    if not exists (select 1 from app.messages m where m.sender = new.sender and m.id <> new.id and m.room like 'place:' || city || ':%') then perform app.count_event(new.sender, 'city_room_new'); end if;
  elsif new.room like 'crew:%' then
    perform app.count_event(new.sender, 'crew_msg');
  else
    perform app.count_event(new.sender, 'msg_direct');
    other := case when split_part(new.room, ':', 2) = new.sender::text then split_part(new.room, ':', 3)::uuid else split_part(new.room, ':', 2)::uuid end;
    if not exists (select 1 from app.messages m where m.room = new.room and m.sender = new.sender and m.id <> new.id) then
      perform app.count_event(new.sender, 'partner_new');
      if exists (select 1 from app.users u where u.id = other and u.created_at > now() - interval '3 days') then perform app.count_event(new.sender, 'welcome_newcomer'); end if;
      if exists (select 1 from app.profiles a join app.profiles b on b.id = other where a.id = new.sender and a.country is not null and b.country is not null and a.country <> b.country) then perform app.count_event(new.sender, 'partner_abroad'); end if;
    end if;
  end if;
  if new.body ~ '[А-Яа-яЁё]' then perform app.count_event(new.sender, 'msg_ru'); end if;
  return new;
end $$;

-- chapter 9: the crew
insert into app.chapters (id, title_en, title_ru, text_en, text_ru) values
 (9, 'Your crew', 'Своя команда', 'A crew is a few friends who answer at night, share news and carry each other through the winter. Start one, fill it, keep it talking.', 'Команда — несколько друзей, которые отвечают ночью, делятся новостями и вместе переживают зиму. Создайте её, наполните и не давайте молчать.');
insert into app.challenges (id, chapter, sort, kind, event, target, weekly, reward, title_en, title_ru, text_en, text_ru) values
 ('crew_found', 9, 1, 'event', 'crew_created', 1, false, 500, 'Found a crew', 'Создать команду', 'Start a crew with a name of your own.', 'Создайте команду со своим названием.'),
 ('crew_first_invite', 9, 2, 'event', 'crew_invite', 1, false, 300, 'First invitation', 'Первое приглашение', 'Invite a friend who follows you back.', 'Пригласите друга, который подписан на вас в ответ.'),
 ('crew_three_invites', 9, 3, 'event', 'crew_invite', 3, false, 700, 'Open the door', 'Открыть дверь', 'Send three invitations to your crew.', 'Отправьте три приглашения в свою команду.'),
 ('crew_new_member', 9, 4, 'event', 'crew_member_joined', 1, false, 600, 'Someone said yes', 'Кто-то согласился', 'A friend you invited joins the crew.', 'Друг, которого вы пригласили, вступает в команду.'),
 ('crew_five_members', 9, 5, 'event', 'crew_member_joined', 4, false, 1500, 'A table for five', 'Стол на пятерых', 'Four of your invited friends join the crew.', 'Четверо приглашённых вами друзей вступают в команду.'),
 ('crew_hello', 9, 6, 'event', 'crew_msg', 1, false, 200, 'Hello, crew', 'Привет, команда', 'Write your first message in the crew chat.', 'Напишите первое сообщение в чате команды.'),
 ('crew_chatty', 9, 7, 'event', 'crew_msg', 30, false, 1200, 'Always talking', 'Всегда на связи', 'Write 30 messages in the crew chat.', 'Напишите 30 сообщений в чате команды.'),
 ('crew_week_talk', 9, 8, 'event', 'crew_msg', 15, true, 800, 'A week together', 'Неделя вместе', 'Write 15 messages in the crew chat this week.', 'Напишите 15 сообщений в чате команды на этой неделе.'),
 ('crew_joined_one', 9, 9, 'event', 'crew_joined', 1, false, 400, 'Join a crew', 'Вступить в команду', 'Accept an invitation to somebody else''s crew.', 'Примите приглашение в чужую команду.'),
 ('crew_week_invite', 9, 10, 'event', 'crew_invite', 2, true, 500, 'New faces this week', 'Новые лица недели', 'Invite two friends this week.', 'Пригласите двух друзей на этой неделе.');

grant select, insert, update, delete on app.crews, app.crew_members, app.crew_invites to vr_app;
grant usage on all sequences in schema app to vr_app;
grant execute on all functions in schema app to vr_app;
grant select on app.crews, app.crew_members, app.crew_invites to vr_backup;
