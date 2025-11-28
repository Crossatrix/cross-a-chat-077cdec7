-- Fix function search_path for check_ai_chat_limit
-- This ensures the function has a fixed search path for security

CREATE OR REPLACE FUNCTION public.check_ai_chat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_ai_chat = true THEN
    IF (SELECT COUNT(*) FROM conversations 
        WHERE created_by = NEW.created_by 
        AND is_ai_chat = true) >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 AI chats allowed per user';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;