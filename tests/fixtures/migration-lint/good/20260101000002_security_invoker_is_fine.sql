-- GOOD fixture: SECURITY INVOKER functions are out of scope (RLS applies).
CREATE OR REPLACE FUNCTION public.list_widgets()
RETURNS SETOF widgets
LANGUAGE sql
AS $$
  SELECT * FROM widgets;
$$;
