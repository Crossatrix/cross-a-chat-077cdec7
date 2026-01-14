-- Add policy for edge function to read push tokens (using service role key)
-- The edge function already uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
-- No additional policy needed

-- However, we need to ensure the realtime subscription is enabled for push_tokens
-- so the app can listen for token changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_tokens;