# REFACTOR V2 — Master Checklist (IKEA Steps)

## Phase 0 — Safety First
- [x] 0.1 Create branch: refactor/v2-structure
- [x] 0.2 Push branch upstream
- [x] 0.3 Tag safety point (optional)
- [x] 0.4 Add .gitignore for snapshots/zips; remove committed zip
- [x] 0.5 Add this roadmap file

## Phase 1 — Create the New Folder Skeleton (no code moves yet)
- [ ] 1.1 Add top-level docs/ (or keep apps/web/docs but standardize)
- [ ] 1.2 Add tooling/ folders (scripts, generators)
- [ ] 1.3 Add packages/ shared libs folder (for shared code)
- [ ] 1.4 Add apps/ boundaries check (web stays isolated)

## Phase 2 — Move Code Into Stable “Domains”
- [ ] 2.1 Extract Supabase access into a single data layer package
- [ ] 2.2 Extract UI primitives into a shared ui package
- [ ] 2.3 Move feature modules into feature folders (metrics, roster, org, auth)

## Phase 3 — Route + Screen Hygiene (stop “stirring the pot”)
- [ ] 3.1 Make routes thin (compose feature modules, no logic)
- [ ] 3.2 Add server/client split conventions
- [ ] 3.3 Add loading/error boundaries per route group

## Phase 4 — Wiring + Regression Pass
- [ ] 4.1 Fix imports after moves
- [ ] 4.2 Typecheck
- [ ] 4.3 Build
- [ ] 4.4 Smoke test core flows: login, org select, roster, metrics upload

