
-- Posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  poll_question TEXT,
  poll_options JSONB,
  likes_count INTEGER NOT NULL DEFAULT 0,
  dislikes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create their own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Post likes table
CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_like BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view post likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can create their own post likes" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own post likes" ON public.post_likes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own post likes" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Post comments table
CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view post comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create their own post comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own post comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own post comments or post owner can" ON public.post_comments FOR DELETE USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.posts WHERE posts.id = post_comments.post_id AND posts.user_id = auth.uid()
  )
);

-- Poll votes table
CREATE TABLE public.post_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view poll votes" ON public.post_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.post_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change vote" ON public.post_poll_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove vote" ON public.post_poll_votes FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for post media
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true);

CREATE POLICY "Anyone can view post media" ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY "Authenticated users can upload post media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-media' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own post media" ON storage.objects FOR DELETE USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
