-- PR D3: End assignment + log wire event

create or replace function public.org_end_assignment(
  p_assignment_id uuid,
  p_actor_user_id uuid,
  p_notes text default null
)
returns public.assignment
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.assignment;
begin
  if p_actor_user_id is null then
    raise exception 'Unauthorized: actor_user_id is null';
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

  -- If already ended, return current row
  if v_assignment.end_date is not null or coalesce(v_assignment.active, true) = false then
    return v_assignment;
  end if;

  -- End it (schema does not have updated_at)
  update public.assignment
  set end_date = current_date,
      active = false
  where assignment_id = p_assignment_id
  returning * into v_assignment;

  -- Log wire event
  insert into public.org_event (
    pc_org_id,
    event_type,
    actor_user_id,
    person_id,
    assignment_id,
    payload
  )
  values (
    v_assignment.pc_org_id,
    'assignment_ended',
    p_actor_user_id,
    v_assignment.person_id,
    v_assignment.assignment_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'position_title', v_assignment.position_title,
        'start_date', v_assignment.start_date,
        'end_date', v_assignment.end_date,
        'notes', p_notes
      )
    )
  );

  return v_assignment;
end;
$$;
