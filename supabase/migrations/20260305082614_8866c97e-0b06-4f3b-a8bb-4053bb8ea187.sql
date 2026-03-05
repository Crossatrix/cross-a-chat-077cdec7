
-- Create helper functions for role hierarchy checks
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('moderator_lite', 'moderator', 'elder_moderator', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_moderator_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('moderator', 'elder_moderator', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_elder_moderator_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('elder_moderator', 'admin')
  )
$$;

-- Create set_user_role function (admin only)
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;

  -- Remove any existing staff roles
  DELETE FROM user_roles
  WHERE user_id = target_user_id AND role IN ('moderator_lite', 'moderator', 'elder_moderator', 'admin');

  -- If new_role is not 'user', add the staff role
  IF new_role != 'user' THEN
    INSERT INTO user_roles (user_id, role) VALUES (target_user_id, new_role);
  END IF;
END;
$$;

-- Update RLS policies for user_bans
DROP POLICY IF EXISTS "Admins can create bans" ON public.user_bans;
CREATE POLICY "Staff can create bans" ON public.user_bans
FOR INSERT TO authenticated
WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete bans" ON public.user_bans;
CREATE POLICY "Moderators can delete bans" ON public.user_bans
FOR DELETE TO authenticated
USING (is_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all bans" ON public.user_bans;
DROP POLICY IF EXISTS "Users can view their own ban status" ON public.user_bans;
CREATE POLICY "Staff and own user can view bans" ON public.user_bans
FOR SELECT TO authenticated
USING (is_staff(auth.uid()) OR auth.uid() = user_id);

-- Update feedback policies
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
CREATE POLICY "Staff can view all feedback" ON public.feedback
FOR SELECT TO authenticated
USING (is_staff(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
CREATE POLICY "Moderators can update feedback" ON public.feedback
FOR UPDATE TO authenticated
USING (is_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete feedback" ON public.feedback;
CREATE POLICY "Moderators can delete feedback" ON public.feedback
FOR DELETE TO authenticated
USING (is_moderator_or_above(auth.uid()));

-- Update errors policies
DROP POLICY IF EXISTS "Admins can view all errors" ON public.errors;
CREATE POLICY "Staff can view errors" ON public.errors
FOR SELECT TO authenticated
USING (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete errors" ON public.errors;
CREATE POLICY "Elder moderators can delete errors" ON public.errors
FOR DELETE TO authenticated
USING (is_elder_moderator_or_above(auth.uid()));

-- Update reports policies
DROP POLICY IF EXISTS "Users can view their own reports" ON public.user_reports;
CREATE POLICY "Users and elder mods can view reports" ON public.user_reports
FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR is_elder_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can update reports" ON public.user_reports;
CREATE POLICY "Elder moderators can update reports" ON public.user_reports
FOR UPDATE TO authenticated
USING (is_elder_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete reports" ON public.user_reports;
CREATE POLICY "Elder moderators can delete reports" ON public.user_reports
FOR DELETE TO authenticated
USING (is_elder_moderator_or_above(auth.uid()));

-- Update custom_emojis policies
DROP POLICY IF EXISTS "Admins can insert emojis" ON public.custom_emojis;
CREATE POLICY "Elder moderators can insert emojis" ON public.custom_emojis
FOR INSERT TO authenticated
WITH CHECK (is_elder_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete emojis" ON public.custom_emojis;
CREATE POLICY "Elder moderators can delete emojis" ON public.custom_emojis
FOR DELETE TO authenticated
USING (is_elder_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can update emojis" ON public.custom_emojis;
CREATE POLICY "Elder moderators can update emojis" ON public.custom_emojis
FOR UPDATE TO authenticated
USING (is_elder_moderator_or_above(auth.uid()))
WITH CHECK (is_elder_moderator_or_above(auth.uid()));

-- Update emoji_categories policies
DROP POLICY IF EXISTS "Admins can insert emoji categories" ON public.emoji_categories;
CREATE POLICY "Elder moderators can insert emoji categories" ON public.emoji_categories
FOR INSERT TO authenticated
WITH CHECK (is_elder_moderator_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete emoji categories" ON public.emoji_categories;
CREATE POLICY "Elder moderators can delete emoji categories" ON public.emoji_categories
FOR DELETE TO authenticated
USING (is_elder_moderator_or_above(auth.uid()));

-- Update user_roles view policy
DROP POLICY IF EXISTS "Users can view own roles and admins can view all" ON public.user_roles;
CREATE POLICY "Users and staff can view roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_staff(auth.uid()));

-- Update app_settings policies for elder_moderator+
DROP POLICY IF EXISTS "Admins can delete app settings" ON public.app_settings;
CREATE POLICY "Admins can delete app settings" ON public.app_settings
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
CREATE POLICY "Admins can insert app settings" ON public.app_settings
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
CREATE POLICY "Admins can update app settings" ON public.app_settings
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
