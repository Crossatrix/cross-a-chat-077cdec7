-- Fix 1: Restrict user_roles table access to authenticated users only
-- This prevents unauthenticated attackers from enumerating admin accounts
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON user_roles;

CREATE POLICY "Authenticated users can view roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fix 2: Add database-level length constraints to prevent storage DoS attacks
-- These enforce the same limits as the client-side validation

-- Messages: 1-2000 characters
ALTER TABLE messages 
  ADD CONSTRAINT content_length_check 
  CHECK (length(content) >= 1 AND length(content) <= 2000);

-- Feedback: 1-5000 characters
ALTER TABLE feedback 
  ADD CONSTRAINT message_length_check 
  CHECK (length(message) >= 1 AND length(message) <= 5000);

-- Profiles: 3-50 characters for username
ALTER TABLE profiles 
  ADD CONSTRAINT username_length_check 
  CHECK (length(username) >= 3 AND length(username) <= 50);

-- User reports: 10-1000 characters
ALTER TABLE user_reports 
  ADD CONSTRAINT reason_length_check 
  CHECK (length(reason) >= 10 AND length(reason) <= 1000);

-- User bans: 10-500 characters
ALTER TABLE user_bans 
  ADD CONSTRAINT ban_reason_length_check 
  CHECK (length(reason) >= 10 AND length(reason) <= 500);