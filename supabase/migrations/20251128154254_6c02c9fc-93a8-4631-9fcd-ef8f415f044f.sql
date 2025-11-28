-- Add last_seen column to profiles table
ALTER TABLE public.profiles
ADD COLUMN last_seen timestamp with time zone DEFAULT now();

-- Create index for faster queries
CREATE INDEX idx_profiles_last_seen ON public.profiles(last_seen);

-- Create function to update last_seen
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;