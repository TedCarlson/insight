# UI/UX Restructure v2 — State Snapshot

## Branch
- ui-ux-restructure-v2

## Locked product contracts
- Primary work views: Roster, Planning (Metrics later)
- Canonical row identity: Person-in-PC_Org membership (public.person_pc_org)
- Roster overlay segmentation (order is required for validations):
  - Person → Org Context → Assignments → Leadership → Schedule
- Unlock chain:
  - Person enables Org Context
  - Org Context enables Assignments
  - Assignments enables Leadership
  - Scheduling/Operations eligibility requires first 4 “Ready”
  - Schedule tab is locked until the first 4 segments qualify (Ready)
- Partial saves allowed; “push to ops/schedule” gated
- Planning math: units = hours * 12; On = 8h = 96 units
- “Unassigned People” = person with NO active membership (no row in person_pc_org where active=true)
- Important missing requirement (reintroduced in overlay):
  - Person must be associated with Company or Contractor (legacy workflow)

## DB changes done (verified)
- Table: public.person_pc_org created
- Backfill from assignment: 15 active memberships
- Views:
  - public.v_roster_active (15 rows; membership + person + current assignment summary)
  - public.v_people_unassigned (136 rows)

## UI scaffolding done
- New surfaces (placeholders):
  - /lead, /lead/roster, /lead/planning
  - /admin, /admin/roster, /admin/planning, /admin/permissions (admin layout includes pc org selector placeholder)
  - /tech, /tech/my-work (placeholder only; tech UX TBD)
- Shared features skeleton:
  - apps/web/src/features/{roster,planning,ui,data}

## Roster v2 progress (functional)
- /lead/roster:
  - loads v_roster_active and renders a table
  - “+ Onboard” drawer exists:
    - shows unassigned people from v_people_unassigned
    - New Person tab includes duplicate heads-up (UI-only)
    - handles emails defensively (may not be array)
  - roster record overlay exists:
    - tab order follows validation chain
    - gating/disable:
      - org locked until Person ready
      - assignments locked until Org Context ready
      - leadership locked until Assignments ready
      - schedule locked until Person+Org+Assignments+Leadership are all Ready

## Overlay segments — real joined data wired
- Person tab:
  - loads authoritative person row from person_admin_v
  - Affiliation (Company / Contractor) selector wired via legacy workflow (updates base person)
  - Role auto-derives on affiliation change:
    - Company → Hires
    - Contractor → Contractors
  - Person “Ready” requires affiliation (co_ref_id present)
- Org Context tab:
  - loads from pc_org_admin_v
  - displays division / region / office (MSO) + pc org identifiers
  - Org Context “Ready” requires division_id + region_id + mso_id
- Assignments tab:
  - loads from assignment_admin_v by assignment_id
  - displays tech_id, start_date, end_date, pc_org_name
  - shows Attention if assignment exists but details fail to load
- Leadership tab:
  - loads from assignment_leadership_admin_v (over assignment_reporting)
  - shows current active leader + reporting history
  - Leadership “Ready” requires an active leader link
- Eligibility:
  - “Eligible for Schedule/Ops” when Person, Org Context, Assignments, Leadership are all Ready
  - blockers list when not eligible
- Schedule tab:
  - appears as its own segment in tab lineup
  - locked until the first 4 segments are all Ready
  - when unlocked, status becomes **Ready** (payload is available)
  - when unlocked, shows Schedule Prep JSON payload (read-only) + Copy JSON


## Notes (drift control)
- zsh: quote paths containing “(prod)” when running sed/ls to avoid globbing issues

## Commits (high value)
- baseline before restructure v2
- IA_MAP_V2.md added
- surface shells added
- features skeleton committed
- lead roster loads v_roster_active
- overlay segments wired end-to-end + schedule tab gated + schedule prep payload
