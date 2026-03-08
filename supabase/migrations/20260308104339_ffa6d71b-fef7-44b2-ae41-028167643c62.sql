
CREATE TABLE public.official_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.official_accounts ENABLE ROW LEVEL SECURITY;

-- Anyone can view official accounts (needed for badge display)
CREATE POLICY "Anyone can view official accounts"
  ON public.official_accounts FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert official accounts"
  ON public.official_accounts FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete official accounts"
  ON public.official_accounts FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));
