
-- Videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  duration integer,
  views_count integer NOT NULL DEFAULT 0,
  likes_count integer NOT NULL DEFAULT 0,
  dislikes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view videos" ON public.videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can upload their own videos" ON public.videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own videos" ON public.videos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own videos" ON public.videos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Video likes/dislikes
CREATE TABLE IF NOT EXISTS public.video_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_like boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view likes" ON public.video_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own likes" ON public.video_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own likes" ON public.video_likes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON public.video_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Video comments
CREATE TABLE IF NOT EXISTS public.video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view comments" ON public.video_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own comments" ON public.video_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.video_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.video_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Follows
CREATE TABLE IF NOT EXISTS public.video_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.video_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view follows" ON public.video_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can follow" ON public.video_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.video_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('video-thumbnails', 'video-thumbnails', true) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Public video files access" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Auth upload video files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');
CREATE POLICY "Own video files delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public thumbnail access" ON storage.objects FOR SELECT USING (bucket_id = 'video-thumbnails');
CREATE POLICY "Auth upload thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'video-thumbnails');
CREATE POLICY "Own thumbnails delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'video-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comments;
