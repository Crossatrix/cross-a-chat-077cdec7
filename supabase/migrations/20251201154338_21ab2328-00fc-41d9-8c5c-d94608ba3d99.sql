-- Add text color customization fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN text_hue integer DEFAULT 48,
ADD COLUMN text_saturation integer DEFAULT 100,
ADD COLUMN text_lightness integer DEFAULT 96;