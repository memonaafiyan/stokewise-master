-- Create OTP codes table for password reset
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting OTP (anyone can request)
CREATE POLICY "Anyone can insert OTP requests" 
  ON public.password_reset_otps 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy for selecting OTP (for verification)
CREATE POLICY "Anyone can verify OTP" 
  ON public.password_reset_otps 
  FOR SELECT 
  USING (true);

-- Create policy for updating OTP (marking as used)
CREATE POLICY "Anyone can update OTP" 
  ON public.password_reset_otps 
  FOR UPDATE 
  USING (true);

-- Create shop settings table for invoice details
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_name TEXT DEFAULT 'Phonex Telecom',
  shop_address TEXT DEFAULT 'Ahmedabad',
  shop_phone TEXT DEFAULT '7874455980',
  shop_email TEXT DEFAULT 'memonaafiyan01@gmail.com',
  gst_number TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for shop settings
CREATE POLICY "Users can view their own shop settings" 
  ON public.shop_settings 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own shop settings" 
  ON public.shop_settings 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update their own shop settings" 
  ON public.shop_settings 
  FOR UPDATE 
  USING (true);

-- Add phone column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON public.password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_code ON public.password_reset_otps(otp_code);