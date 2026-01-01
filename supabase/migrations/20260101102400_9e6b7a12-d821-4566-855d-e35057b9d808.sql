-- Add admin_response column to feedback table
ALTER TABLE public.feedback 
ADD COLUMN admin_response TEXT,
ADD COLUMN admin_response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN admin_response_by UUID REFERENCES public.profiles(id);