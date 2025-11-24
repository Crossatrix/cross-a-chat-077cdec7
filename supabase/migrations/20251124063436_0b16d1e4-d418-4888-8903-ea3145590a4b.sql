-- Add group chat support to conversations table
ALTER TABLE conversations
ADD COLUMN name TEXT,
ADD COLUMN is_group BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN created_by UUID REFERENCES profiles(id);

-- Create index for better query performance
CREATE INDEX idx_conversations_is_group ON conversations(is_group);

-- Update RLS policies to allow group chat creation
CREATE POLICY "Users can create group conversations"
ON conversations
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Function to create a group conversation
CREATE OR REPLACE FUNCTION create_group_conversation(
  group_name TEXT,
  participant_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  conversation_id UUID;
  participant_id UUID;
BEGIN
  -- Create the group conversation
  INSERT INTO conversations (is_group, name, created_by)
  VALUES (true, group_name, auth.uid())
  RETURNING id INTO conversation_id;
  
  -- Add creator as participant
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conversation_id, auth.uid());
  
  -- Add all other participants
  FOREACH participant_id IN ARRAY participant_ids
  LOOP
    IF participant_id != auth.uid() THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (conversation_id, participant_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN conversation_id;
END;
$$;