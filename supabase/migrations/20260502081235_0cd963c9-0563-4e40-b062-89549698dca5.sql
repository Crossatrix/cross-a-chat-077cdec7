
-- ============ LIVESTREAMS ============
CREATE TABLE public.livestreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  adults_only BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'live', -- live | ended
  thumbnail_url TEXT,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  dislikes_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view livestreams"
  ON public.livestreams FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create their own livestreams"
  ON public.livestreams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own livestreams"
  ON public.livestreams FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users and staff can delete livestreams"
  ON public.livestreams FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_staff(auth.uid()));

-- Likes for livestreams
CREATE TABLE public.livestream_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_like BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stream_id, user_id)
);
ALTER TABLE public.livestream_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view livestream likes"
  ON public.livestream_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like livestreams"
  ON public.livestream_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own livestream likes"
  ON public.livestream_likes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own livestream likes"
  ON public.livestream_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- WebRTC signaling for livestreams
CREATE TABLE public.livestream_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID, -- null = broadcast to all viewers (host offers)
  signal_type TEXT NOT NULL, -- offer | answer | ice | viewer_join | viewer_leave
  signal_data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.livestream_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view livestream signals"
  ON public.livestream_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can create livestream signals"
  ON public.livestream_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

-- ============ MUSIC ============
CREATE TABLE public.music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  category TEXT NOT NULL DEFAULT 'music',
  duration NUMERIC NOT NULL DEFAULT 0,
  plays_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  dislikes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view music tracks"
  ON public.music_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can upload their own music"
  ON public.music_tracks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own music"
  ON public.music_tracks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users and staff can delete music"
  ON public.music_tracks FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_staff(auth.uid()));

-- Likes for music
CREATE TABLE public.music_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_like BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, user_id)
);
ALTER TABLE public.music_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view music likes"
  ON public.music_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like music"
  ON public.music_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own music likes"
  ON public.music_likes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own music likes"
  ON public.music_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Foreign key relationships to profiles for joins
ALTER TABLE public.livestreams
  ADD CONSTRAINT livestreams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.music_tracks
  ADD CONSTRAINT music_tracks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Trigger for music_tracks updated_at
CREATE TRIGGER update_music_tracks_updated_at
  BEFORE UPDATE ON public.music_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('livestream-thumbnails', 'livestream-thumbnails', true),
  ('music-audio', 'music-audio', true),
  ('music-covers', 'music-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view livestream thumbs"
  ON storage.objects FOR SELECT USING (bucket_id = 'livestream-thumbnails');
CREATE POLICY "Authenticated can upload livestream thumbs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'livestream-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their livestream thumbs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'livestream-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view music audio"
  ON storage.objects FOR SELECT USING (bucket_id = 'music-audio');
CREATE POLICY "Authenticated can upload music audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'music-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their music audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'music-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view music covers"
  ON storage.objects FOR SELECT USING (bucket_id = 'music-covers');
CREATE POLICY "Authenticated can upload music covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'music-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their music covers"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'music-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
