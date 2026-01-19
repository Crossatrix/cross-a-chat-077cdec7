-- Create errors table for storing error reports
CREATE TABLE public.errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_stack TEXT,
  url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  additional_info JSONB
);

-- Enable RLS
ALTER TABLE public.errors ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert errors (even unauthenticated users might hit errors)
CREATE POLICY "Anyone can insert errors"
ON public.errors
FOR INSERT
WITH CHECK (true);

-- Only admins can view errors
CREATE POLICY "Admins can view all errors"
ON public.errors
FOR SELECT
USING (public.is_app_admin(auth.uid()));

-- Only admins can delete errors
CREATE POLICY "Admins can delete errors"
ON public.errors
FOR DELETE
USING (public.is_app_admin(auth.uid()));