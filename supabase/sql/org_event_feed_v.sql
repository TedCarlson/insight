-- PR D2: Leadership Wire feed view for org-scoped UI
-- Joins org_event to person + actor profile for display.

create or replace view public.org_event_feed_v as
select
  e.org_event_id,
  e.pc_org_id,
  e.event_type,
  e.actor_user_id,
  up.email as actor_email,
  coalesce(up.full_name, up.email, e.actor_user_id::text) as actor_label,
  e.person_id,
  p.full_name as person_full_name,
  e.assignment_id,
  e.payload,
  e.created_at
from public.org_event e
left join public.person p
  on p.person_id = e.person_id
left join public.user_profile up
  on up.auth_user_id = e.actor_user_id;
