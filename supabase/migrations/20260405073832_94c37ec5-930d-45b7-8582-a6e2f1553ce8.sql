
-- Create ads table
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  duration NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'short',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Everyone can view ads
CREATE POLICY "Anyone can view ads"
ON public.ads FOR SELECT
USING (true);

-- Only admins can manage ads
CREATE POLICY "Admins can insert ads"
ON public.ads FOR INSERT
TO authenticated
WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "Admins can delete ads"
ON public.ads FOR DELETE
TO authenticated
USING (public.is_app_admin(auth.uid()));

-- Create storage bucket for ad videos
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-videos', 'ad-videos', true);

CREATE POLICY "Anyone can view ad videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-videos');

CREATE POLICY "Admins can upload ad videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ad-videos' AND public.is_app_admin(auth.uid()));

CREATE POLICY "Admins can delete ad videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ad-videos' AND public.is_app_admin(auth.uid()));
