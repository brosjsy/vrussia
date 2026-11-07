-- The phone inside the game (round 155): a permanent game number per player, texts between players, and the small messages that set up an audio call.
-- Nothing here reaches a real phone network. A number is 12 digits after the +7: 0, a range digit 1-8, nine digits and a Luhn check digit (src/phonenumber.ts),
-- so it can never be a real Russian number. Texts are kept 30 days. Call signals are kept two minutes and deleted when read. No sound ever touches the server.
-- Run as vr_owner.

create table app.phone_numbers (
  user_id uuid primary key references app.profiles (id) on delete cascade,
  digits text not null unique check (digits ~ '^0[1-8][0-9]{10}$'),
  created_at timestamptz not null default now()
);

create table app.texts (
  id bigint generated always as identity primary key,
  sender uuid not null references app.profiles (id) on delete cascade,
  recipient uuid not null references app.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 160),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (sender <> recipient)
);
create index texts_recipient on app.texts (recipient, id desc);
create index texts_sender on app.texts (sender, created_at);

create table app.text_reports (
  text_id bigint not null references app.texts (id) on delete cascade,
  reporter uuid not null references app.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (text_id, reporter)
);

create table app.call_signals (
  id bigint generated always as identity primary key,
  sender uuid not null references app.profiles (id) on delete cascade,
  recipient uuid not null references app.profiles (id) on delete cascade,
  kind text not null check (kind in ('offer', 'answer', 'ice', 'hangup', 'decline')),
  data text not null default '' check (char_length(data) <= 8000),
  created_at timestamptz not null default now()
);
create index call_signals_recipient on app.call_signals (recipient, id);

-- the number of a player: made once, the same afterwards (the caller supplies the random digits; the database checks the shape and that it is free)
create function app.claim_number(p_me uuid, p_digits text) returns text language plpgsql as $$
declare have text;
begin
  select digits into have from app.phone_numbers where user_id = p_me;
  if have is not null then return have; end if;
  if not exists (select 1 from app.profiles where id = p_me) then raise exception 'no profile'; end if;
  insert into app.phone_numbers (user_id, digits) values (p_me, p_digits) on conflict do nothing;
  select digits into have from app.phone_numbers where user_id = p_me;
  if have is null then raise exception 'number taken'; end if;
  return have;
end $$;

create function app.send_text(p_me uuid, p_to text, p_body text) returns bigint language plpgsql as $$
declare prof app.profiles; body text := btrim(p_body); other uuid; n int; new_id bigint;
begin
  select * into prof from app.profiles where id = p_me;
  if prof.id is null then raise exception 'no profile'; end if;
  if not prof.adult then raise exception 'chat is for adults'; end if;
  if char_length(body) < 1 or char_length(body) > 160 then raise exception 'bad length'; end if;
  if app.is_rude(body) then raise exception 'language'; end if;
  if app.has_contact(body) then raise exception 'contact details'; end if;
  select user_id into other from app.phone_numbers where digits = p_to;
  if other is null or other = p_me then raise exception 'no such number'; end if;
  if exists (select 1 from app.blocks where blocker = other and blocked = p_me) then raise exception 'blocked'; end if;
  select count(*) into n from app.texts where sender = p_me and created_at > now() - interval '30 seconds';
  if n >= 6 then raise exception 'slow down'; end if;
  if (select count(*) from app.texts where sender = p_me and created_at > now() - interval '1 day') >= 200 then raise exception 'daily limit'; end if;
  insert into app.texts (sender, recipient, body) values (p_me, other, body) returning id into new_id;
  return new_id;
end $$;

create function app.report_text(p_me uuid, p_text bigint) returns void language plpgsql as $$
begin
  if not exists (select 1 from app.texts where id = p_text and (recipient = p_me)) then raise exception 'no such message'; end if;
  insert into app.text_reports (text_id, reporter) values (p_text, p_me) on conflict do nothing;
  if (select count(*) from app.text_reports where text_id = p_text) >= 2 then update app.texts set hidden = true where id = p_text; end if;
end $$;

-- the signals for a call: a rate limit, a block check, and the other side must have a number
create function app.send_signal(p_me uuid, p_to text, p_kind text, p_data text) returns bigint language plpgsql as $$
declare other uuid; prof app.profiles; new_id bigint;
begin
  select * into prof from app.profiles where id = p_me;
  if prof.id is null then raise exception 'no profile'; end if;
  if not prof.adult then raise exception 'chat is for adults'; end if;
  select user_id into other from app.phone_numbers where digits = p_to;
  if other is null or other = p_me then raise exception 'no such number'; end if;
  if exists (select 1 from app.blocks where blocker = other and blocked = p_me) then raise exception 'blocked'; end if;
  if p_kind = 'offer' and (select count(*) from app.call_signals where sender = p_me and kind = 'offer' and created_at > now() - interval '1 minute') >= 4 then raise exception 'slow down'; end if;
  if (select count(*) from app.call_signals where sender = p_me and created_at > now() - interval '1 minute') >= 120 then raise exception 'slow down'; end if;
  insert into app.call_signals (sender, recipient, kind, data) values (p_me, other, p_kind, coalesce(p_data, '')) returning id into new_id;
  return new_id;
end $$;

create function app.prune_phone() returns int language plpgsql as $$
declare n int; m int;
begin
  delete from app.texts where created_at < now() - interval '30 days';
  get diagnostics n = row_count;
  delete from app.call_signals where created_at < now() - interval '2 minutes';
  get diagnostics m = row_count;
  return n + m;
end $$;

grant select, insert, delete on app.phone_numbers to vr_app;
grant select, insert, update, delete on app.texts to vr_app;
grant select, insert, delete on app.text_reports to vr_app;
grant select, insert, delete on app.call_signals to vr_app;
grant usage on all sequences in schema app to vr_app;
revoke all on all functions in schema app from public;
grant execute on all functions in schema app to vr_app;
grant select on all tables in schema app to vr_backup;
