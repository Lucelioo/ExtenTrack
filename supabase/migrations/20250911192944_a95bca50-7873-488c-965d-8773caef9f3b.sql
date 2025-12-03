-- Insert default admin user
-- Note: This user needs to be created through Supabase Auth first
-- We'll create a SQL script to insert the profile once the user is created

-- Create a function to insert admin profile if it doesn't exist
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
$$ LANGUAGE plpgsql;

-- You can call this function to check if admin exists
SELECT public.ensure_admin_exists();