
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS members_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.livestreams ADD COLUMN IF NOT EXISTS members_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.music_tracks ADD COLUMN IF NOT EXISTS members_only boolean NOT NULL DEFAULT false;
