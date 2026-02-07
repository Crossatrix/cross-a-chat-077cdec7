
-- Create app_settings table for storing version number and other settings
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can view app settings"
ON public.app_settings FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert app settings"
ON public.app_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update app settings"
ON public.app_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete app settings"
ON public.app_settings FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default version
INSERT INTO public.app_settings (key, value) VALUES ('app_version', '1.0.0');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
