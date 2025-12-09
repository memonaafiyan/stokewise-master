-- Create products table for Stock Maker
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  storage TEXT,
  country_variant TEXT DEFAULT 'IN',
  imei TEXT,
  barcode TEXT,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  customer_name TEXT,
  notes TEXT,
  sold BOOLEAN DEFAULT false,
  sold_date TIMESTAMP WITH TIME ZONE,
  currency TEXT DEFAULT 'INR',
  name TEXT GENERATED ALWAYS AS (brand || ' ' || model) STORED,
  category TEXT DEFAULT 'Mobile',
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price DECIMAL(12,2) GENERATED ALWAYS AS (selling_price) STORED,
  low_stock_threshold INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own products" 
ON public.products 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create indexes for fast search
CREATE INDEX idx_products_brand ON public.products(brand);
CREATE INDEX idx_products_model ON public.products(model);
CREATE INDEX idx_products_imei ON public.products(imei);
CREATE INDEX idx_products_country ON public.products(country_variant);
CREATE INDEX idx_products_sold ON public.products(sold);
CREATE INDEX idx_products_created_by ON public.products(created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_products_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;