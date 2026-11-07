-- The crews' table (round 158): each crew's points are the sum of its members' best results, so a crew rises by playing well together and by having members who play.
-- Read-only: a view and one function, nothing is stored. Run as vr_owner.

create function app.top_crews(p_limit int) returns table (id bigint, name text, city text, members bigint, points bigint) language sql stable as $$
  select c.id, c.name, c.city, count(m.player_id), coalesce(sum(b.best), 0)::bigint
  from app.crews c join app.crew_members m on m.crew_id = c.id
  left join lateral (select max(s.score) as best from app.scores s where s.player_id = m.player_id) b on true
  group by c.id order by coalesce(sum(b.best), 0) desc, count(m.player_id) desc, c.id limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;
grant execute on function app.top_crews(int) to vr_app;
