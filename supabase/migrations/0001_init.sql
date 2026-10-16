-- V Russia: the first version of the online part (accounts, cloud saves, a leaderboard, who is online, chat, votes, visits, announcements).
-- Written for Supabase (PostgreSQL with its auth schema). NOTHING here has been run anywhere: the owner creates a project and applies this file.
-- Every table has row level security switched on. Anything that must be checked (scores, messages, votes, presence) is written only through a
-- function that checks it on the server; there is no direct insert policy for those tables, so a changed client cannot write what it likes.

-- ---------- profiles: the public name of a player ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  adult boolean not null default false,                 -- the player said they are 18 or older (needed for chat)
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select using (true);                                   -- names are public, like name tags
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- no insert or delete policy: a profile is made by claim_profile() below and removed with the account

create or replace function public.claim_profile(p_username text, p_adult boolean)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); row public.profiles;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_username !~ '^[a-z0-9_]{3,20}$' then raise exception 'bad username'; end if;
  insert into public.profiles (id, username, adult) values (me, p_username, coalesce(p_adult, false))
    on conflict (id) do update set adult = public.profiles.adult or excluded.adult
    returning * into row;
  return row;
exception when unique_violation then raise exception 'username taken';
end $$;

-- ---------- saves: one saved game per player ----------
create table public.saves (
  player_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 400000),
  version int not null check (version between 1 and 1000),
  day int not null check (day between 0 and 100000),
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
create policy saves_read_own on public.saves for select using (auth.uid() = player_id);
create policy saves_insert_own on public.saves for insert with check (auth.uid() = player_id);
create policy saves_update_own on public.saves for update using (auth.uid() = player_id) with check (auth.uid() = player_id);
create policy saves_delete_own on public.saves for delete using (auth.uid() = player_id);

-- ---------- scores: the leaderboard of finished lives ----------
create table public.scores (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles (id) on delete cascade,
  username text not null,
  origin text not null check (char_length(origin) between 2 and 20),
  city text not null check (char_length(city) between 2 and 40),
  ending text not null check (ending in ('hospital', 'deported', 'debt', 'time')),
  score int not null check (score between 0 and 100000),
  days int not null check (days between 1 and 800),
  created_at timestamptz not null default now()
);
create index scores_top on public.scores (score desc, created_at);
alter table public.scores enable row level security;
create policy scores_read on public.scores for select using (true);
-- no insert policy: scores come only through submit_score()

create or replace function public.submit_score(p_origin text, p_city text, p_ending text, p_score int, p_days int)
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); name text; n int; new_id bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  select username into name from public.profiles where id = me;
  if name is null then raise exception 'no profile'; end if;
  select count(*) into n from public.scores where player_id = me and created_at > now() - interval '1 day';
  if n >= 10 then raise exception 'too many scores today'; end if;
  -- a life of N days cannot be worth more than this: the score formula counts money in thousands, goals and days
  if p_score > 20000 + p_days * 60 then raise exception 'score not possible'; end if;
  insert into public.scores (player_id, username, origin, city, ending, score, days)
    values (me, name, p_origin, p_city, p_ending, p_score, p_days) returning id into new_id;
  return new_id;
end $$;

-- ---------- presence: who is online and where ----------
create table public.presence (
  player_id uuid primary key references public.profiles (id) on delete cascade,
  username text not null,
  city text not null check (char_length(city) between 2 and 40),
  place text not null check (char_length(place) between 2 and 20),
  seen_at timestamptz not null default now()
);
create index presence_seen on public.presence (seen_at);
alter table public.presence enable row level security;
create policy presence_read on public.presence for select to authenticated using (seen_at > now() - interval '3 minutes');
-- no insert or update policy: presence is written only through heartbeat()

create or replace function public.heartbeat(p_city text, p_place text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); name text;
begin
  if me is null then raise exception 'not signed in'; end if;
  select username into name from public.profiles where id = me;
  if name is null then raise exception 'no profile'; end if;
  insert into public.presence (player_id, username, city, place, seen_at) values (me, name, p_city, p_place, now())
    on conflict (player_id) do update set city = excluded.city, place = excluded.place, seen_at = now();
end $$;

create or replace function public.online_count()
returns int language sql security definer set search_path = public stable as $$
  select count(*)::int from public.presence where seen_at > now() - interval '3 minutes';
$$;

-- ---------- chat: a room for every place of every city, and private talks ----------
create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked), check (blocker <> blocked)
);
alter table public.blocks enable row level security;
create policy blocks_own on public.blocks for all using (auth.uid() = blocker) with check (auth.uid() = blocker);

