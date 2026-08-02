CREATE TABLE public.video_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT '📦',
  sort_order integer NOT NULL DEFAULT 100,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.video_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_categories TO authenticated;
GRANT ALL ON public.video_categories TO service_role;

ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view video categories"
  ON public.video_categories FOR SELECT USING (true);

CREATE POLICY "Admins can insert video categories"
  ON public.video_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "Admins can update video categories"
  ON public.video_categories FOR UPDATE TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "Admins can delete video categories"
  ON public.video_categories FOR DELETE TO authenticated
  USING (public.is_app_admin(auth.uid()));

CREATE TRIGGER update_video_categories_updated_at
  BEFORE UPDATE ON public.video_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.video_categories (value, label, icon, sort_order) VALUES
  ('gaming','Gaming','🎮',10),
  ('music','Music','🎵',20),
  ('comedy','Comedy','😂',30),
  ('education','Education','📚',40),
  ('sports','Sports','⚽',50),
  ('news','News','📰',60),
  ('tech','Tech','💻',70),
  ('cooking','Cooking','🍳',80),
  ('travel','Travel','✈️',90),
  ('art','Art & Design','🎨',100),
  ('fitness','Fitness','💪',110),
  ('vlog','Vlog','📹',120),
  ('other','Other','📦',999)
ON CONFLICT (value) DO NOTHING;