-- ============================================================
-- Radio Channels: turn the single shared radio feed into many
-- independently-run channels, each with its own broadcaster(s),
-- songs, news, and now-playing state.
-- ============================================================

-- radio_channels
CREATE TABLE public.radio_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.radio_channels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.radio_channels TO authenticated;
GRANT ALL ON public.radio_channels TO service_role;
ALTER TABLE public.radio_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Radio channels public read" ON public.radio_channels FOR SELECT USING (true);
-- Any registered broadcaster can create a channel (they become its owner);
-- admins can create channels for anyone.
CREATE POLICY "Broadcasters create channels" ON public.radio_channels FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_radio_broadcaster(auth.uid()));
CREATE POLICY "Channel owner updates channel" ON public.radio_channels FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Channel owner deletes channel" ON public.radio_channels FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- radio_channel_broadcasters: who may manage songs/news for a given channel.
-- The channel creator is auto-added as a broadcaster of their own channel;
-- they (or an admin) can add co-broadcasters (must already hold the global
-- "radiobroadcaster" grant in radio_broadcasters).
CREATE TABLE public.radio_channel_broadcasters (
  channel_id uuid NOT NULL REFERENCES public.radio_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);
GRANT SELECT ON public.radio_channel_broadcasters TO anon, authenticated;
GRANT INSERT, DELETE ON public.radio_channel_broadcasters TO authenticated;
GRANT ALL ON public.radio_channel_broadcasters TO service_role;
ALTER TABLE public.radio_channel_broadcasters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel broadcasters public read" ON public.radio_channel_broadcasters FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.is_channel_owner(_channel_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.radio_channels WHERE id = _channel_id AND created_by = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_channel_broadcaster(_channel_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.radio_channel_broadcasters
    WHERE channel_id = _channel_id AND user_id = _user_id
  )
$$;

CREATE POLICY "Owner or admin adds channel broadcaster" ON public.radio_channel_broadcasters FOR INSERT TO authenticated
  WITH CHECK (
    public.is_radio_broadcaster(user_id)
    AND (public.is_channel_owner(channel_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  );
CREATE POLICY "Owner, self, or admin removes channel broadcaster" ON public.radio_channel_broadcasters FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_channel_owner(channel_id, auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );

-- Auto-add the creator of a channel as one of its broadcasters.
CREATE OR REPLACE FUNCTION public.add_channel_owner_as_broadcaster()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.radio_channel_broadcasters (channel_id, user_id, added_by)
  VALUES (NEW.id, NEW.created_by, NEW.created_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER radio_channel_owner_broadcaster_trg
AFTER INSERT ON public.radio_channels
FOR EACH ROW EXECUTE FUNCTION public.add_channel_owner_as_broadcaster();

-- ---- radio_songs: scope to a channel ----
ALTER TABLE public.radio_songs ADD COLUMN channel_id uuid REFERENCES public.radio_channels(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Broadcasters upload songs" ON public.radio_songs;
CREATE POLICY "Broadcasters upload songs" ON public.radio_songs FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = auth.uid()
    AND public.is_radio_broadcaster(auth.uid())
    AND channel_id IS NOT NULL
    AND public.is_channel_broadcaster(channel_id, auth.uid())
  );

DROP POLICY IF EXISTS "Broadcasters delete own songs" ON public.radio_songs;
CREATE POLICY "Broadcasters delete own songs" ON public.radio_songs FOR DELETE TO authenticated
  USING (
    uploader_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.is_channel_owner(channel_id, auth.uid())
  );

-- ---- radio_news: scope to a channel ----
ALTER TABLE public.radio_news ADD COLUMN channel_id uuid REFERENCES public.radio_channels(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Broadcasters create own news" ON public.radio_news;
CREATE POLICY "Broadcasters create own news" ON public.radio_news FOR INSERT TO authenticated
  WITH CHECK (
    broadcaster_id = auth.uid()
    AND public.is_radio_broadcaster(auth.uid())
    AND channel_id IS NOT NULL
    AND public.is_channel_broadcaster(channel_id, auth.uid())
  );

DROP POLICY IF EXISTS "Broadcasters delete own news" ON public.radio_news;
CREATE POLICY "Broadcasters delete own news" ON public.radio_news FOR DELETE TO authenticated
  USING (
    broadcaster_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.is_channel_owner(channel_id, auth.uid())
  );

-- News limit trigger is per-broadcaster overall; also cap per-channel to keep it fair.
CREATE OR REPLACE FUNCTION public.enforce_radio_news_channel_limit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM public.radio_news
  WHERE broadcaster_id = NEW.broadcaster_id AND channel_id = NEW.channel_id;
  IF cnt >= 50 THEN
    RAISE EXCEPTION 'Max 50 news items per broadcaster per channel';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER radio_news_channel_limit_trg BEFORE INSERT ON public.radio_news
FOR EACH ROW EXECUTE FUNCTION public.enforce_radio_news_channel_limit();

-- ---- radio_now_playing: one row per channel instead of a singleton ----
ALTER TABLE public.radio_now_playing DROP CONSTRAINT IF EXISTS single_row;
ALTER TABLE public.radio_now_playing ADD COLUMN channel_id uuid REFERENCES public.radio_channels(id) ON DELETE CASCADE;
ALTER TABLE public.radio_now_playing ALTER COLUMN id DROP DEFAULT;
-- Old singleton row (id=1, channel_id null) is left in place but unused by the UI
-- once channels exist; a fresh row per channel is created below via trigger.

CREATE OR REPLACE FUNCTION public.create_now_playing_for_channel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.radio_now_playing (id, channel_id)
  VALUES (gen_random_uuid(), NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER radio_now_playing_for_channel_trg
AFTER INSERT ON public.radio_channels
FOR EACH ROW EXECUTE FUNCTION public.create_now_playing_for_channel();

-- id needs a default again for the trigger's explicit inserts to also allow
-- ad-hoc inserts if ever needed directly.
ALTER TABLE public.radio_now_playing ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX radio_now_playing_channel_unique ON public.radio_now_playing (channel_id) WHERE channel_id IS NOT NULL;

-- Storage: cover images for channels reuse the existing radio-covers bucket
-- (already public-read for authenticated users); no bucket policy changes needed
-- since RadioChannelCoverDialog will upload under `${userId}/...` like song covers.

-- Realtime for channels list (so UI updates live when channels are added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_channels;
