#!/usr/bin/env bash
set -euo pipefail

# Usage: DATABASE_URL must be exported in env or passed in
MIGRATION_FILE="supabase/migrations/20260206b_fix_shopping_lists_schema.sql"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL environment variable is not set."
  echo "Set: export DATABASE_URL=\"postgresql://user:pass@host:5432/db\""
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "Applying migration: $MIGRATION_FILE"
psql "$DATABASE_URL" -f "$MIGRATION_FILE"
echo "Migration applied."

if [ -n "${VERCEL_DEPLOY_HOOK:-}" ]; then
  echo "Triggering Vercel redeploy via hook"
  curl -s -X POST "$VERCEL_DEPLOY_HOOK" || true
  echo "Redeploy triggered (if hook valid)."
else
  echo "VERCEL_DEPLOY_HOOK not set; skipping redeploy trigger."
fi

echo "Done."
