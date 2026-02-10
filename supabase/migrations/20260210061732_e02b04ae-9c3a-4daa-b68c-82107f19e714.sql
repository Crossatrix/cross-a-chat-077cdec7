
-- Track the last changelog version each user has seen
CREATE TABLE public.user_changelog_seen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_changelog_id UUID NOT NULL,
  seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_changelog_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seen status"
  ON public.user_changelog_seen FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own seen status"
  ON public.user_changelog_seen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seen status"
  ON public.user_changelog_seen FOR UPDATE
  USING (auth.uid() = user_id);
