# Roster Feature

Canonical row identity: Person-in-PC_Org (membership).

Backed by DB views:
- public.v_roster_active
- public.v_people_unassigned

UI contract:
- Table (quick reference)
- Row overlay with ordered tabs: Person → Org Context → Assignments → Leadership
- + Onboard flow: unassigned people picker + new person + dup warnings
