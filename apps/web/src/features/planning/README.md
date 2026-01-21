# Planning Feature (v2)

Planning is the weekly scheduling surface for a **single selected PC Org**. It operates on the same canonical identity as Roster: **Person-in-PC_Org membership** (`public.person_pc_org`).

---

## Scope & row identity

- **Scope:** one `pc_org_id` at a time (Lead surface uses `user_profile.selected_pc_org_id`)
- **Row identity:** `person_pc_org_id` (membership) with a **current active assignment** (when present)
- **Source of truth:** `public.v_roster_active` filtered by:
  - `pc_org_id = selected_pc_org_id`
  - `position_title ILIKE '%Technician%'` (Lead Planning)

---

## Core interaction (v2)

### Weekly planning grid
- A week-at-a-glance grid with **On/Off toggles by day**
- **On** represents a standard day:
  - `hours = 8`
  - `units = hours * 12`
  - therefore: **On = 96 units**
- “Off” represents zero planned units for that day

### Persistence model (current)
- Planning writes/readbacks are sourced from `schedule` rows (by `assignment_id`)
- Weekly keying is based on:
  - `start_date` (week start, ISO date)
  - `schedule_name` (e.g., `planning_week_YYYY-MM-DD`)
- Seeds are loaded for the visible week to hydrate existing plans

---

## View-only planning surface (planned / in-progress)

In addition to the editable grid, Planning will provide a **read-only “What’s planned”** view for the selected week.

This surface will render:
- technician list for the scoped PC Org
- each person’s planned On/Off state by day (derived from `schedule`)
- summary totals and placeholder panels for validations (below)

---

## Readiness concept (Route Lock Readiness)

Route Lock Readiness is the combined result of:

1) **Schedule** (planned coverage exists and meets required rules)
2) **Quota** (supply vs demand / required capacity checks)
3) **Shift Validations** (shift constraints satisfied; no invalid patterns)

Formula concept:
> **Schedule + Quota + Shift Validations = Route Lock Readiness**

### Current status
- Schedule data is available (via `schedule` seeds + planning grid)
- Quota and Shift validations are **placeholders** (to be implemented)
- Metrics will be introduced later as a third primary ops function

---

## Related v2 contracts

- Surfaces:
  - Lead: `/lead/planning` (scoped; Technician-only)
  - Admin: `/admin/planning` (future: broader scope + catalog controls)
- Roster dependency:
  - membership readiness gates scheduling/ops eligibility (Roster Overlay chain)

---
