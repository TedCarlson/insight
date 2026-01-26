# Repo Cleanup Battle Plan — Status

> Updated: 2026-01-25 (America/New_York)

## Phase 0 — Safety rails
- [ ] Create branch `chore/repo-cleanup-YYYYMMDD`
- [ ] Clean install from fresh clone works (`pnpm install`)
- [ ] `pnpm -C apps/web dev` runs
- [ ] Smoke tests written (login, logout, owner redirect, non-owner redirect)
- [ ] CI checks in place (`lint`, `build`, optional e2e smoke)

## Phase 1 — Auth integrity (highest risk first)

### 1.1 Fix login redirect loop hazard
- [x] Patch prepared: block `next` redirect destinations that point back into `/login*`, `/access*`, `/auth*`
- [x] Patch prepared: block scheme-relative redirects (`next=//evil.com`)
- [x] Patch prepared: strip query/hash from `next` before assigning to `pathname`
- [ ] Applied to repo + tested:
  - [ ] Signed-in user visiting `/login?next=/login` no longer loops (lands on `/`)
  - [ ] Signed-in user visiting `/login?next=/auth/callback` lands on `/`
  - [ ] Signed-out redirect preserves intended destination (protected → `/login?next=/protected`)

### 1.2 Consolidate auth listeners (reduce fanout)
- [ ] Identify all `onAuthStateChange` listeners
- [ ] Implement single `AuthProvider` (user/status/isOwner/selectedOrg)
- [ ] Remove duplicated RPC/status calls from Nav/Footer/OrgProvider

## Phase 2 — Routing & API cleanup
- [ ] Reconcile empty/misplaced API routes (e.g., assignment route drift)
- [ ] Make middleware “public route” policy explicit (don’t default-public all `/api/*`)
- [ ] Document route guards (`ROUTES_AND_GUARDS.md`)

## Phase 3 — Dependency cleanup
- [ ] Remove unused deps (Radix/Vaul/CVA/etc. if still unused)
- [ ] Remove unused helpers (e.g., `src/lib/utils.ts` if unused)
- [ ] `lint` + `build` + smoke test

## Phase 4 — Dead code & orphan purge
- [ ] Delete unused components/routes (kit demos, consoles, empty folders)
- [ ] Decide: keep `/kit` as design-system route or remove
- [ ] Ensure generated artifacts are generated or removed (Supabase types)

## Phase 5 — Performance hardening
- [ ] Reduce middleware DB/RPC calls by route need
- [ ] Standardize session usage (server vs client)
- [ ] Add dev-only instrumentation for repeated redirects/session calls

## Phase 6 — Repo hygiene (prevent regressions)
- [ ] Ensure `node_modules/` never appears in artifacts
- [ ] Fix workspace config drift (`pnpm-workspace.yaml`)
- [ ] Add `CONTRIBUTING.md` / cleanup docs

## Phase 7 — Release & verify
- [ ] Ship in PRs (Auth integrity → Cleanup → Perf)
- [ ] Post-deploy verification checklist run


### Phase 1 verification note (added)
- ☐ Update client-side `apps/web/src/lib/navigation/next.ts` `normalizeNext()` to allowlist/sanitize routes so invalid paths (e.g. `/that-page`) fall back to landing.
- ☐ Re-verify: signed out → `/that-page` → login → lands on `/` (no 404).
