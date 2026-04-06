
CREATE TABLE public.pro_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pro subscription"
ON public.pro_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pro subscription"
ON public.pro_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pro subscription"
ON public.pro_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all pro subscriptions"
ON public.pro_subscriptions FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));
