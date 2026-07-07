
-- radio_broadcasters
CREATE TABLE public.radio_broadcasters (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.radio_broadcasters TO anon, authenticated;
GRANT INSERT, DELETE ON public.radio_broadcasters TO authenticated;
GRANT ALL ON public.radio_broadcasters TO service_role;
ALTER TABLE public.radio_broadcasters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Radio broadcasters public read" ON public.radio_broadcasters FOR SELECT USING (true);
CREATE POLICY "Only admins grant broadcaster" ON public.radio_broadcasters FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Only admins revoke broadcaster" ON public.radio_broadcasters FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- helper
CREATE OR REPLACE FUNCTION public.is_radio_broadcaster(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.radio_broadcasters WHERE user_id = _user_id)
$$;

-- radio_songs
CREATE TABLE public.radio_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  audio_url text NOT NULL,
  cover_url text,
  duration_seconds integer NOT NULL DEFAULT 180,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.radio_songs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.radio_songs TO authenticated;
GRANT ALL ON public.radio_songs TO service_role;
ALTER TABLE public.radio_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Radio songs public read" ON public.radio_songs FOR SELECT USING (true);
CREATE POLICY "Broadcasters upload songs" ON public.radio_songs FOR INSERT TO authenticated WITH CHECK (uploader_id = auth.uid() AND public.is_radio_broadcaster(auth.uid()));
CREATE POLICY "Broadcasters delete own songs" ON public.radio_songs FOR DELETE TO authenticated USING (uploader_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- radio_news
CREATE TABLE public.radio_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.radio_news TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.radio_news TO authenticated;
GRANT ALL ON public.radio_news TO service_role;
ALTER TABLE public.radio_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Radio news public read" ON public.radio_news FOR SELECT USING (true);
CREATE POLICY "Broadcasters create own news" ON public.radio_news FOR INSERT TO authenticated WITH CHECK (broadcaster_id = auth.uid() AND public.is_radio_broadcaster(auth.uid()));
CREATE POLICY "Broadcasters update own news" ON public.radio_news FOR UPDATE TO authenticated USING (broadcaster_id = auth.uid()) WITH CHECK (broadcaster_id = auth.uid());
CREATE POLICY "Broadcasters delete own news" ON public.radio_news FOR DELETE TO authenticated USING (broadcaster_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Enforce max 50 news per broadcaster
CREATE OR REPLACE FUNCTION public.enforce_radio_news_limit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM public.radio_news WHERE broadcaster_id = NEW.broadcaster_id;
  IF cnt >= 50 THEN
    RAISE EXCEPTION 'Max 50 news items per broadcaster';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER radio_news_limit_trg BEFORE INSERT ON public.radio_news
FOR EACH ROW EXECUTE FUNCTION public.enforce_radio_news_limit();

-- radio_now_playing (singleton row id=1)
CREATE TABLE public.radio_now_playing (
  id integer PRIMARY KEY DEFAULT 1,
  song_id uuid REFERENCES public.radio_songs(id) ON DELETE SET NULL,
  started_at timestamptz,
  news_text text,
  news_started_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT ON public.radio_now_playing TO anon, authenticated;
GRANT ALL ON public.radio_now_playing TO service_role;
ALTER TABLE public.radio_now_playing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Now playing public read" ON public.radio_now_playing FOR SELECT USING (true);

INSERT INTO public.radio_now_playing (id) VALUES (1) ON CONFLICT DO NOTHING;

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_now_playing;
