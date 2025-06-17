-- Drop all existing policies and tables in correct order
DO $$ 
BEGIN
    -- Drop tables if they exist (this will cascade drop all policies)
    DROP TABLE IF EXISTS public.payment_history CASCADE;
    DROP TABLE IF EXISTS public.projects CASCADE;
    DROP TABLE IF EXISTS public.users CASCADE;
END $$;

-- Create users table first (since it references auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE,
    role TEXT CHECK (role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    project_type TEXT CHECK (project_type IN ('DCR', 'Non DCR')) DEFAULT 'DCR',
    payment_mode TEXT CHECK (payment_mode IN ('Loan', 'Cash')) DEFAULT 'Cash',
    proposal_amount DECIMAL NOT NULL DEFAULT 0,
    advance_payment DECIMAL NOT NULL DEFAULT 0,
    paid_amount DECIMAL DEFAULT 0,
    balance_amount DECIMAL GENERATED ALWAYS AS (proposal_amount - advance_payment - COALESCE(paid_amount, 0)) STORED,
    status TEXT DEFAULT 'active',
    current_stage TEXT DEFAULT 'Advance payment done',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create payment_history table
CREATE TABLE public.payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    amount DECIMAL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(id)
        ON DELETE CASCADE
);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Enable read access for authenticated users" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policies for projects table
CREATE POLICY "Enable read access for authenticated users" ON public.projects
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.projects
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.projects
    FOR DELETE
    TO authenticated
    USING (true);

-- Create policies for payment_history table
CREATE POLICY "Enable read access for authenticated users" ON public.payment_history
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.payment_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_current_stage ON public.projects(current_stage);
CREATE INDEX idx_projects_created_at ON public.projects(created_at);
CREATE INDEX idx_payment_history_project_id ON public.payment_history(project_id);

-- Create function to update project paid_amount
CREATE OR REPLACE FUNCTION update_project_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE public.projects
        SET paid_amount = COALESCE((
            SELECT SUM(amount)
            FROM public.payment_history
            WHERE project_id = OLD.project_id
        ), 0)
        WHERE id = OLD.project_id;
        RETURN OLD;
    ELSE
        UPDATE public.projects
        SET paid_amount = COALESCE((
            SELECT SUM(amount)
            FROM public.payment_history
            WHERE project_id = NEW.project_id
        ), 0)
        WHERE id = NEW.project_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment_history
DROP TRIGGER IF EXISTS update_project_paid_amount_trigger ON public.payment_history;
CREATE TRIGGER update_project_paid_amount_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_project_paid_amount();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at_projects
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_payment_history
    BEFORE UPDATE ON public.payment_history
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert default users
INSERT INTO public.users (id, email, role)
VALUES 
    ((SELECT id FROM auth.users WHERE email = 'admin@axisogreen.in'), 'admin@axisogreen.in', 'admin'),
    ((SELECT id FROM auth.users WHERE email = 'contact@axisogreen.in'), 'contact@axisogreen.in', 'user')
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = timezone('utc'::text, now()); 