
CREATE TABLE public.mods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mods TO authenticated;
GRANT ALL ON public.mods TO service_role;

ALTER TABLE public.mods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mods are viewable by everyone" ON public.mods FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload mods" ON public.mods FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their mods" ON public.mods FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Authors or staff can delete mods" ON public.mods FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_staff(auth.uid()));

CREATE TRIGGER update_mods_updated_at BEFORE UPDATE ON public.mods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Mods bucket public read" ON storage.objects FOR SELECT USING (bucket_id = 'mods');
CREATE POLICY "Authenticated can upload mods" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mods' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authors can delete own mod files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mods' AND auth.uid()::text = (storage.foldername(name))[1]);
