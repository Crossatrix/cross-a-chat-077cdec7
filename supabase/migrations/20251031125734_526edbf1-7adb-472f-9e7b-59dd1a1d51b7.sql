-- Fix: Restrict profile access to authenticated users only
-- This prevents unauthenticated users from enumerating all usernames and user IDs

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Authenticated users can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);