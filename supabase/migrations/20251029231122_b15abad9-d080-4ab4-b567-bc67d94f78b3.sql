-- Drop the existing foreign key constraint
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_coordinator_id_fkey;

-- Add the foreign key constraint with ON DELETE CASCADE
-- This will automatically delete projects when a coordinator is deleted
ALTER TABLE public.projects
ADD CONSTRAINT projects_coordinator_id_fkey 
FOREIGN KEY (coordinator_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;