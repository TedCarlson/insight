// apps/web/src/components/roster/index.ts
//
// Roster component barrel (SINGLE SOURCE OF TRUTH)
// - Fixes “Props doesn’t have rows/onReset” by ensuring imports resolve to the correct files.
// - If you have duplicate exports or older filenames, delete/rename them so this barrel points to ONLY these modules.

export { default as RosterClient } from "./RosterClient";
export { default as RosterFiltersUI } from "./RosterFilters";
export { default as RosterTable } from "./RosterTable";
export { RosterOverlay } from "./RosterOverlay";
