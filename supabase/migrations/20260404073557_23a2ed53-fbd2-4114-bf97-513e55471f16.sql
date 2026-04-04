-- Fix 1: video_weekly_stats - restrict writes to video owners
DROP POLICY IF EXISTS "Authenticated users can insert weekly stats" ON public.video_weekly_stats;
DROP POLICY IF EXISTS "Authenticated users can update weekly stats" ON public.video_weekly_stats;

CREATE POLICY "Video owners can insert weekly stats"
ON public.video_weekly_stats FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos
    WHERE videos.id = video_weekly_stats.video_id
      AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Video owners can update weekly stats"
ON public.video_weekly_stats FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.videos
    WHERE videos.id = video_weekly_stats.video_id
      AND videos.user_id = auth.uid()
  )
);

-- Fix 2: errors table - restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "Anyone can insert errors" ON public.errors;

CREATE POLICY "Authenticated users can insert errors"
ON public.errors FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);