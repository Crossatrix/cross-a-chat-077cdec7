-- Allow users to update their own messages (for editing)
CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create message_reads table to track read receipts
CREATE TABLE public.message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Users can view read receipts for messages in their conversations
CREATE POLICY "Users can view read receipts in their conversations"
ON public.message_reads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reads.message_id
    AND is_conversation_member(m.conversation_id, auth.uid())
  )
);

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
ON public.message_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add updated_at column to messages for tracking edits
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to update updated_at on message edits
CREATE OR REPLACE FUNCTION update_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_message_updated_at();

-- Enable realtime for message_reads
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;