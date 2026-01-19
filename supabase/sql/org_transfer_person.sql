-- D4: Transfer person by ending current assignment and creating a new assignment
-- Logs a single leadership wire event: person_transferred

create or replace function public.org_transfer_person(
  p_from_assignment_id uuid,
  p_to_pc_org_id uuid,
  p_position_title text,
  p_start_date date,
  p_actor_user_id uuid,
  p_notes text default null
)
returns public.assignment
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from public.assignment;
  v_to public.assignment;
begin
  if p_actor_user_id is null then
    raise exception 'Unauthorized: actor_user_id is null';
  end if;

  if p_from_assignment_id is null then
    raise exception 'from_assignment_id is required';
  end if;

  if p_to_pc_org_id is null then
    raise exception 'to_pc_org_id is required';
  end if;

  if p_position_title is null or length(trim(p_position_title)) = 0 then
    raise exception 'position_title is required';
  end if;

  if p_start_date is null then
    raise exception 'start_date is required';
  end if;

  -- Lock & load the source assignment
  select *
    into v_from
  from public.assignment a
  where a.assignment_id = p_from_assignment_id
  for update;

  if v_from.assignment_id is null then
    raise exception 'Source assignment not found';
  end if;

  -- Must be active to transfer
  if v_from.end_date is not null or coalesce(v_from.active, true) = false then
    raise exception 'Source assignment is not active';
  end if;

  -- End the source assignment
  update public.assignment
  set end_date = current_date,
      active = false
  where assignment_id = v_from.assignment_id
  returning * into v_from;

  -- Create destination assignment
  insert into public.assignment (
    pc_org_id,
    person_id,
    position_title,
    start_date,
    end_date,
    active
  )
  values (
    p_to_pc_org_id,
    v_from.person_id,
    trim(p_position_title),
    p_start_date,
    null,
    true
  )
  returning * into v_to;

  -- Log transfer event (wire)
  insert into public.org_event (
    pc_org_id,
    event_type,
    actor_user_id,
    person_id,
    assignment_id,
    payload
  )
  values (
    p_to_pc_org_id,
    'person_transferred',
    p_actor_user_id,
    v_from.person_id,
    v_to.assignment_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'from_pc_org_id', v_from.pc_org_id,
        'to_pc_org_id', p_to_pc_org_id,
        'from_assignment_id', v_from.assignment_id,
        'to_assignment_id', v_to.assignment_id,
        'position_title', v_to.position_title,
        'start_date', v_to.start_date,
        'end_date', v_from.end_date,
        'notes', p_notes
      )
    )
  );

  return v_to;
end;
$$;
