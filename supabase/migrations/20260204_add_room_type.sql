-- Migration: add room_type to projects
-- Date: 2026-02-04

BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS room_type TEXT;

COMMIT;
