CREATE POLICY "Public can view basic profile info" ON public.profiles FOR SELECT TO anon USING (true);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.posts TO anon;
GRANT SELECT ON public.subcross_posts TO anon;
GRANT SELECT ON public.subcrosses TO anon;