-- Globally unassigned people search
-- NOTE: Run this in Supabase SQL editor to create the function.

create or replace function public.people_global_unassigned_search(
  p_query text default '',
  p_limit int default 25
)
returns table (
  person_id uuid,
  full_name text,
  emails text
)
language sql
stable
as $$
  with term as (
    select nullif(trim(p_query), '') as q,
           greatest(1, least(coalesce(p_limit, 25), 100)) as lim
  ),
  active_people as (
    select distinct a.person_id
    from public.assignment a
    where (a.end_date is null) and coalesce(a.active, true) = true
  )
  select p.person_id, p.full_name, p.emails
  from public.person p
  left join active_people ap on ap.person_id = p.person_id
  cross join term t
  where ap.person_id is null
    and coalesce(p.active, true) = true
    and (
      t.q is null
      or p.full_name ilike '%' || t.q || '%'
      or coalesce(p.emails, '') ilike '%' || t.q || '%'
    )
  order by p.full_name
  limit (select lim from term);
$$;
