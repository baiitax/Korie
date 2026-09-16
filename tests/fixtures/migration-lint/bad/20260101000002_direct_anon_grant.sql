-- Deliberately BAD fixture: explicit GRANT to anon even though a REVOKE ran.
CREATE OR REPLACE FUNCTION public.post_gadget_transfer(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.post_gadget_transfer(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_gadget_transfer(uuid) TO anon;
