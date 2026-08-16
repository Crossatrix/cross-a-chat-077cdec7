
-- Add new role values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator_lite';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'elder_moderator';
