
-- 1. Bots: restrict SELECT to admins/owners only
DROP POLICY IF EXISTS "Anyone can see bot flag" ON public.bots;
CREATE POLICY "Admins view bots" ON public.bots
  FOR SELECT TO authenticated
  USING (public.is_app_admin(auth.uid()) OR public.is_app_owner(auth.uid()));

-- 2. Channel subscriptions: limit visibility
DROP POLICY IF EXISTS "Anyone authenticated can view subs" ON public.channel_subscriptions;
CREATE POLICY "Subscriber or creator views subs" ON public.channel_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = creator_id);

-- 3. Device verification codes: remove client SELECT
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.device_verification_codes;

-- 4. Storage: enforce per-user folder uploads
DROP POLICY IF EXISTS "Auth upload video files" ON storage.objects;
CREATE POLICY "Users upload own video files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Auth upload thumbnails" ON storage.objects;
CREATE POLICY "Users upload own thumbnails" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'video-thumbnails'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Authenticated upload subcross media" ON storage.objects;
CREATE POLICY "Users upload own subcross media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'subcross-media'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
