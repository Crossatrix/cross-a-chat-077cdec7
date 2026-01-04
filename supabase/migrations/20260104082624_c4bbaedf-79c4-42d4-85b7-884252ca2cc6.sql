-- Add kicked_at column to track when users were kicked
ALTER TABLE public.conversation_participants 
ADD COLUMN IF NOT EXISTS kicked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update remove_group_member to set kicked_at instead of deleting
CREATE OR REPLACE FUNCTION public.remove_group_member(_conversation_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _caller_role public.group_role;
  _target_role public.group_role;
  _target_username text;
BEGIN
  -- Get caller's role
  SELECT role INTO _caller_role
  FROM public.conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = _caller_id AND kicked_at IS NULL;

  -- Get target's role
  SELECT role INTO _target_role
  FROM public.conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = _target_user_id AND kicked_at IS NULL;

  -- Get target's username for system message
  SELECT username INTO _target_username FROM public.profiles WHERE id = _target_user_id;

  -- Check permissions
  IF _caller_role = 'admin' THEN
    -- Admins can remove anyone except other admins
    IF _target_role = 'admin' THEN
      RETURN false;
    END IF;
  ELSIF _caller_role = 'moderator' THEN
    -- Moderators can only remove members
    IF _target_role != 'member' THEN
      RETURN false;
    END IF;
  ELSE
    RETURN false;
  END IF;

  -- Mark the member as kicked instead of deleting
  UPDATE public.conversation_participants
  SET kicked_at = now()
  WHERE conversation_id = _conversation_id AND user_id = _target_user_id;

  -- Insert system message about kick
  INSERT INTO public.messages (conversation_id, user_id, content, is_system, system_type)
  VALUES (_conversation_id, _target_user_id, _target_username || ' was removed from the group', true, 'kick');

  RETURN true;
END;
$$;

-- Update is_conversation_member to exclude kicked users
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
      AND kicked_at IS NULL
  )
$$;

-- Update has_group_role to exclude kicked users
CREATE OR REPLACE FUNCTION public.has_group_role(_conversation_id uuid, _user_id uuid, _role public.group_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
      AND role = _role
      AND kicked_at IS NULL
  )
$$;

-- Update is_group_admin to exclude kicked users
CREATE OR REPLACE FUNCTION public.is_group_admin(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
      AND role = 'admin'
      AND kicked_at IS NULL
  )
$$;

-- Update is_group_moderator to exclude kicked users
CREATE OR REPLACE FUNCTION public.is_group_moderator(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
      AND (role = 'admin' OR role = 'moderator')
      AND kicked_at IS NULL
  )
$$;

-- Update add_group_member to check for kicked status and rejoin
CREATE OR REPLACE FUNCTION public.add_group_member(_conversation_id uuid, _new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _new_role public.group_role := 'member';
  _new_username text;
  _existing_kicked boolean;
BEGIN
  -- Check if caller is a member of the group (not kicked)
  IF NOT is_conversation_member(_conversation_id, _caller_id) THEN
    RETURN false;
  END IF;

  -- Check if user is already an active member
  IF is_conversation_member(_conversation_id, _new_user_id) THEN
    RETURN false;
  END IF;

  -- Get new user's username for system message
  SELECT username INTO _new_username FROM public.profiles WHERE id = _new_user_id;

  -- If new user is an app admin, make them moderator
  IF is_app_admin(_new_user_id) THEN
    _new_role := 'moderator';
  END IF;

  -- Check if user was previously kicked
  SELECT kicked_at IS NOT NULL INTO _existing_kicked
  FROM public.conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = _new_user_id;

  IF _existing_kicked THEN
    -- Rejoin - clear kicked_at and update role
    UPDATE public.conversation_participants
    SET kicked_at = NULL, role = _new_role
    WHERE conversation_id = _conversation_id AND user_id = _new_user_id;
  ELSE
    -- Add the new member
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (_conversation_id, _new_user_id, _new_role);
  END IF;

  -- Insert system message about joining
  INSERT INTO public.messages (conversation_id, user_id, content, is_system, system_type)
  VALUES (_conversation_id, _new_user_id, _new_username || ' joined the group', true, 'join');

  RETURN true;
END;
$$;