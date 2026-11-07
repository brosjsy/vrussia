-- Interest counters for the planned paid extras (docs/REVENUE_PLAYERS.md, section 6). A player presses "I would want this" on an offer that is NOT on sale
-- yet; the game adds 1 to an anonymous counter. Nothing about the player is stored: no account, no address, no time of day, only a number per offer.
-- Same table and same function as the visit counter; the four new keys are the only ones added.

insert into app.counters (key, value) values ('interest_exam', 0), ('interest_plus', 0), ('interest_looks', 0), ('interest_gift', 0) on conflict (key) do nothing;

create or replace function app.bump(p_key text) returns bigint language plpgsql as $$
declare v bigint;
begin
  if p_key not in ('visits', 'daily_found', 'interest_exam', 'interest_plus', 'interest_looks', 'interest_gift') then raise exception 'bad counter'; end if;
  update app.counters set value = value + 1 where key = p_key returning value into v;
  return v;
end $$;
