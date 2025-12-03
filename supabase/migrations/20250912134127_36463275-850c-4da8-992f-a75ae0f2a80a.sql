-- Create a SECURITY DEFINER helper to avoid recursive policies
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = uid AND role = 'admin'
  );
$$;

-- Fix recursive policies by replacing them with calls to the helper function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert coordinator profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert coordinator profiles"
ON public.profiles
FOR INSERT
WITH CHECK ((role = 'coordinator') AND public.is_admin(auth.uid()));