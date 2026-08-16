-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can view roles
CREATE POLICY "Roles are viewable by everyone"
ON public.user_roles
FOR SELECT
USING (true);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create user_reports table
CREATE TABLE public.user_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.user_reports
FOR SELECT
USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.user_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.user_reports
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_user_id)
);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks"
ON public.user_blocks
FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can create blocks
CREATE POLICY "Users can create blocks"
ON public.user_blocks
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete their own blocks"
ON public.user_blocks
FOR DELETE
USING (auth.uid() = blocker_id);

-- Create user_bans table
CREATE TABLE public.user_bans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- Admins can view all bans
CREATE POLICY "Admins can view all bans"
ON public.user_bans
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can create bans
CREATE POLICY "Admins can create bans"
ON public.user_bans
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete bans (unban)
CREATE POLICY "Admins can delete bans"
ON public.user_bans
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update handle_new_user to assign default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data ->> 'username');
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;

-- Update messages policy to exclude blocked users
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON public.messages;

CREATE POLICY "Messages are viewable by non-blocked users"
ON public.messages
FOR SELECT
USING (
  NOT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = auth.uid()
    AND blocked_user_id = messages.user_id
  )
);