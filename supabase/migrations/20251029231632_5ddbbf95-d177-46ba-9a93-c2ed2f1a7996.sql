-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));