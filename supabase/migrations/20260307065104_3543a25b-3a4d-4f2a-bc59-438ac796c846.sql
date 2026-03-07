
-- Creator verification table
CREATE TABLE public.creator_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'creator', -- 'creator', 'verified', 'verified_plus'
  verified_by uuid REFERENCES public.profiles(id) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_verifications ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view verifications
CREATE POLICY "Anyone can view creator verifications"
ON public.creator_verifications FOR SELECT
TO authenticated
USING (true);

-- Moderators+ can insert/update verifications
CREATE POLICY "Moderators can manage creator verifications"
ON public.creator_verifications FOR INSERT
TO authenticated
WITH CHECK (is_moderator_or_above(auth.uid()));

CREATE POLICY "Moderators can update creator verifications"
ON public.creator_verifications FOR UPDATE
TO authenticated
USING (is_moderator_or_above(auth.uid()));

CREATE POLICY "Admins can delete creator verifications"
ON public.creator_verifications FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-create creator status when user uploads first video
CREATE OR REPLACE FUNCTION public.auto_create_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.creator_verifications (user_id, status)
  VALUES (NEW.user_id, 'creator')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_video_upload_create_creator
AFTER INSERT ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.auto_create_creator();
