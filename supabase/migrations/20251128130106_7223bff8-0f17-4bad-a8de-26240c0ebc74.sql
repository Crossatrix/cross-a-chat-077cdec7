-- Drop trigger first, then function, then recreate with proper security settings
DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
DROP FUNCTION IF EXISTS update_message_updated_at();

CREATE OR REPLACE FUNCTION update_message_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_message_updated_at();