-- Criar tabela de projetos de extensão
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coordinator_id UUID NOT NULL REFERENCES public.profiles(user_id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'finalizado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de alunos
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  matricula TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  course TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de participação de alunos em projetos
CREATE TABLE public.project_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'finalizado')),
  total_hours INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, student_id)
);

-- Criar tabela de registro de frequência/atividades
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participation_id UUID NOT NULL REFERENCES public.project_participations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours INTEGER NOT NULL CHECK (hours > 0),
  activity_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(user_id)
);

-- Criar tabela de relatórios gerados
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('student', 'project', 'general')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id),
  project_id UUID REFERENCES public.projects(id),
  generated_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects
CREATE POLICY "Coordinators can view their own projects" 
ON public.projects 
FOR SELECT 
USING (coordinator_id = auth.uid());

CREATE POLICY "Coordinators can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (coordinator_id = auth.uid());

CREATE POLICY "Coordinators can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (coordinator_id = auth.uid());

CREATE POLICY "Admins can view all projects" 
ON public.projects 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create RLS policies for students
CREATE POLICY "Coordinators can view all students" 
ON public.students 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin')
  )
);

CREATE POLICY "Coordinators can create students" 
ON public.students 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin')
  )
);

CREATE POLICY "Coordinators can update students" 
ON public.students 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin')
  )
);

-- Create RLS policies for project_participations
CREATE POLICY "Coordinators can view participations in their projects" 
ON public.project_participations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND coordinator_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Coordinators can create participations in their projects" 
ON public.project_participations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND coordinator_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Coordinators can update participations in their projects" 
ON public.project_participations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND coordinator_id = auth.uid()
  ) OR is_admin(auth.uid())
);

-- Create RLS policies for attendance_records
CREATE POLICY "Coordinators can view attendance records for their projects" 
ON public.attendance_records 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_participations pp
    JOIN public.projects p ON p.id = pp.project_id
    WHERE pp.id = participation_id AND p.coordinator_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Coordinators can create attendance records for their projects" 
ON public.attendance_records 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_participations pp
    JOIN public.projects p ON p.id = pp.project_id
    WHERE pp.id = participation_id AND p.coordinator_id = auth.uid()
  ) AND created_by = auth.uid()
);

-- Create RLS policies for reports
CREATE POLICY "Users can view their own reports" 
ON public.reports 
FOR SELECT 
USING (generated_by = auth.uid());

CREATE POLICY "Users can create reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (generated_by = auth.uid());

CREATE POLICY "Admins can view all reports" 
ON public.reports 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_projects_coordinator ON public.projects(coordinator_id);
CREATE INDEX idx_project_participations_project ON public.project_participations(project_id);
CREATE INDEX idx_project_participations_student ON public.project_participations(student_id);
CREATE INDEX idx_attendance_records_participation ON public.attendance_records(participation_id);
CREATE INDEX idx_attendance_records_date ON public.attendance_records(date);
CREATE INDEX idx_reports_generated_by ON public.reports(generated_by);
CREATE INDEX idx_students_matricula ON public.students(matricula);

-- Create triggers for updated_at columns
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_participations_updated_at
  BEFORE UPDATE ON public.project_participations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically update total_hours in project_participations
CREATE OR REPLACE FUNCTION public.update_participation_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total hours when attendance record is inserted, updated, or deleted
  IF TG_OP = 'DELETE' THEN
    UPDATE public.project_participations 
    SET total_hours = (
      SELECT COALESCE(SUM(hours), 0) 
      FROM public.attendance_records 
      WHERE participation_id = OLD.participation_id
    )
    WHERE id = OLD.participation_id;
    RETURN OLD;
  ELSE
    UPDATE public.project_participations 
    SET total_hours = (
      SELECT COALESCE(SUM(hours), 0) 
      FROM public.attendance_records 
      WHERE participation_id = NEW.participation_id
    )
    WHERE id = NEW.participation_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update participation hours
CREATE TRIGGER update_participation_hours_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_participation_hours();