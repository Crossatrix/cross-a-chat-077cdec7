
-- Create changelog table
CREATE TABLE public.changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view changelog" ON public.changelog FOR SELECT USING (true);
CREATE POLICY "Admins can insert changelog" ON public.changelog FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update changelog" ON public.changelog FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete changelog" ON public.changelog FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
