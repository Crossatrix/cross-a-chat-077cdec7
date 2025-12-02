-- Add conversation context to reports
ALTER TABLE public.user_reports 
ADD COLUMN conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX idx_user_reports_conversation_id ON public.user_reports(conversation_id);

COMMENT ON COLUMN public.user_reports.conversation_id IS 'The conversation where the report was made';