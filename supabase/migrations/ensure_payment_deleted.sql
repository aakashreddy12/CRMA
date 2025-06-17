-- Function to ensure a payment is permanently deleted
CREATE OR REPLACE FUNCTION public.ensure_payment_deleted(payment_id UUID, project_id UUID)
RETURNS VOID AS $$
BEGIN
    -- First, disable any triggers that might automatically update the payment_history
    -- This is a safety measure to prevent automatic reinsertions
    ALTER TABLE public.payment_history DISABLE TRIGGER ALL;
    
    -- Double check that the payment is deleted
    DELETE FROM public.payment_history WHERE id = payment_id;
    
    -- Manually recalculate and update the project's paid_amount 
    -- This ensures data consistency without relying on triggers
    UPDATE public.projects 
    SET paid_amount = COALESCE((
        SELECT SUM(amount) 
        FROM public.payment_history 
        WHERE project_id = $2
    ), 0)
    WHERE id = $2;
    
    -- Re-enable all triggers
    ALTER TABLE public.payment_history ENABLE TRIGGER ALL;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_payment_deleted(UUID, UUID) TO authenticated;

-- Add comment to explain function
COMMENT ON FUNCTION public.ensure_payment_deleted(UUID, UUID) IS 
'Ensures a payment is permanently deleted and updates the related project''s paid_amount accordingly.'; 