-- supabase/sql/master_roster_v.sql
--
-- UI-ready roster rows for Org -> Roster.
-- One row per assignment (pc_org-scoped) with hydrated:
-- - Person basics (name, mobile)
-- - Company/Contractor display name
-- - "Reports To" (via assignment_leadership_admin_v when present)
--
-- Notes:
-- - Company vs Contractor is inferred via person.role (e.g. 'Contractors' vs 'Hires').
-- - co_ref_id is expected to point at either company.company_id OR contractor.contractor_id.
-- - This view is safe even when co_ref_id is null; co_name falls back to co_code.

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
  -- Expected shape of assignment_leadership_admin_v (used elsewhere in UI):
  -- child_assignment_id, parent_assignment_id, start_date, end_date, active
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
    -- Company join (table assumed present in schema; admin view exists as company_admin_v)
    c.company_name,
    c.company_code,
    -- Contractor join (table present in selected table catalog)
    k.contractor_name,
    k.contractor_code
  from base b
  left join public.company c on c.company_id = b.co_ref_id
  left join public.contractor k on k.contractor_id = b.co_ref_id
)
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
  -- Reports to (hydrated)
  l.parent_assignment_id as reports_to_assignment_id,
  p2.parent_person_id as reports_to_person_id,
  p2.parent_full_name as reports_to_full_name,
  -- Company / Contractor display (full name, fall back to code)
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
;
