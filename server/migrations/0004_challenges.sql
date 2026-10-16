-- Challenges between players, in a storyline of eight chapters (round 124).
-- The server counts what players really do with each other (no client can claim progress it did not make): triggers on the tables of
-- the online part count social events per player, all-time (week 0) and per week. A challenge is "do event E, N times" (personal),
-- "do it together with a friend" (co-op: an invitation both accept, then both mark their part done) or "the whole city together"
-- (city: players join, one shared total). Rewards are in-game money, given once (weekly challenges once a week). Run as vr_owner.

-- ---------- the profile also says where a player comes from (country and continent; optional, public like the name) ----------
alter table app.profiles add column country text check (country ~ '^[A-Z]{2}$');
alter table app.profiles add column region text check (region in ('CIS', 'Europe', 'Asia', 'Africa', 'Americas', 'Oceania'));

-- ---------- counting ----------
create table app.social_counts (
  player_id uuid not null references app.profiles (id) on delete cascade,
  event text not null check (event ~ '^[a-z_:]{2,60}$'),
  week int not null,                                    -- 0: all time; otherwise the week number (since 1970)
  n int not null default 0,
  primary key (player_id, event, week)
);
create function app.this_week() returns int language sql stable as $$ select floor(extract(epoch from now()) / 604800)::int $$;
create function app.count_event(p uuid, e text, k int default 1) returns void language plpgsql as $$
begin
  if p is null or not exists (select 1 from app.profiles where id = p) then return; end if;
  insert into app.social_counts (player_id, event, week, n) values (p, e, 0, k), (p, e, app.this_week(), k)
    on conflict (player_id, event, week) do update set n = app.social_counts.n + excluded.n;
end $$;

-- messages: at a place, in private, in Russian, a new person to talk to, a new city's rooms, a newcomer welcomed
create function app.count_message() returns trigger language plpgsql as $$
declare other uuid; city text;
begin
  if new.room like 'place:%' then
    perform app.count_event(new.sender, 'msg_place');
    city := split_part(new.room, ':', 2);
    if not exists (select 1 from app.messages m where m.sender = new.sender and m.id <> new.id and m.room like 'place:' || city || ':%') then perform app.count_event(new.sender, 'city_room_new'); end if;
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
create trigger messages_count after insert on app.messages for each row execute function app.count_message();

create function app.count_follow() returns trigger language plpgsql as $$
begin
  perform app.count_event(new.follower, 'follow');
  perform app.count_event(new.followed, 'followed');
  if exists (select 1 from app.follows f where f.follower = new.followed and f.followed = new.follower) then
    perform app.count_event(new.follower, 'mutual'); perform app.count_event(new.followed, 'mutual');
  end if;
  return new;
end $$;
create trigger follows_count after insert on app.follows for each row execute function app.count_follow();

create function app.count_note() returns trigger language plpgsql as $$
begin
  perform app.count_event(new.author, 'note_sent'); perform app.count_event(new.owner, 'note_received');
  if new.gift is not null then perform app.count_event(new.author, 'gift_sent'); perform app.count_event(new.owner, 'gift_received'); end if;
  return new;
end $$;
create trigger guestbook_count after insert on app.guestbook for each row execute function app.count_note();

create function app.count_like() returns trigger language plpgsql as $$
begin perform app.count_event(new.voter, 'like_given'); perform app.count_event(new.owner, 'like_received'); return new; end $$;
create trigger home_votes_count after insert on app.home_votes for each row execute function app.count_like();

create function app.count_ad() returns trigger language plpgsql as $$
begin
  perform app.count_event(new.player_id, 'ad_posted');
  if not exists (select 1 from app.ads a where a.player_id = new.player_id and a.city = new.city and a.id <> new.id) then perform app.count_event(new.player_id, 'ad_city_new'); end if;
  return new;
end $$;
create trigger ads_count after insert on app.ads for each row execute function app.count_ad();

