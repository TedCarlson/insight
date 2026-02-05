REFACTOR V2 — Master Migration Checklist

Purpose
This document is the single source of truth for the full refactor of the TeamOptix Insight repo.
	•	Current (v1) code remains in production and functional
	•	New structure (v2) is built alongside it
	•	Migration happens step by step, with zero guesswork

This is written for a non-coder founder executing a professional-grade refactor with guidance.

⸻

Ground Rules (Read Once)
	1.	No behavior changes until explicitly stated
	2.	Routes do not change (new screens mount under the same routes)
	3.	Legacy code is quarantined, not deleted
	4.	One checklist step = one commit
	5.	If unsure: STOP — do not improvise

⸻

PHASE 0 — SAFETY FIRST (Preparation)

Step 0.1 — Create a refactor branch
	•	Create a new git branch
	•	Name: refactor/v2-structure

⸻

PHASE 1 — CREATE THE V2 SKELETON (No logic changes)

Goal: Build the new structure empty while v1 continues to run.

Step 1.1 — Add new top-level folders (do NOT move anything yet)

Create the following folders:

apps/web/src/features/
apps/web/src/domain/
apps/web/src/data/
apps/web/src/legacy/
apps/web/src/shared/


⸻

Step 1.2 — Add feature subfolders (empty)

Create:

apps/web/src/features/roster/
apps/web/src/features/onboard/

Inside each, create:

components/
hooks/
screens/
adapters/
viewmodels/


⸻

Step 1.3 — Add domain subfolders (empty)

Create:

apps/web/src/domain/roster/
apps/web/src/domain/onboard/
apps/web/src/domain/permissions/


⸻

Step 1.4 — Add data layer skeleton (empty)

Create:

apps/web/src/data/supabase/
apps/web/src/data/queries/
apps/web/src/data/rpc/
apps/web/src/data/mappers/


⸻

Step 1.5 — Add shared helpers skeleton (empty)

Create:

apps/web/src/shared/auth/
apps/web/src/shared/validation/
apps/web/src/shared/errors/
apps/web/src/shared/logging/


⸻

Step 1.6 — Commit
	•	Commit message: chore: add v2 folder skeleton

STOP. Do not continue until build passes.

⸻

PHASE 2 — QUARANTINE LEGACY (No behavior changes)

Goal: Freeze v1 so it stops growing, while routes remain unchanged.

Step 2.1 — Create legacy subfolders

Create:

apps/web/src/legacy/roster/
apps/web/src/legacy/onboard/


⸻

Step 2.2 — Move roster legacy files

Move (do not edit):
	•	components/roster/RosterRowModule.tsx
→ legacy/roster/RosterRowModuleLegacy.tsx
	•	components/roster/RosterTable.tsx
→ legacy/roster/RosterTableLegacy.tsx
	•	(if present) large roster helpers used only here

Fix imports only if required to make build pass.

⸻

Step 2.3 — Move onboard legacy page

Move:
	•	app/onboard/page.tsx (full implementation)
→ legacy/onboard/OnboardPageLegacy.tsx

⸻

Step 2.4 — Move roster legacy page

Move:
	•	app/roster/page.tsx (full implementation)
→ legacy/roster/RosterPageLegacy.tsx

⸻

Step 2.5 — Create new thin screens

Create:

apps/web/src/features/roster/screens/RosterScreen.tsx
apps/web/src/features/onboard/screens/OnboardScreen.tsx

Each file should:
	•	Import the corresponding Legacy screen
	•	Render it directly

(No logic. No hooks. Just passthrough.)

⸻

Step 2.6 — Replace route pages with thin wrappers

Edit:
	•	app/roster/page.tsx
	•	app/onboard/page.tsx

Each should:
	•	Import its Screen (RosterScreen, OnboardScreen)
	•	Return it

Routes stay identical.

⸻

Step 2.7 — Add legacy README

Create:

apps/web/src/legacy/README.md

Contents:
	•	Explain legacy purpose
	•	Rule: no new features here

⸻

Step 2.8 — Commit
	•	Commit message: refactor: quarantine legacy v1 code

STOP. App must behave exactly the same.

⸻

PHASE 3 — DOMAIN EXTRACTION (Brain first)

Goal: Pull pure logic out of legacy without changing UI.

Step 3.1 — Create roster domain files

Create:

domain/roster/roster.types.ts
domain/roster/roster.logic.ts
domain/roster/roster.workflows.ts


⸻

Step 3.2 — Move pure logic from legacy roster

From RosterRowModuleLegacy:
	•	computed stats
	•	flags
	•	derived values
	•	non-UI helpers

Move into domain/roster files.

Replace legacy logic with imports.

⸻

Step 3.3 — Repeat for onboard domain

Create:

domain/onboard/onboard.types.ts
domain/onboard/onboard.logic.ts
domain/onboard/onboard.workflows.ts

Move:
	•	step rules
	•	completion checks
	•	payload builders

⸻

Step 3.4 — Commit
	•	Commit message: refactor: extract domain logic

STOP. UI should be unchanged.

⸻

PHASE 4 — DATA + API BOUNDARIES (Plumbing)

Goal: Centralize Supabase and RPC usage.

Step 4.1 — Create adapters

Create:

features/roster/adapters/roster.api.ts
features/onboard/adapters/onboard.api.ts


⸻

Step 4.2 — Move fetch / RPC calls

From legacy files:
	•	move fetch calls into adapters
	•	legacy imports adapters instead

⸻

Step 4.3 — Commit
	•	Commit message: refactor: centralize api adapters

⸻

PHASE 5 — HOOKS + VIEWMODELS (Calm UI)

Goal: Shrink screens dramatically.

Step 5.1 — Add hooks

Create:

features/roster/hooks/useRosterRows.ts
features/roster/hooks/useRosterActions.ts
features/onboard/hooks/useOnboardState.ts
features/onboard/hooks/useOnboardActions.ts


⸻

Step 5.2 — Add viewmodels

Create:

features/roster/viewmodels/roster.view.ts

Move mapping logic here.

⸻

Step 5.3 — Commit
	•	Commit message: refactor: introduce hooks and viewmodels

⸻

PHASE 6 — UI REBUILD (Delete legacy by starvation)

Goal: Replace legacy screens entirely.

Step 6.1 — Build new RosterScreen
	•	Use hooks
	•	Use components
	•	No legacy imports

⸻

Step 6.2 — Build new OnboardScreen
	•	Wizard-based
	•	Uses domain workflows

⸻

Step 6.3 — Delete legacy usage
	•	Screens no longer import legacy
	•	Legacy folder remains only as reference

⸻

Step 6.4 — Commit
	•	Commit message: refactor: replace legacy screens with v2

⸻

PHASE 7 — CLEANUP & GUARDRAILS

Step 7.1 — Add lint rules
	•	Domain cannot import React
	•	App routes cannot contain logic

Step 7.2 — Add REFACTOR COMPLETE note
	•	Update README

⸻

DONE CRITERIA
	•	No mega-files
	•	Domain logic fully isolated
	•	UI composed via hooks
	•	Legacy untouched and shrinking

⸻

Next action after this file exists:
Execute Phase 1 only. Do not skip ahead.