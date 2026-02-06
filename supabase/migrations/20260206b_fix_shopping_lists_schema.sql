-- Migration: Fix shopping_lists schema (created_by_admin type and missing columns)
-- Date: 2026-02-06 (corrective)

BEGIN;

-- Check if columns exist and add if missing
-- This handles cases where the table exists with incomplete/wrong schema

ALTER TABLE public.shopping_lists
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- Fix created_by_admin if it exists with wrong type
-- Note: This is a manual step if the column exists as UUID
-- ALTER TABLE public.shopping_lists
-- DROP COLUMN created_by_admin;
-- ALTER TABLE public.shopping_lists
-- ADD COLUMN created_by_admin BOOLEAN NOT NULL DEFAULT false;

-- If the table doesn't exist yet, the main migration (20260206_add_shopping_lists.sql) will create it correctly

COMMIT;
