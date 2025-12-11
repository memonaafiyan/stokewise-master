-- Add new columns to products table for Stock Maker app
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS model text,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS storage text,
ADD COLUMN IF NOT EXISTS country_variant text DEFAULT 'IN',
ADD COLUMN IF NOT EXISTS purchase_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS sold boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sold_date timestamp with time zone;

-- Update existing name column to be nullable since we'll use brand+model
ALTER TABLE public.products ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN category DROP NOT NULL;

-- Set defaults for existing required fields
ALTER TABLE public.products ALTER COLUMN name SET DEFAULT '';
ALTER TABLE public.products ALTER COLUMN category SET DEFAULT 'Mobile';

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products(model);
CREATE INDEX IF NOT EXISTS idx_products_imei ON public.products(imei);
CREATE INDEX IF NOT EXISTS idx_products_sold ON public.products(sold);