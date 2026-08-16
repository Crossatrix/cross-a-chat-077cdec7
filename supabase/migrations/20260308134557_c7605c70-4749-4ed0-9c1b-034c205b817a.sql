
CREATE TABLE public.featured_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'epic' CHECK (tier IN ('epic', 'legendary', 'mythic')),
  granted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read featured creators" ON public.featured_creators FOR SELECT USING (true);
CREATE POLICY "Admins can manage featured creators" ON public.featured_creators FOR ALL TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
