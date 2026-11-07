-- Shared flats: up to four friends (who follow each other) rent one flat together (round 157). The server keeps who lives together and counts the chores
-- each one does (one a day); the game on each device then splits the rent between the people in the flat. A player lives in at most one shared flat.
-- Chapter 10 of the storyline counts it. Run as vr_owner.

create table app.flats (
  id bigint generated always as identity primary key,
  owner uuid not null references app.profiles (id) on delete cascade,
  city text not null check (char_length(city) between 2 and 40),
  created_at timestamptz not null default now()
);
create table app.flat_members (
  flat_id bigint not null references app.flats (id) on delete cascade,
  player_id uuid not null references app.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_chore date,
  primary key (flat_id, player_id)
);
create unique index flat_members_one_flat on app.flat_members (player_id);
create table app.flat_invites (
  id bigint generated always as identity primary key,
  flat_id bigint not null references app.flats (id) on delete cascade,
  inviter uuid not null references app.profiles (id) on delete cascade,
  invitee uuid not null references app.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
create unique index flat_invites_open on app.flat_invites (flat_id, invitee) where status = 'open';

create function app.create_flat(p_me uuid, p_city text) returns bigint language plpgsql as $$
declare new_id bigint;
begin
  if not exists (select 1 from app.profiles where id = p_me) then raise exception 'no profile'; end if;
  if exists (select 1 from app.flat_members where player_id = p_me) then raise exception 'already in a flat'; end if;
  insert into app.flats (owner, city) values (p_me, p_city) returning id into new_id;
  insert into app.flat_members (flat_id, player_id) values (new_id, p_me);
  perform app.count_event(p_me, 'flat_created');
  return new_id;
end $$;

create function app.flat_invite(p_me uuid, p_friend uuid) returns bigint language plpgsql as $$
declare f bigint; new_id bigint;
begin
  select flat_id into f from app.flat_members where player_id = p_me;
  if f is null then raise exception 'not in a flat'; end if;
  if p_friend = p_me or not exists (select 1 from app.profiles where id = p_friend) then raise exception 'no such player'; end if;
  if not (exists (select 1 from app.follows where follower = p_me and followed = p_friend) and exists (select 1 from app.follows where follower = p_friend and followed = p_me)) then raise exception 'not friends'; end if;
  if exists (select 1 from app.blocks where blocker = p_friend and blocked = p_me) then raise exception 'blocked'; end if;
  if exists (select 1 from app.flat_members where player_id = p_friend) then raise exception 'already in a flat'; end if;
  if (select count(*) from app.flat_members where flat_id = f) >= 4 then raise exception 'flat is full'; end if;
  insert into app.flat_invites (flat_id, inviter, invitee) values (f, p_me, p_friend) returning id into new_id;
  perform app.count_event(p_me, 'flat_invite');
  return new_id;
exception when unique_violation then raise exception 'already invited';
end $$;

create function app.flat_answer(p_me uuid, p_invite bigint, p_accept boolean) returns void language plpgsql as $$
declare inv app.flat_invites;
begin
  select * into inv from app.flat_invites where id = p_invite and invitee = p_me and status = 'open' for update;
  if inv.id is null then raise exception 'no such invitation'; end if;
  if not p_accept then update app.flat_invites set status = 'declined' where id = inv.id; return; end if;
  if exists (select 1 from app.flat_members where player_id = p_me) then raise exception 'already in a flat'; end if;
  if (select count(*) from app.flat_members where flat_id = inv.flat_id) >= 4 then raise exception 'flat is full'; end if;
  insert into app.flat_members (flat_id, player_id) values (inv.flat_id, p_me);
  update app.flat_invites set status = 'accepted' where id = inv.id;
  update app.flat_invites set status = 'declined' where invitee = p_me and status = 'open';
  perform app.count_event(p_me, 'flat_joined');
  perform app.count_event(inv.inviter, 'flat_member_joined');
end $$;

create function app.flat_leave(p_me uuid) returns void language plpgsql as $$
declare f bigint; heir uuid;
begin
  select flat_id into f from app.flat_members where player_id = p_me;
  if f is null then raise exception 'not in a flat'; end if;
  delete from app.flat_members where player_id = p_me;
  select player_id into heir from app.flat_members where flat_id = f order by joined_at, player_id limit 1;
  if heir is null then delete from app.flats where id = f; else update app.flats set owner = heir where id = f and owner = p_me; end if;
end $$;

-- a chore a day (washing up, the rubbish, the floor): counted once per player per day; the same day as a flatmate counts for the shared chapter
create function app.flat_chore(p_me uuid) returns int language plpgsql as $$
declare f bigint; done_today int;
begin
  select flat_id into f from app.flat_members where player_id = p_me;
  if f is null then raise exception 'not in a flat'; end if;
  if exists (select 1 from app.flat_members where player_id = p_me and last_chore = current_date) then raise exception 'chore done today'; end if;
  update app.flat_members set last_chore = current_date where player_id = p_me;
  perform app.count_event(p_me, 'flat_chore');
  select count(*) into done_today from app.flat_members where flat_id = f and last_chore = current_date;
  if done_today >= 2 then perform app.count_event(p_me, 'flat_chore_team'); end if;
  return done_today;
end $$;

create function app.my_flat(p_me uuid) returns table (id bigint, city text, owner uuid, members jsonb) language sql stable as $$
  select f.id, f.city, f.owner,
    (select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'chore_today', m.last_chore = current_date) order by m.joined_at)
       from app.flat_members m join app.profiles p on p.id = m.player_id where m.flat_id = f.id)
  from app.flat_members me join app.flats f on f.id = me.flat_id where me.player_id = p_me;
