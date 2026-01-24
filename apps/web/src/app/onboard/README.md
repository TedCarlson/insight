# Onboard Zone

## Purpose
The Onboard zone is a PC-Org-scoped workflow that lets Manager+ users add or select a person from the global directory and place them onto the currently scoped PC Org roster.

This page is designed to be:
- Low-confusion (no derived fields shown anywhere)
- Fast (search + quick onboarding)
- Safe (RLS + RPC-only writes; no direct table DML)

## Org Scope (Inherited)
- Org scope is inherited from the app state used by `/roster` (selected org at login / last selection).
- The user should NOT have to re-select the org on this page.
- If org scope is missing/invalid, onboarding actions are blocked and the page shows an error state (optionally offering OrgSelector as a fallback).

### Scope Requirements
All org-scoped writes MUST include:
- `pc_org_id = selectedOrgId` from org state (same as roster)
All org-scoped calls MUST obey:
- RLS / `api.assert_pc_org_access(pc_org_id)`
- permission requirements (e.g. `roster_manage`) enforced server-side

## Primary User Outcomes
1) Find a person (active or inactive) in the global directory and onboard them to the scoped PC Org roster.
2) Find “unassigned” people and onboard them quickly.
3) Add a new person, then onboard them.

## Page UX Overview (`/onboard`)
- Header: "Onboard"
- Scope banner (read-only): shows current PC Org (from inherited scope)
- Toolbar:
  - Search input
  - Filter toggle: `Unassigned` | `All People`
  - Button: `+ Add person`
- Main content: DataTable
  - Supports wide content (horizontal scroll)
  - Shows all rows returned by the selected mode
  - Row actions:
    - `Onboard` (opens wizard modal)
    - `View/Edit` (opens wizard modal, starting at Person step)

### “Visibility of all person rows & columns”
- The table shows practical high-signal columns.
- Full record visibility is provided inside the modal via a “Details” panel (read-only key/value or JSON view).
- Derived fields are not exposed as editable UI.

## Wizard Modal (Single Modal, Two Entry Paths)
### Entry Paths
- ADD: `+ Add person` → wizard opens with empty person form
- SELECT: clicking a row action opens wizard preloaded with that person

### Step Order (Authoritative)
1) Person
2) Org (must be set before assignment; org is inherited scope and shown read-only)
3) Assignment (this action adds the person to the roster)
4) Leadership (optional / soft requirement)

### Step 1 — Person (No derived fields shown)
Goal: collect only user-entered fields needed for person create/update.

Rules:
- The wizard must NOT display or allow edits to derived fields.
- Any “affiliation-like choice” that drives derived fields is captured as a minimal, user-friendly input (if required), but derived outputs are never shown.
- Cannot proceed until the Person save succeeds.

Calls:
- Uses existing person create/update pathway (RPC via API client; no direct table DML).

### Step 2 — Org (Scoped, Read-only)
Goal: confirm scope and establish org context before assignment.

Rules:
- `pc_org_id` comes from inherited scope (read-only display).
- Cannot proceed if no valid scoped org exists.

Note:
- Membership/affiliation rows linking the person to the org may be ensured here or deferred to the roster processing RPC, depending on existing server behavior. UX still treats “Org must be set first.”

### Step 3 — Assignment (Adds to roster)
Goal: create the roster assignment for the scoped PC Org.

Rules:
- This step is required.
- On success, the person should appear on roster for the scoped org.
- Cannot proceed/finish if assignment creation fails.

Calls:
- Uses the existing server-side wizard/RPC that ensures the membership chain and creates the assignment (RPC-only).

### Step 4 — Leadership (Optional)
Goal: optionally set the “reports-to / manager” relationship.

Rules:
- Optional/soft requirement:
  - If known, user can set it now.
  - If unknown, submit without it.
- Manager can later open the roster record and set leadership.

Calls:
- Uses existing leadership upsert API (RPC-only).

## Data Rules / “Unassigned” Definition
The Onboard page must support a view that helps locate people who are not currently on any roster.

Unassigned should be implemented using an existing server-side search function if available.
If multiple interpretations exist, prefer the server’s existing definition; otherwise use:
- No active assignment (e.g., end_date is set OR active is false/null) across orgs.

The UI must allow including:
- active persons
- inactive persons
in both All People and Unassigned modes (unless the server function explicitly cannot yet).

## Error Handling (User-visible)
- If the user lacks org access or permissions, show a clear error:
  - Forbidden / missing `roster_manage` → show Notice and block submission.
- Network/server errors → show toast and keep wizard open.
- Validation errors → highlight fields and prevent step advance.

## Guardrails / Non-goals
- Do not change RLS policies.
- Do not introduce direct table writes from the UI.
- Do not surface derived fields in onboarding UI.
- Only add minimal API client wrappers as needed to call existing RPC endpoints.
- Only patch DB functions if strictly required to meet “active/inactive visibility” or “unassigned” behavior.

## Definition of Done (Acceptance Criteria)
- With a valid inherited org scope:
  - User can search All People (active + inactive) and onboard any person.
  - User can search Unassigned (active + inactive) and onboard from that pool.
  - User can Add person and onboard them to scoped org.
  - Assignment is created and person is roster-visible for that org.
  - Leadership can be set now or left blank and set later from roster.
- Derived fields are never displayed or editable.
- No direct table DML from UI; RPC-only writes.
