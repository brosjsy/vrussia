-- The online parts of the game, ported from supabase/migrations/0001..0003 with the same rules and limits.
-- What changed: Supabase's auth.uid() is now an explicit first argument p_me, which the server fills in from the checked session (a player can
-- never choose it); auth.users is app.users; the row-level policies of Supabase became the WHERE clauses of the server's queries, and every one of
-- them is covered by a test (server/test). Run as vr_owner.

-- ---------- bad language: one check for chat, notes and adverts ----------
create function app.is_rude(p text) returns boolean language sql immutable as $$
  select lower(coalesce(p, '')) ~ '(хуй|хуе|хуё|пизд|ебат|ебан|ёбан|еблан|блядь|бляд|сука|суки|мудак|мудил|залуп|fuck|shit|cunt|bitch|nigger|faggot)';
$$;

-- ---------- profiles: the public name ----------
create table app.profiles (
  id uuid primary key references app.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  adult boolean not null default false,
  created_at timestamptz not null default now()
);
create function app.claim_profile(p_me uuid, p_username text, p_adult boolean) returns app.profiles language plpgsql as $$
declare row app.profiles;
begin
  if p_username !~ '^[a-z0-9_]{3,20}$' then raise exception 'bad username'; end if;
  insert into app.profiles (id, username, adult) values (p_me, p_username, coalesce(p_adult, false))
    on conflict (id) do update set adult = app.profiles.adult or excluded.adult
    returning * into row;
  return row;
exception when unique_violation then raise exception 'username taken';
end $$;

-- ---------- saves ----------
create table app.saves (
  player_id uuid primary key references app.profiles (id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 400000),
  version int not null check (version between 1 and 1000),
  day int not null check (day between 0 and 100000),
  updated_at timestamptz not null default now()
);

-- ---------- scores ----------
create table app.scores (
  id bigint generated always as identity primary key,
  player_id uuid not null references app.profiles (id) on delete cascade,
  username text not null,
  origin text not null check (char_length(origin) between 2 and 20),
  city text not null check (char_length(city) between 2 and 40),
  ending text not null check (ending in ('hospital', 'deported', 'debt', 'time')),
  score int not null check (score between 0 and 100000),
  days int not null check (days between 1 and 800),
  created_at timestamptz not null default now()
);
create index scores_top on app.scores (score desc, created_at);
create function app.submit_score(p_me uuid, p_origin text, p_city text, p_ending text, p_score int, p_days int) returns bigint language plpgsql as $$
declare name text; n int; new_id bigint;
begin
  select username into name from app.profiles where id = p_me;
  if name is null then raise exception 'no profile'; end if;
  select count(*) into n from app.scores where player_id = p_me and created_at > now() - interval '1 day';
  if n >= 10 then raise exception 'too many scores today'; end if;
  if p_score > 20000 + p_days * 60 then raise exception 'score not possible'; end if;
  insert into app.scores (player_id, username, origin, city, ending, score, days) values (p_me, name, p_origin, p_city, p_ending, p_score, p_days) returning id into new_id;
  return new_id;
end $$;

-- ---------- presence ----------
create table app.presence (
  player_id uuid primary key references app.profiles (id) on delete cascade,
  username text not null,
  city text not null check (char_length(city) between 2 and 40),
  place text not null check (char_length(place) between 2 and 20),
  seen_at timestamptz not null default now()
);
create index presence_seen on app.presence (seen_at);
create function app.heartbeat(p_me uuid, p_city text, p_place text) returns void language plpgsql as $$
declare name text;
begin
  select username into name from app.profiles where id = p_me;
  if name is null then raise exception 'no profile'; end if;
  insert into app.presence (player_id, username, city, place, seen_at) values (p_me, name, p_city, p_place, now())
    on conflict (player_id) do update set city = excluded.city, place = excluded.place, seen_at = now();
end $$;

