-- Create table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Users can insert signals for conversations they're part of
CREATE POLICY "Users can send signals in their conversations"
ON public.call_signals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = call_signals.conversation_id
    AND user_id = auth.uid()
  )
);

-- Users can view signals addressed to them
CREATE POLICY "Users can view signals addressed to them"
ON public.call_signals
FOR SELECT
USING (
  to_user_id = auth.uid()
  OR from_user_id = auth.uid()
);

-- Index for performance
CREATE INDEX idx_call_signals_conversation ON public.call_signals(conversation_id);
CREATE INDEX idx_call_signals_to_user ON public.call_signals(to_user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;