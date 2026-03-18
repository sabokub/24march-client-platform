-- Migration: Fix shopping_list_items schema to match application expectations
-- Date: 2026-03-18

BEGIN;

-- Rename shopping_list_id to list_id (keep foreign key constraint)
ALTER TABLE public.shopping_list_items
RENAME COLUMN shopping_list_id TO list_id;

-- Add missing columns to shopping_list_items
ALTER TABLE public.shopping_list_items
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS retailer TEXT,
ADD COLUMN IF NOT EXISTS price_eur DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS product_url TEXT,
ADD COLUMN IF NOT EXISTS affiliate_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS style_tags TEXT[],
ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Migrate data from old columns to new ones (idempotent)
UPDATE public.shopping_list_items
SET
  title = COALESCE(name, 'Product'),
  retailer = vendor,
  price_eur = CAST(price AS DECIMAL(10, 2)),
  product_url = url,
  position = COALESCE(position, 0)
WHERE title IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id ON public.shopping_list_items(list_id);

-- Keep old columns for backward compatibility (they're now denormalized)
-- ALTER TABLE public.shopping_list_items
-- DROP COLUMN IF EXISTS name,
-- DROP COLUMN IF EXISTS vendor,
-- DROP COLUMN IF EXISTS price,
-- DROP COLUMN IF EXISTS url;

COMMIT;
