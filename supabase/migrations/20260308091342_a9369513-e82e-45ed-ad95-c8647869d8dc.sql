
CREATE TABLE public.video_not_interested (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.video_not_interested ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own not interested" ON public.video_not_interested FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own not interested" ON public.video_not_interested FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own not interested" ON public.video_not_interested FOR DELETE USING (auth.uid() = user_id);
