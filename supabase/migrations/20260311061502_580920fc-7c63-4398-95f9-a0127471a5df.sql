
-- Video ratings table for community star ratings
CREATE TABLE public.video_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);

-- Add staff rating columns to videos
ALTER TABLE public.videos
  ADD COLUMN staff_rating integer DEFAULT NULL,
  ADD COLUMN staff_rated_by uuid DEFAULT NULL REFERENCES public.profiles(id);

-- Enable RLS
ALTER TABLE public.video_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view ratings
CREATE POLICY "Anyone can view video ratings"
  ON public.video_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own ratings
CREATE POLICY "Users can insert their own ratings"
  ON public.video_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "Users can update their own ratings"
  ON public.video_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings"
  ON public.video_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
