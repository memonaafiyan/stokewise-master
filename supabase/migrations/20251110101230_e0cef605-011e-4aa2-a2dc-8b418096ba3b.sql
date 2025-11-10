-- Fix security warnings by adding SECURITY DEFINER and search_path to trigger functions

-- Update the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update the update_product_stock_on_sale function
CREATE OR REPLACE FUNCTION public.update_product_stock_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

-- Update the update_vyapari_on_sale function
CREATE OR REPLACE FUNCTION public.update_vyapari_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vyapari
  SET 
    total_purchased = total_purchased + NEW.total_amount,
    remaining_balance = remaining_balance + NEW.remaining_amount,
    last_transaction_date = NEW.sale_date
  WHERE id = NEW.vyapari_id;
  RETURN NEW;
END;
$$;

-- Update the update_on_payment function
CREATE OR REPLACE FUNCTION public.update_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update the calculate_credit_score function
CREATE OR REPLACE FUNCTION public.calculate_credit_score(_vyapari_id uuid)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;