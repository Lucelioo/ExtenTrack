-- Fix security warning: Set search_path for the ensure_admin_exists function
CREATE OR REPLACE FUNCTION public.ensure_admin_exists()
RETURNS void AS $$
DECLARE
    admin_email TEXT := 'admin@extentrack.com';
    admin_password TEXT := 'admin123';
BEGIN
    -- Check if admin profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = admin_email) THEN
        -- This function will be called manually after creating the auth user
        -- through the Supabase dashboard or auth interface
        RAISE NOTICE 'Admin user should be created with email: % and password: %', admin_email, admin_password;
    END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;