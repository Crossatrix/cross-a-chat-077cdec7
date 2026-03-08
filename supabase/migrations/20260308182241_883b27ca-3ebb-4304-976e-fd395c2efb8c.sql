
-- Add adults_only column to videos table
ALTER TABLE public.videos ADD COLUMN adults_only boolean NOT NULL DEFAULT false;

-- Add age_verified column to profiles table
ALTER TABLE public.profiles ADD COLUMN age_verified boolean NOT NULL DEFAULT false;
