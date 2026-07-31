-- Web Push subscriptions, so we can deliver notifications even when the
-- app/site is completely closed (real background push via the Push API).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Service role (used by the send-push edge function) bypasses RLS
-- automatically, so it can read every user's subscriptions to deliver pushes.

-- Enable the extension needed to call an edge function from a DB trigger.
create extension if not exists pg_net with schema extensions;

-- Fires whenever a new chat message is inserted. Calls the send-push edge
-- function (fire-and-forget, server-side) which looks up the conversation's
-- other participants and delivers a real Web Push notification to each of
-- their subscribed devices/browsers -- including when they have the site
-- completely closed, since this runs from the database, not the client.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform
    net.http_post(
      url := 'https://kwewkdolmnrjmgplzxrk.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZXdrZG9sbW5yam1ncGx6eHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NzE3MTQsImV4cCI6MjA3NzE0NzcxNH0.mtZiST9pfc5DLokcdY0OMAXlpSK1ftkHJY020u1DXQc'
      ),
      body := jsonb_build_object(
        'messageId', new.id,
        'conversationId', new.conversation_id,
        'senderId', new.user_id
      )
    );

  return new;
end;
$$;

drop trigger if exists on_message_insert_notify on public.messages;
create trigger on_message_insert_notify
  after insert on public.messages
  for each row
  execute function public.notify_new_message();
