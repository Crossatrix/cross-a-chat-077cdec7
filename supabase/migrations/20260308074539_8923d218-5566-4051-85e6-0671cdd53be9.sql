
-- Create video_reports table
CREATE TABLE public.video_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id),
  reason text NOT NULL,
  ai_reviewed boolean DEFAULT false,
  ai_verdict text,
  ai_reason text,
  ai_reviewed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can report videos"
ON public.video_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports, elder mods+ can view all
CREATE POLICY "Users and elder mods can view video reports"
ON public.video_reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR is_elder_moderator_or_above(auth.uid()));

-- Elder mods+ can update (resolve)
CREATE POLICY "Elder mods can update video reports"
ON public.video_reports FOR UPDATE TO authenticated
USING (is_elder_moderator_or_above(auth.uid()));

-- Elder mods+ can delete
CREATE POLICY "Elder mods can delete video reports"
ON public.video_reports FOR DELETE TO authenticated
USING (is_elder_moderator_or_above(auth.uid()));
