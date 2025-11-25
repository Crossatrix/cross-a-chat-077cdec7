-- Drop the existing SELECT policy for conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;

-- Create a new SELECT policy that allows viewing conversations you're a member of OR that you created
CREATE POLICY "Users can view their own conversations" ON public.conversations
FOR SELECT
USING (
  is_conversation_member(id, auth.uid()) OR created_by = auth.uid()
);