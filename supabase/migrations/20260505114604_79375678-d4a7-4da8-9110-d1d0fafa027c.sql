CREATE TABLE IF NOT EXISTS public.beta_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own beta sub"
ON public.beta_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own beta sub"
ON public.beta_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own beta sub"
ON public.beta_subscriptions FOR UPDATE
USING (auth.uid() = user_id);
