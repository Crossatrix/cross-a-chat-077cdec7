
-- Live chat
CREATE TABLE public.livestream_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  croins_gift INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.livestream_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view live chat" ON public.livestream_chat FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can post in live chat" ON public.livestream_chat FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users and stream owner can delete chat" ON public.livestream_chat FOR DELETE TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM livestreams WHERE id = stream_id AND user_id = auth.uid()) OR is_staff(auth.uid()));
CREATE INDEX ON public.livestream_chat (stream_id, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_chat;

-- Channel memberships (tiers a creator offers)
CREATE TABLE public.channel_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_croins INTEGER NOT NULL CHECK (price_croins > 0),
  perks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.channel_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view memberships" ON public.channel_memberships FOR SELECT USING (true);
CREATE POLICY "Creators manage own memberships" ON public.channel_memberships FOR ALL TO authenticated
USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- Active subscriptions to a creator's tier
CREATE TABLE public.channel_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  membership_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, creator_id)
);
ALTER TABLE public.channel_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view subs" ON public.channel_subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own subs" ON public.channel_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subs" ON public.channel_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Creator emojis (tied to creator, available to their members)
CREATE TABLE public.creator_emojis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  membership_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(creator_id, name)
);
ALTER TABLE public.creator_emojis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view creator emojis" ON public.creator_emojis FOR SELECT USING (true);
CREATE POLICY "Creators manage own emojis" ON public.creator_emojis FOR ALL TO authenticated
USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('creator-emojis', 'creator-emojis', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Anyone can view creator emoji files" ON storage.objects FOR SELECT USING (bucket_id = 'creator-emojis');
CREATE POLICY "Authenticated upload creator emojis" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'creator-emojis' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own creator emoji files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'creator-emojis' AND auth.uid()::text = (storage.foldername(name))[1]);
