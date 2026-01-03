-- Create enum for group roles
CREATE TYPE public.group_role AS ENUM ('admin', 'moderator', 'member');

-- Add role column to conversation_participants for group permissions
ALTER TABLE public.conversation_participants 
ADD COLUMN role public.group_role DEFAULT 'member';

-- Add group_image_url column to conversations for group pictures
ALTER TABLE public.conversations 
ADD COLUMN group_image_url text;

-- Function to check if user has a specific group role in a conversation
CREATE OR REPLACE FUNCTION public.has_group_role(_conversation_id uuid, _user_id uuid, _role group_role)
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
  )
$$;

-- Function to check if user is at least moderator (admin or moderator)
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
      AND role IN ('admin', 'moderator')
  )
$$;

-- Function to check if user is group admin
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
  )
$$;

-- Function to check if user is a Cross Chat admin (has admin app_role)
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Update the create_group_conversation function to set creator as admin
CREATE OR REPLACE FUNCTION public.create_group_conversation(group_name text, participant_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conversation_id uuid;
  current_user_id uuid;
  participant_id uuid;
  is_cross_chat_admin boolean;
BEGIN
  current_user_id := auth.uid();
  
  -- Create the conversation
  INSERT INTO conversations (is_group, name, created_by)
  VALUES (true, group_name, current_user_id)
  RETURNING id INTO new_conversation_id;
  
  -- Add creator as group admin
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (new_conversation_id, current_user_id, 'admin');
  
  -- Add other participants with appropriate roles
  FOREACH participant_id IN ARRAY participant_ids
  LOOP
    IF participant_id != current_user_id THEN
      -- Check if participant is a Cross Chat admin
      SELECT is_app_admin(participant_id) INTO is_cross_chat_admin;
      
      IF is_cross_chat_admin THEN
        -- Cross Chat admins get at least moderator role
        INSERT INTO conversation_participants (conversation_id, user_id, role)
        VALUES (new_conversation_id, participant_id, 'moderator');
      ELSE
        -- Regular users become members
        INSERT INTO conversation_participants (conversation_id, user_id, role)
        VALUES (new_conversation_id, participant_id, 'member');
      END IF;
    END IF;
  END LOOP;
  
  RETURN new_conversation_id;
END;
$$;

-- Function to add a member to a group (any member can add new people)
CREATE OR REPLACE FUNCTION public.add_group_member(_conversation_id uuid, _new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_cross_chat_admin boolean;
  new_role group_role;
BEGIN
  -- Check if caller is a member of the group
  IF NOT is_conversation_member(_conversation_id, auth.uid()) THEN
    RETURN false;
  END IF;
  
  -- Check if user is already a member
  IF is_conversation_member(_conversation_id, _new_user_id) THEN
    RETURN false;
  END IF;
  
  -- Determine role for new member
  SELECT is_app_admin(_new_user_id) INTO is_cross_chat_admin;
  IF is_cross_chat_admin THEN
    new_role := 'moderator';
  ELSE
    new_role := 'member';
  END IF;
  
  -- Add the new member
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (_conversation_id, _new_user_id, new_role);
  
  RETURN true;
END;
$$;

-- Function to remove a member from a group
CREATE OR REPLACE FUNCTION public.remove_group_member(_conversation_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role group_role;
  target_role group_role;
BEGIN
  -- Get caller's role
  SELECT role INTO caller_role
  FROM conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = auth.uid();
  
  -- Get target's role
  SELECT role INTO target_role
  FROM conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = _target_user_id;
  
  -- Admins can remove anyone except other admins
  IF caller_role = 'admin' THEN
    IF target_role = 'admin' THEN
      RETURN false;
    END IF;
    DELETE FROM conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _target_user_id;
    RETURN true;
  END IF;
  
  -- Moderators can remove members only (not admins or other moderators)
  IF caller_role = 'moderator' THEN
    IF target_role = 'member' THEN
      DELETE FROM conversation_participants
      WHERE conversation_id = _conversation_id AND user_id = _target_user_id;
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to change a member's role (admin only)
CREATE OR REPLACE FUNCTION public.change_group_role(_conversation_id uuid, _target_user_id uuid, _new_role group_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can change roles
  IF NOT is_group_admin(_conversation_id, auth.uid()) THEN
    RETURN false;
  END IF;
  
  -- Cannot change own role
  IF auth.uid() = _target_user_id THEN
    RETURN false;
  END IF;
  
  -- Update the role
  UPDATE conversation_participants
  SET role = _new_role
  WHERE conversation_id = _conversation_id AND user_id = _target_user_id;
  
  RETURN true;
END;
$$;

-- Function to leave a group
CREATE OR REPLACE FUNCTION public.leave_group(_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_last_admin boolean;
  admin_count integer;
  member_count integer;
BEGIN
  -- Check if user is in the group
  IF NOT is_conversation_member(_conversation_id, auth.uid()) THEN
    RETURN false;
  END IF;
  
  -- Count admins and total members
  SELECT COUNT(*) INTO admin_count
  FROM conversation_participants
  WHERE conversation_id = _conversation_id AND role = 'admin';
  
  SELECT COUNT(*) INTO member_count
  FROM conversation_participants
  WHERE conversation_id = _conversation_id;
  
  -- If user is last admin and there are other members, they can't leave
  IF is_group_admin(_conversation_id, auth.uid()) AND admin_count = 1 AND member_count > 1 THEN
    RETURN false;
  END IF;
  
  -- Remove the user from the group
  DELETE FROM conversation_participants
  WHERE conversation_id = _conversation_id AND user_id = auth.uid();
  
  -- If no members left, delete the conversation
  SELECT COUNT(*) INTO member_count
  FROM conversation_participants
  WHERE conversation_id = _conversation_id;
  
  IF member_count = 0 THEN
    DELETE FROM messages WHERE conversation_id = _conversation_id;
    DELETE FROM conversations WHERE id = _conversation_id;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to delete a group (admin only)
CREATE OR REPLACE FUNCTION public.delete_group(_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can delete the group
  IF NOT is_group_admin(_conversation_id, auth.uid()) THEN
    RETURN false;
  END IF;
  
  -- Delete all messages
  DELETE FROM messages WHERE conversation_id = _conversation_id;
  
  -- Delete all participants
  DELETE FROM conversation_participants WHERE conversation_id = _conversation_id;
  
  -- Delete the conversation
  DELETE FROM conversations WHERE id = _conversation_id;
  
  RETURN true;
END;
$$;

-- Update existing group participants to have 'member' role (they'll need to be promoted manually)
UPDATE conversation_participants cp
SET role = 'member'
WHERE role IS NULL
AND EXISTS (
  SELECT 1 FROM conversations c 
  WHERE c.id = cp.conversation_id AND c.is_group = true
);

-- Set group creators as admins
UPDATE conversation_participants cp
SET role = 'admin'
FROM conversations c
WHERE cp.conversation_id = c.id
  AND c.is_group = true
  AND cp.user_id = c.created_by;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_group_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_moderator TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_group_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_group_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_group_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_group TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group TO authenticated;