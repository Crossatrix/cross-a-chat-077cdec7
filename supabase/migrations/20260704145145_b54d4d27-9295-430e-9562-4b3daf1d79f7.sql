
CREATE POLICY "Mods files readable by authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mods');
CREATE POLICY "Users upload mods to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mods' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own mod files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mods' AND auth.uid()::text = (storage.foldername(name))[1]);
