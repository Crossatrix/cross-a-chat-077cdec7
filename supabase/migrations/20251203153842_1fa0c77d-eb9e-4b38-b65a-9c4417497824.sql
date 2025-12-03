-- Create AI credits table to track daily usage
CREATE TABLE public.ai_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  credits_remaining NUMERIC(5,1) NOT NULL DEFAULT 15,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;

-- Users can view their own credits
CREATE POLICY "Users can view their own credits"
ON public.ai_credits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own credits
CREATE POLICY "Users can update their own credits"
ON public.ai_credits
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own credits record
CREATE POLICY "Users can insert their own credits"
ON public.ai_credits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to get or create user credits with daily reset
CREATE OR REPLACE FUNCTION public.get_or_reset_ai_credits(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits NUMERIC(5,1);
  v_last_reset DATE;
BEGIN
  SELECT credits_remaining, last_reset_date INTO v_credits, v_last_reset
  FROM ai_credits WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO ai_credits (user_id, credits_remaining, last_reset_date)
    VALUES (p_user_id, 15, CURRENT_DATE)
    RETURNING credits_remaining INTO v_credits;
  ELSIF v_last_reset < CURRENT_DATE THEN
    UPDATE ai_credits 
    SET credits_remaining = 15, last_reset_date = CURRENT_DATE, updated_at = now()
    WHERE user_id = p_user_id
    RETURNING credits_remaining INTO v_credits;
  END IF;
  
  RETURN v_credits;
END;
$$;

-- Function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_ai_credits(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current NUMERIC(5,1);
BEGIN
  -- First ensure credits are reset if needed
  PERFORM get_or_reset_ai_credits(p_user_id);
  
  SELECT credits_remaining INTO v_current
  FROM ai_credits WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_current >= p_amount THEN
    UPDATE ai_credits 
    SET credits_remaining = credits_remaining - p_amount, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;