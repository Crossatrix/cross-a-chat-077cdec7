-- Fix 1: device_verification - change policies from public to authenticated
DROP POLICY IF EXISTS "Users can view their own device verification settings" ON public.device_verification;
DROP POLICY IF EXISTS "Users can insert their own device verification settings" ON public.device_verification;
DROP POLICY IF EXISTS "Users can update their own device verification settings" ON public.device_verification;

CREATE POLICY "Users can view their own device verification settings"
ON public.device_verification FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device verification settings"
ON public.device_verification FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device verification settings"
ON public.device_verification FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Fix 2: device_verification_codes - change policies from public to authenticated
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.device_verification_codes;
DROP POLICY IF EXISTS "Users can insert their own verification codes" ON public.device_verification_codes;
DROP POLICY IF EXISTS "Users can update their own verification codes" ON public.device_verification_codes;

CREATE POLICY "Users can view their own verification codes"
ON public.device_verification_codes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification codes"
ON public.device_verification_codes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification codes"
ON public.device_verification_codes FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Fix 3: conversation_participants - restrict INSERT to only conversations created by the user
-- The add_group_member() function (SECURITY DEFINER) handles adding members to existing conversations
DROP POLICY IF EXISTS "Users can add participants to new conversations" ON public.conversation_participants;

CREATE POLICY "Users can add participants to new conversations"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- Allow if user created this conversation (new conversation setup)
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
    -- Or if there's a pending/accepted group invite for them
    OR EXISTS (
      SELECT 1 FROM public.group_invites gi
      WHERE gi.conversation_id = conversation_participants.conversation_id
        AND gi.invited_user_id = auth.uid()
        AND gi.status = 'pending'
    )
  )
);
