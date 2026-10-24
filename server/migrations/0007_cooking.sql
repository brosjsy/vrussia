-- The Kitchen's online challenge (round 139): every real day the game names one easy dish for every player (src/cook.ts, dishOfRealDay); players who
-- cook it send their score, and the day's table shows the best. The score is worked out by the game; the server keeps it plausible (0 to 100, the
-- stars match the score), keeps each player's best of the day, and limits how often a player can send.

create table app.cook_scores (
  player_id uuid not null references app.profiles (id) on delete cascade,
  username text not null,
  day date not null default current_date,
  dish text not null check (dish ~ '^[A-Za-z0-9_]{2,40}$'),
  score int not null check (score between 0 and 100),
  stars int not null check (stars between 0 and 3),
  tries int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (player_id, day)
);
create index cook_scores_day on app.cook_scores (day, dish, score desc);

create function app.cook_submit(p_me uuid, p_dish text, p_score int, p_stars int) returns int language plpgsql as $$
declare name text; best int;
begin
  select username into name from app.profiles where id = p_me;
  if name is null then raise exception 'no profile'; end if;
  if p_score < 0 or p_score > 100 or p_stars <> (case when p_score >= 90 then 3 when p_score >= 70 then 2 when p_score >= 45 then 1 else 0 end) then raise exception 'score not possible'; end if;
  if (select tries from app.cook_scores where player_id = p_me and day = current_date) >= 10 then raise exception 'too many scores today'; end if;
  insert into app.cook_scores (player_id, username, dish, score, stars) values (p_me, name, p_dish, p_score, p_stars)
    on conflict (player_id, day) do update set
      tries = app.cook_scores.tries + 1,
      -- a new dish on the same day (the day changed at midnight in the player's game) replaces the old one; the same dish keeps the best
      score = case when app.cook_scores.dish <> excluded.dish or excluded.score > app.cook_scores.score then excluded.score else app.cook_scores.score end,
      stars = case when app.cook_scores.dish <> excluded.dish or excluded.score > app.cook_scores.score then excluded.stars else app.cook_scores.stars end,
      dish = excluded.dish, username = excluded.username, updated_at = case when excluded.score > app.cook_scores.score then now() else app.cook_scores.updated_at end
    returning score into best;
  perform app.count_event(p_me, 'cook_score');
  delete from app.cook_scores where day < current_date - 30;                     -- a month of tables is enough
  return best;
end $$;

grant select, insert, update, delete on app.cook_scores to vr_app;
revoke all on all functions in schema app from public;
grant execute on all functions in schema app to vr_app;
