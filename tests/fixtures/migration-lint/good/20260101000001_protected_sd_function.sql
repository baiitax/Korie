-- GOOD fixture: SECURITY DEFINER function with the required revoke + grant.
CREATE OR REPLACE FUNCTION public.post_sprocket_transfer(p_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.post_sprocket_transfer(uuid, numeric) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_sprocket_transfer(uuid, numeric) TO service_role;
