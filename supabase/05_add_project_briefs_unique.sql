-- ===========================================
-- 24March Studio - Add UNIQUE on project_briefs.project_id
-- ===========================================
-- Idempotent migration. Safe to run multiple times.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'project_briefs_project_id_key'
          AND conrelid = 'public.project_briefs'::regclass
    ) THEN
        ALTER TABLE public.project_briefs
            ADD CONSTRAINT project_briefs_project_id_key UNIQUE (project_id);
    END IF;
END $$;

SELECT pg_notify('pgrst', 'reload schema');