create function app.count_vote() returns trigger language plpgsql as $$ begin perform app.count_event(new.player_id, 'vote_cast'); return new; end $$;
create trigger votes_count after insert on app.votes for each row execute function app.count_vote();
create function app.count_home() returns trigger language plpgsql as $$ begin perform app.count_event(new.player_id, 'home_shown'); return new; end $$;
create trigger homes_count after insert on app.homes for each row execute function app.count_home();
create function app.count_score() returns trigger language plpgsql as $$ begin perform app.count_event(new.player_id, 'score_sent'); return new; end $$;
create trigger scores_count after insert on app.scores for each row execute function app.count_score();
create function app.count_presence() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or old.city is distinct from new.city then
    if not exists (select 1 from app.social_counts c where c.player_id = new.player_id and c.event = 'seen_in:' || lower(regexp_replace(new.city, '[^A-Za-z]', '', 'g')) and c.week = 0) then
      perform app.count_event(new.player_id, 'seen_in:' || lower(regexp_replace(new.city, '[^A-Za-z]', '', 'g')));
      perform app.count_event(new.player_id, 'city_new');
    end if;
  end if;
  return new;
end $$;
create trigger presence_count after insert or update on app.presence for each row execute function app.count_presence();

-- ---------- the storyline and the challenges ----------
create table app.chapters (id int primary key, title_en text not null, title_ru text not null, text_en text not null, text_ru text not null);
create table app.challenges (
  id text primary key check (id ~ '^[a-z0-9_]{3,40}$'),
  chapter int not null references app.chapters (id),
  sort int not null,
  kind text not null check (kind in ('event', 'coop', 'city')),
  event text,                                            -- for 'event': what is counted
  target int not null check (target between 1 and 1000),
  weekly boolean not null default false,
  reward int not null check (reward between 0 and 50000),
  title_en text not null, title_ru text not null, text_en text not null, text_ru text not null,
  check ((kind = 'event') = (event is not null))
);
create table app.challenge_claims (
  player_id uuid not null references app.profiles (id) on delete cascade,
  challenge_id text not null references app.challenges (id),
  week int not null,
  claimed_at timestamptz not null default now(),
  primary key (player_id, challenge_id, week)
);
-- co-op: two friends do something together; each marks their part done
create table app.coops (
  id bigint generated always as identity primary key,
  challenge_id text not null references app.challenges (id),
  inviter uuid not null references app.profiles (id) on delete cascade,
  invitee uuid not null references app.profiles (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'done')),
  inviter_done boolean not null default false, invitee_done boolean not null default false,
  created_at timestamptz not null default now(),
  check (inviter <> invitee)
);
create index coops_people on app.coops (inviter, invitee);
-- city: everybody in a city joins one effort; one shared total per week
create table app.city_joins (
  challenge_id text not null references app.challenges (id),
  city text not null check (char_length(city) between 2 and 40),
  week int not null,
  player_id uuid not null references app.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, city, week, player_id)
);

/** How far a player is with one challenge (in its period), and whether it is done / claimed. */
create function app.challenge_state(p uuid, c app.challenges, p_city text) returns table (have int, done boolean, claimed boolean) language plpgsql stable as $$
declare wk int := case when c.weekly or c.kind = 'city' then app.this_week() else 0 end; h int;
begin
  if c.kind = 'event' then select coalesce(sum(n), 0)::int into h from app.social_counts where player_id = p and event = c.event and week = wk;
  elsif c.kind = 'coop' then select count(*)::int into h from app.coops where challenge_id = c.id and status = 'done' and (inviter = p or invitee = p);
  else select count(*)::int into h from app.city_joins where challenge_id = c.id and city = coalesce(p_city, '') and week = wk;
  end if;
  return query select h, h >= c.target, exists (select 1 from app.challenge_claims k where k.player_id = p and k.challenge_id = c.id and k.week = wk);
end $$;
create function app.my_challenges(p uuid, p_city text) returns table (id text, chapter int, sort int, kind text, target int, weekly boolean, reward int, title_en text, title_ru text, text_en text, text_ru text, have int, done boolean, claimed boolean, joined boolean)
language sql stable as $$
  select c.id, c.chapter, c.sort, c.kind, c.target, c.weekly, c.reward, c.title_en, c.title_ru, c.text_en, c.text_ru, st.have, st.done, st.claimed,
    (c.kind = 'city' and exists (select 1 from app.city_joins j where j.challenge_id = c.id and j.player_id = p and j.week = app.this_week()))
  from app.challenges c cross join lateral app.challenge_state(p, c, p_city) st order by c.chapter, c.sort;
