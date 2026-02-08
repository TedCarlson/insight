# API Contract Lock List

## Status

### Done
- Runtime call-sites enumerated (TS/TSX only, `apps/web/src/features`).
- Runtime import-sites enumerated (TS/TSX only).
- Type-only import-sites enumerated (TS/TSX only).
- Modularized `apps/web/src/shared/lib/api.ts` behind a stable facade.

### Pending
- Enforce module boundaries (no imports from `@/shared/lib/apiClient/*` outside the facade).
- Add LOC guardrail to prevent api surface regressions.

## Public import surface (must remain stable)
- `@/shared/lib/api`
- `apps/web/src/shared/lib/api.ts` (public facade entrypoint)

## Runtime contract (must not break)
These methods are called by the roster feature at runtime and must remain callable as:
`api.<method>(...)`

- assignmentReportingUpsert
- assignmentUpdate
- personGet
- personPcOrgEndAssociation
- personUpsertWithGrants
- resolveCoDisplay
- rosterCurrentFull
- rosterDrilldown
- rosterMaster

## Runtime import sites (api singleton)
- apps/web/src/features/roster/mutations/rosterRowModule.mutations.ts
- apps/web/src/features/roster/hooks/useRosterPageData.ts
- apps/web/src/features/roster/hooks/rosterRowModule.actions.ts
- apps/web/src/features/roster/hooks/row-module/useLeadershipTab.ts
- apps/web/src/features/roster/hooks/row-module/useOrgTab.ts
- apps/web/src/features/roster/hooks/row-module/usePersonTab.ts
- apps/web/src/features/roster/hooks/row-module/useAssignmentTab.ts

## Type-only contract (must remain exported from `@/shared/lib/api`)
- PcOrgChoice
- RosterRow

## Type-only import sites
- apps/web/src/state/org.tsx (PcOrgChoice)
- apps/web/src/features/roster/pages/RosterPage.tsx (RosterRow)
- apps/web/src/features/roster/lib/rosterFormat.ts (RosterRow)
- apps/web/src/features/roster/hooks/useRosterFilters.ts (RosterRow)
- apps/web/src/features/roster/hooks/useRosterPageData.ts (RosterRow)
- apps/web/src/features/roster/hooks/row-module/useInviteTab.ts (RosterRow)
- apps/web/src/features/roster/components/RosterTable.tsx (RosterRow)
- apps/web/src/features/roster/components/RosterQuickView.tsx (RosterRow)
- apps/web/src/features/roster/components/row-module/OrgTab.tsx (RosterRow)
- apps/web/src/features/roster/components/row-module/InviteTab.tsx (RosterRow)
- apps/web/src/features/roster/components/row-module/LeadershipTab.tsx (RosterRow)