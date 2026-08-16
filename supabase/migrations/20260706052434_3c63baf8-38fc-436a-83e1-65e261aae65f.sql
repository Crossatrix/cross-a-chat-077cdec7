CREATE TABLE public.user_installed_mods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mod_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, mod_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_installed_mods TO authenticated;
GRANT ALL ON public.user_installed_mods TO service_role;

ALTER TABLE public.user_installed_mods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own installed mods"
ON public.user_installed_mods FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_installed_mods_updated_at
BEFORE UPDATE ON public.user_installed_mods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();