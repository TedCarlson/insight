# UI/UX Restructure v2 — State Snapshot

## Branch
- ui-ux-restructure-v2

## Locked product contracts
- Primary work views: Roster, Planning (Metrics later)
- Canonical row identity: Person-in-PC_Org membership (public.person_pc_org)
- Roster overlay tab order: Person → Org Context → Assignments → Leadership
- Unlock chain: Person enables Org Context; Org Context enables Assignments; Assignments enables Leadership; Scheduling requires all 4 ready
- Partial saves allowed; “push to ops/schedule” gated
- Planning math: units = hours * 12; On = 8h = 96 units
- “Unassigned People” = person with NO active membership (no row in person_pc_org where active=true)

## DB changes done
- Table: public.person_pc_org created
- Backfill from assignment: 15 active memberships
- Views:
  - public.v_roster_active (15 rows; includes current assignment summary + position_title)
  - public.v_people_unassigned (136 rows)

## UI scaffolding done
- New surfaces (placeholders):
  - /lead, /lead/roster, /lead/planning
  - /admin, /admin/roster, /admin/planning, /admin/permissions (admin layout includes pc org selector placeholder)
  - /tech, /tech/my-work (placeholder only; tech UX TBD)
- Shared features skeleton:
  - apps/web/src/features/{roster,planning,ui,data}
- /lead/roster:
  - loads v_roster_active and renders a basic table
  - onboard drawer in progress (emails field shape mismatch fixed defensively)

## Commits (high value)
- baseline before restructure v2
- IA_MAP_V2.md added
- surface shells added
- features skeleton committed
- lead roster loads v_roster_active