create table public.messages (
  id bigint generated always as identity primary key,
  room text not null check (room ~ '^(place:[^:]{2,40}:[a-z]{2,20}|direct:[0-9a-f-]{36}:[0-9a-f-]{36})$'),
  sender uuid not null references public.profiles (id) on delete cascade,
  username text not null,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index messages_room on public.messages (room, id desc);
alter table public.messages enable row level security;
-- a place room is read by signed-in adults; a private talk only by its two people; nobody reads what somebody they blocked wrote
create policy messages_read on public.messages for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.adult)
  and (room like 'place:%' or room like '%' || auth.uid()::text || '%')
  and not exists (select 1 from public.blocks b where b.blocker = auth.uid() and b.blocked = messages.sender)
);
-- no insert policy: messages come only through send_message()

create or replace function public.direct_room(a uuid, b uuid)
returns text language sql immutable as $$ select 'direct:' || least(a::text, b::text) || ':' || greatest(a::text, b::text); $$;

create or replace function public.send_message(p_room text, p_body text)
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); prof public.profiles; body text := btrim(p_body); n int; other uuid; new_id bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into prof from public.profiles where id = me;
  if prof.id is null then raise exception 'no profile'; end if;
  if not prof.adult then raise exception 'chat is for adults'; end if;
  if char_length(body) < 1 or char_length(body) > 280 then raise exception 'bad length'; end if;
  select count(*) into n from public.messages where sender = me and created_at > now() - interval '30 seconds';
  if n >= 6 then raise exception 'slow down'; end if;
  if p_room like 'direct:%' then
    if p_room not like '%' || me::text || '%' then raise exception 'not your talk'; end if;
    other := case when split_part(p_room, ':', 2) = me::text then split_part(p_room, ':', 3)::uuid else split_part(p_room, ':', 2)::uuid end;
    if p_room <> public.direct_room(me, other) then raise exception 'bad room'; end if;
    if exists (select 1 from public.blocks where blocker = other and blocked = me) then raise exception 'blocked'; end if;
  elsif p_room !~ '^place:[^:]{2,40}:[a-z]{2,20}$' then raise exception 'bad room';
  end if;
  insert into public.messages (room, sender, username, body) values (p_room, me, prof.username, body) returning id into new_id;
  return new_id;
end $$;

create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.profiles (id) on delete cascade,
  message_id bigint not null references public.messages (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 200),
  created_at timestamptz not null default now(),
  unique (reporter, message_id)
);
alter table public.reports enable row level security;
create policy reports_insert_own on public.reports for insert with check (auth.uid() = reporter);
-- no select policy: only the owner reads reports, in the dashboard

-- ---------- the weekly election, with real votes ----------
create table public.votes (
  week int not null check (week between 0 and 100000),
  city text not null check (char_length(city) between 2 and 40),
  player_id uuid not null references public.profiles (id) on delete cascade,
  candidate text not null check (char_length(candidate) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (week, city, player_id)
);
alter table public.votes enable row level security;
create policy votes_read_own on public.votes for select using (auth.uid() = player_id);
-- no insert policy: one vote a week through cast_vote(); the count is public through vote_tally()

create or replace function public.cast_vote(p_week int, p_city text, p_candidate text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.profiles where id = me) then raise exception 'no profile'; end if;
  insert into public.votes (week, city, player_id, candidate) values (p_week, p_city, me, p_candidate);
exception when unique_violation then raise exception 'already voted';
end $$;

create or replace function public.vote_tally(p_week int, p_city text)
returns table (candidate text, votes bigint) language sql security definer set search_path = public stable as $$
  select v.candidate, count(*) from public.votes v where v.week = p_week and v.city = p_city group by v.candidate order by count(*) desc;
$$;

-- ---------- small shared numbers: visits and the daily find ----------
create table public.counters (key text primary key check (key ~ '^[a-z_]{2,30}$'), value bigint not null default 0);
alter table public.counters enable row level security;
create policy counters_read on public.counters for select using (true);
insert into public.counters (key, value) values ('visits', 0), ('daily_found', 0);

create or replace function public.bump(p_key text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if p_key not in ('visits', 'daily_found') then raise exception 'bad counter'; end if;
  if p_key = 'daily_found' and auth.uid() is null then raise exception 'not signed in'; end if;
  update public.counters set value = value + 1 where key = p_key returning value into v;
  return v;
end $$;

-- ---------- announcements from the owner (written in the dashboard, read by everybody) ----------
create table public.announcements (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 2 and 80),
  body text not null check (char_length(body) between 2 and 500),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy announcements_read on public.announcements for select using (true);

-- ---------- who may call what ----------
revoke all on function public.claim_profile(text, boolean), public.submit_score(text, text, text, int, int), public.heartbeat(text, text), public.send_message(text, text), public.cast_vote(int, text, text) from public, anon;
grant execute on function public.claim_profile(text, boolean), public.submit_score(text, text, text, int, int), public.heartbeat(text, text), public.send_message(text, text), public.cast_vote(int, text, text) to authenticated;
grant execute on function public.online_count(), public.vote_tally(int, text), public.bump(text), public.direct_room(uuid, uuid) to anon, authenticated;
