
CREATE TABLE public.blocked_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

ALTER TABLE public.blocked_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocked categories"
  ON public.blocked_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blocked categories"
  ON public.blocked_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blocked categories"
  ON public.blocked_categories FOR DELETE
  USING (auth.uid() = user_id);