$$;
create function app.my_flat_invites(p_me uuid) returns table (id bigint, flat_id bigint, city text, inviter_name text, created_at timestamptz) language sql stable as $$
  select i.id, i.flat_id, f.city, p.username, i.created_at from app.flat_invites i join app.flats f on f.id = i.flat_id join app.profiles p on p.id = i.inviter
  where i.invitee = p_me and i.status = 'open' order by i.id desc limit 20;
$$;

-- chapter 10: roommates
insert into app.chapters (id, title_en, title_ru, text_en, text_ru) values
 (10, 'Roommates', 'Соседи по квартире', 'Rent is lighter shared. Find people you can live with: split the rent, share the chores, and survive the winter together.', 'Вдвоём аренда легче. Найдите людей, с которыми можно жить: делите аренду, дежурьте по дому и вместе переживите зиму.');
insert into app.challenges (id, chapter, sort, kind, event, target, weekly, reward, title_en, title_ru, text_en, text_ru) values
 ('flat_found', 10, 1, 'event', 'flat_created', 1, false, 500, 'A shared flat', 'Общая квартира', 'Start a shared flat in your city.', 'Заведите общую квартиру в своём городе.'),
 ('flat_first_invite', 10, 2, 'event', 'flat_invite', 1, false, 300, 'Room for you', 'Есть место для тебя', 'Invite a friend who follows you back to your flat.', 'Пригласите в квартиру друга, который подписан на вас в ответ.'),
 ('flat_flatmate', 10, 3, 'event', 'flat_member_joined', 1, false, 700, 'A flatmate', 'Сосед по квартире', 'A friend you invited moves in.', 'Приглашённый вами друг въезжает.'),
 ('flat_full_house', 10, 4, 'event', 'flat_member_joined', 3, false, 1800, 'A full house', 'Полный дом', 'Three friends you invited move in.', 'Трое приглашённых вами друзей въезжают.'),
 ('flat_move_in', 10, 5, 'event', 'flat_joined', 1, false, 500, 'Moving in', 'Переезд', 'Accept an invitation to somebody else''s flat.', 'Примите приглашение в чужую квартиру.'),
 ('flat_first_chore', 10, 6, 'event', 'flat_chore', 1, false, 200, 'Washing up', 'Помыть посуду', 'Do your first chore in the shared flat.', 'Выполните первое дежурство в общей квартире.'),
 ('flat_chore_week', 10, 7, 'event', 'flat_chore', 5, true, 600, 'A tidy week', 'Чистая неделя', 'Do five chores this week.', 'Выполните пять дежурств на этой неделе.'),
 ('flat_chores_30', 10, 8, 'event', 'flat_chore', 30, false, 2000, 'A month of chores', 'Месяц дежурств', 'Do thirty chores in your shared flat.', 'Выполните тридцать дежурств в общей квартире.'),
 ('flat_team_clean', 10, 9, 'event', 'flat_chore_team', 3, false, 900, 'Cleaning together', 'Уборка вместе', 'Do a chore on a day when a flatmate does one too, three times.', 'Выполните дежурство в тот же день, что и сосед, три раза.'),
 ('flat_team_week', 10, 10, 'event', 'flat_chore_team', 4, true, 700, 'The team week', 'Командная неделя', 'Do a chore together with a flatmate four times this week.', 'Выполните дежурство вместе с соседом четыре раза на этой неделе.');

grant select, insert, update, delete on app.flats, app.flat_members, app.flat_invites to vr_app;
grant usage on all sequences in schema app to vr_app;
grant execute on all functions in schema app to vr_app;
grant select on app.flats, app.flat_members, app.flat_invites to vr_backup;
