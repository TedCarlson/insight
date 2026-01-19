-- PR D1: Leadership Wire foundation
-- Creates: public.org_event table + indexes
-- Creates: public.org_assign_person RPC (transactional assignment insert + wire event)

begin;

-- 1) org_event table (append-only)
create table if not exists public.org_event (
  org_event_id uuid primary key default gen_random_uuid(),

  pc_org_id uuid not null references public.pc_org(pc_org_id) on delete cascade,
  event_type text not null,

  actor_user_id uuid not null,
  person_id uuid not null references public.person(person_id) on delete restrict,
  assignment_id uuid null references public.assignment(assignment_id) on delete set null,

  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists org_event_pc_org_id_created_at_idx
  on public.org_event (pc_org_id, created_at desc);

create index if not exists org_event_person_id_created_at_idx
  on public.org_event (person_id, created_at desc);

create index if not exists org_event_event_type_created_at_idx
  on public.org_event (event_type, created_at desc);

-- 2) Transactional RPC: assignment + org_event
-- Actor handling:
-- - If called with an authenticated context, auth.uid() is available.
-- - If called via service role (server API), pass p_actor_user_id explicitly.
create or replace function public.org_assign_person(
  p_pc_org_id uuid,
  p_person_id uuid,
  p_position_title text,
  p_start_date date,
  p_reason_code text default null,
  p_notes text default null,
  p_actor_user_id uuid default null
)
returns public.assignment
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_existing_active int;
  v_assignment public.assignment;
begin
  v_actor := coalesce(p_actor_user_id, auth.uid());
  if v_actor is null then
    raise exception 'Unauthorized: actor_user_id is null';
  end if;

  if p_pc_org_id is null or p_person_id is null then
    raise exception 'pc_org_id and person_id are required';
  end if;

  if p_position_title is null or length(trim(p_position_title)) = 0 then
    raise exception 'position_title is required';
  end if;

  if p_start_date is null then
    raise exception 'start_date is required';
  end if;

  -- Enforce "globally unassigned": no active assignment anywhere
  select count(*)
    into v_existing_active
  from public.assignment a
  where a.person_id = p_person_id
    and a.end_date is null
    and coalesce(a.active, true) = true;

  if v_existing_active > 0 then
    raise exception 'Person already has an active assignment';
  end if;

  insert into public.assignment (
    pc_org_id,
    person_id,
    position_title,
    start_date,
    end_date,
    active
  )
  values (
    p_pc_org_id,
    p_person_id,
    trim(p_position_title),
    p_start_date,
    null,
    true
  )
  returning * into v_assignment;

  insert into public.org_event (
    pc_org_id,
    event_type,
    actor_user_id,
    person_id,
    assignment_id,
    payload
  )
  values (
    p_pc_org_id,
    'assignment_created',
    v_actor,
    p_person_id,
    v_assignment.assignment_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'position_title', v_assignment.position_title,
        'start_date', v_assignment.start_date,
        'reason_code', p_reason_code,
        'notes', p_notes
      )
    )
  );

  return v_assignment;
end;
$$;

commit;
