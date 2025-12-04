-- Add category column to custom_emojis table
ALTER TABLE public.custom_emojis 
ADD COLUMN category TEXT NOT NULL DEFAULT 'general';