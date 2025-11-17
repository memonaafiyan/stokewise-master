-- Add currency support to products and sales tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- Add barcode/IMEI column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS imei TEXT;

-- Create exchange rates table for multi-currency support
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'INR',
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Create policies for exchange rates
CREATE POLICY "Anyone can view exchange rates" 
ON exchange_rates 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can update exchange rates" 
ON exchange_rates 
FOR ALL 
USING (true);

-- Insert some default exchange rates
INSERT INTO exchange_rates (base_currency, target_currency, rate) VALUES
  ('INR', 'USD', 0.012),
  ('INR', 'EUR', 0.011),
  ('INR', 'GBP', 0.0095),
  ('USD', 'INR', 83.0),
  ('EUR', 'INR', 90.0),
  ('GBP', 'INR', 105.0)
ON CONFLICT (base_currency, target_currency) DO NOTHING;

-- Add realtime publication for low stock alerts
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;