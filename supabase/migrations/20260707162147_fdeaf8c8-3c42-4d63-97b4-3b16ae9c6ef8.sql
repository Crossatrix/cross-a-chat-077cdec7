
CREATE POLICY "Radio audio read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'radio-audio');
CREATE POLICY "Radio audio upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'radio-audio' AND public.is_radio_broadcaster(auth.uid()));
CREATE POLICY "Radio audio delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'radio-audio' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "Radio covers read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'radio-covers');
CREATE POLICY "Radio covers upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'radio-covers' AND public.is_radio_broadcaster(auth.uid()));
CREATE POLICY "Radio covers delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'radio-covers' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')));
