ALTER TABLE public.mods
  ADD COLUMN IF NOT EXISTS security_level integer,
  ADD COLUMN IF NOT EXISTS security_findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS security_scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS security_set_by uuid;

CREATE POLICY "Staff can update mod security" ON public.mods
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));