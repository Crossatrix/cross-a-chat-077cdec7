DROP POLICY IF EXISTS "Anyone can view emoji images" ON storage.objects;
CREATE POLICY "Admins view emoji images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'custom-emojis' AND public.has_role(auth.uid(), 'admin'::app_role));