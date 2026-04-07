
CREATE TABLE public.creator_pro_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_pro_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own creator pro subscription"
ON public.creator_pro_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own creator pro subscription"
ON public.creator_pro_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creator pro subscription"
ON public.creator_pro_subscriptions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all creator pro subscriptions"
ON public.creator_pro_subscriptions FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

-- User ad requests
CREATE TABLE public.user_ad_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT,
  duration NUMERIC NOT NULL DEFAULT 0,
  price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  review_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ad_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ad requests"
ON public.user_ad_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ad requests"
ON public.user_ad_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all ad requests"
ON public.user_ad_requests FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update ad requests"
ON public.user_ad_requests FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()));

-- AI credit purchases tracking
CREATE TABLE public.ai_credit_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits_amount NUMERIC NOT NULL DEFAULT 0,
  chats_amount INTEGER NOT NULL DEFAULT 0,
  croins_spent INTEGER NOT NULL DEFAULT 0,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ai credit purchases"
ON public.ai_credit_purchases FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai credit purchases"
ON public.ai_credit_purchases FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
