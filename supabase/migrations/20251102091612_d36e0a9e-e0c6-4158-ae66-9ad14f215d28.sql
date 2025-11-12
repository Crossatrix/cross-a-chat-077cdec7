-- Add important field to feedback table
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS important boolean NOT NULL DEFAULT false;

-- Update RLS policy to allow admins to delete feedback
CREATE POLICY "Admins can delete feedback"
ON public.feedback
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));