-- ---------- chat ----------
create table app.blocks (
  blocker uuid not null references app.profiles (id) on delete cascade,
  blocked uuid not null references app.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked), check (blocker <> blocked)
);
create table app.messages (
  id bigint generated always as identity primary key,
  room text not null check (room ~ '^(place:[^:]{2,40}:[a-z]{2,20}|direct:[0-9a-f-]{36}:[0-9a-f-]{36})$'),
  sender uuid not null references app.profiles (id) on delete cascade,
  username text not null,
  body text not null check (char_length(body) between 1 and 280),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_room on app.messages (room, id desc);
create index messages_sender on app.messages (sender, created_at);
create function app.direct_room(a uuid, b uuid) returns text language sql immutable as $$ select 'direct:' || least(a::text, b::text) || ':' || greatest(a::text, b::text); $$;
create function app.send_message(p_me uuid, p_room text, p_body text) returns bigint language plpgsql as $$
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
  elsif p_room !~ '^place:[^:]{2,40}:[a-z]{2,20}$' then raise exception 'bad room';
  end if;
  insert into app.messages (room, sender, username, body) values (p_room, p_me, prof.username, body) returning id into new_id;
  return new_id;
end $$;
-- what a player may read: not hidden, only as an adult, place rooms and their own private talks, nothing from people they blocked
create function app.read_messages(p_me uuid, p_room text, p_after bigint) returns table (id bigint, room text, sender uuid, username text, body text, created_at timestamptz) language sql stable as $$
  select m.id, m.room, m.sender, m.username, m.body, m.created_at from app.messages m
  where m.room = p_room and m.id > coalesce(p_after, 0) and not m.hidden
    and exists (select 1 from app.profiles p where p.id = p_me and p.adult)
    and (m.room like 'place:%' or split_part(m.room, ':', 2) = p_me::text or split_part(m.room, ':', 3) = p_me::text)
    and not exists (select 1 from app.blocks b where b.blocker = p_me and b.blocked = m.sender)
  order by m.id desc limit 50;
$$;

create table app.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references app.profiles (id) on delete cascade,
  message_id bigint not null references app.messages (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 200),
  created_at timestamptz not null default now(),
  unique (reporter, message_id)
);
create function app.report_message(p_me uuid, p_message bigint, p_reason text) returns void language plpgsql as $$
begin
  if not exists (select 1 from app.profiles where id = p_me) then raise exception 'no profile'; end if;
  if not exists (select 1 from app.read_messages(p_me, (select room from app.messages where id = p_message), p_message - 1) r where r.id = p_message) then raise exception 'no such message'; end if;
  insert into app.reports (reporter, message_id, reason) values (p_me, p_message, p_reason) on conflict do nothing;
  if (select count(distinct reporter) from app.reports where message_id = p_message) >= 3 then update app.messages set hidden = true where id = p_message; end if;
end $$;

-- ---------- my private talks ----------
create function app.my_talks(p_me uuid) returns table (room text, other uuid, other_name text, last_body text, last_at timestamptz) language sql stable as $$
  select t.room, t.other, p.username, t.body, t.created_at from (
    select distinct on (m.room) m.room, m.body, m.created_at,
      case when split_part(m.room, ':', 2) = p_me::text then split_part(m.room, ':', 3)::uuid else split_part(m.room, ':', 2)::uuid end as other
    from app.messages m
    where m.room like 'direct:%' and not m.hidden and (split_part(m.room, ':', 2) = p_me::text or split_part(m.room, ':', 3) = p_me::text)
      and not exists (select 1 from app.blocks b where b.blocker = p_me and b.blocked = m.sender)
    order by m.room, m.id desc
  ) t join app.profiles p on p.id = t.other order by t.created_at desc limit 50;
$$;

-- ---------- the weekly election ----------
create table app.votes (
  week int not null check (week between 0 and 100000),
  city text not null check (char_length(city) between 2 and 40),
  player_id uuid not null references app.profiles (id) on delete cascade,
  candidate text not null check (char_length(candidate) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (week, city, player_id)
);
create function app.cast_vote(p_me uuid, p_week int, p_city text, p_candidate text) returns void language plpgsql as $$
begin
  if not exists (select 1 from app.profiles where id = p_me) then raise exception 'no profile'; end if;
  insert into app.votes (week, city, player_id, candidate) values (p_week, p_city, p_me, p_candidate);
exception when unique_violation then raise exception 'already voted';
end $$;
create function app.vote_tally(p_week int, p_city text) returns table (candidate text, votes bigint) language sql stable as $$
  select v.candidate, count(*) from app.votes v where v.week = p_week and v.city = p_city group by v.candidate order by count(*) desc;
$$;

-- ---------- shared numbers and announcements ----------
create table app.counters (key text primary key check (key ~ '^[a-z_]{2,30}$'), value bigint not null default 0);
insert into app.counters (key, value) values ('visits', 0), ('daily_found', 0);
create function app.bump(p_key text) returns bigint language plpgsql as $$
declare v bigint;
begin
  if p_key not in ('visits', 'daily_found') then raise exception 'bad counter'; end if;
  update app.counters set value = value + 1 where key = p_key returning value into v;
  return v;
end $$;
create table app.announcements (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 2 and 80),
  body text not null check (char_length(body) between 2 and 500),
  created_at timestamptz not null default now()
);

