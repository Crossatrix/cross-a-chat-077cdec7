-- Paid subscriptions: only the server (purchase-subscription function) may create or extend them
DROP POLICY IF EXISTS "Users insert own beta sub" ON public.beta_subscriptions;
DROP POLICY IF EXISTS "Users update own beta sub" ON public.beta_subscriptions;
DROP POLICY IF EXISTS "Users insert own subs" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Users update own subs" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own creator pro subscription" ON public.creator_pro_subscriptions;
DROP POLICY IF EXISTS "Users can update their own creator pro subscription" ON public.creator_pro_subscriptions;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pro_subscriptions' AND cmd IN ('INSERT','UPDATE') LOOP
    EXECUTE format('DROP POLICY %I ON public.pro_subscriptions', r.policyname);
  END LOOP;
END $$;

-- Legacy AI credit functions: not callable by clients
REVOKE EXECUTE ON FUNCTION public.get_or_reset_ai_credits(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_ai_credits(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- Bulk content export function: server only
REVOKE EXECUTE ON FUNCTION public.data_api(text) FROM PUBLIC, anon, authenticated;

-- Membership / block probes: only for yourself (or members / staff)
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    (auth.role() = 'service_role'
      OR _user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.conversation_participants c
                 WHERE c.conversation_id = _conversation_id AND c.user_id = auth.uid() AND c.kicked_at IS NULL))
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = _conversation_id AND user_id = _user_id AND kicked_at IS NULL
    )
$function$;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_content_blocked(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    (auth.role() = 'service_role' OR _user_id = auth.uid() OR public.is_staff(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_content_blocks
      WHERE user_id = _user_id AND (expires_at IS NULL OR expires_at > now())
    );
$function$;
REVOKE EXECUTE ON FUNCTION public.is_content_blocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_content_blocked(uuid) TO authenticated, service_role;

-- Livestream signals: only sender / recipient
DROP POLICY IF EXISTS "Anyone authenticated can view livestream signals" ON public.livestream_signals;
CREATE POLICY "Participants view their livestream signals" ON public.livestream_signals
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id
         OR (to_user_id IS NULL AND EXISTS (SELECT 1 FROM public.livestreams l WHERE l.id = stream_id AND l.user_id = auth.uid())));

-- Storage: public buckets serve files by URL; stop anyone listing every file
DROP POLICY IF EXISTS "Anyone can view ad videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view creator emoji files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view livestream thumbs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view music audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view music covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone view subcross media" ON storage.objects;
DROP POLICY IF EXISTS "Public thumbnail access" ON storage.objects;
DROP POLICY IF EXISTS "Public video files access" ON storage.objects;
DROP POLICY IF EXISTS "Users can view images in their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can view voice messages in their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Mods bucket public read" ON storage.objects;

CREATE POLICY "Owners view own public-bucket files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('avatars','creator-emojis','livestream-thumbnails','music-audio','music-covers',
                  'post-media','chat-videos','subcross-media','video-thumbnails','videos','chat-images','voice-messages')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Admins view ad videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ad-videos' AND public.is_app_admin(auth.uid()));

-- post-media uploads only into your own folder
DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
CREATE POLICY "Users upload own post media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);