-- ===========================================
-- 24March Studio - Storage Configuration
-- ===========================================
-- Exécuter APRES les tables et RLS
--
-- Note: Ces commandes doivent être exécutées
-- dans Supabase Dashboard > Storage ou via API
-- ===========================================

-- Create storage buckets
-- Exécuter dans SQL Editor ou créer manuellement dans Dashboard

-- Bucket pour les assets clients (photos, plans)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les livrables (rendus 3D)
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliverables', 'deliverables', false)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- STORAGE POLICIES - ASSETS BUCKET
-- ===========================================

-- Clients can upload to their own folder
CREATE POLICY "Users can upload assets"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Clients can view their own assets
CREATE POLICY "Users can view own assets"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Clients can delete their own assets
CREATE POLICY "Users can delete own assets"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Admins can view all assets
CREATE POLICY "Admins can view all assets storage"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'assets'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ===========================================
-- STORAGE POLICIES - DELIVERABLES BUCKET
-- ===========================================

-- Only admins can upload deliverables
CREATE POLICY "Admins can upload deliverables"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'deliverables'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Admins can manage all deliverables
CREATE POLICY "Admins can manage deliverables"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'deliverables'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Clients can view deliverables for their projects
-- (Access controlled via signed URLs from the app)
CREATE POLICY "Clients can view project deliverables storage"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'deliverables'
        AND EXISTS (
            SELECT 1 FROM projects p
            JOIN deliverables d ON d.project_id = p.id
            WHERE p.owner_id = auth.uid()
            AND d.storage_path = name
        )
    );
