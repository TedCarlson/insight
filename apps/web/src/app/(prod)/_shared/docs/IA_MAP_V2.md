# IA Map v2 (UI/UX Restructure)

## Goal
Three primary view surfaces (Admin, Leadership, Technician) operating over three core dimensions.
Supporting dimensions are not top-level navigation; they are peered via segmented overlays and step workflows.

---

## Surfaces (the “who”)

### Admin Surface
- Purpose: system governance + full edit reach
- Home: /admin
- Always available tools:
  - Roster
  - Planning
  - Uploads/Imports
  - Permissions / Delegation Console

### Leadership Surface
- Purpose: operational control within assigned company unit scope
- Home: /lead
- Tools appear based on grants/capabilities:
  - Roster (default)
  - Planning (if granted)
  - Uploads (if granted)

### Technician Surface
- Purpose: execution (self-only)
- Home: /tech
- Tools: “my work” views + limited create/new actions

---

## Navigation Rules
- Primary nav for each surface contains only:
  - Home
  - Core Dimension A
  - Core Dimension B
  - Core Dimension C
  - Tools (Roster / Planning / Uploads) if applicable
- Supporting dimensions are not primary nav roots; they appear as tabs/segments inside overlays.

---

## Roster (the operational cockpit)

### Roster Table (Leadership/Admin)
- Shows: pc_org roster quick reference arrangement
- Row click opens: Segmented Overlay (tabs)

### Segmented Overlay Tabs (peering into dimensions)
Tabs represent supporting dimension datasets needed to fully understand/edit a roster record:

1) Person
2) Company Unit Context (pc_org + division + region + office locations as applicable)
3) Assignments
4) Leadership

Each tab contains:
- Summary strip (key fields)
- Details (form or read-only view)
- Related items (mini table) if needed

### Tab Status Pill (minimal UI signal)
Each tab has a small pill indicator:
- Pending (blue): required info missing / step incomplete
- Ready (green): complete
- Attention (amber): conflicts, inactive state, missing prerequisite
- Locked (gray): user lacks edit permission for this segment

Overlay header stays clean; status is communicated via tab pills.

---

## Onboarding (Add Person to Roster)
Guided step workflow that satisfies each required dimension in order.
Same overlay UI, in “onboarding mode.”

Proposed step order:
1) Person (create/select)
2) Company Unit Context (attach to pc_org and required unit attributes)
3) Leadership links (manager/supervisor relationships)
4) Assignment (initial placement)
5) Final review + activate

Steps are gated: must satisfy current step to proceed.

---

## Admin vs Leadership (reach difference)
Same UI components; different affordances:
- Admin can create/update supporting dimension catalogs (pc_org/division/region/etc) and handle active/inactive workflows (close/reopen).
- Leadership can operate within scope; may edit based on grants/capabilities.
