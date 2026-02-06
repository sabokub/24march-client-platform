-- Migration: Add shopping_lists and shopping_list_items tables
-- Date: 2026-02-06

BEGIN;

-- ===========================================
-- SHOPPING LISTS TABLE
-- ===========================================

CREATE TABLE public.shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_by_admin BOOLEAN NOT NULL DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft',
    client_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    title TEXT,
    notes TEXT
);

-- ===========================================
-- SHOPPING LIST ITEMS TABLE
-- ===========================================

CREATE TABLE public.shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL,
    url TEXT,
    image_url TEXT,
    vendor TEXT,
    price NUMERIC,
    quantity INT NOT NULL DEFAULT 1,
    notes TEXT
);

-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX idx_shopping_lists_project ON public.shopping_lists(project_id);
CREATE INDEX idx_shopping_list_items_list ON public.shopping_list_items(shopping_list_id);

-- ===========================================
-- TRIGGER: updated_at
-- ===========================================

CREATE TRIGGER update_shopping_lists_updated_at
    BEFORE UPDATE ON public.shopping_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SHOPPING LISTS POLICIES
-- ===========================================

-- Clients can view shopping lists for their projects
CREATE POLICY "Clients can view own shopping lists"
    ON public.shopping_lists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = shopping_lists.project_id
            AND owner_id = auth.uid()
        )
    );

-- Admins can view all shopping lists
CREATE POLICY "Admins can view all shopping lists"
    ON public.shopping_lists FOR SELECT
    USING (is_admin());

-- Clients can create shopping lists for their projects
CREATE POLICY "Clients can create shopping lists"
    ON public.shopping_lists FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = shopping_lists.project_id
            AND owner_id = auth.uid()
        )
    );

-- Clients can update shopping lists for their projects
CREATE POLICY "Clients can update own shopping lists"
    ON public.shopping_lists FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = shopping_lists.project_id
            AND owner_id = auth.uid()
        )
    );

-- Clients can delete shopping lists for their projects
CREATE POLICY "Clients can delete own shopping lists"
    ON public.shopping_lists FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = shopping_lists.project_id
            AND owner_id = auth.uid()
        )
    );

-- Admins can manage all shopping lists
CREATE POLICY "Admins can manage all shopping lists"
    ON public.shopping_lists FOR ALL
    USING (is_admin());

-- ===========================================
-- SHOPPING LIST ITEMS POLICIES
-- ===========================================

-- Clients can view items in their shopping lists
CREATE POLICY "Clients can view shopping list items"
    ON public.shopping_list_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shopping_lists sl
            JOIN public.projects p ON p.id = sl.project_id
            WHERE sl.id = shopping_list_items.shopping_list_id
            AND p.owner_id = auth.uid()
        )
    );

-- Admins can view all shopping list items
CREATE POLICY "Admins can view all items"
    ON public.shopping_list_items FOR SELECT
    USING (is_admin());

-- Clients can add items to their shopping lists
CREATE POLICY "Clients can add items"
    ON public.shopping_list_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shopping_lists sl
            JOIN public.projects p ON p.id = sl.project_id
            WHERE sl.id = shopping_list_items.shopping_list_id
            AND p.owner_id = auth.uid()
        )
    );

-- Clients can update items in their shopping lists
CREATE POLICY "Clients can update items"
    ON public.shopping_list_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.shopping_lists sl
            JOIN public.projects p ON p.id = sl.project_id
            WHERE sl.id = shopping_list_items.shopping_list_id
            AND p.owner_id = auth.uid()
        )
    );

-- Clients can delete items from their shopping lists
CREATE POLICY "Clients can delete items"
    ON public.shopping_list_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.shopping_lists sl
            JOIN public.projects p ON p.id = sl.project_id
            WHERE sl.id = shopping_list_items.shopping_list_id
            AND p.owner_id = auth.uid()
        )
    );

-- Admins can manage all shopping list items
CREATE POLICY "Admins can manage all items"
    ON public.shopping_list_items FOR ALL
    USING (is_admin());

COMMIT;
