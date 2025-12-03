-- Allow coordinators to delete their own projects
CREATE POLICY "Coordinators can delete their own projects"
ON public.projetos
FOR DELETE
USING (coordinator_id = auth.uid());

-- Allow admins to delete any project
CREATE POLICY "Admins can delete any project"
ON public.projetos
FOR DELETE
USING (is_admin(auth.uid()));

-- Allow coordinators and admins to delete students
CREATE POLICY "Coordinators can delete students"
ON public.estudantes
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM perfis
  WHERE perfis.user_id = auth.uid() 
  AND perfis.role IN ('coordinator', 'admin')
));