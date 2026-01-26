-- Edge-gated assignment patch (manager approved writes via permission grants)
-- Creates an RPC used by the app instead of direct table UPDATEs.

create or replace function public.assignment_patch(
  p_assignment_id uuid,
  p_patch jsonb
)
returns public.assignment
language plpgsql
security definer
set search_path = public, api
as $$
declare
  v_assignment public.assignment;
  v_pc_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if p_assignment_id is null then
    raise exception 'assignment_id is required';
  end if;

  -- Lock and fetch current assignment
  select *
    into v_assignment
  from public.assignment a
  where a.assignment_id = p_assignment_id
  for update;

  if v_assignment.assignment_id is null then
    raise exception 'Assignment not found';
  end if;

  v_pc_org_id := v_assignment.pc_org_id;

  -- Permission gate: app owner OR roster_manage on this org edge
  if not (api.is_app_owner() or api.has_pc_org_permission(v_pc_org_id, 'roster_manage')) then
    raise exception 'Forbidden';
  end if;

  -- Non-destructive patch: only provided keys are applied
  update public.assignment
  set tech_id = coalesce((p_patch->>'tech_id')::uuid, tech_id),
      start_date = coalesce((p_patch->>'start_date')::date, start_date),
      end_date = case
        when p_patch ? 'end_date' then nullif(p_patch->>'end_date','')::date
        else end_date
      end,
      position_title = coalesce(p_patch->>'position_title', position_title),
      active = case
        when p_patch ? 'active' then (p_patch->>'active')::boolean
        else active
      end
  where assignment_id = p_assignment_id
  returning * into v_assignment;

  return v_assignment;
end;
$$;
