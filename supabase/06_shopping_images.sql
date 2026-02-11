-- ===========================================
-- 24March Studio - Shopping Images Storage
-- ===========================================
-- Idempotent migration to add image_storage_path and bucket/policies.

-- Add image_storage_path to shopping_list_items
ALTER TABLE public.shopping_list_items
  ADD COLUMN IF NOT EXISTS image_storage_path TEXT;

-- Create bucket for shopping images
INSERT INTO storage.buckets (id, name, public)
VALUES ('shopping_images', 'shopping_images', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for admins to manage shopping images
DROP POLICY IF EXISTS "Admins can manage shopping images" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'admin upload shopping images'
  ) THEN
    EXECUTE '
      CREATE POLICY "admin upload shopping images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = ''shopping_images''
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.role = ''admin''
        )
      )
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'admin read shopping images'
  ) THEN
    EXECUTE '
      CREATE POLICY "admin read shopping images"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = ''shopping_images''
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.role = ''admin''
        )
      )
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'admin delete shopping images'
  ) THEN
    EXECUTE '
      CREATE POLICY "admin delete shopping images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = ''shopping_images''
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.role = ''admin''
        )
      )
    ';
  END IF;
END $$;

SELECT pg_notify('pgrst', 'reload schema');
