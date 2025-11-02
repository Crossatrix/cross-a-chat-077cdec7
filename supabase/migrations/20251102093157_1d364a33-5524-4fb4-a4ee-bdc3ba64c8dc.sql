-- Allow users to view their own ban status
CREATE POLICY "Users can view their own ban status"
ON public.user_bans
FOR SELECT
USING (auth.uid() = user_id);