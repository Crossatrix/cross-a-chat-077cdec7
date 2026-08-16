-- Create policies for admins to manage roles (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_roles' 
    AND policyname = 'Admins can delete roles'
  ) THEN
    CREATE POLICY "Admins can delete roles"
    ON public.user_roles
    FOR DELETE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Create function to promote user to admin
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;
  
  IF has_role(target_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'User is already an admin';
  END IF;
  
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role);
END;
$$;

-- Create function to demote admin to user
CREATE OR REPLACE FUNCTION public.demote_from_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can demote users';
  END IF;
  
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot demote yourself';
  END IF;
  
  DELETE FROM user_roles
  WHERE user_id = target_user_id AND role = 'admin'::app_role;
END;
$$;