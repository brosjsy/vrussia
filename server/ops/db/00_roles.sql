-- V Russia server: the database roles. Run ONCE per database cluster by an administrator (a superuser, e.g. the "postgres" user), before the
-- first migration:   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f ops/db/00_roles.sql
-- Then give each login role a password with \password (never put passwords in this file or in git):
--   \password vr_owner      \password vr_app      \password vr_backup
--
-- vr_owner  owns the schemas and runs the migrations. The running server never uses it.
-- vr_app    the running server: reads and writes rows of the game's tables and calls its functions. It cannot create, change or drop
--           tables, cannot read the migration history and cannot create roles.
-- vr_backup reads everything, writes nothing: for pg_dump.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'vr_owner') then create role vr_owner login nosuperuser nocreatedb nocreaterole noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'vr_app') then create role vr_app login nosuperuser nocreatedb nocreaterole noinherit connection limit 50; end if;
  if not exists (select 1 from pg_roles where rolname = 'vr_backup') then create role vr_backup login nosuperuser nocreatedb nocreaterole noinherit connection limit 3; end if;
  execute format('grant connect, create on database %I to vr_owner', current_database());
  execute format('grant connect on database %I to vr_app, vr_backup', current_database());
  execute format('revoke create, temporary on database %I from public', current_database());
end $$;
-- nobody but the owner may create things in the public schema (the default before PostgreSQL 15 allowed everybody)
revoke create on schema public from public;
-- the roles never wait forever, and a forgotten transaction is ended
alter role vr_app set statement_timeout = '15s';
alter role vr_app set idle_in_transaction_session_timeout = '30s';
alter role vr_backup set default_transaction_read_only = on;
