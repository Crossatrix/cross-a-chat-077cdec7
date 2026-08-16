-- Drop the existing restrictive SELECT policies
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;

-- Create new PERMISSIVE SELECT policies (PERMISSIVE is the default and allows OR logic)
CREATE POLICY "Admins can view all feedback" 
ON public.feedback 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own feedback" 
ON public.feedback 
FOR SELECT 
USING (auth.uid() = user_id);