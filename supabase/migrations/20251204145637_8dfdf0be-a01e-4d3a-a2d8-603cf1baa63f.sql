-- Create custom emojis table
CREATE TABLE public.custom_emojis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_emojis ENABLE ROW LEVEL SECURITY;

-- Everyone can view emojis
CREATE POLICY "Anyone can view custom emojis"
ON public.custom_emojis
FOR SELECT
USING (true);

-- Only admins can insert emojis
CREATE POLICY "Admins can insert emojis"
ON public.custom_emojis
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete emojis
CREATE POLICY "Admins can delete emojis"
ON public.custom_emojis
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for emoji images
INSERT INTO storage.buckets (id, name, public) VALUES ('custom-emojis', 'custom-emojis', true);

-- Storage policies for emoji bucket
CREATE POLICY "Anyone can view emoji images"
ON storage.objects FOR SELECT
USING (bucket_id = 'custom-emojis');

CREATE POLICY "Admins can upload emoji images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'custom-emojis' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete emoji images"
ON storage.objects FOR DELETE
USING (bucket_id = 'custom-emojis' AND has_role(auth.uid(), 'admin'::app_role));