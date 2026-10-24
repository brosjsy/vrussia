-- Round 152 (security review): contacts are refused in every text players write to each other, not only in adverts, and the check knows more of them.
-- Before, chat messages and guest-book notes only checked for rude words, so "@ivan_work", "write me in tg" or an e-mail address moved victims off the
-- moderated platform. The old word check is kept under a new name; app.is_rude now also refuses contacts, so send_message, sign_guestbook and post_ad
-- (which call it by name at run time) all refuse them without being rewritten.
alter function app.is_rude(text) rename to is_rude_words;

create or replace function app.has_contact(p text) returns boolean language sql immutable as $$
  select coalesce(p, '') ~ '(\+?[0-9][ ().-]{0,2}){10,}'
      or lower(coalesce(p, '')) ~ '(whats ?app|telegram|viber|t\s*\.\s*me|wa\s*\.\s*me|vk\s*\.\s*com|вотсап|ватсап|телеграм|вайбер|инстаграм|instagram|вконтакте|signal|discord)'
      or lower(coalesce(p, '')) ~ '(^|[^a-zа-яё0-9_])(tg|тг|вк|vk|тлг)([^a-zа-яё0-9_]|$)'
      or lower(coalesce(p, '')) ~ '@[a-z0-9_.]{3,}'
$$;

create or replace function app.is_rude(p text) returns boolean language sql immutable as $$
  select app.is_rude_words(p) or app.has_contact(p)
$$;

-- adverts keep their own clearer message for contacts ('contact details'), so they check the words first
create or replace function app.post_ad(p_me uuid, p_city text, p_kind text, p_title text, p_body text, p_price int) returns bigint language plpgsql as $$
declare name text; new_id bigint; title text := btrim(p_title); body text := btrim(coalesce(p_body, ''));
begin
  select username into name from app.profiles where id = p_me;
  if name is null then raise exception 'no profile'; end if;
  if char_length(title) < 4 or char_length(title) > 60 then raise exception 'bad length'; end if;
  if app.is_rude_words(title) or app.is_rude_words(body) then raise exception 'language'; end if;
  if app.has_contact(title) or app.has_contact(body) then raise exception 'contact details'; end if;
  if coalesce(p_price, 0) < 0 then raise exception 'bad price'; end if;
  if (select count(*) from app.ads where player_id = p_me and created_at > now() - interval '1 day') >= 3 then raise exception 'too many ads today'; end if;
  if (select count(*) from app.ads where player_id = p_me and expires_at > now()) >= 3 then raise exception 'too many ads'; end if;
  insert into app.ads (player_id, username, city, kind, title, body, price) values (p_me, name, p_city, p_kind, title, body, coalesce(p_price, 0)) returning id into new_id;
  return new_id;
end $$;

grant execute on all functions in schema app to vr_app;
