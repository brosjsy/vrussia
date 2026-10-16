-- V Russia, the online part, second step: what players need to find and talk to each other, and what the owner needs to keep it clean.
-- Adverts from real players, following other players, a list of one's private talks, messages hidden after three reports, a daily cap on messages,
-- deleting one's own account, and a clean-up job. Apply after 0001_init.sql. NOTHING here has been run on a real server.

-- ---------- messages: hidden after three different players report them, and a daily cap ----------
alter table public.messages add column hidden boolean not null default false;
drop policy messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated using (
  not hidden
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.adult)
  and (room like 'place:%' or room like '%' || auth.uid()::text || '%')
  and not exists (select 1 from public.blocks b where b.blocker = auth.uid() and b.blocked = messages.sender)
);

create or replace function public.hide_reported() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(distinct reporter) from public.reports where message_id = new.message_id) >= 3 then
    update public.messages set hidden = true where id = new.message_id;
  end if;
  return new;
end $$;
create trigger reports_hide after insert on public.reports for each row execute function public.hide_reported();

create or replace function public.messages_cap() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages where sender = new.sender and created_at > now() - interval '1 day') >= 300 then raise exception 'daily limit'; end if;
  return new;
end $$;
create trigger messages_daily_cap before insert on public.messages for each row execute function public.messages_cap();

-- ---------- a player's private talks: each room once, with the other person's name and the last line ----------
create or replace function public.my_talks()
returns table (room text, other uuid, other_name text, last_body text, last_at timestamptz) language sql stable set search_path = public as $$
  select t.room, t.other, p.username, t.body, t.created_at from (
    select distinct on (m.room) m.room, m.body, m.created_at,
      case when split_part(m.room, ':', 2) = auth.uid()::text then split_part(m.room, ':', 3)::uuid else split_part(m.room, ':', 2)::uuid end as other
    from public.messages m where m.room like 'direct:%' order by m.room, m.id desc
  ) t join public.profiles p on p.id = t.other order by t.created_at desc limit 50;
$$;   -- not security definer: the reading rule of messages decides what is seen

-- ---------- adverts from real players ----------
create table public.ads (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles (id) on delete cascade,
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
create index ads_city on public.ads (city, id desc);
alter table public.ads enable row level security;
create policy ads_read on public.ads for select using (not hidden and expires_at > now());
create policy ads_delete_own on public.ads for delete using (auth.uid() = player_id);
-- no insert or update policy: an ad is put up only through post_ad()

create or replace function public.post_ad(p_city text, p_kind text, p_title text, p_body text, p_price int)
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); name text; new_id bigint; title text := btrim(p_title);
begin
  if me is null then raise exception 'not signed in'; end if;
  select username into name from public.profiles where id = me;
  if name is null then raise exception 'no profile'; end if;
  if char_length(title) < 4 or char_length(title) > 60 then raise exception 'bad length'; end if;
  if (select count(*) from public.ads where player_id = me and created_at > now() - interval '1 day') >= 3 then raise exception 'too many ads today'; end if;
  if (select count(*) from public.ads where player_id = me and expires_at > now()) >= 3 then raise exception 'too many ads'; end if;
  insert into public.ads (player_id, username, city, kind, title, body, price) values (me, name, p_city, p_kind, title, btrim(coalesce(p_body, '')), coalesce(p_price, 0)) returning id into new_id;
  return new_id;
end $$;

create table public.ad_reports (
  reporter uuid not null references public.profiles (id) on delete cascade,
  ad_id bigint not null references public.ads (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reporter, ad_id)
);
alter table public.ad_reports enable row level security;
-- no policy at all: written only through report_ad(), read only by the owner in the dashboard

create or replace function public.report_ad(p_ad bigint)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.profiles where id = me) then raise exception 'no profile'; end if;
  insert into public.ad_reports (reporter, ad_id) values (me, p_ad) on conflict do nothing;
  if (select count(*) from public.ad_reports where ad_id = p_ad) >= 3 then update public.ads set hidden = true where id = p_ad; end if;
end $$;

-- ---------- following other players (two who follow each other are friends) ----------
create table public.follows (
  follower uuid not null references public.profiles (id) on delete cascade,
  followed uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followed), check (follower <> followed)
);
alter table public.follows enable row level security;
create policy follows_read on public.follows for select using (auth.uid() = follower or auth.uid() = followed);
create policy follows_insert_own on public.follows for insert with check (auth.uid() = follower and (select count(*) from public.follows f where f.follower = auth.uid()) < 200);
create policy follows_delete_own on public.follows for delete using (auth.uid() = follower);

-- ---------- a player removes their own account, with everything that hangs on it ----------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = me;        -- profiles, saves, scores, presence, messages, ads and the rest go with it (on delete cascade)
end $$;

-- ---------- the clean-up job (for the owner: run it daily, for example with pg_cron) ----------
create or replace function public.cleanup()
returns table (presence_gone bigint, messages_gone bigint, ads_gone bigint) language plpgsql security definer set search_path = public as $$
declare a bigint; b bigint; c bigint;
begin
  with d as (delete from public.presence where seen_at < now() - interval '1 day' returning 1) select count(*) into a from d;
  with d as (delete from public.messages where created_at < now() - interval '30 days' returning 1) select count(*) into b from d;
  with d as (delete from public.ads where expires_at < now() - interval '7 days' returning 1) select count(*) into c from d;
  return query select a, b, c;
end $$;

-- ---------- who may call what ----------
revoke all on function public.post_ad(text, text, text, text, int), public.report_ad(bigint), public.delete_my_account(), public.my_talks(), public.cleanup(), public.hide_reported(), public.messages_cap() from public, anon;
grant execute on function public.post_ad(text, text, text, text, int), public.report_ad(bigint), public.delete_my_account(), public.my_talks() to authenticated;
-- cleanup() is for the owner only (the service role or the scheduler); the two trigger functions are called by nobody directly
