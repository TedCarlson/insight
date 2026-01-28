# Onboard

This route is the lightweight entry point for onboarding a person into the currently scoped PC Org.

## Current behavior

- Shows a searchable list of people.
- Requires a scoped PC Org selection (inherited from app org scope).
- Actions currently show a placeholder notice while quick membership creation is being wired.

## Intended workflow (next)

Goal: one-step **PC org membership creation** from this page.

- SELECT: choose an existing person
  - If the person already has a qualifying affiliation, allow “Onboard to scoped org”.
  - If the person is already an active member in any PC org, block and explain.
- ADD: minimal “Add person” form (only the required `person` table fields)
  - After creation, immediately run the same “Onboard to scoped org” action.
- All other setup (position title, leadership, tech_id, etc.) is handled in **Roster** where the workflow already exists.

## Server integration

Membership creation will be executed via `app/api/org/rpc/route.ts` (edge-permissions gated), calling the existing DB-side RPC that creates the membership chain / roster placement.
