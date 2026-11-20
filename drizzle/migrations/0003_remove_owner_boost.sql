DROP FUNCTION IF EXISTS public.owner_boost(text, uuid, integer, text);
COMMENT ON COLUMN public.profiles.boost_followers IS 'DEPRECATED: owner boost removed';
COMMENT ON COLUMN public.posts.poll_boosts IS 'DEPRECATED: owner boost removed';