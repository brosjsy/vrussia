-- Advertising spaces (round 125): a player mounts an advert on a place in a city (a bus stop, a metro car, a billboard, a wall, the big screen) and
-- the other players in that city see it on the boards of their 3D city. The game pays for it in game roubles (src/adspace.ts); the server keeps the
-- words, checks them (bad language, the simplified advertising law), keeps the limits and counts how many real players have seen each advert.

create table app.adverts (
  id bigint generated always as identity primary key,
  player_id uuid not null references app.profiles (id) on delete cascade,
  username text not null,
  city text not null check (char_length(city) between 2 and 40),
  spot text not null check (spot in ('stop', 'metro', 'board', 'wall', 'screen')),
  head text not null check (char_length(head) between 3 and 32),
  line text not null default '' check (char_length(line) <= 60),
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  icon text not null check (char_length(icon) between 1 and 8),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index adverts_city on app.adverts (city, spot, expires_at);

-- the same rules as lawCheck in src/adspace.ts: the game says why at once, the server checks again
create function app.advert_banned(p text) returns boolean language sql immutable as $$
  select app.is_rude(p) or lower(p) ~ '(vodka|beer|wine|alcohol|водк|пив|вино|алкогол|коньяк|cigarette|tobacco|vape|сигарет|табак|вейп|кальян|casino|poker|ставк|казино|покер|букмекер|loan|credit|займ|кредит|микрофинанс|vote for|голосуй|https?:|www\.|\.ru\M|\.com\M|@)'
$$;

-- how many frames each kind of place has in one city (CAPACITY in src/adspace.ts)
create function app.advert_capacity(p_spot text) returns int language sql immutable as $$
  select case p_spot when 'wall' then 2 when 'screen' then 4 when 'board' then 5 else 6 end
$$;

create function app.mount_advert(p_me uuid, p_city text, p_spot text, p_head text, p_line text, p_color text, p_icon text, p_days int) returns bigint language plpgsql as $$
declare name text; new_id bigint; h text := btrim(p_head); l text := btrim(coalesce(p_line, ''));
begin
  select username into name from app.profiles where id = p_me;
  if name is null then raise exception 'no profile'; end if;
  if char_length(h) < 3 or char_length(h) > 32 or char_length(l) > 60 then raise exception 'bad length'; end if;
  if app.advert_banned(h) or app.advert_banned(l) then raise exception 'language'; end if;
  if (select count(*) from app.adverts where player_id = p_me and expires_at > now()) >= 2 then raise exception 'too many adverts'; end if;
  if (select count(*) from app.adverts where player_id = p_me and created_at > now() - interval '1 day') >= 3 then raise exception 'too many adverts today'; end if;
  -- one player at a time takes the place; the lock keeps two players from taking the last frame at once
  perform pg_advisory_xact_lock(hashtext('advert:' || p_city || ':' || p_spot));
  delete from app.adverts where expires_at < now() - interval '7 days';          -- old adverts go here, so the hourly clean-up needs no change
  if (select count(*) from app.adverts where city = p_city and spot = p_spot and not hidden and expires_at > now()) >= app.advert_capacity(p_spot) then raise exception 'place taken'; end if;
  insert into app.adverts (player_id, username, city, spot, head, line, color, icon, expires_at)
    values (p_me, name, p_city, p_spot, h, l, lower(p_color), p_icon, now() + make_interval(days => least(greatest(coalesce(p_days, 1), 1), 7)))
    returning id into new_id;
  perform app.count_event(p_me, 'advert_mounted');
  return new_id;
end $$;

-- every real player who saw an advert, once a day each (not its own author)
create table app.advert_views (
  advert_id bigint not null references app.adverts (id) on delete cascade,
  viewer uuid not null references app.profiles (id) on delete cascade,
  day date not null default current_date,
  primary key (advert_id, viewer, day)
);
create function app.adverts_in(p_viewer uuid, p_city text) returns table (id bigint, username text, city text, spot text, head text, line text, color text, icon text, expires_at timestamptz, views bigint)
language plpgsql as $$
begin
  if p_viewer is not null then
    insert into app.advert_views (advert_id, viewer)
      select a.id, p_viewer from app.adverts a where a.city = p_city and not a.hidden and a.expires_at > now() and a.player_id <> p_viewer
      on conflict do nothing;
  end if;
  return query select a.id, a.username, a.city, a.spot, a.head, a.line, a.color, a.icon, a.expires_at, (select count(*) from app.advert_views v where v.advert_id = a.id)
    from app.adverts a where a.city = p_city and not a.hidden and a.expires_at > now()
    and (p_viewer is null or not exists (select 1 from app.blocks b where b.blocker = p_viewer and b.blocked = a.player_id))
    order by a.id desc limit 40;
end $$;

create table app.advert_reports (
  reporter uuid not null references app.profiles (id) on delete cascade,
  advert_id bigint not null references app.adverts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reporter, advert_id)
);
create function app.report_advert(p_me uuid, p_advert bigint) returns void language plpgsql as $$
begin
  if not exists (select 1 from app.profiles where id = p_me) then raise exception 'no profile'; end if;
  if not exists (select 1 from app.adverts where id = p_advert) then raise exception 'no such advert'; end if;
  insert into app.advert_reports (reporter, advert_id) values (p_me, p_advert) on conflict do nothing;
  if (select count(*) from app.advert_reports where advert_id = p_advert) >= 3 then update app.adverts set hidden = true where id = p_advert; end if;
end $$;

grant select, insert on app.adverts, app.advert_views, app.advert_reports to vr_app;
grant update (hidden) on app.adverts to vr_app;
grant delete on app.adverts to vr_app;
grant usage on all sequences in schema app to vr_app;
revoke all on all functions in schema app from public;
grant execute on all functions in schema app to vr_app;
