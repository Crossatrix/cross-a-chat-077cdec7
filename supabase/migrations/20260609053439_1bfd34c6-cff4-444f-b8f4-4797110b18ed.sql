
-- Update owner check to allow two emails
CREATE OR REPLACE FUNCTION public.is_app_owner(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) IN ('cross.a.trix.owner@hotmail.com', 'moritz.loeseke7@gmail.com')
  )
$function$;

-- Reply parent ids
ALTER TABLE public.video_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.video_comments(id) ON DELETE CASCADE;
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS video_comments_parent_idx ON public.video_comments(parent_id);
CREATE INDEX IF NOT EXISTS post_comments_parent_idx ON public.post_comments(parent_id);

-- Boost storage
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS boost_followers integer NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_boosts jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Owner boost RPC
CREATE OR REPLACE FUNCTION public.owner_boost(
  p_kind text,
  p_target_id uuid,
  p_amount integer,
  p_sub_kind text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current jsonb;
  v_key text;
  v_cur_count integer;
BEGIN
  IF NOT is_app_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN false;
  END IF;

  IF p_kind = 'followers' THEN
    UPDATE profiles SET boost_followers = GREATEST(0, boost_followers + p_amount) WHERE id = p_target_id;
  ELSIF p_kind = 'video_views' THEN
    UPDATE videos SET views_count = GREATEST(0, views_count + p_amount) WHERE id = p_target_id;
  ELSIF p_kind = 'video_likes' THEN
    UPDATE videos SET likes_count = GREATEST(0, likes_count + p_amount) WHERE id = p_target_id;
  ELSIF p_kind = 'video_dislikes' THEN
    UPDATE videos SET dislikes_count = GREATEST(0, dislikes_count + p_amount) WHERE id = p_target_id;
  ELSIF p_kind = 'post_likes' THEN
    UPDATE posts SET likes_count = GREATEST(0, likes_count + p_amount) WHERE id = p_target_id;
  ELSIF p_kind = 'post_dislikes' THEN
    UPDATE posts SET dislikes_count = GREATEST(0, dislikes_count + p_amount) WHERE id = p_target_id;
  ELSIF p_kind = 'poll_vote' THEN
    IF p_sub_kind IS NULL THEN RAISE EXCEPTION 'option index required'; END IF;
    SELECT poll_boosts INTO v_current FROM posts WHERE id = p_target_id;
    v_key := p_sub_kind;
    v_cur_count := COALESCE((v_current ->> v_key)::int, 0);
    v_current := COALESCE(v_current, '{}'::jsonb) || jsonb_build_object(v_key, GREATEST(0, v_cur_count + p_amount));
    UPDATE posts SET poll_boosts = v_current WHERE id = p_target_id;
  ELSE
    RAISE EXCEPTION 'Unknown kind: %', p_kind;
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_boost(text, uuid, integer, text) TO authenticated;
