#!/usr/bin/env bash
set -euo pipefail

# Generates strongly-typed DB types into types/supabase.ts
# Requirements:
#   - SUPABASE_PROJECT_ID env var set
# Optional:
#   - SUPABASE_ACCESS_TOKEN (if your CLI needs it for non-interactive auth)

if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
  echo "Error: SUPABASE_PROJECT_ID is not set"
  echo "Example: export SUPABASE_PROJECT_ID=abcd1234"
  exit 1
fi

echo "Generating Supabase types for project: ${SUPABASE_PROJECT_ID}"
mkdir -p types

# Uses Supabase CLI via npx (no global install required)
# Note: you can add --schema <schema> if you have multiple schemas.
npx --yes supabase gen types typescript --project-id "${SUPABASE_PROJECT_ID}" --schema public > types/supabase.ts

echo "Wrote types/supabase.ts"
