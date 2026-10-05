ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ai_categories text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS categories_analyzed_at timestamptz;
CREATE INDEX IF NOT EXISTS videos_categories_analyzed_idx ON public.videos (categories_analyzed_at NULLS FIRST);

CREATE TABLE public.user_category_scores (
  user_id uuid NOT NULL,
  category text NOT NULL,
  score numeric(5,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_category_scores TO authenticated;
GRANT ALL ON public.user_category_scores TO service_role;
ALTER TABLE public.user_category_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own scores select" ON public.user_category_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own scores insert" ON public.user_category_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own scores update" ON public.user_category_scores FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own scores delete" ON public.user_category_scores FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Watch a video: boost its categories (+1, max 20), slowly decay all others (-0.1, min 0)
CREATE OR REPLACE FUNCTION public.bump_category_scores(_categories text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); c text;
BEGIN
  IF _uid IS NULL OR _categories IS NULL THEN RETURN; END IF;
  UPDATE user_category_scores SET score = GREATEST(0, score - 0.1), updated_at = now()
    WHERE user_id = _uid AND NOT (category = ANY(_categories));
  FOREACH c IN ARRAY _categories[1:5] LOOP
    INSERT INTO user_category_scores (user_id, category, score) VALUES (_uid, c, 1)
    ON CONFLICT (user_id, category) DO UPDATE SET score = LEAST(20, user_category_scores.score + 1), updated_at = now();
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.bump_category_scores(text[]) TO authenticated;