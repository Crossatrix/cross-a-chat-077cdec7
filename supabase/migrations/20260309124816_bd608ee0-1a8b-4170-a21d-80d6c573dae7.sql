
ALTER TABLE public.videos 
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS appeal_status text NOT NULL DEFAULT 'none';

-- Add comments for clarity
COMMENT ON COLUMN public.videos.moderation_status IS 'approved, pending, struck';
COMMENT ON COLUMN public.videos.moderation_reason IS 'AI-provided reason for striking';
COMMENT ON COLUMN public.videos.appeal_status IS 'none, pending, approved, rejected';
