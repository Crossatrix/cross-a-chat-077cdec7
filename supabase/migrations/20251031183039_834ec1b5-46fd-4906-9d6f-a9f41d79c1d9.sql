-- Fix warning-level RLS policy gaps

-- 1. Allow users to update their own conversations (for metadata like last_read, etc.)
CREATE POLICY "Users can update their conversations"
  ON conversations
  FOR UPDATE
  USING (is_conversation_member(id, auth.uid()));

-- 2. Allow users to update their own profile information
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 3. Allow users to leave conversations they've joined
CREATE POLICY "Users can leave conversations"
  ON conversation_participants
  FOR DELETE
  USING (auth.uid() = user_id);