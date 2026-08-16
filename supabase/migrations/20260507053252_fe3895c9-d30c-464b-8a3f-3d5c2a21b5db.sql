
-- Owner check by email
CREATE OR REPLACE FUNCTION public.is_app_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) = 'cross.a.trix.owner@hotmail.com'
  )
$$;

-- Bots registry
CREATE TABLE public.bots (
  id uuid PRIMARY KEY,
  persona text NOT NULL DEFAULT 'A friendly Cross Chat user.',
  system_prompt text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  reply_chats boolean NOT NULL DEFAULT true,
  comment_posts boolean NOT NULL DEFAULT true,
  created_by uuid,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see bot flag"
  ON public.bots FOR SELECT
  USING (true);

CREATE POLICY "Only owner manages bots insert"
  ON public.bots FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_owner(auth.uid()));

CREATE POLICY "Only owner manages bots update"
  ON public.bots FOR UPDATE
  TO authenticated
  USING (public.is_app_owner(auth.uid()));

CREATE POLICY "Only owner manages bots delete"
  ON public.bots FOR DELETE
  TO authenticated
  USING (public.is_app_owner(auth.uid()));

-- Track which posts/messages a bot already acted on (avoid duplicate replies)
CREATE TABLE public.bot_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL,
  action_type text NOT NULL, -- 'message' | 'subcross_comment' | 'post_comment'
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot_id, action_type, target_id)
);
ALTER TABLE public.bot_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads bot actions" ON public.bot_actions
  FOR SELECT TO authenticated USING (public.is_app_owner(auth.uid()));

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