-- ---------- adverts ----------
create table app.ads (
  id bigint generated always as identity primary key,
  player_id uuid not null references app.profiles (id) on delete cascade,
  username text not null,
  city text not null check (char_length(city) between 2 and 40),
  kind text not null check (kind in ('room', 'job', 'sell', 'service', 'lost')),
  title text not null check (char_length(title) between 4 and 60),
  body text not null default '' check (char_length(body) <= 280),
  price int not null default 0 check (price between 0 and 10000000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index ads_city on app.ads (city, id desc);
create function app.post_ad(p_me uuid, p_city text, p_kind text, p_title text, p_body text, p_price int) returns bigint language plpgsql as $$
declare name text; new_id bigint; title text := btrim(p_title); body text := btrim(coalesce(p_body, ''));
begin
  select username into name from app.profiles where id = p_me;
  if name is null then raise exception 'no profile'; end if;
  if char_length(title) < 4 or char_length(title) > 60 then raise exception 'bad length'; end if;
  if app.is_rude(title) or app.is_rude(body) then raise exception 'language'; end if;
  if (select count(*) from app.ads where player_id = p_me and created_at > now() - interval '1 day') >= 3 then raise exception 'too many ads today'; end if;
  if (select count(*) from app.ads where player_id = p_me and expires_at > now()) >= 3 then raise exception 'too many ads'; end if;
  insert into app.ads (player_id, username, city, kind, title, body, price) values (p_me, name, p_city, p_kind, title, body, coalesce(p_price, 0)) returning id into new_id;
  return new_id;
end $$;
create table app.ad_reports (
  reporter uuid not null references app.profiles (id) on delete cascade,
  ad_id bigint not null references app.ads (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reporter, ad_id)
);
create function app.report_ad(p_me uuid, p_ad bigint) returns void language plpgsql as $$
begin
  if not exists (select 1 from app.profiles where id = p_me) then raise exception 'no profile'; end if;
  if not exists (select 1 from app.ads where id = p_ad) then raise exception 'no such ad'; end if;
  insert into app.ad_reports (reporter, ad_id) values (p_me, p_ad) on conflict do nothing;
  if (select count(*) from app.ad_reports where ad_id = p_ad) >= 3 then update app.ads set hidden = true where id = p_ad; end if;
end $$;

-- ---------- following ----------
create table app.follows (
  follower uuid not null references app.profiles (id) on delete cascade,
  followed uuid not null references app.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followed), check (follower <> followed)
);
create function app.follow(p_me uuid, p_other uuid) returns void language plpgsql as $$
begin
  if not exists (select 1 from app.profiles where id = p_me) then raise exception 'no profile'; end if;
  if (select count(*) from app.follows where follower = p_me) >= 200 then raise exception 'too many follows'; end if;
  insert into app.follows (follower, followed) values (p_me, p_other) on conflict do nothing;
end $$;

-- ---------- homes, the guest book, the best flat ----------
create table app.homes (
  player_id uuid primary key references app.profiles (id) on delete cascade,
  username text not null,
  city text not null check (char_length(city) between 2 and 40),
  dwelling text not null check (dwelling ~ '^[a-z]{3,12}$'),
  design jsonb not null check (pg_column_size(design) < 20000),
  stars int not null default 0 check (stars between 0 and 400),
  updated_at timestamptz not null default now()
);
create function app.publish_home(p_me uuid, p_city text, p_dwelling text, p_design jsonb, p_stars int) returns void language plpgsql as $$
declare name text;
begin
  select username into name from app.profiles where id = p_me;
  if name is null then raise exception 'no profile'; end if;
  insert into app.homes (player_id, username, city, dwelling, design, stars, updated_at) values (p_me, name, p_city, p_dwelling, p_design, coalesce(p_stars, 0), now())
    on conflict (player_id) do update set city = excluded.city, dwelling = excluded.dwelling, design = excluded.design, stars = excluded.stars, updated_at = now();
end $$;
create table app.guestbook (
  id bigint generated always as identity primary key,
  owner uuid not null references app.profiles (id) on delete cascade,
  author uuid not null references app.profiles (id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 200),
  gift text check (gift in ('flowers', 'cake', 'tea', 'chocolates')),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index guestbook_owner on app.guestbook (owner, id desc);
create function app.sign_guestbook(p_me uuid, p_owner uuid, p_body text, p_gift text) returns bigint language plpgsql as $$
declare name text; body text := btrim(p_body); new_id bigint;
begin
  select username into name from app.profiles where id = p_me;
  if name is null then raise exception 'no profile'; end if;
  if p_owner = p_me then raise exception 'your own home'; end if;
  if not exists (select 1 from app.homes where player_id = p_owner) then raise exception 'no such home'; end if;
  if exists (select 1 from app.blocks where blocker = p_owner and blocked = p_me) then raise exception 'blocked'; end if;
  if char_length(body) < 1 or char_length(body) > 200 then raise exception 'bad length'; end if;
  if app.is_rude(body) then raise exception 'language'; end if;
  if (select count(*) from app.guestbook where author = p_me and created_at > now() - interval '1 day') >= 10 then raise exception 'too many notes'; end if;
  insert into app.guestbook (owner, author, author_name, body, gift) values (p_owner, p_me, name, body, p_gift) returning id into new_id;
  return new_id;
end $$;
create table app.home_votes (
  week int not null check (week between 0 and 100000),
  voter uuid not null references app.profiles (id) on delete cascade,
  owner uuid not null references app.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (week, voter), check (voter <> owner)
);
create function app.vote_home(p_me uuid, p_owner uuid) returns void language plpgsql as $$
declare wk int := floor(extract(epoch from now()) / 604800)::int;
begin
  if not exists (select 1 from app.profiles where id = p_me) then raise exception 'no profile'; end if;
  if p_owner = p_me then raise exception 'your own home'; end if;
  if not exists (select 1 from app.homes where player_id = p_owner) then raise exception 'no such home'; end if;
  insert into app.home_votes (week, voter, owner) values (wk, p_me, p_owner);
exception when unique_violation then raise exception 'already voted';
end $$;
create function app.best_homes() returns table (owner uuid, username text, city text, dwelling text, stars int, votes bigint) language sql stable as $$
  select h.player_id, h.username, h.city, h.dwelling, h.stars, count(v.voter) from app.homes h
  join app.home_votes v on v.owner = h.player_id and v.week = floor(extract(epoch from now()) / 604800)::int
  group by h.player_id order by count(v.voter) desc, h.stars desc limit 10;
$$;
create function app.my_friends(p_me uuid) returns table (id uuid, username text, mutual boolean, online boolean, city text, place text) language sql stable as $$
  select p.id, p.username,
    exists (select 1 from app.follows b where b.follower = p.id and b.followed = p_me),
    r.player_id is not null, r.city, r.place
  from app.follows f join app.profiles p on p.id = f.followed
  left join app.presence r on r.player_id = p.id and r.seen_at > now() - interval '3 minutes'
  where f.follower = p_me order by p.username;
$$;

-- ---------- clean-up (the server runs it every hour) ----------
create function app.cleanup() returns table (presence_gone bigint, messages_gone bigint, ads_gone bigint, sessions_gone bigint, tokens_gone bigint) language plpgsql security definer set search_path = app, pg_temp as $$
declare a bigint; b bigint; c bigint; d bigint; e bigint;
begin
  with x as (delete from app.presence where seen_at < now() - interval '1 day' returning 1) select count(*) into a from x;
  with x as (delete from app.messages where created_at < now() - interval '30 days' returning 1) select count(*) into b from x;
  with x as (delete from app.ads where expires_at < now() - interval '7 days' returning 1) select count(*) into c from x;
  with x as (delete from app.sessions where expires_at < now() or idle_expires_at < now() returning 1) select count(*) into d from x;
  with x as (delete from app.email_tokens where expires_at < now() - interval '1 day' returning 1) select count(*) into e from x;
  delete from app.auth_events where created_at < now() - interval '180 days';
  return query select a, b, c, d, e;
end $$;

-- ---------- what the running server may do ----------
grant select, insert, update, delete on app.profiles, app.saves, app.presence, app.blocks, app.follows, app.homes, app.guestbook to vr_app;
grant select, insert on app.scores, app.messages, app.reports, app.votes, app.ads, app.ad_reports, app.home_votes to vr_app;
grant update (hidden) on app.messages, app.ads to vr_app;
grant delete on app.ads to vr_app;
grant select, update on app.counters to vr_app;
grant select on app.announcements to vr_app;
grant usage on all sequences in schema app to vr_app;
revoke all on all functions in schema app from public;
grant execute on all functions in schema app to vr_app;
grant select on all tables in schema app to vr_backup;
