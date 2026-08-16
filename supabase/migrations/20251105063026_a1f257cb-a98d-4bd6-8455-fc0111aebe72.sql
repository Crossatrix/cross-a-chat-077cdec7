-- Add video_url column to messages table
ALTER TABLE public.messages ADD COLUMN video_url text;

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-videos',
  'chat-videos',
  true,
  52428800, -- 50MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
);

-- RLS policies for chat-videos bucket
CREATE POLICY "Users can upload their own videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-videos');

CREATE POLICY "Users can delete their own videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);