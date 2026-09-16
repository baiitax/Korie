-- Deliberately BAD fixture: SECURITY DEFINER function with no REVOKE.
CREATE OR REPLACE FUNCTION public.post_widget_transfer(p_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE widgets SET amount = p_amount WHERE id = p_id;
END;
$$;
