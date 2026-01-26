-- Edge-gated assignment_reporting upsert (manager approved writes via permission grants)
-- Creates an RPC used by the app instead of direct table INSERT/UPDATEs.

create or replace function public.assignment_reporting_upsert_safe(
  p_child_assignment_id uuid,
  p_parent_assignment_id uuid,
  p_start_date date,
  p_assignment_reporting_id uuid default null,
  p_end_date date default null
)
returns public.assignment_reporting
language plpgsql
security definer
set search_path = public, api
as $$
declare
  v_child public.assignment;
  v_row public.assignment_reporting;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if p_child_assignment_id is null then
    raise exception 'child_assignment_id is required';
  end if;

  if p_parent_assignment_id is null then
    raise exception 'parent_assignment_id is required';
  end if;

  if p_start_date is null then
    raise exception 'start_date is required';
  end if;

  -- Lock and load child assignment to determine org scope
  select *
    into v_child
  from public.assignment a
  where a.assignment_id = p_child_assignment_id
  for update;

  if v_child.assignment_id is null then
    raise exception 'Child assignment not found';
  end if;

  if not (api.is_app_owner() or api.has_pc_org_permission(v_child.pc_org_id, 'roster_manage')) then
    raise exception 'Forbidden';
  end if;

  if p_assignment_reporting_id is not null then
    update public.assignment_reporting
    set child_assignment_id = p_child_assignment_id,
        parent_assignment_id = p_parent_assignment_id,
        start_date = p_start_date,
        end_date = p_end_date
    where assignment_reporting_id = p_assignment_reporting_id
    returning * into v_row;

    if v_row.assignment_reporting_id is null then
      raise exception 'assignment_reporting row not found';
    end if;

    return v_row;
  end if;

  insert into public.assignment_reporting (
    child_assignment_id,
    parent_assignment_id,
    start_date,
    end_date
  )
  values (
    p_child_assignment_id,
    p_parent_assignment_id,
    p_start_date,
    p_end_date
  )
  returning * into v_row;

  return v_row;
end;
$$;
