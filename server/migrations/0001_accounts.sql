-- Accounts, sessions and e-mail tokens. Run as vr_owner (see ops/db/00_roles.sql).
-- Secrets are never stored as they are: passwords as Argon2id hashes, session and e-mail tokens as SHA-256 hashes (hex) (a stolen copy of the
-- database cannot be used to log in or to reset a password).
create schema app;
revoke all on schema app from public;

create table app.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) between 3 and 254 and email like '%_@_%'),
  password_hash text not null check (password_hash like '$argon2id$%'),
  email_verified_at timestamptz,
  password_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table app.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  idle_expires_at timestamptz not null,
  expires_at timestamptz not null,                       -- the absolute end, however active the session is
  ip text check (char_length(ip) <= 64),
  user_agent text check (char_length(user_agent) <= 300)
);
create index sessions_user on app.sessions (user_id);
create index sessions_expiry on app.sessions (expires_at);

create table app.email_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null references app.users (id) on delete cascade,
  kind text not null check (kind in ('verify', 'reset')),
  email text not null,                                   -- the address the link was sent to: a verification confirms that address only
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index email_tokens_user on app.email_tokens (user_id, kind);

-- a short record of what happened to accounts, for the owner (never passwords or tokens)
create table app.auth_events (
  id bigint generated always as identity primary key,
  user_id uuid references app.users (id) on delete set null,
  kind text not null check (kind ~ '^[a-z_]{3,40}$'),
  ip text check (char_length(ip) <= 64),
  created_at timestamptz not null default now()
);
create index auth_events_user on app.auth_events (user_id, created_at desc);
create index auth_events_time on app.auth_events (created_at);

-- the running server: rows only
grant usage on schema app to vr_app, vr_backup;
grant select, insert, update, delete on app.users, app.sessions, app.email_tokens to vr_app;
grant select, insert on app.auth_events to vr_app;
grant usage on all sequences in schema app to vr_app;
grant select on all tables in schema app to vr_backup;
