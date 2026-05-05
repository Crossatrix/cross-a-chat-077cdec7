
-- Subcrosses (Reddit-like communities)
CREATE TABLE public.subcrosses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  icon_url text,
  banner_url text,
  created_by uuid NOT NULL,
  members_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subcrosses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subcrosses" ON public.subcrosses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create subcrosses" ON public.subcrosses FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or staff update subcrosses" ON public.subcrosses FOR UPDATE TO authenticated USING (auth.uid() = created_by OR is_staff(auth.uid()));
CREATE POLICY "Creator or staff delete subcrosses" ON public.subcrosses FOR DELETE TO authenticated USING (auth.uid() = created_by OR is_staff(auth.uid()));

-- Subcross memberships (joined communities)
CREATE TABLE public.subcross_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcross_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subcross_id, user_id)
);
ALTER TABLE public.subcross_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subcross members" ON public.subcross_members FOR SELECT USING (true);
CREATE POLICY "Users join subcrosses" ON public.subcross_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave subcrosses" ON public.subcross_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Subcross posts
CREATE TABLE public.subcross_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcross_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  image_url text,
  link_url text,
  likes_count integer NOT NULL DEFAULT 0,
  dislikes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subcross_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subcross posts" ON public.subcross_posts FOR SELECT USING (true);
CREATE POLICY "Users create subcross posts" ON public.subcross_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update subcross posts" ON public.subcross_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners or staff delete subcross posts" ON public.subcross_posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR is_staff(auth.uid()));

-- Post likes (like/dislike)
CREATE TABLE public.subcross_post_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_like boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.subcross_post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view post votes" ON public.subcross_post_votes FOR SELECT USING (true);
CREATE POLICY "Users insert own post votes" ON public.subcross_post_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own post votes" ON public.subcross_post_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own post votes" ON public.subcross_post_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Comments (with optional parent for threading)
CREATE TABLE public.subcross_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  content text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  dislikes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subcross_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view subcross comments" ON public.subcross_comments FOR SELECT USING (true);
CREATE POLICY "Users insert own comments" ON public.subcross_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own comments" ON public.subcross_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners or staff delete comments" ON public.subcross_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR is_staff(auth.uid()));

-- Comment votes
CREATE TABLE public.subcross_comment_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_like boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
ALTER TABLE public.subcross_comment_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view comment votes" ON public.subcross_comment_votes FOR SELECT USING (true);
CREATE POLICY "Users insert own comment votes" ON public.subcross_comment_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comment votes" ON public.subcross_comment_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own comment votes" ON public.subcross_comment_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Vote count maintenance triggers
CREATE OR REPLACE FUNCTION public.update_subcross_post_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.is_like THEN UPDATE subcross_posts SET likes_count=likes_count+1 WHERE id=NEW.post_id;
    ELSE UPDATE subcross_posts SET dislikes_count=dislikes_count+1 WHERE id=NEW.post_id; END IF;
  ELSIF TG_OP='UPDATE' THEN
    IF OLD.is_like<>NEW.is_like THEN
      IF NEW.is_like THEN UPDATE subcross_posts SET likes_count=likes_count+1, dislikes_count=GREATEST(dislikes_count-1,0) WHERE id=NEW.post_id;
      ELSE UPDATE subcross_posts SET dislikes_count=dislikes_count+1, likes_count=GREATEST(likes_count-1,0) WHERE id=NEW.post_id; END IF;
    END IF;
  ELSIF TG_OP='DELETE' THEN
    IF OLD.is_like THEN UPDATE subcross_posts SET likes_count=GREATEST(likes_count-1,0) WHERE id=OLD.post_id;
    ELSE UPDATE subcross_posts SET dislikes_count=GREATEST(dislikes_count-1,0) WHERE id=OLD.post_id; END IF;
  END IF;
  RETURN NULL;
END;$$;
CREATE TRIGGER trg_subcross_post_votes
AFTER INSERT OR UPDATE OR DELETE ON public.subcross_post_votes
FOR EACH ROW EXECUTE FUNCTION public.update_subcross_post_vote_counts();

CREATE OR REPLACE FUNCTION public.update_subcross_comment_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.is_like THEN UPDATE subcross_comments SET likes_count=likes_count+1 WHERE id=NEW.comment_id;
    ELSE UPDATE subcross_comments SET dislikes_count=dislikes_count+1 WHERE id=NEW.comment_id; END IF;
  ELSIF TG_OP='UPDATE' THEN
    IF OLD.is_like<>NEW.is_like THEN
      IF NEW.is_like THEN UPDATE subcross_comments SET likes_count=likes_count+1, dislikes_count=GREATEST(dislikes_count-1,0) WHERE id=NEW.comment_id;
      ELSE UPDATE subcross_comments SET dislikes_count=dislikes_count+1, likes_count=GREATEST(likes_count-1,0) WHERE id=NEW.comment_id; END IF;
    END IF;
  ELSIF TG_OP='DELETE' THEN
    IF OLD.is_like THEN UPDATE subcross_comments SET likes_count=GREATEST(likes_count-1,0) WHERE id=OLD.comment_id;
    ELSE UPDATE subcross_comments SET dislikes_count=GREATEST(dislikes_count-1,0) WHERE id=OLD.comment_id; END IF;
  END IF;
  RETURN NULL;
END;$$;
CREATE TRIGGER trg_subcross_comment_votes
AFTER INSERT OR UPDATE OR DELETE ON public.subcross_comment_votes
FOR EACH ROW EXECUTE FUNCTION public.update_subcross_comment_vote_counts();

-- Comment count maintenance
CREATE OR REPLACE FUNCTION public.update_subcross_post_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE subcross_posts SET comments_count=comments_count+1 WHERE id=NEW.post_id;
  ELSIF TG_OP='DELETE' THEN UPDATE subcross_posts SET comments_count=GREATEST(comments_count-1,0) WHERE id=OLD.post_id; END IF;
  RETURN NULL;
END;$$;
CREATE TRIGGER trg_subcross_comments_count
AFTER INSERT OR DELETE ON public.subcross_comments
FOR EACH ROW EXECUTE FUNCTION public.update_subcross_post_comment_count();

-- Member count maintenance
CREATE OR REPLACE FUNCTION public.update_subcross_member_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE subcrosses SET members_count=members_count+1 WHERE id=NEW.subcross_id;
  ELSIF TG_OP='DELETE' THEN UPDATE subcrosses SET members_count=GREATEST(members_count-1,0) WHERE id=OLD.subcross_id; END IF;
  RETURN NULL;
END;$$;
CREATE TRIGGER trg_subcross_members_count
AFTER INSERT OR DELETE ON public.subcross_members
FOR EACH ROW EXECUTE FUNCTION public.update_subcross_member_count();

-- Auto-add creator as member
CREATE OR REPLACE FUNCTION public.auto_join_subcross_creator()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO subcross_members (subcross_id, user_id) VALUES (NEW.id, NEW.created_by) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_subcross_auto_join AFTER INSERT ON public.subcrosses
FOR EACH ROW EXECUTE FUNCTION public.auto_join_subcross_creator();

-- Storage bucket for subcross media
INSERT INTO storage.buckets (id, name, public) VALUES ('subcross-media', 'subcross-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone view subcross media" ON storage.objects FOR SELECT USING (bucket_id='subcross-media');
CREATE POLICY "Authenticated upload subcross media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='subcross-media');
CREATE POLICY "Owners delete subcross media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='subcross-media' AND auth.uid()::text = (storage.foldername(name))[1]);
