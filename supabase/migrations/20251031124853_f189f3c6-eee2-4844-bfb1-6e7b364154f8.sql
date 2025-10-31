-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can create their own feedback
CREATE POLICY "Users can create feedback"
ON public.feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update feedback status
CREATE POLICY "Admins can update feedback"
ON public.feedback
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));