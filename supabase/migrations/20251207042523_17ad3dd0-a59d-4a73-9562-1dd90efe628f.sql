-- Create emoji_categories table to persist folder structure
CREATE TABLE public.emoji_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.emoji_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view emoji categories"
ON public.emoji_categories
FOR SELECT
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can insert emoji categories"
ON public.emoji_categories
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete emoji categories"
ON public.emoji_categories
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default 'general' category
INSERT INTO public.emoji_categories (name) VALUES ('general');