
ALTER TABLE public.subcross_posts
  ADD CONSTRAINT subcross_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT subcross_posts_subcross_id_fkey FOREIGN KEY (subcross_id) REFERENCES public.subcrosses(id) ON DELETE CASCADE;

ALTER TABLE public.subcross_comments
  ADD CONSTRAINT subcross_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT subcross_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.subcross_posts(id) ON DELETE CASCADE;
