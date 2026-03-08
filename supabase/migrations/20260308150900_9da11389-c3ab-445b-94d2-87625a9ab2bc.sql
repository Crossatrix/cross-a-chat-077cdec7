
-- Table to track weekly video stats for leaderboard
CREATE TABLE public.video_weekly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  weekly_views integer NOT NULL DEFAULT 0,
  weekly_likes integer NOT NULL DEFAULT 0,
  weekly_dislikes integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(video_id, week_start)
);

-- Enable RLS
ALTER TABLE public.video_weekly_stats ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read leaderboard
CREATE POLICY "Anyone can view weekly stats"
  ON public.video_weekly_stats FOR SELECT
  USING (true);

-- System/authenticated users can insert/update (for view tracking)
CREATE POLICY "Authenticated users can insert weekly stats"
  ON public.video_weekly_stats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update weekly stats"
  ON public.video_weekly_stats FOR UPDATE
  TO authenticated
  USING (true);
