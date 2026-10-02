CREATE OR REPLACE FUNCTION public.notify_bot_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.conversation_id IS NULL OR COALESCE(NEW.is_system, false) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.bots WHERE id = NEW.user_id) THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    JOIN public.bots b ON b.id = cp.user_id AND b.active AND b.reply_chats
    WHERE cp.conversation_id = NEW.conversation_id
  ) THEN
    PERFORM net.http_post(
      url := 'https://kwewkdolmnrjmgplzxrk.supabase.co/functions/v1/bots-tick',
      headers := jsonb_build_object('Content-Type','application/json','apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZXdrZG9sbW5yam1ncGx6eHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NzE3MTQsImV4cCI6MjA3NzE0NzcxNH0.mtZiST9pfc5DLokcdY0OMAXlpSK1ftkHJY020u1DXQc'),
      body := jsonb_build_object('mode','reply','conversationId',NEW.conversation_id)
    );
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_bot_reply() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_message_insert_bot_reply AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_bot_reply();