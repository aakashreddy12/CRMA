-- Create payment_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount INTEGER NOT NULL,
    status TEXT CHECK (status IN ('created', 'paid', 'failed')) DEFAULT 'created',
    project_id UUID REFERENCES public.projects(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'pending',
    order_id UUID REFERENCES public.payment_orders(id),
    payment_id TEXT, -- Razorpay payment ID
    project_id UUID REFERENCES public.projects(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies for payment_orders
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view payment_orders
CREATE POLICY "Allow authenticated users to view payment_orders"
ON public.payment_orders
FOR SELECT
TO authenticated
USING (true);

-- Create policy for authenticated users to insert payment_orders
CREATE POLICY "Allow authenticated users to insert payment_orders"
ON public.payment_orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for authenticated users to update payment_orders
CREATE POLICY "Allow authenticated users to update payment_orders"
ON public.payment_orders
FOR UPDATE
TO authenticated
USING (true);

-- Add RLS policies for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view payments
CREATE POLICY "Allow authenticated users to view payments"
ON public.payments
FOR SELECT
TO authenticated
USING (true);

-- Create policy for authenticated users to insert payments
CREATE POLICY "Allow authenticated users to insert payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for authenticated users to update payments
CREATE POLICY "Allow authenticated users to update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (true); 