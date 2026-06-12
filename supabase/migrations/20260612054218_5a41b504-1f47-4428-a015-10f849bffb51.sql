
-- 1. User content blocks (separate from full bans)
CREATE TABLE public.user_content_blocks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_content_blocks TO authenticated;
GRANT ALL ON public.user_content_blocks TO service_role;
ALTER TABLE public.user_content_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own content block"
  ON public.user_content_blocks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage content blocks"
  ON public.user_content_blocks FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Helper RPC
CREATE OR REPLACE FUNCTION public.is_content_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_content_blocks
    WHERE user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- 2. Post reports (works for both posts and subcross_posts)
CREATE TABLE public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  subcross_post_id uuid REFERENCES public.subcross_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_post_target CHECK ((post_id IS NULL) <> (subcross_post_id IS NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reports TO authenticated;
GRANT ALL ON public.post_reports TO service_role;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can file post report"
  ON public.post_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Reporter or staff can view post reports"
  ON public.post_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Staff can update post reports"
  ON public.post_reports FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete post reports"
  ON public.post_reports FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));
