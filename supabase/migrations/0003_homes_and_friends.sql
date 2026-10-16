-- V Russia, the online part, third step: homes that friends can visit, a guest book with notes and small gifts, a weekly "best flat" vote,
-- a list of friends with who is online, and a filter for bad language in chat, notes and adverts. Apply after 0001 and 0002.
-- NOTHING here has been run on a real server.

-- ---------- bad language: one check used by every place where players write ----------
create or replace function public.is_rude(p text) returns boolean language sql immutable as $$
  select lower(coalesce(p, '')) ~ '(хуй|хуе|хуё|пизд|ебат|ебан|ёбан|еблан|блядь|бляд|сука|суки|мудак|мудил|залуп|fuck|shit|cunt|bitch|nigger|faggot)';
$$;
create or replace function public.messages_clean() returns trigger language plpgsql as $$
begin
  if public.is_rude(new.body) then raise exception 'language'; end if;
  return new;
end $$;
create trigger messages_language before insert on public.messages for each row execute function public.messages_clean();
create or replace function public.ads_clean() returns trigger language plpgsql as $$
begin
  if public.is_rude(new.title) or public.is_rude(new.body) then raise exception 'language'; end if;
  return new;
end $$;
create trigger ads_language before insert on public.ads for each row execute function public.ads_clean();

-- ---------- the home a player shows to others ----------
create table public.homes (
  player_id uuid primary key references public.profiles (id) on delete cascade,
  username text not null,
  city text not null check (char_length(city) between 2 and 40),
  dwelling text not null check (dwelling ~ '^[a-z]{3,12}$'),
  design jsonb not null check (pg_column_size(design) < 20000),
  stars int not null default 0 check (stars between 0 and 400),
  updated_at timestamptz not null default now()
);
alter table public.homes enable row level security;
create policy homes_read on public.homes for select to authenticated using (true);
-- written only through publish_home(), which takes the name from the profile
create or replace function public.publish_home(p_city text, p_dwelling text, p_design jsonb, p_stars int)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); name text;
begin
  if me is null then raise exception 'not signed in'; end if;
  select username into name from public.profiles where id = me;
  if name is null then raise exception 'no profile'; end if;
  insert into public.homes (player_id, username, city, dwelling, design, stars, updated_at) values (me, name, p_city, p_dwelling, p_design, coalesce(p_stars, 0), now())
    on conflict (player_id) do update set city = excluded.city, dwelling = excluded.dwelling, design = excluded.design, stars = excluded.stars, updated_at = now();
end $$;

-- ---------- the guest book: a short note and maybe a small gift ----------
create table public.guestbook (
  id bigint generated always as identity primary key,
  owner uuid not null references public.profiles (id) on delete cascade,
  author uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 200),
  gift text check (gift in ('flowers', 'cake', 'tea', 'chocolates')),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index guestbook_owner on public.guestbook (owner, id desc);
alter table public.guestbook enable row level security;
create policy guestbook_read on public.guestbook for select to authenticated using (not hidden and not exists (select 1 from public.blocks b where b.blocker = auth.uid() and b.blocked = guestbook.author));
create policy guestbook_owner_hides on public.guestbook for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy guestbook_delete on public.guestbook for delete using (auth.uid() = owner or auth.uid() = author);
create or replace function public.sign_guestbook(p_owner uuid, p_body text, p_gift text)
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); name text; body text := btrim(p_body); new_id bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  select username into name from public.profiles where id = me;
  if name is null then raise exception 'no profile'; end if;
  if p_owner = me then raise exception 'your own home'; end if;
  if not exists (select 1 from public.homes where player_id = p_owner) then raise exception 'no such home'; end if;
  if exists (select 1 from public.blocks where blocker = p_owner and blocked = me) then raise exception 'blocked'; end if;
  if char_length(body) < 1 or char_length(body) > 200 then raise exception 'bad length'; end if;
  if public.is_rude(body) then raise exception 'language'; end if;
  if (select count(*) from public.guestbook where author = me and created_at > now() - interval '1 day') >= 10 then raise exception 'too many notes'; end if;
  insert into public.guestbook (owner, author, author_name, body, gift) values (p_owner, me, name, body, p_gift) returning id into new_id;
  return new_id;
end $$;

-- ---------- one like a week for the best flat ----------
create table public.home_votes (
  week int not null check (week between 0 and 100000),
  voter uuid not null references public.profiles (id) on delete cascade,
  owner uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (week, voter), check (voter <> owner)
);
alter table public.home_votes enable row level security;
create policy home_votes_own on public.home_votes for select using (auth.uid() = voter);
create or replace function public.vote_home(p_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); wk int := floor(extract(epoch from now()) / 604800)::int;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.profiles where id = me) then raise exception 'no profile'; end if;
  if p_owner = me then raise exception 'your own home'; end if;
  if not exists (select 1 from public.homes where player_id = p_owner) then raise exception 'no such home'; end if;
  insert into public.home_votes (week, voter, owner) values (wk, me, p_owner);
exception when unique_violation then raise exception 'already voted';
end $$;
create or replace function public.best_homes()
returns table (owner uuid, username text, city text, dwelling text, stars int, votes bigint) language sql security definer set search_path = public stable as $$
  select h.player_id, h.username, h.city, h.dwelling, h.stars, count(v.voter) from public.homes h
  join public.home_votes v on v.owner = h.player_id and v.week = floor(extract(epoch from now()) / 604800)::int
  group by h.player_id order by count(v.voter) desc, h.stars desc limit 10;
$$;

-- ---------- friends: who I follow, whether they follow me back, and whether they are online ----------
create or replace function public.my_friends()
returns table (id uuid, username text, mutual boolean, online boolean, city text, place text) language sql stable security definer set search_path = public as $$
  select p.id, p.username,
    exists (select 1 from public.follows b where b.follower = p.id and b.followed = auth.uid()),
    exists (select 1 from public.presence r where r.player_id = p.id and r.seen_at > now() - interval '3 minutes'),
    (select r.city from public.presence r where r.player_id = p.id and r.seen_at > now() - interval '3 minutes'),
    (select r.place from public.presence r where r.player_id = p.id and r.seen_at > now() - interval '3 minutes')
  from public.follows f join public.profiles p on p.id = f.followed
  where f.follower = auth.uid() order by p.username;
$$;   -- security definer so that a friend's presence is visible; it only ever lists the caller's own follows

-- ---------- who may call what ----------
revoke all on function public.publish_home(text, text, jsonb, int), public.sign_guestbook(uuid, text, text), public.vote_home(uuid), public.best_homes(), public.my_friends() from public, anon;
grant execute on function public.publish_home(text, text, jsonb, int), public.sign_guestbook(uuid, text, text), public.vote_home(uuid), public.best_homes(), public.my_friends() to authenticated;
grant execute on function public.is_rude(text) to anon, authenticated;
