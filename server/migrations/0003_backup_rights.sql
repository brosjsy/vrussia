-- The backup role (vr_backup) must read everything pg_dump copies: the tables, the sequences behind the ids, and the migration history
-- (so a restored database knows which migrations it already has). Tables added by later migrations are readable by it automatically.
grant select on all sequences in schema app to vr_backup;
grant usage on schema app_meta to vr_backup;
grant select on app_meta.migrations to vr_backup;
alter default privileges for role vr_owner in schema app grant select on tables to vr_backup;
alter default privileges for role vr_owner in schema app grant select on sequences to vr_backup;
