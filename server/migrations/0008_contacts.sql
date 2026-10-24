-- No phone numbers or messenger contacts in player adverts and advertising spaces (round 150, found in manual testing: a phone number got through).
-- Players answer an advert through the game's own private chat, so nobody's number is published. Ten or more digits (with spaces, brackets, dots or
-- dashes between them) count as a phone number; prices go up to 10,000,000, which has eight.
create function app.has_contact(p text) returns boolean language sql immutable as $$
  select coalesce(p, '') ~ '(\+?[0-9][ ().-]{0,2}){10,}' or lower(coalesce(p, '')) ~ '(whats ?app|telegram|viber|t\.me|вотсап|ватсап|телеграм|вайбер)'
$$;

create or replace function app.advert_banned(p text) returns boolean language sql immutable as $$
  select app.is_rude(p) or app.has_contact(p) or lower(p) ~ '(vodka|beer|wine|alcohol|водк|пив|вино|алкогол|коньяк|cigarette|tobacco|vape|сигарет|табак|вейп|кальян|casino|poker|ставк|казино|покер|букмекер|loan|credit|займ|кредит|микрофинанс|vote for|голосуй|https?:|www\.|\.ru\M|\.com\M|@)'
$$;

create or replace function app.post_ad(p_me uuid, p_city text, p_kind text, p_title text, p_body text, p_price int) returns bigint language plpgsql as $$
declare name text; new_id bigint; title text := btrim(p_title); body text := btrim(coalesce(p_body, ''));
begin
  select username into name from app.profiles where id = p_me;
  if name is null then raise exception 'no profile'; end if;
  if char_length(title) < 4 or char_length(title) > 60 then raise exception 'bad length'; end if;
  if app.is_rude(title) or app.is_rude(body) then raise exception 'language'; end if;
  if app.has_contact(title) or app.has_contact(body) then raise exception 'contact details'; end if;
  if coalesce(p_price, 0) < 0 then raise exception 'bad price'; end if;
  if (select count(*) from app.ads where player_id = p_me and created_at > now() - interval '1 day') >= 3 then raise exception 'too many ads today'; end if;
  if (select count(*) from app.ads where player_id = p_me and expires_at > now()) >= 3 then raise exception 'too many ads'; end if;
  insert into app.ads (player_id, username, city, kind, title, body, price) values (p_me, name, p_city, p_kind, title, body, coalesce(p_price, 0)) returning id into new_id;
  return new_id;
end $$;

grant execute on all functions in schema app to vr_app;
