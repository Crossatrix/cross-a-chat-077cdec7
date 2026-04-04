-- Fix: user_warnings INSERT policy is WITH CHECK (true), allowing anyone to insert warnings
DROP POLICY IF EXISTS "System can insert warnings" ON public.user_warnings;

CREATE POLICY "Staff can insert warnings"
ON public.user_warnings
FOR INSERT
TO authenticated
WITH CHECK (is_staff(auth.uid()));
