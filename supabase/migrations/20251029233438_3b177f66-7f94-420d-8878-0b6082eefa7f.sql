-- Renomear tabelas para português brasileiro
ALTER TABLE public.attendance_records RENAME TO registros_presenca;
ALTER TABLE public.profiles RENAME TO perfis;
ALTER TABLE public.project_participations RENAME TO participacoes_projeto;
ALTER TABLE public.projects RENAME TO projetos;
ALTER TABLE public.reports RENAME TO relatorios;
ALTER TABLE public.students RENAME TO estudantes;

-- Atualizar a função is_admin para usar o novo nome da tabela
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis
    WHERE user_id = uid AND role = 'admin'
  );
$function$;

-- Atualizar a função handle_new_user para usar o novo nome da tabela
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.perfis (user_id, email, name, role, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'coordinator'),
    NEW.raw_user_meta_data->>'department'
  );
  RETURN NEW;
END;
$function$;

-- Atualizar a função ensure_admin_exists para usar o novo nome da tabela
CREATE OR REPLACE FUNCTION public.ensure_admin_exists()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    admin_email TEXT := 'admin@extentrack.com';
    admin_password TEXT := 'admin123';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE email = admin_email) THEN
        RAISE NOTICE 'Admin user should be created with email: % and password: %', admin_email, admin_password;
    END IF;
END;
$function$;

-- Atualizar a função update_participation_hours para usar o novo nome da tabela
CREATE OR REPLACE FUNCTION public.update_participation_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.participacoes_projeto 
    SET total_hours = (
      SELECT COALESCE(SUM(hours), 0) 
      FROM public.registros_presenca 
      WHERE participation_id = OLD.participation_id
    )
    WHERE id = OLD.participation_id;
    RETURN OLD;
  ELSE
    UPDATE public.participacoes_projeto 
    SET total_hours = (
      SELECT COALESCE(SUM(hours), 0) 
      FROM public.registros_presenca 
      WHERE participation_id = NEW.participation_id
    )
    WHERE id = NEW.participation_id;
    RETURN NEW;
  END IF;
END;
$function$;