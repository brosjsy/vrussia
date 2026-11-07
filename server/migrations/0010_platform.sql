-- The platform tables (round 154): privacy-friendly usage events and error reports, feature flags, and classes for teachers and NGOs.
-- Nothing here stores an IP address, a user agent or an e-mail address. Events and errors carry a random per-tab id, never a player id.
-- Run as vr_owner.

-- ---------- usage events and error reports (anonymous, kept 90 days) ----------
create table app.telemetry (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in ('event', 'error')),
  name text not null check (name ~ '^[a-z0-9_.:-]{2,60}$'),
  props jsonb not null default '{}'::jsonb check (octet_length(props::text) <= 1000),
  sid text check (sid ~ '^[a-z0-9]{8,32}$'),
  build text check (build ~ '^[A-Za-z0-9._-]{1,30}$')
);
create index telemetry_at on app.telemetry (at);
create index telemetry_name on app.telemetry (kind, name, at);
create function app.prune_telemetry() returns int language plpgsql as $$
declare n int;
begin
  delete from app.telemetry where at < now() - interval '90 days';
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- feature flags (read by every browser, changed by an administrator) ----------
create table app.flags (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  enabled boolean not null default false,
  rollout int not null default 100 check (rollout between 0 and 100),
  note text not null default '' check (char_length(note) <= 200),
  updated_at timestamptz not null default now()
);

-- announcements stay read-only for the server's role (least privilege, test/db.test.ts): an administrator posts one through this function only
create function app.post_announcement(p_title text, p_body text) returns bigint language sql security definer set search_path = app, pg_temp as $$
  insert into app.announcements (title, body) values (p_title, p_body) returning id
$$;

-- ---------- classes: a teacher or an NGO gives a code, pupils play and send their result under a nickname ----------
create table app.classes (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  owner uuid not null references app.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  assignment jsonb not null default '{}'::jsonb check (octet_length(assignment::text) <= 1000),
  created_at timestamptz not null default now()
);
create index classes_owner on app.classes (owner);
create table app.class_results (
  id bigint generated always as identity primary key,
  code text not null references app.classes (code) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 20),
  origin text not null check (char_length(origin) between 2 and 20),
  ending text not null check (ending in ('hospital', 'deported', 'debt', 'time')),
  score int not null check (score between 0 and 100000),
  days int not null check (days between 1 and 800),
  learned jsonb not null default '{}'::jsonb check (octet_length(learned::text) <= 4000),
  created_at timestamptz not null default now(),
  unique (code, nickname)
);

grant select, insert, delete on app.telemetry to vr_app;
grant select, insert, update, delete on app.flags to vr_app;
grant select, insert, delete on app.classes to vr_app;
grant select, insert, update, delete on app.class_results to vr_app;
grant usage on all sequences in schema app to vr_app;
revoke all on all functions in schema app from public;
grant execute on all functions in schema app to vr_app;
grant select on all tables in schema app to vr_backup;
