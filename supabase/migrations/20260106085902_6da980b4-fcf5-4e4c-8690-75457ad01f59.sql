-- Add privacy settings columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN show_online_status BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN allow_group_invites_from_strangers BOOLEAN NOT NULL DEFAULT true;

-- Create group_blocks table for blocking users from adding you to groups
CREATE TABLE public.group_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_user_id)
);

-- Enable RLS on group_blocks
ALTER TABLE public.group_blocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for group_blocks
CREATE POLICY "Users can view their own group blocks"
ON public.group_blocks
FOR SELECT
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create group blocks"
ON public.group_blocks
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own group blocks"
ON public.group_blocks
FOR DELETE
USING (auth.uid() = blocker_id);

-- Create group_invites table for pending group invitations
CREATE TABLE public.group_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  invited_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  UNIQUE(conversation_id, invited_user_id)
);

-- Enable RLS on group_invites
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for group_invites
CREATE POLICY "Users can view invites they received or sent"
ON public.group_invites
FOR SELECT
USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);

CREATE POLICY "Users can create group invites"
ON public.group_invites
FOR INSERT
WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Invited users can update their own invites"
ON public.group_invites
FOR UPDATE
USING (auth.uid() = invited_user_id);

CREATE POLICY "Users can delete invites they sent or received"
ON public.group_invites
FOR DELETE
USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);