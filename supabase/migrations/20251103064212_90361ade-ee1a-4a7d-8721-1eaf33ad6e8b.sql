-- Add expires_at column to user_bans for temporary bans
ALTER TABLE public.user_bans 
ADD COLUMN expires_at timestamp with time zone;

-- Add comment to explain the column
COMMENT ON COLUMN public.user_bans.expires_at IS 'If set, the ban will expire at this time. NULL means permanent ban.';