$$;
create function app.claim_challenge(p uuid, p_id text, p_city text) returns int language plpgsql as $$
declare c app.challenges; st record; wk int;
begin
  select * into c from app.challenges where id = p_id; if c.id is null then raise exception 'no such challenge'; end if;
  if not exists (select 1 from app.profiles where id = p) then raise exception 'no profile'; end if;
  select * into st from app.challenge_state(p, c, p_city);
  if st.claimed then raise exception 'already claimed'; end if;
  if not st.done then raise exception 'not done yet'; end if;
  if c.kind = 'city' and not exists (select 1 from app.city_joins j where j.challenge_id = c.id and j.player_id = p and j.week = app.this_week()) then raise exception 'join first'; end if;
  wk := case when c.weekly or c.kind = 'city' then app.this_week() else 0 end;
  insert into app.challenge_claims (player_id, challenge_id, week) values (p, c.id, wk);
  return c.reward;
end $$;
create function app.coop_invite(p uuid, p_friend uuid, p_challenge text) returns bigint language plpgsql as $$
declare new_id bigint;
begin
  if not exists (select 1 from app.challenges where id = p_challenge and kind = 'coop') then raise exception 'no such challenge'; end if;
  if p_friend = p then raise exception 'invalid input'; end if;
  if not exists (select 1 from app.follows where follower = p and followed = p_friend) or not exists (select 1 from app.follows where follower = p_friend and followed = p) then raise exception 'friends only'; end if;
  if exists (select 1 from app.blocks where blocker = p_friend and blocked = p) then raise exception 'blocked'; end if;
  if (select count(*) from app.coops where inviter = p and created_at > now() - interval '1 day') >= 10 then raise exception 'too many invitations'; end if;
  if exists (select 1 from app.coops where challenge_id = p_challenge and status in ('invited', 'accepted') and ((inviter = p and invitee = p_friend) or (inviter = p_friend and invitee = p))) then raise exception 'already invited'; end if;
  insert into app.coops (challenge_id, inviter, invitee) values (p_challenge, p, p_friend) returning id into new_id;
  return new_id;
end $$;
create function app.coop_answer(p uuid, p_coop bigint, p_yes boolean) returns void language plpgsql as $$
begin
  update app.coops set status = case when p_yes then 'accepted' else 'declined' end where id = p_coop and invitee = p and status = 'invited';
  if not found then raise exception 'no such invitation'; end if;
end $$;
create function app.coop_done(p uuid, p_coop bigint) returns text language plpgsql as $$
declare c app.coops;
begin
  update app.coops set inviter_done = inviter_done or inviter = p, invitee_done = invitee_done or invitee = p
    where id = p_coop and status = 'accepted' and (inviter = p or invitee = p) returning * into c;
  if c.id is null then raise exception 'no such invitation'; end if;
  if c.inviter_done and c.invitee_done then
    update app.coops set status = 'done' where id = c.id;
    perform app.count_event(c.inviter, 'coop_done'); perform app.count_event(c.invitee, 'coop_done');
    return 'done';
  end if;
  return 'waiting';
end $$;
create function app.city_join(p uuid, p_challenge text, p_city text) returns int language plpgsql as $$
declare n int;
begin
  if not exists (select 1 from app.challenges where id = p_challenge and kind = 'city') then raise exception 'no such challenge'; end if;
  if not exists (select 1 from app.profiles where id = p) then raise exception 'no profile'; end if;
  insert into app.city_joins (challenge_id, city, week, player_id) values (p_challenge, p_city, app.this_week(), p) on conflict do nothing;
  select count(*)::int into n from app.city_joins where challenge_id = p_challenge and city = p_city and week = app.this_week();
  return n;
end $$;

-- ---------- what the running server may do ----------
grant select, insert, update on app.social_counts, app.coops to vr_app;
grant select, insert on app.challenge_claims, app.city_joins to vr_app;
grant select on app.chapters, app.challenges to vr_app;
grant usage on all sequences in schema app to vr_app;
revoke all on all functions in schema app from public;
grant execute on all functions in schema app to vr_app;

-- the player's country (from the sign-up form or the profile), public like the name
create function app.set_origin(p uuid, p_country text, p_region text) returns void language plpgsql as $$
begin
  update app.profiles set country = upper(p_country), region = p_region where id = p;
  if not found then raise exception 'no profile'; end if;
end $$;
grant execute on function app.set_origin(uuid, text, text) to vr_app;
