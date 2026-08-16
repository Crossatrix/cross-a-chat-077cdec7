
-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on messages in their conversations
CREATE POLICY "Users can view reactions in their conversations"
  ON public.message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reactions.message_id
        AND is_conversation_member(m.conversation_id, auth.uid())
    )
  );

-- Users can add reactions
CREATE POLICY "Users can add reactions"
  ON public.message_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reactions.message_id
        AND is_conversation_member(m.conversation_id, auth.uid())
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
