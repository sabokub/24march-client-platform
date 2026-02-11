-- ===========================================
-- 24March Studio - Add Missing Columns
-- ===========================================
-- Idempotent migration to ensure all columns exist with correct types.
-- Safe to run multiple times.

-- Add projects.room_type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'projects'
        AND column_name = 'room_type'
    ) THEN
        ALTER TABLE public.projects
            ADD COLUMN room_type TEXT DEFAULT NULL;
        RAISE NOTICE 'Added column projects.room_type';
    ELSE
        RAISE NOTICE 'Column projects.room_type already exists';
    END IF;
END $$;

-- Ensure shopping_lists.created_by_admin exists and is BOOLEAN
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'shopping_lists'
        AND column_name = 'created_by_admin'
    ) THEN
        -- Column doesn't exist, add it
        ALTER TABLE public.shopping_lists
            ADD COLUMN created_by_admin BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Added column shopping_lists.created_by_admin (BOOLEAN)';
    ELSE
        -- Column exists, check and fix type if needed
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'shopping_lists'
            AND column_name = 'created_by_admin'
            AND data_type != 'boolean'
        ) THEN
            -- Wrong type, need to convert (safe: default to false)
            ALTER TABLE public.shopping_lists
                ALTER COLUMN created_by_admin DROP DEFAULT,
                DROP CONSTRAINT IF EXISTS shopping_lists_created_by_admin_check;
            
            ALTER TABLE public.shopping_lists
                ALTER COLUMN created_by_admin TYPE BOOLEAN USING false;
            
            ALTER TABLE public.shopping_lists
                ALTER COLUMN created_by_admin SET DEFAULT false,
                ALTER COLUMN created_by_admin SET NOT NULL;
            
            RAISE NOTICE 'Converted shopping_lists.created_by_admin to BOOLEAN (set all existing values to false)';
        ELSE
            RAISE NOTICE 'Column shopping_lists.created_by_admin exists and is already BOOLEAN';
        END IF;
    END IF;
END $$;

-- Notify PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');
