-- Add is_system column to messages for system messages (joins, leaves, kicks)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS system_type TEXT;

-- System message types: 'join', 'leave', 'kick', 'promote', 'demote'

-- Update the leave_group function to insert a system message
CREATE OR REPLACE FUNCTION public.leave_group(_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _is_admin boolean;
  _admin_count integer;
  _member_count integer;
  _username text;
BEGIN
  -- Check if user is a member
  IF NOT is_conversation_member(_conversation_id, _user_id) THEN
    RETURN false;
  END IF;

  -- Get username for system message
  SELECT username INTO _username FROM public.profiles WHERE id = _user_id;

  -- Check if user is admin
  SELECT role = 'admin' INTO _is_admin
  FROM public.conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = _user_id;

  -- Count admins and members
  SELECT COUNT(*) INTO _admin_count
  FROM public.conversation_participants
  WHERE conversation_id = _conversation_id AND role = 'admin';

  SELECT COUNT(*) INTO _member_count
  FROM public.conversation_participants
  WHERE conversation_id = _conversation_id;

  -- If user is the only admin but there are other members, prevent leaving
  IF _is_admin AND _admin_count = 1 AND _member_count > 1 THEN
    RETURN false;
  END IF;

  -- Remove user from group
  DELETE FROM public.conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = _user_id;

  -- Insert system message about leaving
  INSERT INTO public.messages (conversation_id, user_id, content, is_system, system_type)
  VALUES (_conversation_id, _user_id, _username || ' left the group', true, 'leave');

  -- If no members left, delete the group
  SELECT COUNT(*) INTO _member_count
  FROM public.conversation_participants
  WHERE conversation_id = _conversation_id;

  IF _member_count = 0 THEN
    DELETE FROM public.messages WHERE conversation_id = _conversation_id;
    DELETE FROM public.conversations WHERE id = _conversation_id;
  END IF;

  RETURN true;
END;
$$;

-- Update the remove_group_member function to insert a system message
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
  WHERE conversation_id = _conversation_id AND user_id = _caller_id;

  -- Get target's role
  SELECT role INTO _target_role
  FROM public.conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = _target_user_id;

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

  -- Remove the member
  DELETE FROM public.conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = _target_user_id;

  -- Insert system message about kick
  INSERT INTO public.messages (conversation_id, user_id, content, is_system, system_type)
  VALUES (_conversation_id, _target_user_id, _target_username || ' was removed from the group', true, 'kick');

  RETURN true;
END;
$$;

-- Update the add_group_member function to insert a system message
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
BEGIN
  -- Check if caller is a member of the group
  IF NOT is_conversation_member(_conversation_id, _caller_id) THEN
    RETURN false;
  END IF;

  -- Check if user is already a member
  IF is_conversation_member(_conversation_id, _new_user_id) THEN
    RETURN false;
  END IF;

  -- Get new user's username for system message
  SELECT username INTO _new_username FROM public.profiles WHERE id = _new_user_id;

  -- If new user is an app admin, make them moderator
  IF is_app_admin(_new_user_id) THEN
    _new_role := 'moderator';
  END IF;

  -- Add the new member
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (_conversation_id, _new_user_id, _new_role);

  -- Insert system message about joining
  INSERT INTO public.messages (conversation_id, user_id, content, is_system, system_type)
  VALUES (_conversation_id, _new_user_id, _new_username || ' joined the group', true, 'join');

  RETURN true;
END;
$$;