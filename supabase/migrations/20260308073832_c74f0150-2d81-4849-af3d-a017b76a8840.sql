
-- Allow video owners to delete comments on their own videos
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.video_comments;
CREATE POLICY "Users can delete their own comments or creators can delete"
ON public.video_comments
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = video_comments.video_id 
    AND videos.user_id = auth.uid()
  )
);
