-- Add voice_url column to messages table
ALTER TABLE public.messages ADD COLUMN voice_url text;

-- Create storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  true,
  10485760, -- 10MB limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
);

-- RLS policies for voice-messages bucket
CREATE POLICY "Users can upload voice messages to their conversations"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'voice-messages' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view voice messages in their conversations"
ON storage.objects
FOR SELECT
USING (bucket_id = 'voice-messages');

CREATE POLICY "Users can delete their own voice messages"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'voice-messages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);