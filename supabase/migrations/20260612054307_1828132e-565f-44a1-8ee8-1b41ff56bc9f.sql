
CREATE OR REPLACE FUNCTION public.owner_boost(p_kind text, p_target_id uuid, p_amount integer, p_sub_kind text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ELSIF p_kind = 'subcross_post_likes' THEN
    UPDATE subcross_posts SET likes_count = GREATEST(0, likes_count + p_amount) WHERE id = p_target_id;
  ELSIF p_kind = 'subcross_post_dislikes' THEN
    UPDATE subcross_posts SET dislikes_count = GREATEST(0, dislikes_count + p_amount) WHERE id = p_target_id;
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
$function$;
