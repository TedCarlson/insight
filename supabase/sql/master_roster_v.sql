-- supabase/sql/master_roster_v.sql
--
-- UI-ready roster rows for Org -> Roster.
-- One row per PERSON per pc_org (deduped), hydrated with:
-- - Person basics (name, mobile)
-- - Company/Contractor display name
-- - "Reports To" (via assignment_leadership_admin_v when present)
--
-- Dedup rule (one row per person per pc_org):
--   1) Prefer active assignment (active=true AND end_date is null)
--   2) Else prefer latest start_date
--   3) Tie-breaker assignment_id desc

create or replace view public.master_roster_v as
with base as (
  select
    a.assignment_id,
    a.pc_org_id,
    a.pc_org_name,
    a.person_id,
    a.full_name,
    p.mobile,
    a.tech_id,
    a.position_title,
    a.start_date,
    a.end_date,
    (a.active is true and a.end_date is null) as assignment_active,
    p.role,
    p.co_ref_id,
    p.co_code
  from public.assignment_admin_v a
  join public.person p on p.person_id = a.person_id
),
lead as (
  select
    l.child_assignment_id,
    l.parent_assignment_id
  from public.assignment_leadership_admin_v l
  where
    (l.active is true)
    and (l.end_date is null or l.end_date >= current_date)
),
parent as (
  select
    aa.assignment_id as parent_assignment_id,
    aa.person_id as parent_person_id,
    aa.full_name as parent_full_name
  from public.assignment_admin_v aa
),
co as (
  select
    b.assignment_id,
    c.company_name,
    c.company_code,
    k.contractor_name,
    k.contractor_code
  from base b
  left join public.company c on c.company_id = b.co_ref_id
  left join public.contractor k on k.contractor_id = b.co_ref_id
),
enriched as (
  select
    b.assignment_id,
    b.pc_org_id,
    b.pc_org_name,
    b.person_id,
    b.full_name,
    b.mobile,
    b.tech_id,
    b.position_title,
    b.start_date,
    b.end_date,
    b.assignment_active,

    l.parent_assignment_id as reports_to_assignment_id,
    p2.parent_person_id as reports_to_person_id,
    p2.parent_full_name as reports_to_full_name,

    case
      when b.role ilike '%contract%' then coalesce(co.contractor_name, b.co_code)
      else coalesce(co.company_name, b.co_code)
    end as co_name,
    case
      when b.role ilike '%contract%' then 'contractor'
      else 'company'
    end as co_type,
    b.co_code
  from base b
  left join lead l on l.child_assignment_id = b.assignment_id
  left join parent p2 on p2.parent_assignment_id = l.parent_assignment_id
  left join co on co.assignment_id = b.assignment_id
),
ranked as (
  select
    e.*,
    row_number() over (
      partition by e.pc_org_id, e.person_id
      order by
        case when e.assignment_active then 1 else 0 end desc,
        e.start_date desc nulls last,
        e.assignment_id desc
    ) as rn
  from enriched e
)
select
  assignment_id,
  pc_org_id,
  pc_org_name,
  person_id,
  full_name,
  mobile,
  tech_id,
  position_title,
  start_date,
  end_date,
  assignment_active,
  reports_to_assignment_id,
  reports_to_person_id,
  reports_to_full_name,
  co_name,
  co_type,
  co_code
from ranked
where rn = 1
;
