-- Add column to track if user has read the admin response
ALTER TABLE public.feedback ADD COLUMN response_read boolean DEFAULT false;