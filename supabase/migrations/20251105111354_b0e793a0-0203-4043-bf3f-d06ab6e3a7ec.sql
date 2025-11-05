-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  unit_price DECIMAL(10, 2) NOT NULL,
  low_stock_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create vyapari (customers) table
CREATE TABLE public.vyapari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  email TEXT,
  address TEXT,
  total_purchased DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  total_paid DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  remaining_balance DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  credit_score INTEGER DEFAULT 100 NOT NULL,
  last_transaction_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vyapari_id UUID REFERENCES public.vyapari(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  remaining_amount DECIMAL(12, 2) NOT NULL,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  due_date DATE NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  vyapari_id UUID REFERENCES public.vyapari(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create email_reminders table for tracking sent emails
CREATE TABLE public.email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  vyapari_id UUID REFERENCES public.vyapari(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  email_sent_to TEXT NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vyapari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_reminders ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for vyapari
CREATE POLICY "Authenticated users can view vyapari"
  ON public.vyapari FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create vyapari"
  ON public.vyapari FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update vyapari"
  ON public.vyapari FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete vyapari"
  ON public.vyapari FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sales
CREATE POLICY "Authenticated users can view sales"
  ON public.sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sales"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update sales"
  ON public.sales FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete sales"
  ON public.sales FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payments
CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for email_reminders
CREATE POLICY "Authenticated users can view email reminders"
  ON public.email_reminders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert email reminders"
  ON public.email_reminders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vyapari_updated_at
  BEFORE UPDATE ON public.vyapari
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update product stock on sale
CREATE OR REPLACE FUNCTION public.update_product_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_stock_on_sale();

-- Create function to update vyapari totals on sale
CREATE OR REPLACE FUNCTION public.update_vyapari_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.vyapari
  SET 
    total_purchased = total_purchased + NEW.total_amount,
    remaining_balance = remaining_balance + NEW.remaining_amount,
    last_transaction_date = NEW.sale_date
  WHERE id = NEW.vyapari_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vyapari_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vyapari_on_sale();

-- Create function to update vyapari and sale on payment
CREATE OR REPLACE FUNCTION public.update_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vyapari totals
  UPDATE public.vyapari
  SET 
    total_paid = total_paid + NEW.amount,
    remaining_balance = remaining_balance - NEW.amount
  WHERE id = NEW.vyapari_id;
  
  -- Update sale payment status
  UPDATE public.sales
  SET 
    paid_amount = paid_amount + NEW.amount,
    remaining_amount = remaining_amount - NEW.amount,
    payment_status = CASE
      WHEN (paid_amount + NEW.amount) >= total_amount THEN 'paid'::payment_status
      WHEN (paid_amount + NEW.amount) > 0 THEN 'partial'::payment_status
      ELSE 'pending'::payment_status
    END
  WHERE id = NEW.sale_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_on_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_on_payment();

-- Create function to calculate credit score
CREATE OR REPLACE FUNCTION public.calculate_credit_score(_vyapari_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 100;
  overdue_count INTEGER;
  timely_count INTEGER;
BEGIN
  -- Count overdue payments
  SELECT COUNT(*)
  INTO overdue_count
  FROM public.sales
  WHERE vyapari_id = _vyapari_id
    AND payment_status IN ('overdue', 'pending')
    AND due_date < CURRENT_DATE;
  
  -- Count timely payments
  SELECT COUNT(*)
  INTO timely_count
  FROM public.sales
  WHERE vyapari_id = _vyapari_id
    AND payment_status = 'paid'
    AND paid_amount >= total_amount;
  
  -- Adjust score
  score := score - (overdue_count * 10);
  score := score + (timely_count * 5);
  
  -- Cap between 0 and 100
  IF score > 100 THEN score := 100; END IF;
  IF score < 0 THEN score := 0; END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX idx_products_created_by ON public.products(created_by);
CREATE INDEX idx_vyapari_created_by ON public.vyapari(created_by);
CREATE INDEX idx_sales_vyapari_id ON public.sales(vyapari_id);
CREATE INDEX idx_sales_product_id ON public.sales(product_id);
CREATE INDEX idx_sales_payment_status ON public.sales(payment_status);
CREATE INDEX idx_sales_due_date ON public.sales(due_date);
CREATE INDEX idx_payments_sale_id ON public.payments(sale_id);
CREATE INDEX idx_payments_vyapari_id ON public.payments(vyapari_id);