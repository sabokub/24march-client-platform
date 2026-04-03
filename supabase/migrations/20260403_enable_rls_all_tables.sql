-- Migration: Enable RLS on all public tables with missing security
-- Date: 2026-04-03
-- Purpose: Fix security errors - enable Row Level Security on tables

BEGIN;

-- ===========================================
-- ENABLE RLS ON PUBLIC TABLES
-- ===========================================

-- Enable RLS on testimonials if it exists
ALTER TABLE IF EXISTS public.testimonials ENABLE ROW LEVEL SECURITY;

-- Enable RLS on content_library if it exists
ALTER TABLE IF EXISTS public.content_library ENABLE ROW LEVEL SECURITY;

-- Enable RLS on workflow_logs if it exists
ALTER TABLE IF EXISTS public.workflow_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on leads if it exists
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;

-- Enable RLS on products if it exists
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- POLICIES FOR TESTIMONIALS
-- ===========================================

-- Clients can view testimonials (public content)
CREATE POLICY IF NOT EXISTS "Users can view testimonials"
    ON public.testimonials FOR SELECT
    USING (true);

-- Only admins can manage testimonials
CREATE POLICY IF NOT EXISTS "Admins can manage testimonials"
    ON public.testimonials FOR ALL
    USING (is_admin());

-- ===========================================
-- POLICIES FOR CONTENT_LIBRARY
-- ===========================================

-- Everyone can view content library (public content)
CREATE POLICY IF NOT EXISTS "Users can view content library"
    ON public.content_library FOR SELECT
    USING (true);

-- Only admins can manage content library
CREATE POLICY IF NOT EXISTS "Admins can manage content library"
    ON public.content_library FOR ALL
    USING (is_admin());

-- ===========================================
-- POLICIES FOR WORKFLOW_LOGS
-- ===========================================

-- Only admins can view workflow logs
CREATE POLICY IF NOT EXISTS "Admins can view workflow logs"
    ON public.workflow_logs FOR SELECT
    USING (is_admin());

-- Only admins can manage workflow logs
CREATE POLICY IF NOT EXISTS "Admins can manage workflow logs"
    ON public.workflow_logs FOR ALL
    USING (is_admin());

-- ===========================================
-- POLICIES FOR LEADS
-- ===========================================

-- Only admins can view leads
CREATE POLICY IF NOT EXISTS "Admins can view leads"
    ON public.leads FOR SELECT
    USING (is_admin());

-- Only admins can manage leads
CREATE POLICY IF NOT EXISTS "Admins can manage leads"
    ON public.leads FOR ALL
    USING (is_admin());

-- ===========================================
-- POLICIES FOR PRODUCTS
-- ===========================================

-- Everyone can view products (public catalog)
CREATE POLICY IF NOT EXISTS "Users can view products"
    ON public.products FOR SELECT
    USING (true);

-- Only admins can manage products
CREATE POLICY IF NOT EXISTS "Admins can manage products"
    ON public.products FOR ALL
    USING (is_admin());

COMMIT;
