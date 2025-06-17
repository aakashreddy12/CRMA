-- Create service_tickets table
CREATE TABLE IF NOT EXISTS public.service_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    description TEXT NOT NULL,
    status TEXT CHECK (status IN ('open', 'in_progress', 'completed')) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Add RLS policies
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to select service tickets
CREATE POLICY "Allow authenticated users to view service tickets"
ON public.service_tickets
FOR SELECT
TO authenticated
USING (true);

-- Create policy for authenticated users to insert service tickets
CREATE POLICY "Allow authenticated users to insert service tickets"
ON public.service_tickets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for authenticated users to update service tickets
CREATE POLICY "Allow authenticated users to update service tickets"
ON public.service_tickets
FOR UPDATE
TO authenticated
USING (true); 