-- Add rating column to feedback table
ALTER TABLE public.feedback 
ADD COLUMN rating integer;

-- Add check constraint to ensure rating is between 1 and 5 (if provided)
ALTER TABLE public.feedback 
ADD CONSTRAINT feedback_rating_check CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Add delete policy for admins on user_reports
CREATE POLICY "Admins can delete reports"
ON public.user_reports
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));