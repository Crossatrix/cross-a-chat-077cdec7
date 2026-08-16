
-- Add category column to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

-- Create table to track category view counts per user for personalization
CREATE TABLE IF NOT EXISTS public.video_category_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  view_count integer NOT NULL DEFAULT 1,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.video_category_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own category views"
  ON public.video_category_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category views"
  ON public.video_category_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category views"
  ON public.video_category_views FOR UPDATE
  USING (auth.uid() = user_id);
