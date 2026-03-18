-- ===========================================
-- 24March Studio - Row Level Security (RLS)
-- ===========================================
-- Exécuter APRES 01_schema.sql
--
-- PRINCIPE RLS = DÉFENSE EN PROFONDEUR
-- -----------------------------------
-- Même si le code applicatif a un bug ou une faille,
-- la base de données elle-même refuse les accès non autorisés.
-- C'est une deuxième ligne de défense au niveau le plus bas.
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user owns a project
CREATE OR REPLACE FUNCTION owns_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM projects
        WHERE id = project_uuid
        AND owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- PROFILES POLICIES
-- ===========================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = 'client'); -- Cannot self-promote to admin

-- Allow insert during registration (handled by trigger)
CREATE POLICY "Allow profile creation"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- ===========================================
-- PROJECTS POLICIES
-- ===========================================

-- Clients can view their own projects
CREATE POLICY "Clients can view own projects"
    ON projects FOR SELECT
    USING (owner_id = auth.uid());

-- Admins can view all projects
CREATE POLICY "Admins can view all projects"
    ON projects FOR SELECT
    USING (is_admin());

-- Clients can create projects
CREATE POLICY "Clients can create projects"
    ON projects FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Clients can update their own projects (limited)
CREATE POLICY "Clients can update own projects"
    ON projects FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Admins can update any project
CREATE POLICY "Admins can update any project"
    ON projects FOR UPDATE
    USING (is_admin());

-- ===========================================
-- PROJECT BRIEFS POLICIES
-- ===========================================

-- Clients can view their project briefs
CREATE POLICY "Clients can view own briefs"
    ON project_briefs FOR SELECT
    USING (owns_project(project_id));

-- Admins can view all briefs
CREATE POLICY "Admins can view all briefs"
    ON project_briefs FOR SELECT
    USING (is_admin());

-- Clients can insert/update their briefs
CREATE POLICY "Clients can create briefs"
    ON project_briefs FOR INSERT
    WITH CHECK (owns_project(project_id));

CREATE POLICY "Clients can update own briefs"
    ON project_briefs FOR UPDATE
    USING (owns_project(project_id));

-- ===========================================
-- ASSETS POLICIES
-- ===========================================

-- Clients can view their assets
CREATE POLICY "Clients can view own assets"
    ON assets FOR SELECT
    USING (owner_id = auth.uid());

-- Admins can view all assets
CREATE POLICY "Admins can view all assets"
    ON assets FOR SELECT
    USING (is_admin());

-- Clients can upload assets to their projects
CREATE POLICY "Clients can upload assets"
    ON assets FOR INSERT
    WITH CHECK (owner_id = auth.uid() AND owns_project(project_id));

-- Clients can delete their own assets
CREATE POLICY "Clients can delete own assets"
    ON assets FOR DELETE
    USING (owner_id = auth.uid());

-- ===========================================
-- DELIVERABLES POLICIES
-- ===========================================

-- Clients can view deliverables for their projects
CREATE POLICY "Clients can view project deliverables"
    ON deliverables FOR SELECT
    USING (owns_project(project_id));

-- Admins can view all deliverables
CREATE POLICY "Admins can view all deliverables"
    ON deliverables FOR SELECT
    USING (is_admin());

-- Only admins can upload deliverables
CREATE POLICY "Admins can upload deliverables"
    ON deliverables FOR INSERT
    WITH CHECK (is_admin());

-- Only admins can delete deliverables
CREATE POLICY "Admins can delete deliverables"
    ON deliverables FOR DELETE
    USING (is_admin());

-- ===========================================
-- SHOPPING LISTS POLICIES
-- ===========================================

-- Clients can view shopping lists for their projects (only if sent)
CREATE POLICY "Clients can view sent shopping lists"
    ON shopping_lists FOR SELECT
    USING (owns_project(project_id) AND status != 'draft');

-- Admins can view all shopping lists
CREATE POLICY "Admins can view all shopping lists"
    ON shopping_lists FOR SELECT
    USING (is_admin());

-- Only admins can create shopping lists
CREATE POLICY "Admins can create shopping lists"
    ON shopping_lists FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update any shopping list
CREATE POLICY "Admins can update shopping lists"
    ON shopping_lists FOR UPDATE
    USING (is_admin());

-- Clients can update to validate or request adjustment
CREATE POLICY "Clients can validate shopping lists"
    ON shopping_lists FOR UPDATE
    USING (owns_project(project_id) AND status = 'sent')
    WITH CHECK (status IN ('validated', 'adjustment_requested'));

-- ===========================================
-- SHOPPING LIST ITEMS POLICIES
-- ===========================================

-- View through parent shopping list
CREATE POLICY "View shopping list items"
    ON shopping_list_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shopping_lists sl
            WHERE sl.id = list_id
            AND (
                is_admin()
                OR (
                    EXISTS (
                        SELECT 1 FROM projects p
                        WHERE p.id = sl.project_id
                        AND p.owner_id = auth.uid()
                    )
                    AND sl.status != 'draft'
                )
            )
        )
    );

-- Only admins can manage items
CREATE POLICY "Admins can insert items"
    ON shopping_list_items FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update items"
    ON shopping_list_items FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete items"
    ON shopping_list_items FOR DELETE
    USING (is_admin());

-- ===========================================
-- MESSAGES POLICIES
-- ===========================================

-- Users can view messages in their projects
CREATE POLICY "View project messages"
    ON messages FOR SELECT
    USING (owns_project(project_id) OR is_admin());

-- Users can send messages to their projects
CREATE POLICY "Send messages"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND (owns_project(project_id) OR is_admin())
    );

-- ===========================================
-- AUDIT LOGS POLICIES
-- ===========================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (is_admin());

-- Anyone authenticated can create audit logs
CREATE POLICY "Authenticated users can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (actor_id = auth.uid());
