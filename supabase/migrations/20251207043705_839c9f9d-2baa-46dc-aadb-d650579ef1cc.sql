-- Allow admins to update custom emojis (for moving between categories)
CREATE POLICY "Admins can update emojis" 
ON public.custom_emojis 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));