DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Owners or staff delete posts" ON public.posts FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
CREATE POLICY "Owners or staff delete videos" ON public.videos FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR public.is_staff(auth.uid()));